
'use client';

import { type ReactNode, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { WelcomeModal } from './welcome-modal';
import { LevelUpModal } from './level-up-modal';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const showNav = !['/login', '/signup'].includes(pathname);
  
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const previousLevelRef = useRef<number | undefined>();

  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            
            // Check if level has changed
            if (previousLevelRef.current !== undefined && userProfile.level !== undefined && userProfile.level > previousLevelRef.current) {
                setIsLevelUpModalOpen(true);
            }
            
            previousLevelRef.current = userProfile.level;
        }
    });

    return () => unsubscribe();
  }, [user]);


  return (
    <>
      {showNav && user && <WelcomeModal />}
      <LevelUpModal isOpen={isLevelUpModalOpen} onOpenChange={setIsLevelUpModalOpen} />
      <div className="flex h-dvh flex-col">
        <main className={cn('flex-1 overflow-y-auto', showNav && 'pb-16')}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </>
  );
}
