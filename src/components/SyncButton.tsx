'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setResultMessage(null);
    setIsError(false);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setResultMessage(data.message || 'ซิงค์ข้อมูลเรียบร้อยแล้ว');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setIsError(true);
      setResultMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-md transition-all ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span>{loading ? 'กำลังสแกนสลิป...' : 'ซิงค์สลิปจาก Google Drive'}</span>
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
