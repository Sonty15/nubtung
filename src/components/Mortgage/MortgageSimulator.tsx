'use client';

import { useState, useMemo } from 'react';
import { Calculator, Sparkles, Clock, Coins, ArrowRight, Zap, TrendingDown } from 'lucide-react';
import { compareExtraPayment } from '@/lib/mortgage/simulator';
import { DEFAULT_INTEREST_CONFIG } from '@/lib/mortgage/types';
import type { InterestConfig } from '@/lib/mortgage/types';

interface MortgageSimulatorProps {
  currentBalance?: number;
  interestConfig?: InterestConfig;
  accountName?: string;
  defaultBasePayment?: number;
}

const PRESET_AMOUNTS = [1000, 2000, 3000, 5000, 10000];

export default function MortgageSimulator({
  currentBalance = 2100000,
  interestConfig = DEFAULT_INTEREST_CONFIG,
  accountName = 'สินเชื่อบ้านหลัก',
  defaultBasePayment = 8500,
}: MortgageSimulatorProps) {
  const principal = Math.max(10000, currentBalance || 2100000);
  const [basePayment, setBasePayment] = useState<number>(defaultBasePayment || 8500);
  const [extraPayment, setExtraPayment] = useState<number>(3000);

  // Run simulation reactively using client-side engine
  const comparison = useMemo(() => {
    return compareExtraPayment({
      principal,
      baseMonthlyPayment: Math.max(500, basePayment),
      extraMonthlyPayment: Math.max(0, extraPayment),
      interestConfig,
    });
  }, [principal, basePayment, extraPayment, interestConfig]);

  const { standard, withExtra, monthsSaved, yearsSaved, interestSaved } = comparison;

  const stdYears = Math.floor(standard.totalMonths / 12);
  const stdMonths = standard.totalMonths % 12;

  const extraYears = Math.floor(withExtra.totalMonths / 12);
  const extraMonths = withExtra.totalMonths % 12;

  const savedYearsPart = Math.floor(monthsSaved / 12);
  const savedMonthsPart = monthsSaved % 12;

  const timeReductionPct =
    standard.totalMonths > 0 ? ((monthsSaved / standard.totalMonths) * 100).toFixed(0) : '0';
  const interestReductionPct =
    standard.totalInterest > 0
      ? ((interestSaved / standard.totalInterest) * 100).toFixed(0)
      : '0';

  return (
    <div className="p-5 sm:p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-6">
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              เครื่องจำลองการโปะบ้าน (Extra Payment Simulator)
            </h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            คำนวณผลลัพธ์แบบเรียลไทม์เมื่อจ่ายค่างวดเพิ่มขึ้นในแต่ละเดือนสำหรับ {accountName}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 text-xs font-semibold self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>คำนวณจากยอดหนี้ ฿{principal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Base Monthly Payment */}
        <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
            <span>ค่างวดปกติขั้นต่ำต่อเดือน</span>
            <span className="text-slate-500">฿{basePayment.toLocaleString()}</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
              ฿
            </span>
            <input
              type="number"
              min={1000}
              step={500}
              value={basePayment}
              onChange={(e) => setBasePayment(Number(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            ยอดผ่อนชำระตามสัญญาปกติของธนาคาร
          </p>
        </div>

        {/* Extra Payment Slider & Input */}
        <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-800/50">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ยอดที่ต้องการโปะเพิ่มต่อเดือน (Extra Payment)</span>
            </label>
            <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              +฿{extraPayment.toLocaleString()}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={30000}
            step={500}
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200/50 dark:bg-emerald-900/50 rounded-lg"
          />

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-medium mr-1">ปุ่มลัด:</span>
            {PRESET_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setExtraPayment(amt)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  extraPayment === amt
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 border border-emerald-200/50 dark:border-emerald-800/60'
                }`}
              >
                +{amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setExtraPayment(0)}
              className="px-2 py-0.5 rounded-lg text-[11px] text-slate-400 hover:text-rose-500 font-medium"
            >
              รีเซ็ต
            </button>
          </div>
        </div>
      </div>

      {/* Results Highlight Summary Cards */}
      {extraPayment > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Time Saved Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/10 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                ระยะเวลาที่ประหยัดได้
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                เร็วขึ้น {timeReductionPct}%
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {savedYearsPart > 0 ? `${savedYearsPart} ปี ` : ''}
              {savedMonthsPart > 0 ? `${savedMonthsPart} เดือน` : savedYearsPart === 0 ? '0 เดือน' : ''}
            </p>
            <p className="text-xs text-emerald-100/90 pt-1">
              จากเดิม {stdYears} ปี {stdMonths} เดือน ➔ เหลือเพียง {extraYears} ปี {extraMonths} เดือน
            </p>
          </div>

          {/* Interest Saved Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-600/10 space-y-1.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                ดอกเบี้ยที่ประหยัดได้
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                ลดลง {interestReductionPct}%
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ฿{interestSaved.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-amber-100/90 pt-1">
              เงินในกระเป๋าที่ประหยัดได้ตลอดอายุสัญญา
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 text-center">
          💡 เลื่อนแถบด้านบนหรือกดปุ่มลัดเพื่อดูผลลัพธ์การประหยัดดอกเบี้ยและเวลาเมื่อโปะเงินเพิ่ม
        </div>
      )}

      {/* Visual Amortization Comparison Timeline */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          เปรียบเทียบผลรวมตลอดอายุสัญญา
        </h4>

        {/* Standard Row */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                ผ่อนแบบปกติ (฿{basePayment.toLocaleString()}/เดือน)
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              ใช้เวลา <span className="font-bold text-slate-900 dark:text-white">{stdYears} ปี {stdMonths} เดือน</span> ({standard.totalMonths} งวด)
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>เงินต้น: ฿{standard.totalPrincipal.toLocaleString()}</span>
            <span>ดอกเบี้ยรวม: <span className="text-amber-600 dark:text-amber-400 font-semibold">฿{standard.totalInterest.toLocaleString()}</span></span>
            <span>รวมทั้งหมด: ฿{standard.totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {/* With Extra Row */}
        <div className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
          extraPayment > 0
            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>โปะเพิ่มเป็น (฿{(basePayment + extraPayment).toLocaleString()}/เดือน)</span>
                {extraPayment > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                    +฿{extraPayment.toLocaleString()}
                  </span>
                )}
              </span>
            </div>
            <div className="text-slate-700 dark:text-slate-300 font-semibold">
              ใช้เวลา <span className="font-bold text-emerald-600 dark:text-emerald-400">{extraYears} ปี {extraMonths} เดือน</span> ({withExtra.totalMonths} งวด)
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>เงินต้น: ฿{withExtra.totalPrincipal.toLocaleString()}</span>
            <span>ดอกเบี้ยรวม: <span className="text-emerald-600 dark:text-emerald-400 font-bold">฿{withExtra.totalInterest.toLocaleString()}</span></span>
            <span>รวมทั้งหมด: ฿{withExtra.totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
