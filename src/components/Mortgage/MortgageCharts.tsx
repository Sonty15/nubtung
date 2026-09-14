'use client';

import { useState, useMemo } from 'react';
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
import { BarChart3, TrendingDown, Layers } from 'lucide-react';
import type { MortgagePayment } from '@/lib/mortgage/types';

interface MortgageChartsProps {
  payments: MortgagePayment[];
  loading?: boolean;
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatShortThaiDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10) + 543;
    const month = parseInt(parts[1], 10) - 1;
    const shortYear = String(year).slice(-2);
    return `${THAI_MONTHS[month] || parts[1]} ${shortYear}`;
  } catch {
    return dateStr;
  }
}

interface MonthlyAggregatedData {
  key: string;
  label: string;
  fullDate: string;
  principal: number;
  interest: number;
  fee: number;
  totalPaid: number;
  remainingBalance: number;
}
interface MortgageTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyAggregatedData }>;
}

const MortgageCustomTooltip = ({ active, payload }: MortgageTooltipProps) => {
  if (active && payload && payload.length) {
    const data: MonthlyAggregatedData = payload[0]?.payload;
    if (!data) return null;

    const principalPct = data.totalPaid > 0 ? (data.principal / data.totalPaid) * 100 : 0;
    const interestPct = data.totalPaid > 0 ? (data.interest / data.totalPaid) * 100 : 0;

    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
          <span className="font-bold text-slate-800 dark:text-slate-100">{data.label}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{data.fullDate}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
            <span>🟢 ตัดเงินต้น ({principalPct.toFixed(0)}%):</span>
            <span className="font-bold">฿{data.principal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
            <span>🟡 ดอกเบี้ย ({interestPct.toFixed(0)}%):</span>
            <span className="font-bold">฿{data.interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          {data.fee > 0 && (
            <div className="flex justify-between text-sky-600 dark:text-sky-400 font-medium">
              <span>🔵 ค่าธรรมเนียม/ประกัน:</span>
              <span className="font-bold">฿{data.fee.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between text-slate-800 dark:text-slate-200 font-bold">
          <span>ยอดชำระรวม:</span>
          <span>฿{data.totalPaid.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>

        {data.remainingBalance > 0 && (
          <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span>ยอดหนี้คงเหลือ:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ฿{data.remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function MortgageCharts({ payments, loading = false }: MortgageChartsProps) {
  const [chartType, setChartType] = useState<'STACKED_BAR' | 'BALANCE_CURVE'>('STACKED_BAR');

  // Process and sort payments chronologically
  const chartData = useMemo(() => {
    if (!payments || payments.length === 0) return [];

    const sorted = [...payments].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

    // Group by Month or Payment Date
    // If multiple entries occur in same month across accounts, we group them by YYYY-MM
    const map = new Map<string, MonthlyAggregatedData>();

    for (const p of sorted) {
      const monthKey = p.paymentDate.slice(0, 7); // YYYY-MM
      const existing = map.get(monthKey);

      if (existing) {
        existing.principal += Number(p.principal) || 0;
        existing.interest += Number(p.interest) || 0;
        existing.fee += Number(p.fee) || 0;
        existing.totalPaid += Number(p.totalPaid) || 0;
        // Remaining balance: take the latest
        existing.remainingBalance = Number(p.remainingBalance) || existing.remainingBalance;
        existing.fullDate = p.paymentDate;
      } else {
        map.set(monthKey, {
          key: monthKey,
          label: formatShortThaiDate(p.paymentDate),
          fullDate: p.paymentDate,
          principal: Number(p.principal) || 0,
          interest: Number(p.interest) || 0,
          fee: Number(p.fee) || 0,
          totalPaid: Number(p.totalPaid) || 0,
          remainingBalance: Number(p.remainingBalance) || 0,
        });
      }
    }

    return Array.from(map.values()).map((item) => ({
      ...item,
      principal: Math.round(item.principal * 100) / 100,
      interest: Math.round(item.interest * 100) / 100,
      fee: Math.round(item.fee * 100) / 100,
      totalPaid: Math.round(item.totalPaid * 100) / 100,
      remainingBalance: Math.round(item.remainingBalance * 100) / 100,
    }));
  }, [payments]);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-[420px] flex items-center justify-center">
        <div className="w-full h-full bg-slate-100 dark:bg-slate-800/40 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs h-[380px] flex flex-col items-center justify-center text-slate-400 text-xs">
        <Layers className="w-10 h-10 mb-3 opacity-30 text-emerald-500" />
        <span className="font-semibold text-slate-600 dark:text-slate-400">ยังไม่มีข้อมูลการผ่อนชำระ</span>
        <span className="text-slate-400 dark:text-slate-500 mt-1">กด &ldquo;Sync จากอีเมล ธอส.&rdquo; หรือบันทึกรายการด้วยตนเองเพื่อเริ่มต้น</span>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
      {/* Header with Title & Chart Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {chartType === 'STACKED_BAR' ? (
              <BarChart3 className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-teal-500" />
            )}
            <span>
              {chartType === 'STACKED_BAR'
                ? 'สัดส่วนการชำระรายเดือน (Principal vs Interest vs Fee)'
                : 'แนวโน้มการลดยอดหนี้คงเหลือ (Balance Reduction Curve)'}
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {chartType === 'STACKED_BAR'
              ? 'แยกสัดส่วน เงินต้น (เขียว) ดอกเบี้ย (ส้ม) และประกัน/ค่าธรรมเนียม (ฟ้า)'
              : 'แสดงความชันการลดลงของภาระหนี้ทั้งหมดตามกาลเวลา'}
          </p>
        </div>

        {/* Toggle Chart Type */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('STACKED_BAR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              chartType === 'STACKED_BAR'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>สัดส่วนงวด</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('BALANCE_CURVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              chartType === 'BALANCE_CURVE'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-teal-500" />
            <span>ยอดหนี้ลดลง</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[320px] sm:h-[360px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'STACKED_BAR' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              <Tooltip content={<MortgageCustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                formatter={(value) => {
                  if (value === 'principal') return '🟢 เงินต้น';
                  if (value === 'interest') return '🟡 ดอกเบี้ย';
                  if (value === 'fee') return '🔵 ประกัน/ธรรมเนียม';
                  return value;
                }}
              />
              <Bar dataKey="principal" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={42} />
              <Bar dataKey="interest" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={42} />
              <Bar dataKey="fee" stackId="a" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={42} />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="mortgageBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
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
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`)}
              />
              <Tooltip content={<MortgageCustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                formatter={() => '📉 ยอดหนี้คงเหลือ'}
              />
              <Area
                type="monotone"
                dataKey="remainingBalance"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#mortgageBalanceGrad)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
