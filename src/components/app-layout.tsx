'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const showNav = !['/login', '/signup'].includes(pathname);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-dvh flex-col">
      {showNav && (
        <header className="absolute top-2 right-4 z-50">
           <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign Out"
          >
            <LogOut className="size-5" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </header>
      )}
      <main className={cn('flex-1 overflow-y-auto', showNav && 'pb-16')}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
