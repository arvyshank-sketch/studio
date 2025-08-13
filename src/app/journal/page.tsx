
'use client';

import { useState, useEffect, useMemo, useCallback }from 'react';
import { useForm, Controller }from 'react-hook-form';
import { zodResolver }from '@hookform/resolvers/zod';
import { z }from 'zod';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { db }from '@/lib/firebase';
import { useAuth }from '@/context/auth-context';
import withAuth from '@/components/with-auth';
import type { DailyLog, Habit, UserProfile }from '@/lib/types';
import { format, subDays, parse }from 'date-fns';
import { processGamification } from '@/lib/gamification';

import { Button }from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input }from '@/components/ui/input';
import { Textarea }from '@/components/ui/textarea';
import { useToast }from '@/hooks/use-toast';
import { Switch }from '@/components/ui/switch';
import { Loader2, BookOpen, Brain, DollarSign, HeartHandshake, CheckCircle, Flame, Repeat, PlusCircle }from 'lucide-react';
import { Skeleton }from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { HabitManager } from '@/components/habit-manager';

const logSchema = z.object({
  studyDuration: z.coerce.number().min(0).optional(),
  quranPagesRead: z.coerce.number().min(0).optional(),
  expenses: z.coerce.number().min(0, 'Must be a positive number').max(1000000, "Please enter a reasonable expense amount.").optional(),
  abstained: z.boolean().default(false),
  notes: z.string().optional(),
  customHabits: z.record(z.boolean()).optional(),
});


const studyOptions = [
    { value: 0.5, label: '30 min' },
    { value: 1, label: '1 hour' },
    { value: 1.5, label: '1.5 hours' },
    { value: 2, label: '2 hours' },
];

const quranOptions = [
    { value: 1, label: '1 Page' },
    { value: 3, label: '3 Pages' },
    { value: 5, label: '5 Pages' },
    { value: 10, label: '10 Pages' },
    { value: 15, label: '15 Pages' },
    { value: 20, label: "One Juz'" }, // One Juz is ~20 pages
];

function DailyLogPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isHabitManagerOpen, setIsHabitManagerOpen] = useState(false);
  
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const form = useForm<z.infer<typeof logSchema>>({
    resolver: zodResolver(logSchema),
    defaultValues: {
        studyDuration: 0,
        quranPagesRead: 0,
        expenses: 0,
        abstained: false,
        notes: '',
        customHabits: {},
    }
  });

  const userDocRef = useMemo(() => {
    if (user) {
      return doc(db, 'users', user.uid);
    }
    return null;
  }, [user]);

  const docRef = useMemo(() => {
    if (user) {
      return doc(db, 'users', user.uid, 'dailyLogs', today);
    }
    return null;
  }, [user, today]);

  const logsCollectionRef = useMemo(() => {
    if (user) {
      return collection(db, 'users', user.uid, 'dailyLogs');
    }
    return null;
  }, [user]);
  

  const calculateStreak = useCallback(async () => {
    if (!logsCollectionRef) return 0;
  
    const q = query(logsCollectionRef, orderBy('date', 'desc'), limit(100));
    const snapshot = await getDocs(q);
  
    let currentStreak = 0;
    let expectedDate = new Date();
  
    const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as (DailyLog & {id: string})[];

    // Check today's entry first
    const todayLog = logs.find(log => log.date === format(new Date(), 'yyyy-MM-dd'));
    if (todayLog && todayLog.abstained) {
        currentStreak = 1;
        expectedDate = subDays(new Date(), 1);
    } else if (todayLog && !todayLog.abstained) {
        return 0; // Streak broken today
    } else {
        // No log for today, check starting from yesterday
        expectedDate = subDays(new Date(), 1);
    }

    const sortedLogs = logs
        .filter(log => log.date !== format(new Date(), 'yyyy-MM-dd')) // exclude today which is already checked
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const log of sortedLogs) {
      const logDate = parse(log.date, 'yyyy-MM-dd', new Date());
      if (format(logDate, 'yyyy-MM-dd') === format(expectedDate, 'yyyy-MM-dd')) {
        if (log.abstained) {
          currentStreak++;
          expectedDate = subDays(expectedDate, 1);
        } else {
          break; // Streak broken
        }
      } else {
        // Gap in dates, streak is broken
        break;
      }
    }
  
    return currentStreak;
  }, [logsCollectionRef]);


  useEffect(() => {
    if (!userDocRef) return;
    
    // Set up real-time listener for user profile
    const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const profileData = doc.data() as UserProfile;
            setUserProfile(profileData);
            // Ensure form has default values for new habits
            const currentHabits = form.getValues('customHabits') || {};
            const newHabits = profileData.habits?.reduce((acc, habit) => {
                acc[habit.id] = currentHabits[habit.id] || false;
                return acc;
            }, {} as Record<string, boolean>) || {};
            form.setValue('customHabits', newHabits);
        }
    }, (error) => {
         console.error('Error listening to profile updates:', error);
         toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch user profile.',
        });
    });

    // Fetch initial log and calculate streak
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (docRef) {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              form.reset(docSnap.data() as z.infer<typeof logSchema>);
            }
        }
        const currentStreak = await calculateStreak();
        setStreak(currentStreak);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch today\'s log.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();

    return () => {
        unsubscribeProfile();
    };
  }, [userDocRef, docRef, toast, calculateStreak, form]);

  const handleFormSubmit = async (data: z.infer<typeof logSchema>) => {
    if (!docRef || !userDocRef) return;
    setIsSubmitting(true);
    
    const logData: DailyLog = {
      date: today,
      studyDuration: data.studyDuration || 0,
      quranPagesRead: data.quranPagesRead || 0,
      expenses: data.expenses || 0,
      abstained: data.abstained || false,
      notes: data.notes || '',
      customHabits: data.customHabits || {},
    };

    try {
      await runTransaction(db, async (transaction) => {
        const userProfileSnap = await transaction.get(userDocRef);
        if (!userProfileSnap.exists()) {
          throw new Error("User profile not found!");
        }
        const profile = userProfileSnap.data() as UserProfile;

        // Note: The gamification logic needs *all* logs. For simplicity in this transaction,
        // we'll fetch them here. For larger datasets, consider optimizing this.
        const allLogsQuery = query(logsCollectionRef!, orderBy('date', 'desc'));
        const allLogsSnap = await getDocs(allLogsQuery);
        const allLogs = allLogsSnap.docs.map(doc => doc.data() as DailyLog);

        transaction.set(docRef, logData, { merge: true });

        const updatedProfile = processGamification(profile, allLogs, logData);

        transaction.update(userDocRef, updatedProfile);
      });
      
      const newStreak = await calculateStreak();
      setStreak(newStreak);

      toast({
        title: 'Log Saved!',
        description: "Your progress, XP, and badges have been updated.",
        action: <div className="p-2 bg-green-500 text-white rounded-full"><CheckCircle size={24} /></div>,
      });
    } catch (error) {
      console.error('Error saving log:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your log.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Daily Log
        </h1>
        <p className="text-muted-foreground">
          Track your core activities for {format(new Date(), 'MMMM d, yyyy')}.
        </p>
      </header>

       <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Log Your Day</CardTitle>
                        <CardDescription>Fill in your accomplishments and activities for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-6">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-10 w-24" />
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <FormField
                                    control={form.control}
                                    name="studyDuration"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="flex items-center gap-2"><Brain /> Study Duration</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={(value) => field.onChange(parseFloat(value))}
                                                value={field.value?.toString()}
                                                className="flex flex-wrap gap-4"
                                                >
                                                {studyOptions.map(option => (
                                                    <FormItem key={option.value} className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={option.value.toString()} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{option.label}</FormLabel>
                                                    </FormItem>
                                                ))}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="quranPagesRead"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="flex items-center gap-2"><BookOpen /> Qur'an Read</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                onValueChange={(value) => field.onChange(parseInt(value))}
                                                value={field.value?.toString()}
                                                className="flex flex-wrap gap-x-6 gap-y-4"
                                                >
                                                {quranOptions.map(option => (
                                                    <FormItem key={option.value} className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value={option.value.toString()} />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{option.label}</FormLabel>
                                                    </FormItem>
                                                ))}
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="expenses"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2"><DollarSign /> Financial Expenses</FormLabel>
                                                <FormControl><Input type="number" step="0.01" placeholder="0" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="abstained"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base flex items-center gap-2"><HeartHandshake /> Abstinence</FormLabel>
                                                <FormDescription>Did you abstain from masturbation?</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <Separator />

                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-medium flex items-center gap-2"><Repeat /> Custom Habits</h3>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsHabitManagerOpen(true)}>
                                            <PlusCircle className="size-5" />
                                            <span className="sr-only">Add or manage habits</span>
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {userProfile?.habits && userProfile.habits.length > 0 ? (
                                           userProfile.habits.map((habit) => (
                                                <FormField
                                                    key={habit.id}
                                                    control={form.control}
                                                    name={`customHabits.${habit.id}`}
                                                    render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base">{habit.name}</FormLabel>
                                                        </div>
                                                        <FormControl>
                                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                        </FormControl>
                                                    </FormItem>
                                                    )}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-sm text-center text-muted-foreground py-4">
                                                No custom habits added yet. Click the '+' icon to add one.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Any thoughts or reflections for today..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <CheckCircle />}
                                    Save Today's Log
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-8">
                <Card className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Flame /> Current Abstinence Streak</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        {isLoading ? (
                            <Skeleton className="h-24 w-24 rounded-full mx-auto bg-white/20" />
                        ) : (
                            <div className="text-6xl font-bold">{streak}</div>
                        )}
                        <p className="font-light mt-2">{streak === 1 ? 'Day' : 'Days'}</p>
                        <p className="text-sm mt-4 opacity-80">Keep going! Every day is a victory.</p>
                    </CardContent>
                </Card>
            </div>
        </form>
       </Form>
      <HabitManager
          isOpen={isHabitManagerOpen}
          setIsOpen={setIsHabitManagerOpen}
          profile={userProfile}
      />
    </div>
  );
}

export default withAuth(DailyLogPage);

    