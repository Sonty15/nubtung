'use client';

import { Home, Shield, TrendingDown, Percent, Receipt, Coins, ArrowUpRight } from 'lucide-react';
import type { MortgageSummary } from '@/lib/mortgage/types';

interface MortgageOverviewCardsProps {
  summary: MortgageSummary | null;
  selectedAccountId: string;
  loading?: boolean;
}

export default function MortgageOverviewCards({
  summary,
  selectedAccountId,
  loading = false,
}: MortgageOverviewCardsProps) {
  if (loading || !summary) {
    return (
      <div className="space-y-4">
        <div className="h-36 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isAll = selectedAccountId === 'ALL';
  const currentAccount = isAll
    ? null
    : summary.accounts.find((a) => a.id === selectedAccountId) || summary.accounts[0];

  const loanAmount = currentAccount ? currentAccount.loanAmount : summary.totalLoanAmount;
  const remainingBalance = currentAccount ? currentAccount.remainingBalance : summary.totalRemainingBalance;
  const principalPaid = currentAccount ? currentAccount.principalPaid : summary.totalPrincipalPaid;
  const interestPaid = currentAccount ? currentAccount.interestPaid : summary.totalInterestPaid;
  const feePaid = currentAccount ? currentAccount.feePaid : summary.totalFeePaid;
  const progressPercent = currentAccount ? currentAccount.progressPercent : summary.progressPercent;

  const totalPaidOverall = principalPaid + interestPaid + feePaid;

  const cards = [
    {
      title: 'ยอดหนี้คงเหลือ',
      subtitle: `จากวงเงินกู้ ฿${loanAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      amount: remainingBalance,
      icon: Home,
      color: 'rose',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200/60 dark:border-rose-800/40',
      badge: 'คงค้างชำระ',
    },
    {
      title: 'เงินต้นที่ชำระแล้ว',
      subtitle: `ตัดเงินต้นไปแล้ว ${progressPercent.toFixed(1)}%`,
      amount: principalPaid,
      icon: TrendingDown,
      color: 'emerald',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      badge: `${progressPercent.toFixed(1)}% สำเร็จ`,
    },
    {
      title: 'ดอกเบี้ยสะสมที่จ่ายไป',
      subtitle: 'ดอกเบี้ยจ่ายทั้งหมดสะสม',
      amount: interestPaid,
      icon: Coins,
      color: 'amber',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      badge: 'ดอกเบี้ยจ่าย',
    },
    {
      title: 'ค่าธรรมเนียม / ประกันสะสม',
      subtitle: 'ค่าเบี้ยประกันและธรรมเนียม',
      amount: feePaid,
      icon: Receipt,
      color: 'sky',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-200/60 dark:border-sky-800/40',
      badge: 'ค่าใช้จ่ายแฝง',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Featured Hero Card with Progress */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 text-white shadow-xl shadow-emerald-900/10 border border-emerald-600/30 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20">
                {isAll ? '🌟 ภาพรวมสัญญาเงินกู้ทั้งหมด' : currentAccount?.name}
              </span>
              <span className="text-xs text-emerald-200 font-medium">
                {isAll ? '2 บัญชีคู่สัญญา' : `เลขที่ ${currentAccount?.accountNumber}`}
              </span>
            </div>
            <div>
              <p className="text-xs text-emerald-100/90 font-medium uppercase tracking-wider">
                ยอดหนี้คงเหลือรวมสุทธิ
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  ฿{remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs sm:text-sm text-emerald-200">
                  / ฿{loanAmount.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Box */}
          <div className="min-w-[240px] max-w-sm w-full bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-emerald-100">ความคืบหน้าการปลดหนี้</span>
              <span className="text-white font-bold">{progressPercent.toFixed(2)}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-emerald-200 pt-0.5">
              <span>เงินต้นชำระแล้ว ฿{principalPaid.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</span>
              <span>รวมจ่ายแล้ว ฿{totalPaidOverall.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Account breakdown badges when in ALL view */}
        {isAll && summary.accounts.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {summary.accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors px-3.5 py-2 rounded-xl border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-medium text-emerald-100 truncate max-w-[170px] sm:max-w-[210px]">
                    {acc.name}
                  </span>
                </div>
                <div className="text-right font-semibold">
                  <span>฿{acc.remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-emerald-300 ml-1.5">({acc.progressPercent.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4 Detail KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 sm:p-5 rounded-3xl border bg-white dark:bg-slate-900 ${card.border} shadow-xs transition-all hover:shadow-md relative overflow-hidden`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className={`w-10 h-10 rounded-2xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.bg} ${card.text}`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                  ฿{card.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
