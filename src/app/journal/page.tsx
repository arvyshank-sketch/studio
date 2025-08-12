'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { JournalEntry } from '@/lib/types';
import { format } from 'date-fns';

const journalSchema = z.object({
  studyHours: z.coerce.number().min(0, 'Must be a positive number'),
  quranPages: z.coerce.number().min(0, 'Must be a positive number'),
  expenses: z.coerce.number().min(0, 'Must be a positive number'),
  abstained: z.boolean().default(false),
});

type JournalFormValues = z.infer<typeof journalSchema>;

const JOURNAL_STORAGE_KEY = 'synergy-journal-history';

export default function JournalPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      studyHours: 0,
      quranPages: 0,
      expenses: 0,
      abstained: false,
    },
  });

  useEffect(() => {
    setIsClient(true);
    try {
      const storedEntries = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries);
        setEntries(parsedEntries);
        const today = format(new Date(), 'yyyy-MM-dd');
        const todaysEntry = parsedEntries.find((e: JournalEntry) => e.date === today);
        if (todaysEntry) {
          form.reset(todaysEntry);
        }
      }
    } catch (error) {
      console.error('Failed to load journal entries from local storage', error);
    }
  }, [form]);
  
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error('Failed to save journal entries to local storage', error);
      }
    }
  }, [entries, isClient]);


  const onSubmit: SubmitHandler<JournalFormValues> = (data) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setEntries((prev) => {
      const existingIndex = prev.findIndex((e) => e.date === today);
      const newEntry: JournalEntry = { ...data, date: today };
      if (existingIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingIndex] = newEntry;
        return updatedEntries;
      }
      return [...prev, newEntry];
    });

    toast({
      title: 'Journal Saved',
      description: "Today's entry has been successfully saved.",
    });
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Daily Journal
        </h1>
        <p className="text-muted-foreground">
          Log your daily activities and habits to stay on track.
        </p>
      </header>

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Today's Entry - {isClient ? format(new Date(), 'MMMM d, yyyy') : 'Loading...'}</CardTitle>
            <CardDescription>
              Fill in the details for your activities today. Your entry will be updated if it already exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="studyHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Studied</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quranPages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pages of Quran Read</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormLabel>Financial Expenses</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
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
                        <FormLabel>Self-Discipline</FormLabel>
                        <FormDescription>
                          Did you stay committed today?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Save Today's Journal
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
