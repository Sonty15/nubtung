'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('ซิงค์ข้อมูลทั้งหมด');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSyncAll = async () => {
    setLoading(true);
    setResultMessage(null);
    setIsError(false);

    try {
      // 1. Sync Slips first
      setStatusText('กำลังสแกนสลิป...');
      const slipRes = await fetch('/api/sync', { method: 'POST' });
      const slipData = await slipRes.json();

      if (!slipRes.ok) {
        throw new Error(slipData.error || 'Slip sync failed');
      }

      // 2. Sync Statements next
      setStatusText('กำลังกระทบยอด Statement...');
      const stmRes = await fetch('/api/statements/sync', { method: 'POST' });
      const stmData = await stmRes.json();

      if (!stmRes.ok) {
        throw new Error(stmData.error || 'Statement sync failed');
      }

      const slipProcessed = slipData.stats?.processed ?? 0;
      const stmTotal = stmData.total ?? 0;

      setResultMessage(
        `ซิงค์สำเร็จ! (สลิปใหม่: ${slipProcessed} รายการ, รายการทั้งหมด: ${stmTotal} รายการ)`
      );

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setIsError(true);
      setResultMessage(err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setLoading(false);
      setStatusText('ซิงค์ข้อมูลทั้งหมด');
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSyncAll}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all active:scale-95 ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>{statusText}</span>
      </button>

      {resultMessage && (
        <div
          className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm max-w-xs ${
            isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isError ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{resultMessage}</span>
        </div>
      )}
    </div>
  );
}
