import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'นับตังค์ - Nubtang | จัดการรายรับ-รายจ่าย & บันทึกสลิปอัตโนมัติ',
  description: 'ระบบบันทึกรายรับ-รายจ่าย เชื่อมต่อ Google Sheets และซิงค์สลิปจาก Google Drive อัตโนมัติด้วย AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full bg-slate-50 antialiased">
      <body className="min-h-full flex flex-col text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
