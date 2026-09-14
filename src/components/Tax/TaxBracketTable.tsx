'use client';

import React from 'react';
import { Table, Lightbulb, Scale, CheckCircle2, ArrowRight } from 'lucide-react';
import type { TaxCalculationResult } from '@/lib/tax/tax-types';

interface TaxBracketTableProps {
  result: TaxCalculationResult;
}

const MAX_TAX_BY_TIER: Record<string, string> = {
  '0 - 150,000': 'ยกเว้นภาษี (฿0)',
  '150,001 - 300,000': '฿7,500',
  '300,001 - 500,000': '฿20,000',
  '500,001 - 750,000': '฿37,500',
  '750,001 - 1,000,000': '฿50,000',
  '1,000,001 - 2,000,000': '฿250,000',
  '2,000,001 - 5,000,000': '฿900,000',
  'มากกว่า 5,000,000': 'ไม่จำกัด',
};

export default function TaxBracketTable({ result }: TaxBracketTableProps) {
  const currentTier = result.taxBrackets.find((b) => b.isCurrentTier) || result.taxBrackets[0];
  const marginalRate = currentTier ? currentTier.rate : 0;
  const marginalRatePercent = (marginalRate * 100).toFixed(0);
  const savingsPer10k = 10000 * marginalRate;
  const savingsPer50k = 50000 * marginalRate;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Table className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ตารางอัตราภาษีเงินได้บุคคลธรรมดา 8 ขั้นบันได
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            คำนวณภาษีตามมาตรา 48(1) แห่งประมวลรัษฎากร โดยคิดแบบอัตราก้าวหน้าตามระดับเงินได้สุทธิ
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">ฐานภาษีปัจจุบัน:</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50">
            {marginalRatePercent}% (ขั้น {currentTier.tierName})
          </span>
        </div>
      </div>

      {/* Progressive Tax Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-3 sm:px-4">ช่วงเงินได้สุทธิ</th>
              <th className="py-3 px-3 sm:px-4 text-center">อัตราภาษี</th>
              <th className="py-3 px-3 sm:px-4 text-right hidden md:table-cell">ภาษีสูงสุดในขั้น</th>
              <th className="py-3 px-3 sm:px-4 text-right">เงินได้ในขั้นนี้</th>
              <th className="py-3 px-3 sm:px-4 text-right">ภาษีขั้นนี้</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {result.taxBrackets.map((bracket, index) => {
              const isCurrent = bracket.isCurrentTier;
              const hasTaxable = bracket.taxableInTier > 0;

              return (
                <tr
                  key={index}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 font-semibold text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/50 dark:ring-emerald-500/30'
                      : hasTaxable
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-50/30 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {/* Bracket Name + Highlight Tag */}
                  <td className="py-3 px-3 sm:px-4 flex items-center gap-2">
                    <span>{bracket.tierName}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        ขั้นปัจจุบัน
                      </span>
                    )}
                  </td>

                  {/* Tax Rate */}
                  <td className="py-3 px-3 sm:px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                        bracket.rate === 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {(bracket.rate * 100).toFixed(0)}%
                    </span>
                  </td>

                  {/* Max Tax in Tier */}
                  <td className="py-3 px-3 sm:px-4 text-right hidden md:table-cell text-slate-500 dark:text-slate-400">
                    {MAX_TAX_BY_TIER[bracket.tierName] || '-'}
                  </td>

                  {/* Taxable in Tier */}
                  <td className="py-3 px-3 sm:px-4 text-right font-medium">
                    ฿{bracket.taxableInTier.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Tax in Tier */}
                  <td className="py-3 px-3 sm:px-4 text-right font-bold">
                    ฿{bracket.taxInTier.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
            <tr>
              <td colSpan={3} className="py-3 px-3 sm:px-4 text-slate-800 dark:text-white hidden md:table-cell">
                รวมภาษีคำนวณแบบขั้นบันได (วิธีที่ 1)
              </td>
              <td colSpan={2} className="py-3 px-3 sm:px-4 text-slate-800 dark:text-white md:hidden">
                รวมภาษีขั้นบันได (วิธี 1)
              </td>
              <td className="py-3 px-3 sm:px-4 text-right text-slate-800 dark:text-white" colSpan={2}>
                ฿{result.progressiveTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Method Comparison Callout */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            การเปรียบเทียบวิธีคำนวณภาษี (วิธีที่ 1 vs วิธีที่ 2)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Method 1 */}
          <div
            className={`p-3.5 rounded-xl border ${
              result.taxMethodUsed === 'progressive'
                ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                วิธีที่ 1: อัตราภาษีก้าวหน้า
              </span>
              {result.taxMethodUsed === 'progressive' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                  วิธีที่ถูกเลือก
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              คำนวณจากเงินได้สุทธิ (เงินได้พึงประเมิน - ค่าใช้จ่าย - ค่าลดหย่อน)
            </p>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              ฿{result.progressiveTax.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Method 2 */}
          <div
            className={`p-3.5 rounded-xl border ${
              result.taxMethodUsed === 'flat05'
                ? 'bg-white dark:bg-slate-900 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                วิธีที่ 2: เหมาจ่ายร้อยละ 0.5
              </span>
              {result.taxMethodUsed === 'flat05' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                  วิธีที่ถูกเลือก
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              คำนวณจากเงินได้อื่นที่ไม่ใช่ 40(1) รวมกันตั้งแต่ 120,000 บ. ขึ้นไป (0.5%)
            </p>
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200">
              ฿{result.flatTax05.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Legal Rationale Note */}
        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <span className="font-bold text-slate-800 dark:text-slate-200">สรุปหลักเกณฑ์การประเมิน: </span>
          {result.taxMethodUsed === 'flat05' ? (
            <span>
              คุณมีเงินได้ประเภทอื่นนอกจากเงินเดือน 40(1) รวมกัน ฿{result.nonSalaryIncome.toLocaleString('th-TH')} ซึ่งเกิน 120,000 บาท และยอดภาษีเหมา 0.5% (฿{result.flatTax05.toLocaleString('th-TH')}) มีจำนวนสูงกว่าภาษีวิธีที่ 1 ตามประมวลรัษฎากร ม.48(2) กำหนดให้เสียตามจำนวนที่มากกว่า
            </span>
          ) : result.nonSalaryIncome < 120000 ? (
            <span>
              เงินได้อื่นนอกจากเงินเดือน 40(1) รวมกัน ฿{result.nonSalaryIncome.toLocaleString('th-TH')} ซึ่งไม่ถึงเกณฑ์ 120,000 บาท จึงได้รับการยกเว้นไม่ต้องคำนวณภาษีวิธีเหมา 0.5%
            </span>
          ) : !result.flatTax05Applicable ? (
            <span>
              เงินได้อื่นนอกจากเงินเดือนเกิน 120,000 บาท แต่ภาษีคำนวณร้อยละ 0.5 ไม่เกิน 5,000 บาท กฎหมายจึงยกเว้นไม่ต้องเสียตามวิธีเหมา ให้เสียตามวิธีอัตราก้าวหน้า
            </span>
          ) : (
            <span>
              ภาษีตามวิธีอัตราก้าวหน้า (฿{result.progressiveTax.toLocaleString('th-TH')}) สูงกว่าภาษีเหมา 0.5% (฿{result.flatTax05.toLocaleString('th-TH')}) กฎหมายกำหนดให้เสียตามจำนวนภาษีที่คำนวณได้สูงกว่า
            </span>
          )}
        </div>
      </div>

      {/* Tax Optimization Tip Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-emerald-500/20 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              คำแนะนำการวางแผนภาษี (Tax Optimization Tip)
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              วิเคราะห์จากฐานภาษีส่วนเพิ่ม (Marginal Tax Bracket) ปัจจุบันของคุณ
            </span>
          </div>
        </div>

        {marginalRate === 0 ? (
          <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3.5 rounded-xl border border-emerald-500/20">
            🎉 <strong>ปัจจุบันเงินได้สุทธิของคุณยังอยู่ในเกณฑ์ยกเว้นภาษี (0%)</strong> คุณยังไม่ต้องชำระภาษีเงินได้บุคคลธรรมดา จึงยังไม่มีความจำเป็นต้องซื้อกองทุนลดหย่อนภาษีเพิ่มเติมเพื่อประหยัดภาษีในปีนี้
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              ฐานภาษีส่วนเพิ่มของคุณอยู่ที่ <strong>{marginalRatePercent}%</strong> นั่นหมายความว่า ทุกๆ การลดหย่อนภาษีที่เพิ่มขึ้น 1 บาท คุณจะประหยัดภาษีได้ <strong>{marginalRate} บาท</strong> ทันที!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">ซื้อ ThaiESG / RMF เพิ่ม ฿10,000</span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  ประหยัด ฿{savingsPer10k.toLocaleString('th-TH')}
                </span>
              </div>

              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">ซื้อ ThaiESG / RMF เพิ่ม ฿50,000</span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  ประหยัด ฿{savingsPer50k.toLocaleString('th-TH')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
