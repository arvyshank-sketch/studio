
'use client';

import { type ReactNode, useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Rank } from '@/lib/types';
import { getRank } from '@/lib/gamification';

import { BottomNav } from './bottom-nav';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { WelcomeModal } from './welcome-modal';
import { LevelUpModal } from './level-up-modal';
import { RankUpModal } from './rank-up-modal';

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const showNav = !['/login', '/signup'].includes(pathname);
  
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [isRankUpModalOpen, setIsRankUpModalOpen] = useState(false);
  const [rankChangeInfo, setRankChangeInfo] = useState<{ oldRank: Rank; newRank: Rank } | null>(null);

  const previousLevelRef = useRef<number | undefined>();
  const previousRankRef = useRef<Rank | undefined>();

  useEffect(() => {
    if (!user) return;
    
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            const currentLevel = userProfile.level ?? 1;
            const newRank = getRank(currentLevel);

            // Check for Level Up
            if (previousLevelRef.current !== undefined && currentLevel > previousLevelRef.current) {
                setIsLevelUpModalOpen(true);
            }
            
            // Check for Rank Up
            if (previousRankRef.current && newRank.name !== previousRankRef.current.name) {
                setRankChangeInfo({ oldRank: previousRankRef.current, newRank: newRank });
                setIsRankUpModalOpen(true);
            }
            
            previousLevelRef.current = currentLevel;
            previousRankRef.current = newRank;
        }
    });

    return () => unsubscribe();
  }, [user]);


  return (
    <>
      {showNav && user && <WelcomeModal />}
      <LevelUpModal isOpen={isLevelUpModalOpen} onOpenChange={setIsLevelUpModalOpen} />
      <RankUpModal 
        isOpen={isRankUpModalOpen} 
        onOpenChange={setIsRankUpModalOpen}
        rankChangeInfo={rankChangeInfo}
      />
      <div className="flex h-dvh flex-col">
        <main className={cn('flex-1 overflow-y-auto', showNav && 'pb-16')}>
          {children}
        </main>
        {showNav && <BottomNav />}
      </div>
    </>
  );
}
