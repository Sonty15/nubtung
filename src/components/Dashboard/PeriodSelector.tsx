'use client';

import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

export type PeriodMode = 'ALL' | 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';

interface PeriodSelectorProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_FULL_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export default function PeriodSelector({
  mode,
  onModeChange,
  selectedDate,
  onDateChange,
}: PeriodSelectorProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const currentDate = selectedDate.getDate();

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (mode === 'YEAR') {
      next.setFullYear(currentYear - 1);
    } else if (mode === 'MONTH') {
      next.setMonth(currentMonth - 1);
    } else if (mode === 'WEEK') {
      next.setDate(currentDate - 7);
    } else if (mode === 'DAY') {
      next.setDate(currentDate - 1);
    }
    onDateChange(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (mode === 'YEAR') {
      next.setFullYear(currentYear + 1);
    } else if (mode === 'MONTH') {
      next.setMonth(currentMonth + 1);
    } else if (mode === 'WEEK') {
      next.setDate(currentDate + 7);
    } else if (mode === 'DAY') {
      next.setDate(currentDate + 1);
    }
    onDateChange(next);
  };

  const handleResetToToday = () => {
    onDateChange(new Date());
  };

  // Format label based on active mode
  const getPeriodLabel = () => {
    const buddhistYear = currentYear + 543;
    if (mode === 'ALL') {
      return 'ข้อมูลทั้งหมด (All Time)';
    }
    if (mode === 'YEAR') {
      return `ปี พ.ศ. ${buddhistYear} (ค.ศ. ${currentYear})`;
    }
    if (mode === 'MONTH') {
      return `${THAI_FULL_MONTHS[currentMonth]} ${buddhistYear}`;
    }
    if (mode === 'WEEK') {
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay() || 7;
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = THAI_MONTHS[startOfWeek.getMonth()];
      const endMonth = THAI_MONTHS[endOfWeek.getMonth()];

      return `${startOfWeek.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${buddhistYear}`;
    }
    if (mode === 'DAY') {
      return `${currentDate} ${THAI_FULL_MONTHS[currentMonth]} ${buddhistYear}`;
    }
    return '';
  };

  const modeButtons: { id: PeriodMode; label: string }[] = [
    { id: 'ALL', label: 'ทั้งหมด' },
    { id: 'YEAR', label: 'รายปี' },
    { id: 'MONTH', label: 'รายเดือน' },
    { id: 'WEEK', label: 'รายสัปดาห์' },
    { id: 'DAY', label: 'รายวัน' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
        {modeButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => onModeChange(btn.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === btn.id
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Date Navigator (only when not ALL) */}
      {mode !== 'ALL' ? (
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={handlePrev}
            title="ย้อนกลับ"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 min-w-[160px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>{getPeriodLabel()}</span>
          </div>

          <button
            onClick={handleNext}
            title="ถัดไป"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetToToday}
            title="กลับมาปัจจุบัน"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">ปัจจุบัน</span>
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-400 dark:text-slate-500 px-3 py-1 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          <span>แสดงรายการทั้งหมดตั้งแต่เริ่มบันทึก</span>
        </div>
      )}
    </div>
  );
}
