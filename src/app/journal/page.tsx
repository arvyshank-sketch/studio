
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
} from 'firebase/firestore';
import { db }from '@/lib/firebase';
import { useAuth }from '@/context/auth-context';
import withAuth from '@/components/with-auth';
import type { DailyLog }from '@/lib/types';
import { format, subDays, parse }from 'date-fns';

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
import { Loader2, BookOpen, Brain, DollarSign, HeartHandshake, CheckCircle, Flame }from 'lucide-react';
import { Skeleton }from '@/components/ui/skeleton';
import { Slider }from '@/components/ui/slider';

const logSchema = z.object({
  studyDuration: z.coerce.number().min(0).max(8, "Study duration cannot exceed 8 hours").optional(),
  quranPagesRead: z.coerce.number().min(0, 'Must be a positive number').max(1000, "That's more pages than in the entire Qur'an!").optional(),
  expenses: z.coerce.number().min(0, 'Must be a positive number').max(1000000, "Please enter a reasonable expense amount.").optional(),
  abstained: z.boolean().default(false),
  notes: z.string().optional(),
});

type LogFormValues = z.infer<typeof logSchema>;

function DailyLogPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      studyDuration: 0,
      quranPagesRead: 0,
      expenses: 0,
      abstained: false,
      notes: '',
    },
  });

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
    const fetchLog = async () => {
      if (!docRef) return;
      setIsLoading(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data() as LogFormValues);
        }
        const currentStreak = await calculateStreak();
        setStreak(currentStreak);
      } catch (error) {
        console.error('Error fetching log:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch today\'s log.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLog();
  }, [docRef, form, toast, calculateStreak]);

  const handleFormSubmit = async (data: LogFormValues) => {
    if (!docRef) return;
    setIsSubmitting(true);
    
    const logData: DailyLog = {
      ...data,
      date: today,
      studyDuration: data.studyDuration || 0,
      quranPagesRead: data.quranPagesRead || 0,
      expenses: data.expenses || 0,
    }

    try {
      await setDoc(docRef, logData, { merge: true });
      const newStreak = await calculateStreak();
      setStreak(newStreak);

      toast({
        title: 'Log Saved!',
        description: "Today's activities have been successfully logged.",
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

  const studyDurationValue = form.watch('studyDuration');

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                    control={form.control}
                                    name="studyDuration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center justify-between">
                                                <span className='flex items-center gap-2'><Brain /> Study Duration</span>
                                                <span className="text-sm font-normal text-muted-foreground">
                                                  {field.value?.toFixed(2)} hours
                                                </span>
                                            </FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={0}
                                                    max={8}
                                                    step={0.25}
                                                    defaultValue={[field.value ?? 0]}
                                                    onValueChange={(value) => field.onChange(value[0])}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="expenses"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><DollarSign /> Financial Expenses</FormLabel>
                                            <FormControl><Input type="number" step="0.01" placeholder="0" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="quranPagesRead"
                                        render={({ field }) => (
                                          <FormItem>
                                              <FormLabel className="flex items-center gap-2"><BookOpen /> Qur'an Pages Read</FormLabel>
                                              <FormControl><Input type="number" step="1" placeholder="0" {...field} /></FormControl>
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
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
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
      </div>
    </div>
  );
}

export default withAuth(DailyLogPage);

    