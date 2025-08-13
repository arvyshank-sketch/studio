
'use client';

import { useState, useEffect, useMemo } from 'react';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/context/auth-context";
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getLevel, getXpForLevel, XP_REWARDS } from '@/lib/gamification';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Shield, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const Commandment = ({ text, xp, isPenalty = false }: { text: string; xp: number; isPenalty?: boolean }) => (
    <li className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            {isPenalty ? <XCircle className="text-red-400 size-4" /> : <CheckCircle className="text-green-400 size-4" />}
            <span>{text}</span>
        </div>
        <span className={cn('font-bold', isPenalty ? 'text-red-400' : 'text-green-400')}>
            {isPenalty ? '' : '+'}{xp} XP
        </span>
    </li>
);

function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const currentLevel = useMemo(() => profile ? getLevel(profile.xp ?? 0) : 1, [profile]);
  const xpForCurrentLevel = useMemo(() => getXpForLevel(currentLevel), [currentLevel]);
  const xpForNextLevel = useMemo(() => getXpForLevel(currentLevel + 1), [currentLevel]);
  const currentLevelProgress = useMemo(() => {
    if (!profile?.xp) return 0;
    const totalXpInLevel = xpForNextLevel - xpForCurrentLevel;
    const xpInCurrentLevel = profile.xp - xpForCurrentLevel;
    return totalXpInLevel > 0 ? (xpInCurrentLevel / totalXpInLevel) * 100 : 0;
  }, [profile, xpForCurrentLevel, xpForNextLevel]);

  const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
      <div className="flex justify-between items-center py-3 border-b border-border/50">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground font-medium">{isLoading ? <Skeleton className="h-5 w-32" /> : value}</dd>
      </div>
  );

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8 flex items-center gap-4">
        {isLoading ? <Skeleton className="size-20 rounded-full" /> : (
            <Avatar className="size-20 border-2 border-primary">
                <AvatarImage src={profile?.photoURL} alt={profile?.displayName} />
                <AvatarFallback className="text-2xl bg-muted">
                    {profile?.displayName?.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
        )}
        <div>
           {isLoading ? (
               <div className="space-y-2">
                   <Skeleton className="h-8 w-48" />
                   <Skeleton className="h-5 w-64" />
                </div>
           ) : (
             <>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {profile?.displayName}
                </h1>
                <p className="text-muted-foreground">{profile?.email}</p>
            </>
           )}
        </div>
      </header>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info"><User className="mr-2" /> Player Info</TabsTrigger>
          <TabsTrigger value="rules"><Shield className="mr-2" />System Commandments</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Your personal stats and information.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </div>
              ) : (
                <dl>
                  <InfoRow label="UID" value={profile?.uid} />
                  <InfoRow label="Joined System" value={profile?.createdAt ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'} />
                  <div>
                    <div className="flex justify-between items-baseline pt-4 mb-2">
                        <span className="font-bold text-lg text-primary">Level {currentLevel}</span>
                        <span className="text-sm text-muted-foreground">
                        {profile?.xp ?? 0} / {xpForNextLevel} XP
                        </span>
                    </div>
                    <Progress value={currentLevelProgress} className="h-3" />
                  </div>
                </dl>
              )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                    <LogOut className="mr-2" />
                    Sign Out
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
            <div 
                className="p-8 rounded-lg text-white"
                style={{
                    backgroundImage: 'url(/system-commandments-bg.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div 
                    className="p-6 bg-black/70 backdrop-blur-sm rounded-md border-2 border-blue-400/50"
                    style={{ textShadow: '0 0 8px hsl(210 90% 60% / 0.8)'}}
                >
                    <h3 className="text-center text-2xl font-bold mb-6 text-blue-300">System Commandments</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">XP Rewards</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Gaining Weight" xp={XP_REWARDS.WEIGHT_GAIN} />
                                <Commandment text="Abstinence (Daily)" xp={XP_REWARDS.ABSTAINED} />
                                <Commandment text="Custom Habit (Each)" xp={XP_REWARDS.CUSTOM_HABIT} />
                                <Commandment text="Calorie Log (Daily)" xp={XP_REWARDS.CALORIE_LOGGED} />
                                <Commandment text="Study (per 30 min)" xp={XP_REWARDS.STUDY_PER_30_MIN} />
                                <Commandment text="Expense Log (Daily)" xp={XP_REWARDS.EXPENSE_LOGGED} />
                                <Commandment text="Qur'an (per page)" xp={XP_REWARDS.QURAN_PER_PAGE} />
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">Unexpected Quests</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Quest Completion" xp={XP_REWARDS.UNEXPECTED_QUEST} />
                                <Commandment text="Quest Failure (Penalty)" xp={XP_REWARDS.UNEXPECTED_QUEST_PENALTY} isPenalty={true}/>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">Penalties</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Missed Daily Quest" xp={XP_REWARDS.DAILY_QUEST_MISSED_PENALTY} isPenalty={true}/>
                                <Commandment text="Missed Calorie Log" xp={XP_REWARDS.CALORIE_LOG_MISSED_PENALTY} isPenalty={true}/>
                                <Commandment text="Unfinished Habit (Each)" xp={XP_REWARDS.CUSTOM_HABIT_PENALTY} isPenalty={true}/>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withAuth(ProfilePage);
