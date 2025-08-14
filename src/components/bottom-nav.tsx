
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  type LucideIcon,
  BookOpenCheck,
  Utensils,
  Weight,
  User,
  BrainCircuit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

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
    label: 'Daily Quest',
    icon: BookOpenCheck,
  },
   {
    href: '/diet',
    label: 'Diet',
    icon: Utensils,
  },
  {
    href: '/weight',
    label: 'Weight',
    icon: Weight,
  },
   {
    href: '/ai-progress',
    label: 'AI Analysis',
    icon: BrainCircuit,
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-sm">
      <nav className="grid h-16 grid-cols-6 items-center justify-around">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors w-full h-full relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <link.icon className="size-6" />
              <span className="text-xs font-medium sr-only sm:not-sr-only">{link.label}</span>
              {isActive && (
                <div className="absolute bottom-0 h-1 w-8 rounded-t-full bg-gradient-to-r from-primary to-purple-400" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
