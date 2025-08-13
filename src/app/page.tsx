
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
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats, WeightEntry } from '@/lib/types';
import { startOfWeek, endOfWeek, format } from 'date-fns';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    };
    setGreeting(getGreeting());

    const fetchDashboardStats = async () => {
      if (!user) return;
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

      // Placeholder for longest streak
      const longestStreak = 0; 

      setStats({
        weeklyWeightChange: weightChange,
        weeklyJournalEntries: journalCount,
        longestHabitStreak: longestStreak,
      });

      setIsLoading(false);
    };

    fetchDashboardStats();
  }, [user]);

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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Abstinence Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {stats?.longestHabitStreak ?? 0}
                     <span className="text-sm font-normal text-muted-foreground">
                        {' '}days
                    </span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Streak tracking coming soon!
                </p>
            </CardContent>
        </Card>
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
