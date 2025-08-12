'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
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
import { useToast } from '@/hooks/use-toast';
import type { WeightEntry } from '@/lib/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const weightSchema = z.object({
  weight: z.coerce.number().positive('Weight must be a positive number'),
});

type WeightFormValues = z.infer<typeof weightSchema>;

const WEIGHT_STORAGE_KEY = 'synergy-weight';

export default function WeightPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const storedEntries = localStorage.getItem(WEIGHT_STORAGE_KEY);
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Failed to load weight entries from local storage', error);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        console.error('Failed to save weight entries to local storage', error);
      }
    }
  }, [entries, isClient]);

  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      weight: undefined,
    },
  });

  const onSubmit: SubmitHandler<WeightFormValues> = (data) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setEntries((prev) => {
      const existingIndex = prev.findIndex((e) => e.date === today);
      const newEntry = { date: today, weight: data.weight };
      if (existingIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingIndex] = newEntry;
        return updatedEntries;
      }
      return [...prev, newEntry];
    });
    toast({
      title: 'Weight Logged',
      description: `Today's weight of ${data.weight}kg has been saved.`,
    });
    form.reset({ weight: undefined });
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Weight Tracking
        </h1>
        <p className="text-muted-foreground">
          Monitor your weight to stay on top of your fitness goals.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Log Today's Weight</CardTitle>
            <CardDescription>
              Enter your weight for today. If an entry exists, it will be updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 75.5"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Save Weight
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress Over Time</CardTitle>
            <CardDescription>
              Your weight changes visualized.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pr-8">
            {isClient && sortedEntries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedEntries}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="url(#colorWeight)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <TrendingUp className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Not Enough Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Log your weight for a few days to see a chart of your progress.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
