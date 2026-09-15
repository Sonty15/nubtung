'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Ban,
  CircleDot,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Wallet,
  Tag,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import type {
  IncomeBySection,
  TaxBreakdownTransaction,
  ExemptionReason,
} from '@/lib/tax/tax-types';

export interface IncomeBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionKey: keyof IncomeBySection | 'exempt' | null;
  sectionTitle: string;
  transactions: TaxBreakdownTransaction[];
  excludedIds: Set<string>;
  onToggleExclude: (txId: string) => void;
}

import {
  REASON_LABELS,
  SECTION_CODE_MAP,
  formatThaiDate,
  isTransactionExcluded,
  getTransactionStatusInfo,
} from '@/lib/tax/tax-breakdown-helpers';

export {
  formatThaiDate,
  isTransactionExcluded,
  getTransactionStatusInfo,
  REASON_LABELS,
  SECTION_CODE_MAP,
};


export default function IncomeBreakdownModal({
  isOpen,
  onClose,
  sectionKey,
  sectionTitle,
  transactions,
  excludedIds,
  onToggleExclude,
}: IncomeBreakdownModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'TAXABLE' | 'EXEMPT'>('ALL');

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset search and filter when section changes
  useEffect(() => {
    setSearchTerm('');
    setFilterTab('ALL');
  }, [sectionKey]);

  // Real-time summary metrics across all transactions in this section
  const { grossTotal, taxableAmount, excludedAmount, taxableCount, excludedCount } =
    useMemo(() => {
      let gross = 0;
      let taxable = 0;
      let excluded = 0;
      let tCount = 0;
      let eCount = 0;

      for (const tx of transactions) {
        const amt = Number(tx.amount) || 0;
        gross += amt;
        const isExcluded = isTransactionExcluded(tx, excludedIds);
        if (isExcluded) {
          excluded += amt;
          eCount += 1;
        } else {
          taxable += amt;
          tCount += 1;
        }
      }

      return {
        grossTotal: gross,
        taxableAmount: taxable,
        excludedAmount: excluded,
        taxableCount: tCount,
        excludedCount: eCount,
      };
    }, [transactions, excludedIds]);

  // Filtered transactions based on search and status tab
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      // 1. Search term match (note, category, account, amount)
      if (q) {
        const note = (tx.note || '').toLowerCase();
        const category = (tx.category || '').toLowerCase();
        const account = (tx.account || '').toLowerCase();
        const amountStr = (tx.amount || 0).toString();
        const matchesSearch =
          note.includes(q) ||
          category.includes(q) ||
          account.includes(q) ||
          amountStr.includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Status tab match
      const isExcluded = isTransactionExcluded(tx, excludedIds);
      const isTaxable = !isExcluded;

      if (filterTab === 'TAXABLE') {
        return isTaxable;
      }
      if (filterTab === 'EXEMPT') {
        return isExcluded;
      }

      return true;
    });
  }, [transactions, searchTerm, filterTab, excludedIds]);

  if (!isOpen) return null;

  const isExemptSection = sectionKey === 'exempt';
  const sectionBadge =
    isExemptSection
      ? 'ยกเว้นภาษี'
      : sectionKey && SECTION_CODE_MAP[sectionKey]
      ? SECTION_CODE_MAP[sectionKey]
      : 'มาตรา 40';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="income-breakdown-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-all duration-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                    isExemptSection
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                  }`}
                >
                  {sectionBadge}
                </span>
                <h2
                  id="income-breakdown-title"
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate"
                >
                  {sectionTitle}
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {transactions.length} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                รายการธุรกรรมที่เชื่อมโยงกับหมวดนี้ สามารถเปิด/ปิดเพื่อรวมหรือยกเว้นจากการคำนวณภาษีได้
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Summary Cards (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Gross Total */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  ยอดรวมทั้งหมด
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  ฿{grossTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                {transactions.length} รายการ
              </span>
            </div>

            {/* 2. Active Taxable Amount */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  รวมในภาษี (Active)
                </span>
                <div className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  ฿{taxableAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700">
                {taxableCount} รายการ
              </span>
            </div>

            {/* 3. Excluded Amount */}
            <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  ยกเว้นภาษี (Exempt)
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
                  ฿{excludedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                {excludedCount} รายการ
              </span>
            </div>
          </div>

          {/* Search Bar & Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาตามบันทึก, หมวดหมู่, หรือบัญชี..."
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="ล้างคำค้นหา"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                ทั้งหมด ({transactions.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('TAXABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterTab === 'TAXABLE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/60'
                }`}
              >
                <span>🟢 รวมในภาษี ({taxableCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('EXEMPT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterTab === 'EXEMPT'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <span>🚫 ยกเว้นภาษี ({excludedCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800/60 space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {transactions.length === 0
                  ? 'ไม่มีรายการธุรกรรมในหมวดนี้'
                  : `ไม่พบรายการที่ตรงกับ "${searchTerm}"`}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                {transactions.length === 0
                  ? 'ระบบไม่พบธุรกรรมรายรับที่เชื่อมโยงกับหมวดนี้ในปีภาษีที่เลือก'
                  : 'ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองด้านบนเพื่อค้นหารายการ'}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx, idx) => {
              const isExcluded = isTransactionExcluded(tx, excludedIds);
              const isTaxable = !isExcluded;
              const statusInfo = getTransactionStatusInfo(tx, isExcluded);

              return (
                <div
                  key={tx.id || `tx-${idx}`}
                  className={`pt-3 first:pt-0 pb-1 rounded-2xl p-3 sm:p-4 border transition-all ${
                    isTaxable
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Date, Category, Account, Note & Badges */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        {/* Date & Time */}
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatThaiDate(tx.date)}</span>
                          {tx.time && (
                            <span className="text-slate-400 text-[11px] font-normal">
                              ({tx.time})
                            </span>
                          )}
                        </span>

                        {/* Account Badge */}
                        {tx.account && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Wallet className="w-3 h-3 text-slate-400" />
                            <span>{tx.account}</span>
                          </span>
                        )}

                        {/* Category Badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{tx.category}</span>
                        </span>
                      </div>

                      {/* Note or Category as Title */}
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {tx.note ? tx.note : <span className="text-slate-400 dark:text-slate-500 font-normal">ไม่มีบันทึกรายละเอียด</span>}
                      </div>

                      {/* Status / Exemption Reason Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {statusInfo.statusType === 'taxable' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>รวมในภาษี</span>
                          </span>
                        )}

                        {statusInfo.statusType === 'auto-exempt' && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                              <Ban className="w-3 h-3" />
                              <span>ยกเว้นอัตโนมัติ</span>
                            </span>
                            {statusInfo.reasonLabel && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                {statusInfo.reasonLabel}
                              </span>
                            )}
                          </>
                        )}

                        {statusInfo.statusType === 'user-excluded' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <CircleDot className="w-3 h-3" />
                            <span>ยกเว้นโดยผู้ใช้</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Inclusion Toggle Switch */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                      {/* Amount */}
                      <span
                        className={`text-base sm:text-lg font-bold ${
                          isTaxable
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500 line-through'
                        }`}
                      >
                        +฿{(Number(tx.amount) || 0).toLocaleString('th-TH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>

                      {/* Inclusion Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {isTaxable ? 'รวมภาษี' : 'ยกเว้น'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isTaxable}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tx.id) {
                              onToggleExclude(tx.id);
                            }
                          }}
                          disabled={!tx.id}
                          title={
                            !tx.id
                              ? 'ไม่มี Transaction ID ไม่สามารถสลับสถานะได้'
                              : isTaxable
                              ? 'คลิกเพื่อยกเว้นรายการนี้จากการคำนวณภาษี'
                              : 'คลิกเพื่อรวมรายการนี้ในการคำนวณภาษี'
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isTaxable ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isTaxable ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 shrink-0 text-slate-400" />
            <span>
              การเปิด/ปิดรายการจะอัปเดตยอดคำนวณภาษีและเงินได้พึงประเมินโดยอัตโนมัติ
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
