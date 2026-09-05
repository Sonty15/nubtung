'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListOrdered, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import ManualTransactionModal from './Transactions/ManualTransactionModal';

interface MobileBottomNavProps {
  onSyncComplete?: () => void;
  onRefresh?: () => void;
}

export default function MobileBottomNav({ onSyncComplete, onRefresh }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);

  const handleQuickSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      await res.json();
      if (onSyncComplete) onSyncComplete();
      if (onRefresh) onRefresh();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2 shadow-lg shadow-black/5 safe-area-bottom transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            pathname === '/'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${pathname === '/' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">ภาพรวม</span>
        </Link>

        {/* Quick Add Button */}
        <div className="flex flex-col items-center">
          <ManualTransactionModal onSuccess={() => {
            if (onSyncComplete) onSyncComplete();
            if (onRefresh) onRefresh();
          }} isMobileFab={true} />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">บันทึก</span>
        </div>

        {/* Transactions */}
        <Link
          href="/transactions"
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            pathname === '/transactions'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${pathname === '/transactions' ? 'bg-emerald-50 dark:bg-emerald-950/60' : ''}`}>
            <ListOrdered className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">รายการ</span>
        </Link>

        {/* Sync Button */}
        <button
          onClick={handleQuickSync}
          disabled={syncing}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50"
        >
          <div className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin text-emerald-500' : ''}`} />
          </div>
          <span className="text-[10px] tracking-tight">{syncing ? 'ซิงค์...' : 'ซิงค์สลิป'}</span>
        </button>
      </div>
    </div>
  );
}
