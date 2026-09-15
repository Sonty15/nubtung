'use client';

import React from 'react';
import { RefreshCw, Sliders, CheckCircle, Info, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import type { IncomeBySection, TaxBreakdownTransaction } from '@/lib/tax/tax-types';

interface TaxIncomeFormProps {
  income: IncomeBySection;
  expenses: Record<keyof IncomeBySection, number>;
  onChange: (key: keyof IncomeBySection, value: number) => void;
  isManualOverride: boolean;
  onToggleOverride: () => void;
  onResetSynced: () => void;
  transactionsBySection?: Record<keyof IncomeBySection, TaxBreakdownTransaction[]>;
  exemptTransactions?: TaxBreakdownTransaction[];
  excludedTransactionIds?: Set<string>;
  onOpenBreakdown?: (sectionKey: keyof IncomeBySection | 'exempt', title: string) => void;
}

interface SectionMeta {
  key: keyof IncomeBySection;
  code: string;
  title: string;
  subtitle: string;
  rule: string;
  expenseRateText: string;
  iconBg: string;
  accentText: string;
}

const SECTION_METAS: SectionMeta[] = [
  {
    key: 'section40_1',
    code: '40(1)',
    title: 'เงินเดือน โบนัส ค่าจ้าง',
    subtitle: 'เงินได้จากการจ้างแรงงาน รายได้ประจำตามมาตรา 40(1)',
    rule: 'หักรวมกับ 40(2) ได้ 50% สูงสุดไม่เกิน 100,000 บาท',
    expenseRateText: '50% (รวม 40(2) สูงสุด 100k)',
    iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
    accentText: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'section40_2',
    code: '40(2)',
    title: 'ฟรีแลนซ์ ค่านายหน้า เบี้ยประชุม',
    subtitle: 'เงินได้จากหน้าที่หรือตำแหน่งงานที่ทำ หรือรับจ้างทำงาน',
    rule: 'หักรวมกับ 40(1) ได้ 50% สูงสุดไม่เกิน 100,000 บาท',
    expenseRateText: '50% (รวม 40(1) สูงสุด 100k)',
    iconBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60',
    accentText: 'text-teal-600 dark:text-teal-400',
  },
  {
    key: 'section40_3',
    code: '40(3)',
    title: 'ค่าสิทธิ ค่าลิขสิทธิ์ สิทธิบัตร',
    subtitle: 'ค่า GoodWill, สิทธิบัตร, ทรัพย์สินทางปัญญา หรือสิทธิอื่นๆ',
    rule: 'หักค่าใช้จ่ายได้ 50% สูงสุดไม่เกิน 100,000 บาท',
    expenseRateText: '50% (สูงสุด 100k)',
    iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
    accentText: 'text-purple-600 dark:text-purple-400',
  },
  {
    key: 'section40_4',
    code: '40(4)',
    title: 'ดอกเบี้ย เงินปันผล คริปโทฯ',
    subtitle: 'ดอกเบี้ยเงินฝาก/หุ้นกู้, เงินปันผลกองทุน/หุ้น, ผลกำไรสินทรัพย์ดิจิทัล',
    rule: 'กฎหมายไม่อนุญาตให้หักค่าใช้จ่าย (หักได้ 0%)',
    expenseRateText: 'หักไม่ได้ (0%)',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    accentText: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'section40_5',
    code: '40(5)',
    title: 'ค่าเช่าทรัพย์สิน บ้าน ที่ดิน รถยนต์',
    subtitle: 'เงินได้จากการให้เช่าทรัพย์สิน หรือการผิดสัญญาเช่าซื้อ',
    rule: 'หักเหมาค่าใช้จ่ายได้ 30% (หรือหักตามจริงพร้อมหลักฐาน)',
    expenseRateText: 'หักเหมา 30%',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
    accentText: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'section40_6',
    code: '40(6)',
    title: 'วิชาชีพอิสระ',
    subtitle: 'ประกอบโรคศิลปะ (แพทย์), กฎหมาย, วิศวกรรม, สถาปัตยกรรม, บัญชี, ประณีตศิลปกรรม',
    rule: 'หักเหมาค่าใช้จ่ายได้ 30% (หรือ 60% สำหรับประกอบโรคศิลปะ)',
    expenseRateText: 'หักเหมา 30% (แพทย์ 60%)',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'section40_7',
    code: '40(7)',
    title: 'ค่ารับเหมาทั้งค่าแรงและของ',
    subtitle: 'การรับเหมาที่ผู้รับเหมาต้องลงทุนจัดหาสัมภาระในส่วนสำคัญนอกจากเครื่องมือ',
    rule: 'หักเหมาค่าใช้จ่ายได้ 60% (หรือหักตามจริงพร้อมหลักฐาน)',
    expenseRateText: 'หักเหมา 60%',
    iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60',
    accentText: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    key: 'section40_8',
    code: '40(8)',
    title: 'ธุรกิจ การค้า พาณิชย์ หรืออื่นๆ',
    subtitle: 'เงินได้จากการพาณิชย์ การเกษตร การอุตสาหกรรม หรือเงินได้อื่นที่ไม่เข้าพวก',
    rule: 'หักเหมาค่าใช้จ่ายได้ 60% สำหรับ 43 ประเภทธุรกิจที่ระบุ หรือหักตามจริง',
    expenseRateText: 'หักเหมา 60%',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
    accentText: 'text-rose-600 dark:text-rose-400',
  },
];

export default function TaxIncomeForm({
  income,
  expenses,
  onChange,
  isManualOverride,
  onToggleOverride,
  onResetSynced,
  transactionsBySection,
  exemptTransactions = [],
  excludedTransactionIds,
  onOpenBreakdown,
}: TaxIncomeFormProps) {
  const totalIncomeCalculated = Object.values(income).reduce((acc, val) => acc + (val || 0), 0);
  const totalExemptAmount = exemptTransactions.reduce(
    (sum, tx) => sum + (Number(tx.amount) || 0),
    0
  );

  const handleInputChange = (key: keyof IncomeBySection, rawValue: string) => {
    // Clean non-numeric characters except decimal point
    const cleaned = rawValue.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    onChange(key, isNaN(num) ? 0 : Math.max(0, num));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
      {/* Header & Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              เงินได้พึงประเมิน 8 ประเภท (มาตรา 40)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              ปีภาษีปัจจุบัน
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ระบุยอดเงินได้พึงประเมินในแต่ละหมวด ระบบจะคำนวณหักค่าใช้จ่ายตามสัดส่วนที่กฎหมายกำหนดให้อัตโนมัติ
          </p>
        </div>

        {/* Sync / Override Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleOverride}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isManualOverride
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs hover:bg-amber-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="สลับระหว่างใช้ยอดอัตโนมัติจากรายการธุรกรรม หรือกำหนดเอง"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isManualOverride ? 'โหมดกำหนดเอง (Manual)' : 'โหมดซิงก์อัตโนมัติ'}</span>
          </button>

          {isManualOverride && (
            <button
              type="button"
              onClick={onResetSynced}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title="รีเซ็ตยอดกลับไปใช้ตัวเลขที่คำนวณได้จากรายการธุรกรรม"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเซ็ตตามธุรกรรม</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div
        className={`px-4 py-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          isManualOverride
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isManualOverride ? (
            <Sliders className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>
            {isManualOverride
              ? 'คุณเปิดใช้งานโหมดกำหนดเอง คุณสามารถแก้ไขตัวเลขในแต่ละประเภทได้อย่างอิสระ'
              : 'ข้อมูลรายได้เชื่อมโยงกับธุรกรรมรายรับในระบบโดยอัตโนมัติ หากต้องการปรับแต่งให้คลิกปุ่มโหมดกำหนดเอง'}
          </span>
        </div>

        <span className="font-bold shrink-0 hidden md:inline">
          รวมเงินได้ ฿{totalIncomeCalculated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Form List of 8 Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {SECTION_METAS.map((section) => {
          const currentAmount = income[section.key] || 0;
          const currentExpense = expenses[section.key] || 0;

          const activeList = transactionsBySection?.[section.key] || [];
          const userExcludedList = exemptTransactions.filter(
            (tx) => tx.section === section.key && tx.isUserExcluded && !tx.isExempt
          );
          const totalSectionTxCount = activeList.length + userExcludedList.length;
          const excludedCount = userExcludedList.length;

          return (
            <div
              key={section.key}
              className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors gap-3"
            >
              {/* Header of Section */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${section.iconBg}`}>
                      {section.code}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {section.title}
                    </h3>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    {section.expenseRateText}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {section.subtitle}
                </p>
              </div>

              {/* Transaction count badge & Breakdown modal trigger */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {totalSectionTxCount} รายการ
                  </span>
                  {excludedCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                      🚫 ยกเว้น {excludedCount} รายการ
                    </span>
                  )}
                </div>

                {onOpenBreakdown && (
                  <button
                    type="button"
                    onClick={() => onOpenBreakdown(section.key, section.title)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800/60 transition-all cursor-pointer shadow-2xs hover:shadow-xs shrink-0"
                    title={`ดูรายการธุรกรรมของ ${section.code}`}
                  >
                    <span>🔍 ดูรายการ ({totalSectionTxCount})</span>
                  </button>
                )}
              </div>

              {/* Input and Live Expense Badge */}
              <div className="space-y-2">
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-bold text-sm">
                    ฿
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currentAmount === 0 ? '' : currentAmount}
                    placeholder="0.00"
                    onChange={(e) => handleInputChange(section.key, e.target.value)}
                    className="block w-full pl-8 pr-3 py-2 text-sm sm:text-base font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </div>

                {/* Expense rule & Live Deduction Amount */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-0.5">
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate max-w-[60%]">
                    <Info className="w-3 h-3 shrink-0" />
                    <span className="truncate">{section.rule}</span>
                  </span>

                  <span
                    className={`font-semibold shrink-0 px-2 py-0.5 rounded-md ${
                      currentExpense > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    หักค่าใช้จ่าย ฿{currentExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🛡️ Non-Taxable / Exempt Income Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-linear-to-br from-slate-50 via-slate-50/80 to-rose-50/30 dark:from-slate-800/70 dark:via-slate-800/40 dark:to-rose-950/20 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>🛡️ รายรับที่ได้รับยกเว้นภาษี (Non-Taxable / Exempt Income)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
              {exemptTransactions.length} รายการ
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            ระบบคัดกรองเงินกู้บ้าน/ส่วนต่าง, เงินอุปการะจากพ่อแม่ตาม ม.42(26), และเงินแชร์ค่าใช้จ่ายออกให้อัตโนมัติ ไม่นำมารวมเป็นฐานภาษี
          </p>
        </div>

        <div className="flex sm:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800/60">
          <div className="text-left md:text-right">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              ยอดยกเว้นภาษีรวม
            </span>
            <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ฿{totalExemptAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {onOpenBreakdown && (
            <button
              type="button"
              onClick={() => onOpenBreakdown('exempt', 'รายรับที่ได้รับยกเว้นภาษี (Non-Taxable Income)')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs hover:shadow-md shrink-0"
              title="ดูรายการธุรกรรมที่ได้รับการยกเว้นภาษีทั้งหมด"
            >
              <span>🔍 ดูรายการยกเว้น ({exemptTransactions.length} รายการ)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
