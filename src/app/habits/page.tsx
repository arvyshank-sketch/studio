
'use client';

import withAuth from '@/components/with-auth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Lucide from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
  where,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { format, subDays, isToday, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Flame, Plus, Trash2, Zap, Target } from 'lucide-react';
import type { Habit, HabitEntry } from '@/lib/types';
import { generateMotivation } from '@/ai/flows/generate-motivation-flow';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const habitSchema = z.object({
  name: z.string().min(1, 'Habit name is required.'),
  icon: z.string().min(1, 'Icon is required.'),
});

type HabitFormValues = z.infer<typeof habitSchema>;

// Get available Lucide icons
const iconKeys = Object.keys(Lucide).filter(
  (key) => typeof Lucide[key as keyof typeof Lucide] === 'object' && key !== 'createLucideIcon' && key !== 'icons'
) as (keyof typeof Lucide)[];


function HabitTrackerPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: '', icon: 'CheckSquare' },
  });

  const habitsCollectionRef = useMemo(() => {
    if (user) return collection(db, 'users', user.uid, 'habits');
    return null;
  }, [user]);

  const habitEntriesCollectionRef = useMemo(() => {
    if (user) return collection(db, 'users', user.uid, 'habitEntries');
    return null;
  }, [user]);

  // Fetch habits
  useEffect(() => {
    if (!habitsCollectionRef) return;
    setIsLoading(true);
    const q = query(habitsCollectionRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const habitsData = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Habit)
        );
        setHabits(habitsData);
        // We set loading to false in the other effect, after all data is fetched
      },
      (error) => {
        console.error('Error fetching habits:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch habits.',
        });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [habitsCollectionRef, toast]);
  
    // Fetch today's habit entry
  useEffect(() => {
    if (!habitEntriesCollectionRef) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const q = query(habitEntriesCollectionRef, where('date', '==', todayStr));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setHabitEntries([]);
      } else {
        const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitEntry));
        setHabitEntries(entriesData);
      }
      setIsLoading(false); // All essential data is now loaded
    }, (error) => {
      console.error("Error fetching today's habit entry:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [habitEntriesCollectionRef]);


  const todayEntry = useMemo(() => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      return habitEntries.find(entry => entry.date === todayStr);
  }, [habitEntries]);

  const handleAddHabit = async (data: HabitFormValues) => {
    if (!habitsCollectionRef || !user) return;
    try {
      await addDoc(habitsCollectionRef, {
        userId: user.uid,
        name: data.name,
        icon: data.icon,
        createdAt: serverTimestamp(),
        currentStreak: 0,
        longestStreak: 0,
      });
      toast({ title: 'Success', description: 'Habit added!' });
      setIsAddDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the habit.',
      });
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!habitsCollectionRef) return;
    if (!window.confirm('Are you sure? This will delete the habit and all its history.')) return;
    
    try {
      // This is a simplified delete. For a production app, you might want to
      // also delete all related habit entries in a batched write or cloud function.
      await deleteDoc(doc(habitsCollectionRef, habitId));
      toast({ title: 'Success', description: 'Habit deleted.' });
    } catch (error) {
      console.error('Error deleting habit:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete habit.' });
    }
  }

  const handleToggleHabit = useCallback(async (habit: Habit, isChecked: boolean) => {
    if (!habitEntriesCollectionRef || !habitsCollectionRef) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    try {
        await runTransaction(db, async (transaction) => {
            let newCompletedIds: string[];
            
            const todayEntryRef = doc(habitEntriesCollectionRef, todayStr);
            const todayEntryDoc = await transaction.get(todayEntryRef);
            
            if (todayEntryDoc.exists()) {
                const currentCompletedIds = todayEntryDoc.data().completedHabitIds || [];
                if (isChecked) {
                    newCompletedIds = [...currentCompletedIds, habit.id];
                } else {
                    newCompletedIds = currentCompletedIds.filter(id => id !== habit.id);
                }
                transaction.update(todayEntryRef, { completedHabitIds: newCompletedIds });
            } else {
                 if (isChecked) {
                    newCompletedIds = [habit.id];
                    transaction.set(todayEntryRef, { date: todayStr, completedHabitIds: newCompletedIds });
                }
            }

            // Streak Logic
            const habitRef = doc(habitsCollectionRef, habit.id);
            const lastCompletedDate = habit.lastCompletedDate ? parseISO(habit.lastCompletedDate) : null;
            let newCurrentStreak = habit.currentStreak || 0;

            if (isChecked) {
                if (lastCompletedDate) {
                    const daysDifference = differenceInCalendarDays(new Date(), lastCompletedDate);
                    if (daysDifference === 1) {
                        newCurrentStreak += 1;
                    } else if (daysDifference > 1) {
                        newCurrentStreak = 1; // Reset streak
                    }
                    // if daysDifference is 0, do nothing.
                } else {
                    newCurrentStreak = 1;
                }
                
                transaction.update(habitRef, {
                    currentStreak: newCurrentStreak,
                    longestStreak: Math.max(habit.longestStreak || 0, newCurrentStreak),
                    lastCompletedDate: todayStr
                });

                 if (newCurrentStreak > (habit.currentStreak || 0) && newCurrentStreak > 1) {
                    generateMotivation().then(motivation => {
                        toast({
                            title: `🔥 ${motivation.title}`,
                            description: motivation.quote,
                        });
                    });
                }
            } else { // Unchecking
                 if (lastCompletedDate && isToday(lastCompletedDate)) {
                    // If we are un-checking today's completion, we need to revert the streak.
                    const yesterdayEntryRef = doc(habitEntriesCollectionRef, yesterdayStr);
                    const yesterdayEntryDoc = await transaction.get(yesterdayEntryRef);
                    const completedYesterday = yesterdayEntryDoc.exists() && yesterdayEntryDoc.data().completedHabitIds.includes(habit.id);

                    if (completedYesterday) {
                        // Revert to yesterday's streak
                        newCurrentStreak = habit.currentStreak - 1;
                    } else {
                        // It was a new streak, so reset
                        newCurrentStreak = 0;
                    }
                    
                    transaction.update(habitRef, {
                        currentStreak: newCurrentStreak,
                        lastCompletedDate: completedYesterday ? yesterdayStr : ''
                    });
                }
            }
        });
    } catch (error) {
        console.error("Transaction failed: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update habit." });
    }
  }, [habitEntriesCollectionRef, habitsCollectionRef, toast]);
  

  const IconPicker = ({ onSelect }: { onSelect: (iconName: string) => void }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                    {form.watch('icon') ? (
                        <>
                            <Lucide.Icon name={form.watch('icon') as keyof typeof Lucide} className="mr-2" />
                            {form.watch('icon')}
                        </>
                    ) : "Select an icon" }
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <div className="grid grid-cols-6 gap-1 p-2 h-64 overflow-y-auto">
                {iconKeys.map(iconName => {
                    const IconComponent = Lucide[iconName as keyof typeof Lucide] as Lucide.LucideIcon;
                    return (
                    <Button
                        key={iconName}
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(iconName)}
                    >
                        <IconComponent />
                    </Button>
                    );
                })}
                </div>
            </PopoverContent>
        </Popover>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Habit Tracker
            </h1>
            <p className="text-muted-foreground">
            Build consistency, one day at a time.
            </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2" />
                    New Habit
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a New Habit</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddHabit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Habit Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Read for 15 minutes" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <FormControl>
                                        <IconPicker onSelect={(iconName) => field.onChange(iconName)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Add Habit</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </header>
      
      {isLoading ? (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : habits.length > 0 ? (
        <div className="space-y-4">
          {habits.map(habit => {
            const IconComponent = Lucide[habit.icon as keyof typeof Lucide] as Lucide.LucideIcon;
            const isChecked = todayEntry?.completedHabitIds.includes(habit.id) ?? false;
            return (
              <Card key={habit.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox 
                    id={`habit-${habit.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggleHabit(habit, !!checked)}
                    className="size-6"
                  />
                  <div className="flex items-center gap-4 flex-1">
                      <div className="bg-primary/10 p-3 rounded-lg">
                         {IconComponent && <IconComponent className="size-6 text-primary" />}
                      </div>
                      <div className="flex-1">
                          <label htmlFor={`habit-${habit.id}`} className="font-medium text-lg cursor-pointer">{habit.name}</label>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1" title="Current Streak">
                        <Flame className="size-5 text-orange-500"/>
                        <span>{habit.currentStreak || 0}</span>
                    </div>
                     <div className="flex items-center gap-1" title="Longest Streak">
                        <Zap className="size-5 text-yellow-500"/>
                        <span>{habit.longestStreak || 0}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteHabit(habit.id)}>
                      <Trash2 className="size-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
          <Target className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Habits Yet</h3>
          <p className="text-sm text-muted-foreground">
             Click 'New Habit' to start tracking your first habit.
          </p>
        </div>
      )}
    </div>
  );
}

export default withAuth(HabitTrackerPage);
