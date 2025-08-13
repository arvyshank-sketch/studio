'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = !['/login', '/signup'].includes(pathname);

  return (
    <div className="flex flex-col h-screen">
      <main className={`flex-1 overflow-y-auto ${showNav ? 'pb-20' : ''}`}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
}
