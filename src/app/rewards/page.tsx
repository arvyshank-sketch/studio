
'use client';

import { useState, useEffect } from 'react';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/context/auth-context";
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Reward, UserReward } from '@/lib/types';
import { ALL_REWARDS } from '@/lib/rewards';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Award, MessageSquare, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const rarityStyles = {
  common: {
    badge: 'bg-muted/80 text-muted-foreground/80 border-transparent',
    card: 'border-muted/20',
    glow: '',
  },
  rare: {
    badge: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    card: 'border-blue-700/60',
    glow: 'shadow-lg shadow-blue-900/50',
  },
  legendary: {
    badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-600/50',
    card: 'border-yellow-600/60',
    glow: 'shadow-2xl shadow-yellow-800/60',
  },
};

const getRewardIcon = (type: string) => {
    switch (type) {
        case 'title': return <Award className="size-8 text-foreground/80" />;
        case 'badge': return <Star className="size-8 text-foreground/80" />;
        case 'quote': return <MessageSquare className="size-8 text-foreground/80" />;
        default: return <Award className="size-8 text-foreground/80" />;
    }
}

function RewardsPage() {
  const { user } = useAuth();
  const [unlockedRewards, setUnlockedRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const rewardsRef = collection(db, 'users', user.uid, 'userRewards');
    const unsubscribe = onSnapshot(rewardsRef, (snapshot) => {
      const rewardsData = snapshot.docs.map(doc => doc.data() as UserReward);
      setUnlockedRewards(rewardsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const combinedRewards = ALL_REWARDS.map(reward => {
    const unlockedVersion = unlockedRewards.find(ur => ur.id === reward.id);
    return {
      ...reward,
      unlocked: !!unlockedVersion,
      unlockedAt: unlockedVersion?.unlockedAt,
    };
  }).sort((a,b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0)); // Show unlocked first


  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          My Rewards
        </h1>
        <p className="text-muted-foreground">
          A collection of all rewards you've unlocked on your journey.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {combinedRewards.map(reward => {
            const styles = rarityStyles[reward.rarity];
            return (
              <Card
                key={reward.id}
                className={cn(
                  'flex flex-col justify-between transition-all duration-300',
                  reward.unlocked ? styles.card : 'border-dashed border-muted/20 bg-card/50',
                  reward.unlocked ? styles.glow : ''
                )}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {reward.unlocked ? getRewardIcon(reward.type) : <Lock className="size-8 text-muted-foreground/50" />}
                    <span className={cn(!reward.unlocked && 'text-muted-foreground/50')}>{reward.name}</span>
                  </CardTitle>
                  <CardDescription className={cn(!reward.unlocked && 'text-muted-foreground/30')}>
                    {reward.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                   <Badge className={cn('capitalize', reward.unlocked ? styles.badge : 'bg-muted/30 text-muted-foreground/50 border-transparent')}>
                        {reward.rarity}
                    </Badge>
                    {reward.unlockedAt && (
                         <p className="text-xs text-muted-foreground">
                           Unlocked {formatDistanceToNow(reward.unlockedAt.toDate(), { addSuffix: true })}
                         </p>
                    )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default withAuth(RewardsPage);
