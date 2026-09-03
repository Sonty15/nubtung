'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

interface CategoryPieChartProps {
  categoryBreakdown: Record<string, number>;
  totalExpense: number;
  loading?: boolean;
}

const COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#64748b', // slate
];

export default function CategoryPieChart({
  categoryBreakdown,
  totalExpense,
  loading,
}: CategoryPieChartProps) {
  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full min-h-[380px] flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800/40 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const entries = Object.entries(categoryBreakdown || {}).sort(([, a], [, b]) => b - a);
  const data = entries.map(([name, value]) => ({ name, value }));

  if (data.length === 0 || totalExpense <= 0) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full min-h-[380px] flex flex-col items-center justify-center text-slate-400 text-xs">
        <PieIcon className="w-8 h-8 mb-2 opacity-30" />
        <span>ไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลานี้</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PieIcon className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            สัดส่วนค่าใช้จ่ายตามหมวดหมู่
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
          ยอดรวม ฿{totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
        </p>

        {/* Donut Chart */}
        <div className="h-44 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [
                  `฿${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
                  'ยอดใช้จ่าย',
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-slate-400 font-medium">ค่าใช้จ่าย</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {data.length} หมวดหมู่
            </span>
          </div>
        </div>

        {/* Top Category Legend List */}
        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {entries.map(([category, amount], idx) => {
            const pct = Math.round((amount / totalExpense) * 100);
            const color = COLORS[idx % COLORS.length];
            return (
              <div key={category} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                    {category}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                  <span>฿{amount.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
