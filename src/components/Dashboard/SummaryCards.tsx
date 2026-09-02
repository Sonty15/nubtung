import { ArrowDownRight, ArrowUpRight, Repeat, Wallet } from 'lucide-react';
import { DashboardSummary } from '@/types';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

export default function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      title: 'รายรับทั้งหมด',
      amount: summary?.totalIncome || 0,
      icon: ArrowDownRight,
      color: 'emerald',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
    },
    {
      title: 'รายจ่ายทั้งหมด',
      amount: summary?.totalExpense || 0,
      icon: ArrowUpRight,
      color: 'rose',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
    },
    {
      title: 'ยอดเงินคงเหลือสุทธิ',
      amount: summary?.netBalance || 0,
      icon: Wallet,
      color: 'sky',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-100',
    },
    {
      title: 'โอนระหว่างบัญชี (ไม่นับเป็นรายจ่าย)',
      amount: summary?.transferTotal || 0,
      icon: Repeat,
      color: 'amber',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-white border ${card.border} shadow-xs flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500">{card.title}</span>
              <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.text} flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-7 w-28 bg-gray-100 animate-pulse rounded-lg" />
              ) : (
                <span className={`text-2xl font-bold tracking-tight ${card.text}`}>
                  ฿{card.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
