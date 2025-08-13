'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { WelcomeModal } from './welcome-modal';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const showNav = !['/login', '/signup'].includes(pathname);

  return (
    <>
      {showNav && user && <WelcomeModal />}
      <div className="flex h-dvh flex-col">
        <main className={cn('flex-1 overflow-y-auto', showNav && 'pb-16')}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </>
  );
}
