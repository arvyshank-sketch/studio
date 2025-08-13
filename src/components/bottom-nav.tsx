'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  type LucideIcon,
  TrendingUp,
  Sparkles,
  BookOpenCheck,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const links: NavLink[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/journal',
    label: 'Journal',
    icon: BookOpenCheck,
  },
   {
    href: '/diet',
    label: 'Diet',
    icon: Utensils,
  },
  {
    href: '/progress',
    label: 'AI Coach',
    icon: Sparkles,
  },
  {
    href: '/weight',
    label: 'Weight',
    icon: TrendingUp,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <nav className="flex justify-around items-center h-16">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors w-full h-full',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <link.icon className="size-6" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
