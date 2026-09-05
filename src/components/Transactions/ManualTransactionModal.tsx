'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { TransactionType } from '@/types';

interface ManualTransactionModalProps {
  onSuccess: () => void;
  isMobileFab?: boolean;
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

export default function ManualTransactionModal({ onSuccess, isMobileFab = false }: ManualTransactionModalProps) {
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
      {isMobileFab ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
          title="บันทึกรายการเอง"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกรายการเอง</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">บันทึกรายการใหม่</h2>

            {error && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      type === t
                        ? t === 'EXPENSE'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : t === 'INCOME'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'EXPENSE' ? '🔴 รายจ่าย' : t === 'INCOME' ? '🟢 รายรับ' : '🔄 โอนย้าย'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xl font-bold px-3.5 py-3 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="dark:bg-slate-900 dark:text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    บัญชี
                  </label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="K PLUS" className="dark:bg-slate-900 dark:text-white">🔵 K PLUS</option>
                    <option value="Make by KBank" className="dark:bg-slate-900 dark:text-white">🟡 Make by KBank</option>
                    <option value="เป๋าตัง" className="dark:bg-slate-900 dark:text-white">📲 เป๋าตัง (Paotang)</option>
                    <option value="เงินสด" className="dark:bg-slate-900 dark:text-white">💵 เงินสด</option>
                    <option value="อื่นๆ" className="dark:bg-slate-900 dark:text-white">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  วันที่
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียด / หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ข้าวกลางวัน, ค่ากาแฟ"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-2xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
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
