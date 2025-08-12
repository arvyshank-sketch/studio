'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { Habit, HabitEntry } from '@/lib/types';
import { Plus, Trash2, X } from 'lucide-react';

const habitSchema = z.object({
  name: z.string().min(1, 'Habit name is required'),
});

type HabitFormValues = z.infer<typeof habitSchema>;

const HABITS_STORAGE_KEY = 'synergy-habits';
const HABIT_ENTRIES_STORAGE_KEY = 'synergy-habit-entries';

const defaultHabits: Habit[] = [
    { id: 1, name: 'Studied for 1+ hour' },
    { id: 2, name: 'Read Quran' },
    { id: 3, name: 'Tracked all expenses' },
    { id: 4, name: 'Practiced self-discipline' },
];

export default function JournalPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    setIsClient(true);
    try {
      const storedHabits = localStorage.getItem(HABITS_STORAGE_KEY);
      if (storedHabits) {
        setHabits(JSON.parse(storedHabits));
      } else {
        setHabits(defaultHabits);
      }

      const storedEntries = localStorage.getItem(HABIT_ENTRIES_STORAGE_KEY);
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Failed to load data from local storage', error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
        localStorage.setItem(HABIT_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error('Failed to save data to local storage', error);
      }
    }
  }, [habits, entries, isClient]);
  
  const today = useMemo(() => isClient ? format(new Date(), 'yyyy-MM-dd') : '', [isClient]);

  const todaysCompletedHabitIds = useMemo(() => {
    if (!isClient) return new Set();
    const todaysEntry = entries.find(e => e.date === today);
    return new Set(todaysEntry?.completedHabitIds || []);
  }, [entries, today, isClient]);

  const onAddHabit: SubmitHandler<HabitFormValues> = (data) => {
    setHabits((prev) => [...prev, { id: Date.now(), name: data.name }]);
    form.reset();
  };

  const deleteHabit = (id: number) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== id));
    // Also remove completions for this habit from all entries
    setEntries(prev => prev.map(entry => ({
      ...entry,
      completedHabitIds: entry.completedHabitIds.filter(habitId => habitId !== id),
    })));
  };

  const toggleHabitCompletion = (habitId: number) => {
    setEntries(prev => {
      const existingEntryIndex = prev.findIndex(e => e.date === today);
      let newCompletedIds: number[];

      if (existingEntryIndex > -1) {
        const existingEntry = prev[existingEntryIndex];
        const completedIds = new Set(existingEntry.completedHabitIds);
        if (completedIds.has(habitId)) {
          completedIds.delete(habitId);
        } else {
          completedIds.add(habitId);
        }
        newCompletedIds = Array.from(completedIds);
        
        const updatedEntries = [...prev];
        updatedEntries[existingEntryIndex] = { ...existingEntry, completedHabitIds: newCompletedIds };
        return updatedEntries;

      } else {
        newCompletedIds = [habitId];
        const newEntry: HabitEntry = { date: today, completedHabitIds: newCompletedIds };
        return [...prev, newEntry];
      }
    });
  };


  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Daily Habits
        </h1>
        <p className="text-muted-foreground">
          Check off the habits you've completed today.
        </p>
      </header>

      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Habits</CardTitle>
            <CardDescription>
              {isClient ? format(new Date(), 'MMMM d, yyyy') : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isClient && habits.length > 0 ? (
                <div className="space-y-4">
                {habits.map(habit => (
                    <div key={habit.id} className="flex items-center space-x-3 rounded-md border p-4">
                        <Checkbox
                            id={`habit-${habit.id}`}
                            checked={todaysCompletedHabitIds.has(habit.id)}
                            onCheckedChange={() => toggleHabitCompletion(habit.id)}
                        />
                        <label
                            htmlFor={`habit-${habit.id}`}
                            className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            {habit.name}
                        </label>
                    </div>
                ))}
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <h3 className="text-lg font-semibold">No Habits Defined</h3>
                    <p className="text-sm text-muted-foreground">
                    Use the form on the right to add your first habit.
                    </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Add a New Habit</CardTitle>
              <CardDescription>Expand your list of daily habits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onAddHabit)}
                  className="flex items-start gap-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="sr-only">Habit Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Meditate for 10 mins" {...field} />
                        </FormControl>
                        <FormMessage className="pt-2" />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="icon">
                    <Plus className="size-4" />
                    <span className="sr-only">Add Habit</span>
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Manage Habits</CardTitle>
              <CardDescription>Add or remove habits from your list.</CardDescription>
            </CardHeader>
            <CardContent>
                {isClient && habits.length > 0 ? (
                    <ul className="space-y-2">
                    {habits.map(habit => (
                        <li key={habit.id} className="flex items-center justify-between rounded-md border bg-muted/50 p-3 text-sm">
                            <span className="font-medium">{habit.name}</span>
                            <Button variant="ghost" size="icon" onClick={() => deleteHabit(habit.id)}>
                                <X className="size-4 text-destructive" />
                                <span className="sr-only">Delete habit</span>
                            </Button>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No habits yet.</p>
                )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
