'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isSameDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { JOURNAL_STORAGE_KEY } from '@/lib/constants';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';

const journalSchema = z.object({
  studyHours: z.coerce.number().min(0),
  quranPages: z.coerce.number().min(0),
  expenses: z.coerce.number().min(0, 'Expenses must be a positive number'),
  abstained: z.boolean().default(false),
});

type JournalFormValues = z.infer<typeof journalSchema>;

function JournalPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useSyncedLocalStorage<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      studyHours: 0,
      quranPages: 0,
      expenses: 0,
      abstained: false,
    },
  });
  
  const selectedDateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  useEffect(() => {
    const todayEntry = entries.find((e) => e.date === selectedDateString);
    if (todayEntry) {
      form.reset(todayEntry);
    } else {
        form.reset({
            studyHours: 0,
            quranPages: 0,
            expenses: 0,
            abstained: false,
        });
    }
  }, [selectedDateString, entries, form]);

  const calculateStreak = useCallback(() => {
    const sortedAbstinenceDays = entries
        .filter(e => e.abstained)
        .map(e => new Date(e.date))
        .sort((a, b) => b.getTime() - a.getTime());

    if (sortedAbstinenceDays.length === 0) return 0;

    let currentStreak = 0;
    let lastDate = new Date();
    
    const todayIsTracked = sortedAbstinenceDays.some(d => isSameDay(d, lastDate));
    if (!todayIsTracked) {
        lastDate.setDate(lastDate.getDate() - 1);
    }

    for (const date of sortedAbstinenceDays) {
        if (isSameDay(date, lastDate)) {
            currentStreak++;
            lastDate.setDate(lastDate.getDate() - 1);
        } else {
            break;
        }
    }
    return currentStreak;
  }, [entries]);

  const currentStreak = useMemo(() => calculateStreak(), [calculateStreak]);

  const onSubmit: SubmitHandler<JournalFormValues> = (data) => {
    const newEntry: JournalEntry = { date: selectedDateString, ...data, streak: 0 };
    setEntries((prev) => {
      const updatedEntries = prev.filter((e) => e.date !== selectedDateString);
      return [...updatedEntries, newEntry];
    });
    
    toast({
        title: "Journal Saved",
        description: `Your entry for ${format(selectedDate, "MMMM d")} has been saved.`,
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Daily Journal
        </h1>
        <p className="text-muted-foreground">Track your daily habits and progress.</p>
      </header>
      
      <div className="space-y-4">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Log for {format(selectedDate, "MMMM d, yyyy")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <FormField
                            control={form.control}
                            name="abstained"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-4">
                                     <div className="bg-red-100 p-3 rounded-full">
                                         <Flame className="w-6 h-6 text-red-500" />
                                     </div>
                                    <div>
                                        <FormLabel className="text-lg font-semibold">Self-Discipline</FormLabel>
                                        <FormDescription>Current Streak: {currentStreak} days</FormDescription>
                                    </div>
                                </div>
                                <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="h-8 w-8 rounded-full data-[state=checked]:bg-primary"
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="studyHours"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-4">
                                     <div className="bg-blue-100 p-3 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M11 6h2v6h-2zm0 8h2v2h-2z"></path></svg>
                                     </div>
                                    <div>
                                        <FormLabel className="text-lg font-semibold">Study</FormLabel>
                                    </div>
                                </div>
                                <FormControl>
                                     <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            <SelectItem value="0.5">30 min</SelectItem>
                                            <SelectItem value="1">1 hour</SelectItem>
                                            <SelectItem value="2">2 hours</SelectItem>
                                            <SelectItem value="3">3+ hours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="quranPages"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-4">
                                     <div className="bg-green-100 p-3 rounded-full">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M19 2H5c-1.103 0-2 .897-2 2v16c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM5 20V4h14l.002 16H5z"></path><path d="M7 6h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"></path></svg>
                                     </div>
                                    <div>
                                        <FormLabel className="text-lg font-semibold">Quran</FormLabel>
                                    </div>
                                </div>
                                <FormControl>
                                      <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            <SelectItem value="1">1-2</SelectItem>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="expenses"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-4">
                                     <div className="bg-yellow-100 p-3 rounded-full">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path><path d="M13 12.586 14.707 11.293l-1.414-1.414L12 11.586l-1.293-1.293-1.414 1.414L11 12.586v3.414h2v-2.586z"></path><path d="M12.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"></path></svg>
                                     </div>
                                    <div>
                                        <FormLabel className="text-lg font-semibold">Expenses</FormLabel>
                                    </div>
                                </div>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        {...field}
                                        className="w-[120px]"
                                    />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                <Button type="submit" className="w-full">Save Journal</Button>
            </form>
        </Form>
      </div>
    </div>
  );
}

export default JournalPage;
