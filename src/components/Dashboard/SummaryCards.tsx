'use client';

import { ArrowDownRight, ArrowUpRight, Repeat, Wallet, Building2 } from 'lucide-react';
import { DashboardSummary } from '@/types';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  overallSummary?: DashboardSummary | null;
  loading: boolean;
  kplusBalance?: number;
  makeBalance?: number;
  accountBalances?: Record<string, number>;
  totalCashInAccounts?: number;
}

export default function SummaryCards({
  summary,
  overallSummary,
  loading,
  kplusBalance,
  makeBalance,
  accountBalances,
  totalCashInAccounts,
}: SummaryCardsProps) {
  const cards = [
    {
      title: 'รายรับในช่วงเวลา',
      amount: summary?.totalIncome || 0,
      icon: ArrowDownRight,
      color: 'emerald',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      badge: 'เงินเข้า',
    },
    {
      title: 'รายจ่ายในช่วงเวลา',
      amount: summary?.totalExpense || 0,
      icon: ArrowUpRight,
      color: 'rose',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200/60 dark:border-rose-800/40',
      badge: 'เงินออก',
    },
    {
      title: 'กระแสเงินสดสุทธิ (Net Flow)',
      amount: summary?.netBalance || 0,
      icon: Wallet,
      color: 'sky',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-200/60 dark:border-sky-800/40',
      badge: 'รายรับ - รายจ่าย',
    },
    {
      title: 'โอนระหว่างบัญชี',
      amount: summary?.transferTotal || 0,
      icon: Repeat,
      color: 'amber',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      badge: 'ไม่นับเป็นรายจ่าย',
    },
  ];

  const resolvedAccountBalances =
    accountBalances ||
    overallSummary?.accountBalances ||
    summary?.accountBalances || {
      'K PLUS': kplusBalance ?? 43253.07,
      'Make by KBank': makeBalance ?? 903.29,
    };

  const resolvedTotalCash =
    totalCashInAccounts ??
    overallSummary?.totalCashInAccounts ??
    summary?.totalCashInAccounts ??
    Object.values(resolvedAccountBalances).reduce((sum, val) => sum + val, 0);

  const kplusBal = resolvedAccountBalances['K PLUS'] ?? 43253.07;
  const makeBal = resolvedAccountBalances['Make by KBank'] ?? 903.29;
  const paotangBal = resolvedAccountBalances['เป๋าตัง'] ?? 0;

  return (
    <div className="space-y-4">
      {/* Real Account Balances Header Bar */}
      <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 rounded-3xl text-white shadow-lg shadow-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-100 font-semibold block">
              ยอดเงินในบัญชีจริงทั้งหมด (Total Cash in Accounts)
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ฿{resolvedTotalCash.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Dynamic Breakdown by Bank / Account */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
            <span className="text-[10px] text-emerald-100 font-medium block">🔵 K PLUS (กสิกร)</span>
            <span className="text-sm font-bold">฿{kplusBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="px-3.5 py-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
            <span className="text-[10px] text-emerald-100 font-medium block">🟡 Make by KBank</span>
            <span className="text-sm font-bold">฿{makeBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          {paotangBal !== 0 && (
            <div className="px-3.5 py-2 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
              <span className="text-[10px] text-emerald-100 font-medium block">📲 เป๋าตัง</span>
              <span className="text-sm font-bold">฿{paotangBal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Period Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border ${card.border} shadow-xs flex flex-col justify-between transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.title}</span>
                <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.text} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-2xl font-extrabold tracking-tight ${card.text}`}>
                    {loading ? (
                      <span className="inline-block w-24 h-7 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                    ) : (
                      `฿${card.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{card.badge}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
