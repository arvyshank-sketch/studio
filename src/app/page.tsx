'use client';

import withAuth from '@/components/with-auth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  PenSquare,
  Flame,
  Moon,
  Sun,
  BarChart,
  Loader2,
  Book,
  Utensils,
  IndianRupee,
  LogOut,
  Calendar,
  PlusCircle,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DashboardStats, WeightEntry, UserProfile, DailyLog, MealEntry } from '@/lib/types';
import { startOfWeek, endOfWeek, format, subDays, eachDayOfInterval, parseISO, differenceInCalendarDays } from 'date-fns';
import { getLevel, getXpForLevel, badges as definedBadges } from '@/lib/gamification';
import { cn } from '@/lib/utils';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';
import { MEALS_STORAGE_KEY } from '@/lib/constants';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { useRouter } from 'next/navigation';
import { HabitManager } from '@/components/habit-manager';


function DashboardPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [challengeProgress, setChallengeProgress] = useState<{week: number; day: number} | null>(null);
  const [isHabitManagerOpen, setIsHabitManagerOpen] = useState(false);
  
  const storageKey = user ? `${MEALS_STORAGE_KEY}-${user.uid}` : MEALS_STORAGE_KEY;
  const [allMeals] = useSyncedLocalStorage<MealEntry[]>(storageKey, []);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };


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
            const userProfile = doc.data() as UserProfile;
            setProfile(userProfile);

            if (userProfile.createdAt) {
                const totalDays = differenceInCalendarDays(new Date(), userProfile.createdAt.toDate()) + 1;
                const week = Math.ceil(totalDays / 7);
                const day = totalDays % 7 === 0 ? 7 : totalDays % 7;
                setChallengeProgress({ week, day });
            }
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
      const endOfToday = new Date();
      const startOfLast7Days = subDays(endOfToday, 6);


      // Fetch weight data for the week
      const weightRef = collection(db, 'users', user.uid, 'weightEntries');
      const weightQuery = query(
        weightRef,
        where('date', '>=', startOfLast7Days),
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
        where('date', '>=', format(startOfLast7Days, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfToday, 'yyyy-MM-dd'))
      );
      const journalSnap = await getDocs(journalQuery);
      const weeklyLogs = journalSnap.docs.map(doc => doc.data() as DailyLog);

      const allLogsQuery = query(journalRef, orderBy('date', 'desc'));
      const allLogsSnap = await getDocs(allLogsQuery);
      
      let longestStreak = 0;
      // ... streak calculation logic will go here in a future update ...


      setStats({
        weeklyWeightChange: weightChange,
        weeklyJournalEntries: weeklyLogs.length,
        longestHabitStreak: longestStreak,
        calories: 0 // Will be calculated with meals data
      });
      
      // Process data for the chart
      const dateInterval = eachDayOfInterval({ start: startOfLast7Days, end: endOfToday });
      
      const processedChartData = dateInterval.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        const logForDay = weeklyLogs.find(log => log.date === formattedDate);
        const mealsForDay = allMeals.filter(meal => meal.date === formattedDate);
        const totalCalories = mealsForDay.reduce((sum, meal) => sum + meal.calories, 0);

        return {
          date: format(date, 'MMM d'),
          study: logForDay?.studyDuration || 0,
          quran: logForDay?.quranPagesRead || 0,
          expenses: logForDay?.expenses || 0,
          calories: totalCalories,
        };
      });

      setChartData(processedChartData);
      setIsLoading(false);
    };

    fetchDashboardStats();
  }, [user, allMeals]);
  
  const currentLevel = useMemo(() => profile ? getLevel(profile.xp ?? 0) : 1, [profile]);
  const xpForCurrentLevel = useMemo(() => getXpForLevel(currentLevel), [currentLevel]);
  const xpForNextLevel = useMemo(() => getXpForLevel(currentLevel + 1), [currentLevel]);
  const currentLevelProgress = useMemo(() => {
    if (!profile?.xp) return 0;
    const totalXpInLevel = xpForNextLevel - xpForCurrentLevel;
    const xpInCurrentLevel = profile.xp - xpForCurrentLevel;
    return totalXpInLevel > 0 ? (xpInCurrentLevel / totalXpInLevel) * 100 : 0;
  }, [profile, xpForCurrentLevel, xpForNextLevel]);
  const userBadges = useMemo(() => {
      if (!profile?.badges) return [];
      return definedBadges.filter(b => profile.badges?.includes(b.id));
  }, [profile]);

  const formattedUsername = useMemo(() => {
    const name = user?.displayName || user?.email?.split('@')[0] || 'User';
    const nameWithoutNumbers = name.replace(/[0-9]/g, '');
    return nameWithoutNumbers.charAt(0).toUpperCase() + nameWithoutNumbers.slice(1);
  }, [user]);


  const StatCard = ({
    title,
    value,
    unit,
    icon,
    isLoading,
  }: {
    title: string;
    value: number | string;
    unit?: string;
    icon: React.ReactNode;
    isLoading: boolean;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24 bg-muted/20" />
        ) : (
          <div className="text-3xl font-bold">
            {value}
            <span className="text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const CustomTooltip = ({ active, payload, label, unit = '', prefix = '' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-card border border-border rounded-lg shadow-lg">
          <p className="label font-bold text-foreground">{`${label}`}</p>
          <p className="intro" style={{ color: payload[0].stroke || payload[0].fill }}>
            {`${payload[0].name}: ${prefix}${payload[0].value.toLocaleString()}${unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const ChartPlaceholder = () => (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
        <BarChart className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No Data Yet</h3>
        <p className="text-sm text-muted-foreground">
            Log your activities for a few days to see a chart of your progress.
        </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">
            {greeting}, {formattedUsername}!
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Your personal dashboard for holistic growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-[1.2rem] w-[1.2rem] block dark:hidden" />
              <Moon className="hidden h-[1.2rem] w-[1.2rem] dark:block" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="size-5" />
              <span className="sr-only">Sign Out</span>
            </Button>
        </div>
      </header>

      {/* Gamification Section */}
       <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading || !profile ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/4 bg-muted/20" />
              <Skeleton className="h-4 w-full bg-muted/20" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Level {currentLevel}</span>
                <span className="text-sm text-muted-foreground">
                  {profile.xp ?? 0} / {xpForNextLevel} XP
                </span>
              </div>
              <Progress value={currentLevelProgress} className="h-3" />
            </div>
          )}
           <div>
            <h4 className="text-lg font-medium mb-3">Badges</h4>
             {isLoading || !profile ? (
                <div className="flex gap-4">
                    <Skeleton className="size-20 rounded-full bg-muted/20" />
                    <Skeleton className="size-20 rounded-full bg-muted/20" />
                    <Skeleton className="size-20 rounded-full bg-muted/20" />
                </div>
             ) : (
                 <div className="flex flex-wrap gap-4">
                     {definedBadges.map(badge => {
                        const isUnlocked = userBadges.some(b => b.id === badge.id);
                        return (
                         <div key={badge.id} className="flex flex-col items-center text-center gap-2" title={`${badge.name}: ${badge.description}`}>
                            <div className={cn(
                                "flex items-center justify-center size-20 rounded-full bg-card/80 border-2",
                                isUnlocked ? "border-accent text-accent" : "border-muted/20 text-muted-foreground/40"
                            )}>
                               <badge.icon className="size-10" />
                            </div>
                            <span className={cn(
                                "text-xs w-20 truncate font-medium",
                                isUnlocked ? "text-foreground" : "text-muted-foreground/60"
                            )}>{badge.name}</span>
                         </div>
                        );
                     })}
                 </div>
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
            stats && stats.weeklyWeightChange <= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingUp className="h-5 w-5 text-red-400" />
            )
          }
          isLoading={isLoading}
        />
        <StatCard
          title="Days Logged This Week"
          value={stats?.weeklyJournalEntries ?? 0}
          unit="/7"
          icon={<PenSquare className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Longest Abstinence Streak"
          value={stats?.longestHabitStreak ?? 0}
          unit=" days"
          icon={<Flame className="h-5 w-5 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

       {/* Chart Section */}
       <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Utensils /> Calories Logged</CardTitle>
                    <CardDescription>Daily calorie intake for the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full pr-4">
                    {isLoading ? ( <Loader2 className="size-8 animate-spin text-primary mx-auto" /> ) : chartData.some(d => d.calories > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip unit=" kcal" />} />
                            <Area type="monotone" dataKey="calories" name="Calories" stroke="hsl(var(--primary))" fill="url(#colorCalories)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : ( <ChartPlaceholder /> )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><IndianRupee /> Weekly Expenses</CardTitle>
                    <CardDescription>Daily expenses for the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full pr-4">
                    {isLoading ? ( <Loader2 className="size-8 animate-spin text-primary mx-auto" /> ) : chartData.some(d => d.expenses > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                           <defs>
                                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip prefix="₹" />} />
                            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--accent))" fill="url(#colorExpenses)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : ( <ChartPlaceholder /> )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Book /> Study Progress</CardTitle>
                    <CardDescription>Daily study progress for the last 7 days.</CardDescription>
                </CardHeader>
                 <CardContent className="h-[300px] w-full pr-4">
                    {isLoading ? ( <Loader2 className="size-8 animate-spin text-primary mx-auto" /> ) : chartData.some(d => d.study > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip unit=" hrs" />} />
                            <defs>
                                <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="study" name="Study" stroke="hsl(var(--chart-2))" fill="url(#colorStudy)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : ( <ChartPlaceholder /> )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Book /> Quran Progress</CardTitle>
                    <CardDescription>Daily quran progress for the last 7 days.</CardDescription>
                </CardHeader>
                 <CardContent className="h-[300px] w-full pr-4">
                    {isLoading ? ( <Loader2 className="size-8 animate-spin text-primary mx-auto" /> ) : chartData.some(d => d.quran > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip content={<CustomTooltip unit=" pgs"/>} />
                            <defs>
                                <linearGradient id="colorQuran" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="quran" name="Quran" stroke="hsl(var(--chart-4))" fill="url(#colorQuran)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : ( <ChartPlaceholder /> )}
                </CardContent>
            </Card>
       </div>
       {challengeProgress && (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><Calendar /> Challenge Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className='flex items-center justify-around text-center'>
                    <div>
                        <p className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400'>{challengeProgress.week}</p>
                        <p className='text-muted-foreground'>Week</p>
                    </div>
                     <div>
                        <p className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400'>{challengeProgress.day}</p>
                        <p className='text-muted-foreground'>Day</p>
                    </div>
                </div>
            </CardContent>
        </Card>
       )}
       {profile && (
        <Card>
            <CardHeader>
                 <div className="flex items-center justify-between">
                    <CardTitle>Custom Habits</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsHabitManagerOpen(true)}>
                        <PlusCircle className="size-5" />
                        <span className="sr-only">Add or manage habits</span>
                    </Button>
                </div>
                <CardDescription>
                    Add and track your own daily habits.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : profile.habits && profile.habits.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {profile.habits.map(habit => (
                            <div key={habit.id} className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm">
                                {habit.name}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No custom habits added yet. Click the '+' to add your first one!</p>
                )}
            </CardContent>
             <HabitManager
                isOpen={isHabitManagerOpen}
                setIsOpen={setIsHabitManagerOpen}
                profile={profile}
             />
        </Card>
       )}
    </div>
  );
}

export default withAuth(DashboardPage);
