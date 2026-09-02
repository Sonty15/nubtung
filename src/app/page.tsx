'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import SummaryCards from '@/components/Dashboard/SummaryCards';
import ManualTransactionModal from '@/components/Transactions/ManualTransactionModal';
import { DashboardSummary, Transaction } from '@/types';
import Link from 'next/link';
import { ArrowRight, ExternalLink, FileSpreadsheet, PieChart, Building2 } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onSyncComplete={fetchData} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ภาพรวมการเงิน (Financial Overview)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              เชื่อมต่อและอ่านข้อมูลสดจาก Google Sheets พร้อมระบบ AI อ่านสลิปอัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ManualTransactionModal onSuccess={fetchData} />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold">หมายเหตุ: </span>
              <span>{error} (โปรดตรวจสอบการตั้งค่า Service Account และ Sheet ID ใน .env.local)</span>
            </div>
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-medium transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* 4 Summary cards */}
        <SummaryCards summary={summary} loading={loading} />

        {/* 2 Columns: Breakdowns & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Categories & Accounts breakdown */}
          <div className="space-y-6">
            {/* Category breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>
              </div>

              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded-full" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded-full" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded-full" />
                </div>
              ) : Object.keys(summary?.categoryBreakdown || {}).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">ยังไม่มีข้อมูลค่าใช้จ่าย</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary?.categoryBreakdown || {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => {
                      const totalExpense = summary?.totalExpense || 1;
                      const percentage = Math.round((amount / totalExpense) * 100);
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium text-slate-700">
                            <span>{category}</span>
                            <span>฿{amount.toLocaleString()} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Account Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>รายจ่ายแยกตามบัญชี</span>
              </div>

              {loading ? (
                <div className="space-y-2 py-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded-full" />
                </div>
              ) : Object.keys(summary?.accountBreakdown || {}).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(summary?.accountBreakdown || {}).map(([acc, amt]) => (
                    <div
                      key={acc}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-700"
                    >
                      <span className="font-semibold text-slate-800">{acc}</span>
                      <span className="text-rose-600">฿{amt.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Recent Transactions */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">รายการล่าสุด</h2>
                <Link
                  href="/transactions"
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <span>ดูทั้งหมด</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (summary?.recentTransactions || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  ยังไม่มีรายการธุรกรรม
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {summary?.recentTransactions.map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-50 text-emerald-700'
                              : tx.type === 'TRANSFER'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {tx.type === 'INCOME' ? 'เข้า' : tx.type === 'TRANSFER' ? 'โอน' : 'ออก'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {tx.note || tx.category}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {tx.date} • {tx.account} • {tx.category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-bold ${
                            tx.type === 'INCOME'
                              ? 'text-emerald-600'
                              : tx.type === 'TRANSFER'
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '🔄 ' : '-'}฿
                          {tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </p>
                        {tx.slipUrl && (
                          <a
                            href={tx.slipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-emerald-600 hover:underline flex items-center justify-end gap-0.5"
                          >
                            <span>สลิป</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                ข้อมูลอัปเดตอัตโนมัติจาก Google Sheets
              </span>
              <Link
                href="/transactions"
                className="text-xs font-semibold px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors"
              >
                ดูรายการทั้งหมด & ค้นหา
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
