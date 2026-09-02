'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import TransactionTable from '@/components/Transactions/TransactionTable';
import ManualTransactionModal from '@/components/Transactions/ManualTransactionModal';
import { Transaction } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onSyncComplete={fetchTransactions} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              รายการธุรกรรมทั้งหมด (Transactions)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ข้อมูลทั้งหมดในแท็บ '📝 รายการทั้งหมด' บน Google Sheets สามารถค้นหา กรอง และดูสลิปได้
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ManualTransactionModal onSuccess={fetchTransactions} />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold">ข้อความแจ้งเตือน: </span>
              <span>{error}</span>
            </div>
            <button
              onClick={fetchTransactions}
              className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-medium transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <TransactionTable transactions={transactions} loading={loading} />
      </main>
    </div>
  );
}
