'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TransactionType } from '@/types';

interface ManualTransactionModalProps {
  onSuccess: () => void;
}

const CATEGORIES = [
  'อาหารและเครื่องดื่ม',
  'ของใช้ในบ้าน/ซูเปอร์',
  'การเดินทาง/ค่าน้ำมัน',
  'ช้อปปิ้ง',
  'สาธารณูปโภค (น้ำ/ไฟ/เน็ต)',
  'บันเทิง/สตรีมมิ่ง',
  'สุขภาพ/ยา',
  'โอนระหว่างบัญชี',
  'เงินเดือน/รายรับ',
  'อื่นๆ',
];

export default function ManualTransactionModal({ onSuccess }: ManualTransactionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [account, setAccount] = useState('K PLUS');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          category,
          account,
          note,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record transaction');
      }

      setIsOpen(false);
      setAmount('');
      setNote('');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white shadow-xs transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>บันทึกรายการเอง</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-4">บันทึกรายการใหม่</h2>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
                {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      type === t
                        ? t === 'EXPENSE'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : t === 'INCOME'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-amber-500 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t === 'EXPENSE' ? '🔴 รายจ่าย' : t === 'INCOME' ? '🟢 รายรับ' : '🔄 โอนย้าย'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-lg font-bold px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">บัญชี</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="K PLUS">K PLUS</option>
                    <option value="Make by KBank">Make by KBank</option>
                    <option value="เงินสด">เงินสด</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">วันที่</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">รายละเอียด / หมายเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น ข้าวกลางวัน, ค่ากาแฟ"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึกลง Google Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
