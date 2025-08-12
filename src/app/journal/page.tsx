'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays, isToday, parseISO } from 'date-fns';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { JournalEntry } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flame } from 'lucide-react';

const journalSchema = z.object({
  studyHours: z.coerce.number().min(0),
  quranPages: z.coerce.number().min(0),
  expenses: z.coerce.number().min(0, 'Expenses must be a positive number'),
  abstained: z.boolean().default(false),
});

type JournalFormValues = z.infer<typeof journalSchema>;

const JOURNAL_STORAGE_KEY = 'synergy-journal-entries';

export default function JournalPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedEntries = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Failed to load journal entries from local storage', error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error('Failed to save journal entries to local storage', error);
      }
    }
  }, [entries, isClient]);

  const today = useMemo(() => isClient ? format(new Date(), 'yyyy-MM-dd') : '', [isClient]);
  const yesterday = useMemo(() => isClient ? format(subDays(new Date(), 1), 'yyyy-MM-dd') : '', [isClient]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      studyHours: 0,
      quranPages: 0,
      expenses: 0,
      abstained: false,
    },
  });

  const todaysEntry = useMemo(() => entries.find(e => e.date === today), [entries, today]);
  const yesterdaysEntry = useMemo(() => entries.find(e => e.date === yesterday), [entries, yesterday]);
  const currentStreak = useMemo(() => todaysEntry?.streak ?? 0, [todaysEntry]);

  useEffect(() => {
    if (isClient) {
        if (todaysEntry) {
            form.reset(todaysEntry);
        } else {
            form.reset({
                studyHours: 0,
                quranPages: 0,
                expenses: 0,
                abstained: false,
            });
        }
    }
  }, [today, entries, form, isClient, todaysEntry]);


  const onSubmit: SubmitHandler<JournalFormValues> = (data) => {
    setEntries((prev) => {
      let newStreak = 0;
      if (data.abstained) {
        // If abstained today, continue or start streak
        const yesterdayStreak = yesterdaysEntry?.abstained ? (yesterdaysEntry.streak || 0) : 0;
        newStreak = yesterdayStreak + 1;
      }
      
      const newEntry = { date: today, ...data, streak: newStreak };

      const existingIndex = prev.findIndex((e) => e.date === today);
      if (existingIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingIndex] = newEntry;
        return updatedEntries;
      }
      return [...prev, newEntry];
    });
    toast({
      title: 'Journal Saved',
      description: "Today's journal entry has been saved successfully.",
    });
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Daily Journal
        </h1>
        <p className="text-muted-foreground">
          Log your daily activities, expenses, and track your self-discipline.
        </p>
      </header>
      
       <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isClient ? currentStreak : 0} days</div>
            <p className="text-xs text-muted-foreground">
              {isClient && !todaysEntry?.abstained && currentStreak > 0 ? "Streak broken. Keep going!" : "Keep the fire burning!"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Today's Entry</CardTitle>
          <CardDescription>
            {isClient ? format(new Date(), 'MMMM d, yyyy') : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <FormField
                control={form.control}
                name="abstained"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border bg-card p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Practiced Self-Discipline
                      </FormLabel>
                      <FormDescription>
                        Check this box if you successfully practiced self-discipline today.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Study Time</FormLabel>
                     <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select study duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="1.5">1.5 hours</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="3">3+ hours</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quranPages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quran Reading</FormLabel>
                     <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select pages read" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="0">None</SelectItem>
                            <SelectItem value="1">1-2 pages</SelectItem>
                            <SelectItem value="5">5 pages</SelectItem>
                            <SelectItem value="10">10 pages</SelectItem>
                            <SelectItem value="20">20+ pages (Juz)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Financial Expenses</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 15.50"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Log the total amount you spent today.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">
                Save Journal
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
