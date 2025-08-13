
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
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { eachDayOfInterval, format, subDays, differenceInCalendarDays, getWeek, startOfWeek } from 'date-fns';
import type { DashboardStats, WeightEntry, UserProfile, DailyLog, MealEntry, UnexpectedQuest, QuestExercise } from '@/lib/types';
import { getLevel, getXpForLevel, badges as definedBadges, XP_REWARDS } from '@/lib/gamification';
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
import { LevelUpModal } from '@/components/level-up-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

function DashboardPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [greeting, setGreeting] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [challengeProgress, setChallengeProgress] = useState<{week: number; day: number} | null>(null);
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [unexpectedQuest, setUnexpectedQuest] = useState<UnexpectedQuest | null>(null);
  const [isQuestLoading, setIsQuestLoading] = useState(true);

  const previousLevelRef = useRef<number | undefined>();
  
  const storageKey = user ? `${MEALS_STORAGE_KEY}-${user.uid}` : MEALS_STORAGE_KEY;
  const [allMeals] = useSyncedLocalStorage<MealEntry[]>(storageKey, []);

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    };
    setGreeting(getGreeting());
  }, []);

  // Reminder notification logic
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!user) return;

    const checkAndSendNotification = async () => {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const notificationKey = `synergy-notification-sent-${todayStr}`;

        // Check if it's after 9 PM and if notification hasn't been sent today
        if (now.getHours() >= 21 && !localStorage.getItem(notificationKey)) {
            const dailyLogRef = doc(db, 'users', user.uid, 'dailyLogs', todayStr);
            const dailyLogSnap = await getDoc(dailyLogRef);
            
            // Check if quest is already completed
            const logData = dailyLogSnap.data() as DailyLog | undefined;
            const questCompleted = logData && (
                (logData.studyDuration ?? 0) > 0 ||
                (logData.quranPagesRead ?? 0) > 0 ||
                logData.abstained ||
                Object.values(logData.customHabits ?? {}).some(Boolean)
            );

            if (!questCompleted) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Synergy Daily Quest Reminder', {
                            body: "Don't forget to complete your Daily Quest to avoid an XP penalty!",
                            icon: '/favicon.ico', // Optional: add an icon
                        });
                        localStorage.setItem(notificationKey, 'true');
                    }
                });
            }
        }
    };
    checkAndSendNotification();
  }, [user]);

  // Listener for user profile and quest day randomization
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    
    const setupQuestDays = async (userProfile: UserProfile) => {
        const now = new Date();
        const currentWeek = getWeek(now, { weekStartsOn: 1 }); // Monday as first day

        if (userProfile.questWeek !== currentWeek) {
            const randomDays = new Set<number>();
            while (randomDays.size < 2) {
                randomDays.add(Math.floor(Math.random() * 7)); // 0 (Sun) to 6 (Sat)
            }
            const questDays = Array.from(randomDays);
            await updateDoc(userDocRef, {
                questDays: questDays,
                questWeek: currentWeek,
            });
        }
    };
    
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            
            if (previousLevelRef.current !== undefined && userProfile.level !== undefined && userProfile.level > previousLevelRef.current) {
                setIsLevelUpModalOpen(true);
            }
            
            setProfile(userProfile);
            setupQuestDays(userProfile); // Check and set quest days
            previousLevelRef.current = userProfile.level;

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

  // Unexpected Quest generation and listener
  useEffect(() => {
      if (!user || !profile || !profile.questDays) return;
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const questDocRef = doc(db, 'users', user.uid, 'unexpectedQuests', todayStr);

      const generateQuest = async () => {
          const docSnap = await getDoc(questDocRef);
          const questData = docSnap.data() as UnexpectedQuest | undefined;
          const todayDayOfWeek = new Date().getDay(); // 0 (Sun) - 6 (Sat)
          
          // Check if today is a designated quest day
          if (profile.questDays?.includes(todayDayOfWeek)) {
            // If the quest doesn't exist OR it exists but hasn't been completed, (re)generate it.
            // This allows updating the quest if the code changes.
            if (!questData || !questData.isCompleted) {
                const newQuest: UnexpectedQuest = {
                    id: todayStr,
                    title: 'Strength Training',
                    description: 'A sudden mission has appeared. Complete it by the end of the day or face a penalty.',
                    exercises: [
                        { name: 'Push-ups', goal: 25, completed: false },
                        { name: 'Sit-ups', goal: 35, completed: false },
                        { name: 'Squats', goal: 40, completed: false },
                        { name: 'Running', goal: 2, completed: false, unit: 'km' }
                    ],
                    isCompleted: false,
                    generatedAt: serverTimestamp(),
                };
                await setDoc(questDocRef, newQuest);
            }
          }
      };
      
      generateQuest();

      const unsubscribe = onSnapshot(questDocRef, (doc) => {
          if (doc.exists()) {
              setUnexpectedQuest(doc.data() as UnexpectedQuest);
          } else {
              setUnexpectedQuest(null);
          }
          setIsQuestLoading(false);
      });
      
      return () => unsubscribe();

  }, [user, profile]);


  // Fetch dashboard stats
  useEffect(() => {
    if (!user) return;

    const fetchDashboardStats = async () => {
      setIsLoading(true);

      const now = new Date();
      const endOfToday = new Date();
      const startOfLast7Days = subDays(endOfToday, 6);

      // Parallelize fetches
      const weightRef = collection(db, 'users', user.uid, 'weightEntries');
      const weightQuery = query(
        weightRef,
        where('date', '>=', startOfLast7Days),
        orderBy('date', 'asc')
      );

      const journalRef = collection(db, 'users', user.uid, 'dailyLogs');
      const journalQuery = query(
        journalRef,
        where('date', '>=', format(startOfLast7Days, 'yyyy-MM-dd')),
        where('date', '<=', format(endOfToday, 'yyyy-MM-dd'))
      );
      
      const [weightSnap, journalSnap] = await Promise.all([
          getDocs(weightQuery),
          getDocs(journalQuery)
      ]);
      
      const weeklyWeights = weightSnap.docs.map(
        (doc) => doc.data() as WeightEntry
      );

      let weightChange = 0;
      if (weeklyWeights.length > 1) {
        const firstWeight = weeklyWeights[0].weight;
        const lastWeight = weeklyWeights[weeklyWeights.length - 1].weight;
        weightChange = lastWeight - firstWeight;
      }

      const weeklyLogs = journalSnap.docs.map(doc => doc.data() as DailyLog);

      setStats({
        weeklyWeightChange: weightChange,
        weeklyJournalEntries: weeklyLogs.length,
        calories: 0 // Will be calculated with meals data from local storage
      });
      
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
    const name = user?.displayName || user?.email?.split('@')[0] || 'Player';
    const nameWithoutNumbers = name.replace(/[0-9]/g, '');
    return nameWithoutNumbers.charAt(0).toUpperCase() + nameWithoutNumbers.slice(1);
  }, [user]);

  const handleQuestExerciseToggle = (exerciseName: string, checked: boolean) => {
    if (!unexpectedQuest) return;
    const updatedExercises = unexpectedQuest.exercises.map(ex => 
        ex.name === exerciseName ? { ...ex, completed: checked } : ex
    );
    setUnexpectedQuest({ ...unexpectedQuest, exercises: updatedExercises });
  };

  const handleCompleteQuest = async () => {
    if (!user || !unexpectedQuest) return;
    
    const allCompleted = unexpectedQuest.exercises.every(ex => ex.completed);
    if (!allCompleted) {
        toast({
            variant: 'destructive',
            title: 'Incomplete Quest',
            description: 'You must complete all exercises to finish the quest.'
        });
        return;
    }
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const questDocRef = doc(db, 'users', user.uid, 'unexpectedQuests', todayStr);
    const userDocRef = doc(db, 'users', user.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userProfileSnap = await transaction.get(userDocRef);
            if (!userProfileSnap.exists()) throw new Error("User profile not found!");
            
            const currentProfile = userProfileSnap.data() as UserProfile;
            const newXp = (currentProfile.xp || 0) + XP_REWARDS.UNEXPECTED_QUEST;
            const newLevel = getLevel(newXp);
            
            transaction.update(userDocRef, { xp: newXp, level: newLevel });
            transaction.update(questDocRef, { isCompleted: true });
        });
        
        toast({
            title: `+${XP_REWARDS.UNEXPECTED_QUEST} XP!`,
            description: "You have successfully completed the Unexpected Quest!",
        });

    } catch (e) {
        console.error("Failed to complete unexpected quest:", e);
        toast({ variant: 'destructive', title: "Error", description: "Couldn't save quest completion." });
    }
  };


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
    <>
    <LevelUpModal isOpen={isLevelUpModalOpen} onOpenChange={setIsLevelUpModalOpen} />
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">
            {greeting}, {formattedUsername}!
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Welcome, Player. Your personal dashboard for holistic growth.
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
        </div>
      </header>

      {/* Unexpected Quest Section */}
      {!isQuestLoading && unexpectedQuest && (
        <div
            className="p-6 font-mono text-cyan-200 border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20 rounded-lg bg-black/70 backdrop-blur-sm"
            style={{ textShadow: '0 0 5px hsl(198 90% 55% / 0.5)'}}
        >
            <div className='flex items-center gap-4 px-4 py-2 border border-cyan-400/50 rounded-md mb-6'>
                <AlertCircle className="size-6 text-cyan-300"/>
                <h3 className="text-xl font-bold tracking-widest text-cyan-300">QUEST INFO</h3>
            </div>
            
            <div className="text-center mb-6">
                <p className='tracking-wider'>[Daily Quest: {unexpectedQuest.title} has arrived.]</p>
            </div>
            
            <div className="mb-8">
                <h4 className='text-center text-lg font-bold tracking-widest mb-4 border-b-2 border-cyan-400/50 pb-2 w-24 mx-auto'>GOAL</h4>
                <ul className='space-y-3'>
                    {unexpectedQuest.exercises.map((ex, i) => (
                       <li key={i} className="flex justify-between items-center text-lg">
                           <span>{ex.name}</span>
                           <div className="flex items-center gap-3">
                               <span className='font-sans tracking-widest'>[{ex.goal}{ex.unit}]</span>
                               <Checkbox 
                                    id={`ex-${ex.name}`} 
                                    checked={ex.completed}
                                    onCheckedChange={(checked) => handleQuestExerciseToggle(ex.name, checked as boolean)}
                                    disabled={unexpectedQuest.isCompleted}
                                />
                           </div>
                       </li>
                    ))}
                </ul>
            </div>
            
            <div className='text-center space-y-2 mb-8'>
                <p className='font-bold text-lg tracking-wider text-cyan-100'>WARNING: Failure to complete</p>
                <p className='text-md tracking-wider text-cyan-200/80'>the daily quest will result in</p>
                <p className='text-md tracking-wider text-cyan-200/80'>an appropriate <span className="text-red-400 font-bold" style={{textShadow: '0 0 5px hsl(350 78% 55% / 0.8)'}}>penalty.</span></p>
            </div>

            {!unexpectedQuest.isCompleted && (
                <div className='flex justify-center'>
                    <button 
                        onClick={handleCompleteQuest}
                        className="p-2 border-2 border-cyan-400/80 rounded-md hover:bg-cyan-400/20 hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!unexpectedQuest.exercises.every(ex => ex.completed)}
                    >
                        <Check className="size-10 text-cyan-300 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            )}
             {unexpectedQuest.isCompleted && (
                <p className="text-center text-green-500 font-bold tracking-widest">[ Quest Completed ]</p>
            )}

        </div>
      )}

      {/* Gamification Section */}
       <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading || !profile ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/4 bg-muted/20" />
              <Skeleton className="h-4 w-full bg-muted" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Level {currentLevel}</span>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
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
                        <p className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent'>{challengeProgress.week}</p>
                        <p className='text-muted-foreground'>Week</p>
                    </div>
                     <div>
                        <p className='text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent'>{challengeProgress.day}</p>
                        <p className='text-muted-foreground'>Day</p>
                    </div>
                </div>
            </CardContent>
        </Card>
       )}
    </div>
    </>
  );
}

export default withAuth(DashboardPage);
