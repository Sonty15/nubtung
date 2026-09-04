'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import { ExternalLink, Search, Filter, Trash2 } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh?: () => void;
}

export default function TransactionTable({ transactions, loading, onRefresh }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      (tx.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.account || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = selectedType === 'ALL' || tx.type === selectedType;
    const matchAccount = selectedAccount === 'ALL' || tx.account === selectedAccount;

    return matchSearch && matchType && matchAccount;
  });

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`คุณต้องการลบรายการ "${tx.note || tx.category}" จำนวน ฿${tx.amount.toLocaleString()} ใช่หรือไม่?`)) {
      return;
    }

    setDeletingId(tx.id);
    try {
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(tx.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`ลบรายการไม่สำเร็จ: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden transition-colors">
      {/* Table controls */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหารายการ, ร้านค้า, หมวดหมู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="EXPENSE">🔴 รายจ่าย</option>
            <option value="INCOME">🟢 รายรับ</option>
            <option value="TRANSFER">🔄 โอนย้ายเงิน</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">บัญชีทั้งหมด</option>
            <option value="K PLUS">K PLUS</option>
            <option value="Make by KBank">Make by KBank</option>
            <option value="เป๋าตัง">เป๋าตัง</option>
            <option value="เงินสด">เงินสด</option>
          </select>
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-5 py-3.5">วัน-เวลา</th>
              <th className="px-5 py-3.5">ประเภท</th>
              <th className="px-5 py-3.5">หมวดหมู่</th>
              <th className="px-5 py-3.5">บัญชี</th>
              <th className="px-5 py-3.5">รายละเอียด</th>
              <th className="px-5 py-3.5 text-right">จำนวนเงิน</th>
              <th className="px-5 py-3.5 text-center">สลิป</th>
              <th className="px-3 py-3.5 text-center w-12">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  กำลังโหลดข้อมูลจาก Google Sheets...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  ไม่พบรายการที่ตรงกับเงื่อนไข
                </td>
              </tr>
            ) : (
              filtered.map((tx, idx) => {
                let badgeColor = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900';
                let typeText = 'รายจ่าย';
                if (tx.type === 'INCOME') {
                  badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
                  typeText = 'รายรับ';
                } else if (tx.type === 'TRANSFER') {
                  badgeColor = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900';
                  typeText = 'โอนย้ายเงิน';
                }

                const isDeleting = deletingId === tx.id;

                return (
                  <tr key={`${tx.id || 'row'}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                      <div>{tx.date}</div>
                      {tx.time && <div className="text-[11px] text-slate-400">{tx.time}</div>}
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${badgeColor}`}>
                        {typeText}
                      </span>
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {tx.category}
                    </td>

                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                        {tx.account}
                      </span>
                    </td>

                    <td className="px-5 py-3 max-w-xs truncate text-slate-800 dark:text-slate-200 text-xs" title={tx.note}>
                      {tx.note || '-'}
                    </td>

                    <td className="px-5 py-3 text-right whitespace-nowrap font-bold text-xs sm:text-sm">
                      <span
                        className={
                          tx.type === 'INCOME'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'TRANSFER'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '🔄 ' : '-'}฿
                        {tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      {(() => {
                        const slipLink =
                          tx.slipUrl && tx.slipUrl.startsWith('http')
                            ? tx.slipUrl
                            : tx.driveFileId && tx.driveFileId.length > 10
                            ? `https://drive.google.com/file/d/${tx.driveFileId}/view`
                            : null;

                        return slipLink ? (
                          <a
                            href={slipLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline font-medium cursor-pointer"
                          >
                            <span>สลิป</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                        );
                      })()}
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(tx)}
                        disabled={isDeleting}
                        title="ลบรายการนี้"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all disabled:opacity-30"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>แสดง {filtered.length} รายการ</span>
        <span>เชื่อมต่อ Google Sheets สด</span>
      </div>
    </div>
  );
}
