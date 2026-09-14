'use client';

import { CheckCircle2, AlertCircle, TrendingDown, Coins, Receipt, Calculator, Percent } from 'lucide-react';
import type { TaxCalculationResult } from '@/lib/tax/tax-types';

interface TaxSummaryCardsProps {
  result: TaxCalculationResult;
  loading?: boolean;
}

export default function TaxSummaryCards({ result, loading = false }: TaxSummaryCardsProps) {
  const isRefund = result.isRefund;
  const netAmount = Math.abs(result.netTaxPayable);
  const isZeroTax = result.netTaxPayable === 0;

  const standardCards = [
    {
      title: 'รายได้รวมทั้งปี',
      subtitle: 'เงินได้พึงประเมิน 40(1)-40(8)',
      amount: result.totalIncome,
      icon: Coins,
      color: 'emerald',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      badge: 'เงินได้ทั้งหมด',
    },
    {
      title: 'ค่าใช้จ่ายหักได้',
      subtitle: 'หักตามอัตราที่กฎหมายกำหนด',
      amount: result.totalDeductibleExpenses,
      icon: TrendingDown,
      color: 'amber',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      badge: 'หักตาม ม.42 ทวิ-ม.46',
    },
    {
      title: 'ค่าลดหย่อนรวม',
      subtitle: 'ตนเอง ครอบครัว กองทุน ประกัน',
      amount: result.totalDeductions,
      icon: Receipt,
      color: 'sky',
      bg: 'bg-sky-50 dark:bg-sky-950/40',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-200/60 dark:border-sky-800/40',
      badge: 'สิทธิลดหย่อน ม.47',
    },
    {
      title: 'เงินได้สุทธิคำนวณภาษี',
      subtitle: 'เงินได้หลังหักค่าใช้จ่ายและลดหย่อน',
      amount: result.netTaxableIncome,
      icon: Calculator,
      color: 'indigo',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200/60 dark:border-indigo-800/40',
      badge: 'ฐานคำนวณขั้นบันได',
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Prominent Featured Card: Tax Payable or Refund */}
      <div
        className={`p-4 sm:p-6 rounded-3xl border transition-all shadow-md ${
          isRefund
            ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500/30 shadow-emerald-600/10'
            : isZeroTax
            ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white border-slate-700 shadow-slate-900/10'
            : 'bg-gradient-to-br from-rose-600 via-orange-600 to-rose-700 text-white border-rose-500/30 shadow-rose-600/10'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              {isRefund || isZeroTax ? (
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-white/80 font-bold">
                  ผลการประเมินภาษีสุทธิ
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-md shadow-xs ${
                    isRefund
                      ? 'bg-emerald-400/30 text-white border border-emerald-300/40'
                      : isZeroTax
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-rose-400/30 text-white border border-rose-300/40'
                  }`}
                >
                  {isRefund
                    ? '🎉 ได้รับเงินคืนภาษี'
                    : isZeroTax
                    ? '✅ ไม่ต้องเสียภาษีเพิ่ม'
                    : '⚠️ ภาษีที่ต้องชำระเพิ่ม'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  อัตราภาษีแท้จริง {result.effectiveTaxRate.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-4xl font-black tracking-tight">
                  {loading ? (
                    <span className="inline-block w-32 sm:w-48 h-8 sm:h-10 bg-white/20 animate-pulse rounded-xl" />
                  ) : (
                    `฿${netAmount.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right Breakdown Pill */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/15">
            <div className="px-3 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <span className="text-[10px] sm:text-xs text-white/80 block font-medium">ภาษีคำนวณได้</span>
              <span className="text-xs sm:text-sm font-bold">
                {loading ? '...' : `฿${result.finalTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="px-3 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <span className="text-[10px] sm:text-xs text-white/80 block font-medium">หัก ณ ที่จ่ายแล้ว</span>
              <span className="text-xs sm:text-sm font-bold">
                {loading ? '...' : `฿${result.withholdingTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 px-3 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
              <span className="text-[10px] sm:text-xs text-white/80 block font-medium">วิธีคำนวณที่ใช้</span>
              <span className="text-xs sm:text-sm font-bold">
                {result.taxMethodUsed === 'flat05' ? 'เหมา 0.5% (วิธีที่ 2)' : 'อัตราก้าวหน้า (วิธีที่ 1)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Standard Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {standardCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border ${card.border} shadow-xs flex flex-col justify-between transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="min-w-0 pr-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                    {card.title}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block truncate">
                    {card.subtitle}
                  </span>
                </div>
                <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.text} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1 mb-0.5 sm:mb-1">
                  <span className={`text-base sm:text-2xl font-extrabold tracking-tight ${card.text}`}>
                    {loading ? (
                      <span className="inline-block w-20 sm:w-28 h-6 sm:h-7 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                    ) : (
                      `฿${card.amount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    )}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {card.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
