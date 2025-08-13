import type { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
