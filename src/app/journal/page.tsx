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

export default function JournalPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [today, setToday] = useState('');
  const JOURNAL_STORAGE_KEY = `synergy-journal-${today}`;

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
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    setToday(todayStr);
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isClient && today) {
      try {
        const storedEntry = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (storedEntry) {
          const data: JournalEntry = JSON.parse(storedEntry);
          form.reset(data);
        }
      } catch (error) {
        console.error('Failed to load journal entry from local storage', error);
      }
    }
  }, [isClient, today, form, JOURNAL_STORAGE_KEY]);


  const onSubmit: SubmitHandler<JournalFormValues> = (data) => {
    if (!isClient || !today) return;
    try {
      const entryToSave: JournalEntry = { ...data, date: today };
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entryToSave));
      toast({
        title: 'Journal Saved',
        description: "Today's entry has been successfully saved.",
      });
    } catch (error) {
      console.error('Failed to save journal entry', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save your journal entry.',
      });
    }
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
              Fill in the details for your activities today.
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
