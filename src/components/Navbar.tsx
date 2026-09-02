'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Wallet, LayoutDashboard, ListOrdered, LogOut, FileSpreadsheet } from 'lucide-react';
import SyncButton from './SyncButton';

export default function Navbar({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'ภาพรวม (Dashboard)', href: '/', icon: LayoutDashboard },
    { label: 'รายการทั้งหมด (Transactions)', href: '/transactions', icon: ListOrdered },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-emerald-200 shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">นับตังค์</span>
              <span className="text-xs text-emerald-600 block font-medium">Nubtang Finance</span>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            <SyncButton onSyncComplete={onSyncComplete} />

            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
