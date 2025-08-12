'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, BookMarked, DollarSign, Sparkles, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { JournalEntry, MealEntry } from '@/lib/types';
import { format, parseISO, subDays } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const featureCards = [
  {
    title: 'Daily Journal',
    description: "Track study, piety, finances, and habits.",
    href: '/journal',
    icon: <BookMarked className="size-8 text-primary" />,
  },
  {
    title: 'Weight Tracking',
    description: 'Log your weight and see your progress over time.',
    href: '/weight',
    icon: <TrendingUp className="size-8 text-primary" />,
  },
  {
    title: 'Diet & Calories',
    description: 'Keep a log of your meals and daily calorie intake.',
    href: '/diet',
    icon: <UtensilsCrossed className="size-8 text-primary" />,
  },
  {
    title: 'AI Progress Analysis',
    description: 'Analyze your physique changes with AI.',
    href: '/progress',
    icon: <Sparkles className="size-8 text-primary" />,
  },
];

const JOURNAL_STORAGE_KEY = 'synergy-journal-history';
const MEALS_STORAGE_KEY = 'synergy-meals-history';

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedJournal = localStorage.getItem(JOURNAL_STORAGE_KEY);
      if (storedJournal) {
        setJournalEntries(JSON.parse(storedJournal));
      }
      const storedMeals = localStorage.getItem(MEALS_STORAGE_KEY);
      if (storedMeals) {
        setMealEntries(JSON.parse(storedMeals));
      }
    } catch (error) {
      console.error('Failed to load entries from local storage', error);
    }
  }, []);

  const last7DaysData = useMemo(() => {
    if (!isClient) return [];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, i)).reverse();
    
    return last7Days.map(date => {
        const dateString = format(date, 'yyyy-MM-dd');
        const journalEntry = journalEntries.find(e => e.date === dateString);
        const mealsForDay = mealEntries.filter(m => m.date === dateString);
        const totalCalories = mealsForDay.reduce((sum, meal) => sum + meal.calories, 0);

        return {
            date: dateString,
            studyHours: journalEntry?.studyHours || 0,
            quranPages: journalEntry?.quranPages || 0,
            expenses: journalEntry?.expenses || 0,
            calories: totalCalories,
        };
    });
  }, [journalEntries, mealEntries, isClient]);

  const hasData = useMemo(() => {
      return journalEntries.length > 0 || mealEntries.length > 0;
  }, [journalEntries, mealEntries]);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome to Synergy
        </h1>
        <p className="text-muted-foreground">Your personal dashboard for holistic growth.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((feature) => (
          <Link href={feature.href} key={feature.title} className="flex">
            <Card className="flex w-full flex-col justify-between transition-all hover:shadow-lg hover:scale-[1.02]">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-start p-0 text-primary hover:bg-transparent">
                  <span>Go to {feature.title}</span>
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <div className="mt-2">
        <Card>
            <CardHeader>
                <CardTitle>Weekly Review</CardTitle>
                <CardDescription>
                    Your journal and diet progress from the last 7 days.
                </CardDescription>
            </CardHeader>
            <CardContent>
              {isClient && hasData ? (
                <Tabs defaultValue="study">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="study">Study</TabsTrigger>
                    <TabsTrigger value="quran">Quran</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="calories">Calories</TabsTrigger>
                  </TabsList>
                  <TabsContent value="study" className="h-[300px] w-full pr-8 pt-4">
                     <JournalChart data={last7DaysData} dataKey="studyHours" color="hsl(var(--primary))" name="Hours Studied" icon={BookOpen} />
                  </TabsContent>
                   <TabsContent value="quran" className="h-[300px] w-full pr-8 pt-4">
                      <JournalChart data={last7DaysData} dataKey="quranPages" color="hsl(var(--chart-3))" name="Pages Read" icon={BookMarked} />
                   </TabsContent>
                   <TabsContent value="expenses" className="h-[300px] w-full pr-8 pt-4">
                      <JournalChart data={last7DaysData} dataKey="expenses" color="hsl(var(--chart-2))" name="Expenses" icon={DollarSign} />
                   </TabsContent>
                    <TabsContent value="calories" className="h-[300px] w-full pr-8 pt-4">
                        <JournalChart data={last7DaysData} dataKey="calories" color="hsl(var(--chart-4))" name="Calories" icon={UtensilsCrossed} />
                    </TabsContent>
                </Tabs>
              ) : (
                <div className="flex h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <TrendingUp className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Not Enough Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Log your journal or diet entries for a few days to see a chart of your progress.
                    </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


function JournalChart({ data, dataKey, color, name, icon: Icon }: { data: any[], dataKey: string, color: string, name: string, icon: React.ElementType }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
        <XAxis
          dataKey="date"
          tickFormatter={(str) => format(parseISO(str), 'MMM d')}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={['dataMin', `dataMax + ${dataKey === 'calories' ? 100 : 2}`]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
           formatter={(value) => [value, name]}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#color-${dataKey})`} strokeWidth={2} name={name} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
