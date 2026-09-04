'use client';

import { useState } from 'react';
import { Transaction, TransactionType } from '@/types';
import { ExternalLink, Search, Filter, Trash2, Edit3, MessageSquarePlus, X, Check, Save } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh?: () => void;
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

export default function TransactionTable({ transactions, loading, onRefresh }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick Note Edit Modal (for Auto-sync transactions)
  const [editingNoteTx, setEditingNoteTx] = useState<Transaction | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Full Edit Modal (for Manual transactions)
  const [editingManualTx, setEditingManualTx] = useState<Transaction | null>(null);
  const [manualType, setManualType] = useState<TransactionType>('EXPENSE');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0]);
  const [manualAccount, setManualAccount] = useState('K PLUS');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [isSavingManual, setIsSavingManual] = useState(false);

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
    if (!confirm(`คุณต้องการลบรายการที่บันทึกเอง "${tx.note || tx.category}" จำนวน ฿${tx.amount.toLocaleString()} ใช่หรือไม่?`)) {
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

  const handleOpenEdit = (tx: Transaction) => {
    if (tx.source === 'MANUAL') {
      setEditingManualTx(tx);
      setManualType(tx.type);
      setManualAmount(tx.amount.toString());
      setManualCategory(tx.category || CATEGORIES[0]);
      setManualAccount(tx.account || 'K PLUS');
      setManualDate(tx.date);
      setManualTime(tx.time || '');
      setManualNote(tx.note || '');
    } else {
      setEditingNoteTx(tx);
      setEditNoteText(tx.note || '');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoteTx) return;

    setIsSavingNote(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNoteTx.id,
          note: editNoteText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update note');
      }

      editingNoteTx.note = editNoteText;
      setEditingNoteTx(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`บันทึกรายละเอียดไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManualTx) return;

    setIsSavingManual(true);
    try {
      const parsedAmount = parseFloat(manualAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      }

      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingManualTx.id,
          type: manualType,
          amount: parsedAmount,
          category: manualCategory,
          account: manualAccount,
          date: manualDate,
          time: manualTime,
          note: manualNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      // Update in-memory
      editingManualTx.type = manualType;
      editingManualTx.amount = parsedAmount;
      editingManualTx.category = manualCategory;
      editingManualTx.account = manualAccount;
      editingManualTx.date = manualDate;
      editingManualTx.time = manualTime;
      editingManualTx.note = manualNote;

      setEditingManualTx(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`แก้ไขรายการไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSavingManual(false);
    }
  };

  return (
    <>
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
                <th className="px-5 py-3.5">รายละเอียด / หมายเหตุ</th>
                <th className="px-5 py-3.5 text-right">จำนวนเงิน</th>
                <th className="px-5 py-3.5 text-center">สลิป</th>
                <th className="px-3 py-3.5 text-center w-20">จัดการ</th>
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

                  const isManual = tx.source === 'MANUAL';
                  const isDeleting = deletingId === tx.id;

                  return (
                    <tr key={`${tx.id || 'row'}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
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

                      <td className="px-5 py-3 max-w-xs text-slate-800 dark:text-slate-200 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate" title={tx.note || 'ไม่มีรายละเอียด'}>
                            {tx.note || <span className="text-slate-400 italic">ไม่มีรายละเอียด</span>}
                          </span>
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            title={isManual ? 'แก้ไขรายการทั้งหมด' : 'เพิ่ม / แก้ไขรายละเอียดเพิ่มเติม'}
                            className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors shrink-0 opacity-40 group-hover:opacity-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            title={isManual ? 'แก้ไขรายการนี้' : 'เพิ่มรายละเอียดเพิ่มเติม'}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {isManual ? (
                            <button
                              onClick={() => handleDelete(tx)}
                              disabled={isDeleting}
                              title="ลบรายการที่บันทึกเอง"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all disabled:opacity-30"
                            >
                              <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin text-rose-500' : ''}`} />
                            </button>
                          ) : null}
                        </div>
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

      {/* Full Edit Modal for MANUAL Transactions */}
      {editingManualTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors">
            <button
              onClick={() => setEditingManualTx(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">แก้ไขรายการที่บันทึกเอง</h2>
                <span className="text-[11px] text-slate-400">แก้ไขข้อมูลได้ครบทุกช่อง และอัปเดตลง Google Sheet</span>
              </div>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-4 text-sm">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setManualType(t)}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      manualType === t
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
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full text-lg font-bold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              {/* Category & Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    value={manualAccount}
                    onChange={(e) => setManualAccount(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="K PLUS" className="dark:bg-slate-900 dark:text-white">🔵 K PLUS</option>
                    <option value="Make by KBank" className="dark:bg-slate-900 dark:text-white">🟡 Make by KBank</option>
                    <option value="เป๋าตัง" className="dark:bg-slate-900 dark:text-white">📲 เป๋าตัง (Paotang)</option>
                    <option value="เงินสด" className="dark:bg-slate-900 dark:text-white">💵 เงินสด</option>
                    <option value="อื่นๆ" className="dark:bg-slate-900 dark:text-white">อื่นๆ</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เวลา
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียด / หมายเหตุ
                </label>
                <textarea
                  rows={3}
                  placeholder="เช่น ข้าวกลางวัน, ค่ากาแฟ, รายการสิ่งของที่ซื้อ"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingManualTx(null)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-2xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingManual ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Edit Note / Comment Modal for AUTO_SYNC Transactions */}
      {editingNoteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative transition-colors">
            <button
              onClick={() => setEditingNoteTx(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquarePlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">เพิ่ม/แก้ไขรายละเอียดเพิ่มเติม</h2>
                <span className="text-[11px] text-slate-400">
                  {editingNoteTx.date} {editingNoteTx.time} | ฿{editingNoteTx.amount.toLocaleString()} ({editingNoteTx.category})
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  คำอธิบาย / รายการสิ่งของที่ซื้อ (เช่น ซื้อของแม็คโคร: หมู 2 กก, ไข่ไก่, นมสด, ของใช้)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="พิมพ์รายละเอียดเพิ่มเติมเกี่ยวกับรายการนี้..."
                  value={editNoteText}
                  onChange={(e) => setEditNoteText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingNoteTx(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-2xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingNote ? 'กำลังบันทึกลง Sheet...' : 'บันทึกคำอธิบาย'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
