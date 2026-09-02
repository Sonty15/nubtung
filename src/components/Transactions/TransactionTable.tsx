'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import { ExternalLink, Search, Filter } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export default function TransactionTable({ transactions, loading }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.account.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = selectedType === 'ALL' || tx.type === selectedType;
    const matchAccount = selectedAccount === 'ALL' || tx.account === selectedAccount;

    return matchSearch && matchType && matchAccount;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
      {/* Table controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหารายการ, ร้านค้า, หมวดหมู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="EXPENSE">🔴 รายจ่าย</option>
            <option value="INCOME">🟢 รายรับ</option>
            <option value="TRANSFER">🔄 โอนย้ายเงิน</option>
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">บัญชีทั้งหมด</option>
            <option value="K PLUS">K PLUS</option>
            <option value="Make by KBank">Make by KBank</option>
            <option value="เงินสด">เงินสด</option>
          </select>
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/75 text-gray-500 font-medium text-xs uppercase border-b border-gray-100">
            <tr>
              <th className="px-5 py-3">วัน-เวลา</th>
              <th className="px-5 py-3">ประเภท</th>
              <th className="px-5 py-3">หมวดหมู่</th>
              <th className="px-5 py-3">บัญชี</th>
              <th className="px-5 py-3">รายละเอียด</th>
              <th className="px-5 py-3 text-right">จำนวนเงิน</th>
              <th className="px-5 py-3 text-center">สลิป</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  กำลังโหลดข้อมูลจาก Google Sheets...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  ไม่พบรายการ
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                let typeText = 'รายจ่าย';
                let amountPrefix = '-';

                if (tx.type === 'INCOME') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  typeText = 'รายรับ';
                  amountPrefix = '+';
                } else if (tx.type === 'TRANSFER') {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                  typeText = 'โอนย้าย';
                  amountPrefix = '🔄 ';
                }

                return (
                  <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500">
                      <div>{tx.date}</div>
                      <div className="text-[11px] text-gray-400">{tx.time}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badgeColor}`}>
                        {typeText}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-600">
                        {tx.account}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-gray-800">
                      {tx.note || '-'}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                      tx.type === 'INCOME' ? 'text-emerald-600' : tx.type === 'TRANSFER' ? 'text-amber-600' : 'text-gray-900'
                    }`}>
                      {amountPrefix}฿{tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {tx.slipUrl ? (
                        <a
                          href={tx.slipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          <span>ดูสลิป</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
