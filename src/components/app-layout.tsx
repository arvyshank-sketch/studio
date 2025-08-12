import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from './ui/sidebar';
import { SidebarNav } from './sidebar-nav';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
