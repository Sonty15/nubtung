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

      if (slipProcessed > 0 && stmTotal > 0) {
        setResultMessage(`ซิงค์สำเร็จ! (พบสลิปใหม่ ${slipProcessed} รายการ, Statement ${stmTotal} รายการ)`);
      } else if (slipProcessed > 0) {
        setResultMessage(`ซิงค์สำเร็จ! (เพิ่มสลิปใหม่ ${slipProcessed} รายการ)`);
      } else if (stmTotal > 0) {
        setResultMessage(`ซิงค์สำเร็จ! (อัปเดต Statement ${stmTotal} รายการ)`);
      } else {
        setResultMessage('ข้อมูลเป็นปัจจุบันแล้ว (ไม่มีสลิปหรือ Statement ใหม่ใน Drive)');
      }

      if (onSyncComplete) onSyncComplete();

      // Auto dismiss message after 5 seconds
      setTimeout(() => {
        setResultMessage(null);
      }, 5000);
    } catch (err: any) {
      setIsError(true);
      setResultMessage(err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setLoading(false);
      setStatusText('ซิงค์ข้อมูลทั้งหมด');
    }
  };

  return (
    <div className="flex flex-col items-end gap-2 relative">
      <button
        onClick={handleSyncAll}
        disabled={loading}
        title="ซิงค์ข้อมูลทั้งหมด (สลิปและ Statement)"
        className={`flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all active:scale-95 ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        <RefreshCw className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{statusText}</span>
      </button>

      {resultMessage && (
        <div
          className={`absolute top-12 right-0 z-50 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-xl border max-w-[85vw] sm:max-w-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            isError
              ? 'bg-red-50 dark:bg-red-950/90 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span className="font-medium truncate sm:whitespace-normal">{resultMessage}</span>
        </div>
      )}
    </div>
  );
}
