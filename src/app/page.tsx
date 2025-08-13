
'use client';

import withAuth from '@/components/with-auth';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  BookMarked,
  Sparkles,
  UtensilsCrossed,
  Weight,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
  PenSquare,
  Flame,
  Award,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats, WeightEntry, UserProfile, DailyLog } from '@/lib/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getLevel, getXpForLevel, badges as definedBadges } from '@/lib/gamification';

const featureCards = [
  {
    title: 'Daily Tracking',
    description: 'Log your studies, Quran reading, expenses, and habits.',
    href: '/journal',
    icon: <BookMarked className="size-8 text-primary" />,
  },
  {
    title: 'Weight Tracking',
    description: 'Log your weight and see your progress over time.',
    href: '/weight',
    icon: <Weight className="size-8 text-primary" />,
  },
  {
    title: 'Diet & Calories',
    description: 'Keep a log of your meals and daily calorie intake.',
    href: '/diet',
    icon: <UtensilsCrossed className="size-8 text-primary" />,
  },
  {
    title: 'AI Progress Analysis',
    description: 'Analyze your physique changes with AI.',
    href: '/progress',
    icon: <Sparkles className="size-8 text-primary" />,
  },
];

function DashboardPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    };
    setGreeting(getGreeting());
  }, []);

  // Listener for user profile
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
        }
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!user) return;

    const fetchDashboardStats = async () => {
      setIsLoading(true);

      const now = new Date();
      const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch weight data for the week
      const weightRef = collection(db, 'users', user.uid, 'weightEntries');
      const weightQuery = query(
        weightRef,
        where('date', '>=', startOfThisWeek),
        where('date', '<=', endOfThisWeek),
        orderBy('date', 'asc')
      );
      const weightSnap = await getDocs(weightQuery);
      const weeklyWeights = weightSnap.docs.map(
        (doc) => doc.data() as WeightEntry
      );

      let weightChange = 0;
      if (weeklyWeights.length > 1) {
        const firstWeight = weeklyWeights[0].weight;
        const lastWeight = weeklyWeights[weeklyWeights.length - 1].weight;
        weightChange = lastWeight - firstWeight;
      }

      // Fetch journal entries for the week
      const journalRef = collection(db, 'users', user.uid, 'dailyLogs');
      const journalQuery = query(
        journalRef,
        where('date', '>=', format(startOfThisWeek, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfThisWeek, 'yyyy-MM-dd'))
      );
      const journalSnap = await getDocs(journalQuery);
      const journalCount = journalSnap.size;
      
      const allLogsQuery = query(journalRef, orderBy('date', 'desc'));
      const allLogsSnap = await getDocs(allLogsQuery);
      const allLogs = allLogsSnap.docs.map(doc => doc.data() as DailyLog);

      let longestStreak = 0;
      // ... streak calculation logic will go here in a future update ...


      setStats({
        weeklyWeightChange: weightChange,
        weeklyJournalEntries: journalCount,
        longestHabitStreak: longestStreak,
      });

      setIsLoading(false);
    };

    fetchDashboardStats();
  }, [user]);
  
  const currentLevel = useMemo(() => profile ? getLevel(profile.xp ?? 0) : 1, [profile]);
  const xpForCurrentLevel = useMemo(() => getXpForLevel(currentLevel), [currentLevel]);
  const xpForNextLevel = useMemo(() => getXpForLevel(currentLevel + 1), [currentLevel]);
  const currentLevelProgress = useMemo(() => {
    const totalXpInLevel = xpForNextLevel - xpForCurrentLevel;
    const xpInCurrentLevel = (profile?.xp ?? 0) - xpForCurrentLevel;
    return (xpInCurrentLevel / totalXpInLevel) * 100;
  }, [profile, xpForCurrentLevel, xpForNextLevel]);
  const userBadges = useMemo(() => {
      if (!profile?.badges) return [];
      return definedBadges.filter(b => profile.badges?.includes(b.id));
  }, [profile]);


  const StatCard = ({
    title,
    value,
    unit,
    icon,
    isLoading,
    change,
  }: {
    title: string;
    value: number | string;
    unit?: string;
    icon: React.ReactNode;
    isLoading: boolean;
    change?: number;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">
            {value}
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </div>
        )}
        {change !== undefined && !isLoading && (
          <p className="text-xs text-muted-foreground">
            {change > 0 ? `+${change.toFixed(1)}kg` : `${change.toFixed(1)}kg`}{' '}
            from last week
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl break-words">
            {greeting}, {user?.displayName || user?.email}!
          </h1>
          <p className="text-muted-foreground">
            Your personal dashboard for holistic growth.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </header>

      {/* Gamification Section */}
       <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Level up by completing your daily tasks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || !profile ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-primary">Level {currentLevel}</span>
                <span className="text-sm text-muted-foreground">
                  {profile.xp ?? 0} / {xpForNextLevel} XP
                </span>
              </div>
              <Progress value={currentLevelProgress} className="h-2" />
            </div>
          )}
           <div>
            <h4 className="text-sm font-medium mb-2">Badges</h4>
             {isLoading || !profile ? (
                <div className="flex gap-4">
                    <Skeleton className="size-16 rounded-full" />
                    <Skeleton className="size-16 rounded-full" />
                    <Skeleton className="size-16 rounded-full" />
                </div>
             ) : userBadges.length > 0 ? (
                 <div className="flex flex-wrap gap-4">
                     {userBadges.map(badge => (
                         <div key={badge.id} className="flex flex-col items-center text-center gap-1" title={`${badge.name}: ${badge.description}`}>
                            <div className="flex items-center justify-center size-16 rounded-full bg-accent text-accent-foreground border-2 border-amber-400">
                               <badge.icon className="size-8" />
                            </div>
                            <span className="text-xs w-16 truncate">{badge.name}</span>
                         </div>
                     ))}
                 </div>
             ) : (
                <p className="text-sm text-muted-foreground">No badges unlocked yet. Keep logging to earn them!</p>
             )}
           </div>
        </CardContent>
      </Card>


      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Weekly Weight Change"
          value={stats?.weeklyWeightChange.toFixed(1) ?? '0.0'}
          unit=" kg"
          icon={
            stats && stats.weeklyWeightChange < 0 ? (
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            )
          }
          isLoading={isLoading}
        />
        <StatCard
          title="Days Logged This Week"
          value={stats?.weeklyJournalEntries ?? 0}
          icon={<PenSquare className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Longest Abstinence Streak"
          value={stats?.longestHabitStreak ?? 0}
          unit=" days"
          icon={<Flame className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Links Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {featureCards.map((feature) => (
          <Link href={feature.href} key={feature.title} className="flex">
            <Card className="flex w-full flex-col justify-between transition-all hover:shadow-lg hover:scale-[1.02] dark:bg-card dark:hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">
                  Go to {feature.title}{' '}
                  <ArrowRight className="ml-1 inline size-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default withAuth(DashboardPage);
