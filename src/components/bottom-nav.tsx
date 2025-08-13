
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  type LucideIcon,
  Sparkles,
  BookOpenCheck,
  Utensils,
  Weight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

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
    icon: Weight,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <nav className="grid h-16 grid-cols-5 items-center justify-around">
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
              <span className="text-xs font-medium sr-only sm:not-sr-only">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
