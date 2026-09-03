'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

interface TrendChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const income = payload.find((p: any) => p.dataKey === 'income')?.value || 0;
    const expense = payload.find((p: any) => p.dataKey === 'expense')?.value || 0;
    const net = income - expense;

    return (
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">
          {label}
        </p>
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
          <span>🟢 รายรับ:</span>
          <span>฿{income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
          <span>🔴 รายจ่าย:</span>
          <span>฿{expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>💰 คงเหลือ:</span>
          <span className={net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {net >= 0 ? '+' : ''}฿{net.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function TrendChart({ data, loading }: TrendChartProps) {
  const [chartType, setChartType] = useState<'BAR' | 'AREA'>('AREA');

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full min-h-[380px] flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800/40 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full min-h-[380px] flex flex-col items-center justify-center text-slate-400 text-xs">
        <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
        <span>ไม่มีข้อมูลธุรกรรมในช่วงเวลานี้</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-full flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>แนวโน้มรายรับ - รายจ่าย (Income vs Expense Trend)</span>
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            เปรียบเทียบกระแสเงินเข้า-ออกตามช่วงเวลาที่เลือก
          </p>
        </div>

        {/* Toggle Chart Type */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/50 self-start sm:self-auto">
          <button
            onClick={() => setChartType('BAR')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'BAR'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>กราฟแท่ง</span>
          </button>
          <button
            onClick={() => setChartType('AREA')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              chartType === 'AREA'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
            <span>กราฟเส้น</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas filling the entire card height */}
      <div className="flex-1 w-full min-h-[300px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'BAR' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888888' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#888888' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                formatter={(value) => (value === 'income' ? '🟢 รายรับ' : '🔴 รายจ่าย')}
              />
              <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888888' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#888888' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                formatter={(value) => (value === 'income' ? '🟢 รายรับ' : '🔴 รายจ่าย')}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeGrad)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseGrad)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
