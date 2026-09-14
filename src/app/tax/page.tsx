'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  TaxSummaryCards,
  TaxIncomeForm,
  TaxDeductionsForm,
  TaxBracketTable,
} from '@/components/Tax';
import {
  calculateTax,
  defaultIncome,
  defaultDeductions,
} from '@/lib/tax/tax-engine';
import type {
  IncomeBySection,
  TaxDeductions,
  TaxCalculationResult,
} from '@/lib/tax/tax-types';
import {
  Calculator,
  Calendar,
  RefreshCw,
  Save,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

interface NotificationState {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function TaxPage() {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(
    () => [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
      currentYear + 2,
    ],
    [currentYear]
  );

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [income, setIncome] = useState<IncomeBySection>(defaultIncome);
  const [syncedIncome, setSyncedIncome] = useState<IncomeBySection>(defaultIncome);
  const [deductions, setDeductions] = useState<TaxDeductions>(defaultDeductions);
  const [withholdingTax, setWithholdingTax] = useState<number>(0);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'info', message: string) => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      setNotification({ type, message });
      notificationTimerRef.current = setTimeout(() => {
        setNotification(null);
      }, 4000);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // Fetch tax data for the selected year
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setError(null);
      try {
        const res = await fetch(`/api/tax?year=${selectedYear}`);
        let data: {
          success?: boolean;
          error?: string;
          syncedIncome?: IncomeBySection;
          savedProfile?: {
            income?: IncomeBySection;
            deductions?: TaxDeductions;
            withholdingTax?: number;
          };
        } | null = null;

        try {
          data = await res.json();
        } catch {
          // Response was not JSON (e.g. HTML 500/502 page)
        }

        if (ignore) return;

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `ไม่สามารถดึงข้อมูลภาษีได้ (HTTP ${res.status})`);
        }

        const fetchedSynced: IncomeBySection = data.syncedIncome || defaultIncome;
        setSyncedIncome(fetchedSynced);

        if (data.savedProfile) {
          setIncome(data.savedProfile.income || fetchedSynced);
          setDeductions(data.savedProfile.deductions || defaultDeductions);
          setWithholdingTax(data.savedProfile.withholdingTax || 0);
          setIsManualOverride(false);
        } else {
          setIncome(fetchedSynced);
          setDeductions(defaultDeductions);
          setWithholdingTax(0);
          setIsManualOverride(false);
        }
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูลภาษี';
        setError(msg);
        showNotification('error', msg);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [selectedYear, showNotification]);

  // Explicit sync triggered by user
  const handleExplicitSync = async () => {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch(`/api/tax?year=${selectedYear}`);
      let data: {
        success?: boolean;
        error?: string;
        syncedIncome?: IncomeBySection;
      } | null = null;

      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `ไม่สามารถซิงค์ข้อมูลภาษีได้ (HTTP ${res.status})`);
      }

      const fetchedSynced: IncomeBySection = data.syncedIncome || defaultIncome;
      setSyncedIncome(fetchedSynced);
      setIncome(fetchedSynced);
      setIsManualOverride(false);

      showNotification(
        'success',
        `ซิงค์รายได้ปี ${selectedYear} (พ.ศ. ${selectedYear + 543}) จากรายการธุรกรรมเรียบร้อยแล้ว`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลรายได้';
      setError(msg);
      showNotification('error', msg);
    } finally {
      setSyncing(false);
    }
  };

  // Real-time tax calculation
  const result: TaxCalculationResult = useMemo(() => {
    return calculateTax(income, deductions, withholdingTax);
  }, [income, deductions, withholdingTax]);

  // Save tax profile to Google Sheets
  const handleSaveToSheet = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          income,
          deductions,
          withholdingTax,
        }),
      });

      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error || `ไม่สามารถบันทึกข้อมูลภาษีลง Google Sheet ได้ (HTTP ${res.status})`
        );
      }

      showNotification(
        'success',
        `บันทึกข้อมูลภาษีปี ${selectedYear} ลง Google Sheet สำเร็จแล้ว`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลง Google Sheet';
      showNotification('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleIncomeChange = (key: keyof IncomeBySection, value: number) => {
    setIncome((prev) => ({ ...prev, [key]: value }));
    setIsManualOverride(true);
  };

  const handleDeductionChange = (key: keyof TaxDeductions, value: number) => {
    setDeductions((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetSynced = () => {
    setIncome(syncedIncome);
    setIsManualOverride(false);
    showNotification('info', 'รีเซ็ตข้อมูลรายได้กลับเป็นค่าที่คำนวณจากรายการธุรกรรมแล้ว');
  };

  const handleToggleOverride = () => {
    setIsManualOverride((prev) => !prev);
  };

  const handleYearChange = (year: number) => {
    if (saving || year === selectedYear) return;
    setLoading(true);
    setSelectedYear(year);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f19] transition-colors">
      <Navbar onSyncComplete={handleExplicitSync} />

      {/* Floating Notification Toast */}
      {notification && (
        <div
          role="alert"
          className={`fixed top-18 right-4 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 backdrop-blur-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : notification.type === 'error'
              ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              : 'bg-sky-50/95 dark:bg-sky-950/95 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {notification.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            {notification.type === 'error' && (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            {notification.type === 'info' && (
              <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            )}
            <p className="text-xs sm:text-sm font-medium leading-snug">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 pb-28 md:pb-8">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <Calculator className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                คำนวณและวางแผนภาษี (Personal Income Tax)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              คำนวณภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด. 90/91) เชื่อมโยงบัญชีรายรับรายจ่าย พร้อมแนะนำสิทธิลดหย่อนเต็มพิกัด
            </p>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Year Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-x-auto">
              <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1 shrink-0" />
              {availableYears.map((yr) => {
                const isSelected = yr === selectedYear;
                return (
                  <button
                    key={yr}
                    type="button"
                    disabled={saving}
                    onClick={() => handleYearChange(yr)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    ปี {yr} (พ.ศ. {yr + 543})
                  </button>
                );
              })}
            </div>

            {/* Sync from Transactions Button */}
            <button
              type="button"
              onClick={handleExplicitSync}
              disabled={syncing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              title="ดึงข้อมูลรายได้จากแท็บธุรกรรมมาคำนวณใหม่"
            >
              <RefreshCw
                className={`w-4 h-4 ${syncing ? 'animate-spin text-emerald-500' : 'text-slate-500'}`}
              />
              <span>{syncing ? 'กำลังซิงค์...' : 'ซิงค์รายได้จากบัญชี'}</span>
            </button>

            {/* Manual Override Toggle */}
            <button
              type="button"
              onClick={handleToggleOverride}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isManualOverride
                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="เปิด/ปิดการแก้ไขตัวเลขเงินได้ด้วยตนเอง"
            >
              <Sliders className="w-4 h-4" />
              <span>{isManualOverride ? 'โหมดแก้ไขอิสระ' : 'แก้ไขตัวเลขอิสระ'}</span>
            </button>

            {/* Save to Google Sheet Button */}
            <button
              type="button"
              onClick={handleSaveToSheet}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              title="บันทึกข้อมูลภาษีและสิทธิลดหย่อนลง Google Sheets"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกลง Google Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                handleExplicitSync();
              }}
              className="px-3 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-xl font-medium transition-colors cursor-pointer"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* 1. Summary Cards */}
        <TaxSummaryCards result={result} loading={loading} />

        {/* 2. Income Form (Section 40) */}
        <TaxIncomeForm
          income={income}
          expenses={result.expensesBySection}
          onChange={handleIncomeChange}
          isManualOverride={isManualOverride}
          onToggleOverride={handleToggleOverride}
          onResetSynced={handleResetSynced}
        />

        {/* 3. Deductions Form */}
        <TaxDeductionsForm
          deductions={deductions}
          onChange={handleDeductionChange}
          result={result}
          withholdingTax={withholdingTax}
          onWithholdingChange={setWithholdingTax}
        />

        {/* 4. Progressive Tax Bracket Table */}
        <TaxBracketTable result={result} />
      </main>

      <MobileBottomNav
        onSyncComplete={handleExplicitSync}
        onRefresh={handleExplicitSync}
      />
    </div>
  );
}
