import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { SidebarNav } from './sidebar-nav';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:justify-end">
          <SidebarTrigger className="md:hidden" />
          {/* Header content for mobile can go here */}
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
