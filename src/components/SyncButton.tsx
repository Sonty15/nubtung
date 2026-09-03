'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, FileText, ChevronDown } from 'lucide-react';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

export default function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'SLIPS' | 'STATEMENTS' | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSyncSlips = async () => {
    setLoading(true);
    setLoadingType('SLIPS');
    setResultMessage(null);
    setIsError(false);
    setMenuOpen(false);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Slip sync failed');
      }

      setResultMessage(data.message || 'ซิงค์สลิปเรียบร้อยแล้ว');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setIsError(true);
      setResultMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const handleSyncStatements = async () => {
    setLoading(true);
    setLoadingType('STATEMENTS');
    setResultMessage(null);
    setIsError(false);
    setMenuOpen(false);

    try {
      const res = await fetch('/api/statements/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Statement sync failed');
      }

      setResultMessage(data.message || 'ซิงค์ Statement เรียบร้อยแล้ว');
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setIsError(true);
      setResultMessage(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  return (
    <div className="relative flex flex-col items-end gap-2">
      <div className="inline-flex rounded-xl shadow-xs">
        {/* Main sync button: slips */}
        <button
          onClick={handleSyncSlips}
          disabled={loading}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-l-xl text-white text-xs font-semibold transition-all ${
            loading && loadingType === 'SLIPS'
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading && loadingType === 'SLIPS' ? 'animate-spin' : ''}`} />
          <span>{loading && loadingType === 'SLIPS' ? 'กำลังสแกนสลิป...' : 'ซิงค์สลิป'}</span>
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={loading}
          className="px-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-r-xl border-l border-emerald-500/30 transition-colors"
          title="ตัวเลือกการซิงค์เพิ่มเติม"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute top-11 right-0 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2">
          <button
            onClick={handleSyncSlips}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-800">ซิงค์สลิปจาก Google Drive</p>
              <p className="text-[11px] text-gray-400">สแกนโฟลเดอร์ kplus และ make</p>
            </div>
          </button>

          <button
            onClick={handleSyncStatements}
            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sky-50 hover:text-sky-800 flex items-center gap-2 transition-colors mt-1"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <div>
              <p className="font-semibold text-gray-800">ซิงค์ e-Statement PDF</p>
              <p className="text-[11px] text-gray-400">อ่านและกระทบยอดบัญชีธนาคาร</p>
            </div>
          </button>
        </div>
      )}

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
