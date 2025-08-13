'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, type SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays, addDays, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  Card,
  CardContent,
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
import { Flame, Plus, X } from 'lucide-react';
import { JOURNAL_STORAGE_KEY } from '@/lib/constants';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';

const journalSchema = z.object({
  studyHours: z.coerce.number().min(0),
  quranPages: z.coerce.number().min(0),
  expenses: z.coerce.number().min(0, 'Expenses must be a positive number'),
  abstained: z.boolean().default(false),
});

type JournalFormValues = z.infer<typeof journalSchema>;

const DateSelector = ({ selectedDate, setSelectedDate }: { selectedDate: Date, setSelectedDate: (date: Date) => void }) => {
  const dates = useMemo(() => {
    const start = subDays(new Date(), 3);
    const end = addDays(new Date(), 3);
    return eachDayOfInterval({ start, end });
  }, []);

  return (
    <div className="flex justify-center space-x-2 rounded-full bg-primary/10 p-2 mb-8">
      {dates.map((date) => (
        <Button
          key={date.toString()}
          variant={isSameDay(date, selectedDate) ? 'default' : 'ghost'}
          onClick={() => setSelectedDate(date)}
          className="flex flex-col h-auto rounded-full px-4 py-2"
        >
          <span className="text-xs">{format(date, 'EEE')}</span>
          <span className="font-bold text-lg">{format(date, 'd')}</span>
        </Button>
      ))}
    </div>
  );
};


export default function JournalPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useSyncedLocalStorage<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
  const [isClient, setIsClient] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedDateString = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  
  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      studyHours: 0,
      quranPages: 0,
      expenses: 0,
      abstained: false,
    },
  });

  const todaysEntry = useMemo(() => entries.find(e => e.date === selectedDateString), [entries, selectedDateString]);
  
  const calculateStreak = useCallback(() => {
    if (!entries.length) return 0;
  
    const sortedEntries = entries
        .filter(e => e.abstained)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
    if (sortedEntries.length === 0) return 0;
  
    let streak = 0;
    let expectedDate = new Date();
  
    // Check if today is a streak day
    const todayEntry = entries.find(e => isSameDay(new Date(e.date), expectedDate));
    if (todayEntry?.abstained) {
        streak++;
        expectedDate = subDays(expectedDate, 1);
    } else {
        // If today is not a streak day, the streak is 0 unless we are looking at a past date
         if (!isSameDay(selectedDate, new Date())) {
             // If looking at a past date, calculate streak up to that date
             expectedDate = selectedDate;
         } else {
            return 0;
         }
    }

    const sortedAbstinenceDays = entries
        .filter(e => e.abstained)
        .map(e => new Date(e.date))
        .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let lastDate = new Date();

    if (!sortedAbstinenceDays.some(d => isSameDay(d, lastDate))) {
        lastDate = subDays(lastDate, 1);
    }
    
    for (const date of sortedAbstinenceDays) {
        if (isSameDay(date, lastDate)) {
            currentStreak++;
            lastDate = subDays(lastDate, 1);
        } else {
            break;
        }
    }
    return currentStreak;
  }, [entries, selectedDate]);
  
  const currentStreak = useMemo(() => calculateStreak(), [calculateStreak]);

  useEffect(() => {
    if (isClient) {
        const entryForDate = entries.find(e => e.date === selectedDateString);
        if (entryForDate) {
            form.reset(entryForDate);
        } else {
            form.reset({
                studyHours: 0,
                quranPages: 0,
                expenses: 0,
                abstained: false,
            });
        }
    }
  }, [selectedDateString, entries, form, isClient]);


  const onSubmit: SubmitHandler<JournalFormValues> = (data) => {
    setEntries((prev) => {
      const newEntry = { date: selectedDateString, ...data, streak: 0 }; // Streak will be recalculated
      const existingIndex = prev.findIndex((e) => e.date === selectedDateString);
      
      let updatedEntries;
      if (existingIndex > -1) {
        updatedEntries = [...prev];
        updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], ...newEntry };
      } else {
        updatedEntries = [...prev, newEntry];
      }
      return updatedEntries;
    });
    toast({
      title: 'Journal Saved',
      description: "Your journal entry has been saved successfully.",
    });
  };

  const formValues = form.watch();
  useEffect(() => {
    // Auto-save on change
    const subscription = form.watch(() => {
        onSubmit(form.getValues());
    });
    return () => subscription.unsubscribe();
  }, [form, onSubmit]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Today
        </h1>
      </header>

      {isClient && <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
      
      <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xl">
        <CardContent className="p-6 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold">100 ways to</h2>
                <h1 className="text-4xl font-extrabold tracking-tight">LOVE MYSELF</h1>
                <Button className="mt-4 bg-yellow-400 text-purple-900 hover:bg-yellow-500">Let's Go!</Button>
            </div>
            <div className="text-6xl">
                <span role="img" aria-label="hugging face emoji">🤗</span>
            </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <FormProvider {...form}>
            <form>
                <Card>
                    <CardContent className="p-4">
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
                    </CardContent>
                </Card>

                 <Card>
                    <CardContent className="p-4">
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
                                        <FormDescription>Track your learning</FormDescription>
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
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardContent className="p-4">
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
                                        <FormDescription>Pages read</FormDescription>
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
                    </CardContent>
                </Card>

                 <Card>
                    <CardContent className="p-4">
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
                                        <FormDescription>Daily spending</FormDescription>
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
            </form>
        </FormProvider>
      </div>

       <div className="fixed bottom-24 right-6 z-50">
         <Button className="rounded-full w-16 h-16 shadow-lg">
           <Plus className="w-8 h-8" />
         </Button>
       </div>
    </div>
  );
}
