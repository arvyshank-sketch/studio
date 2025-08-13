'use client';

import { useState, useMemo } from 'react';
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Trash2, Weight as WeightIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';
import { WEIGHT_STORAGE_KEY } from '@/lib/constants';

const weightSchema = z.object({
  weight: z.coerce.number().positive('Weight must be a positive number'),
});

type WeightFormValues = z.infer<typeof weightSchema>;

function WeightPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useSyncedLocalStorage<WeightEntry[]>(WEIGHT_STORAGE_KEY, []);

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
  
  const deleteEntry = (date: string) => {
    setEntries((prev) => prev.filter((entry) => entry.date !== date));
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);
  
  const chartData = useMemo(() => {
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

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 flex flex-col gap-8">
            <Card>
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

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                    <CardDescription>
                        All your logged weight entries.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedEntries.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Weight (kg)</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedEntries.map((entry) => (
                                    <TableRow key={entry.date}>
                                        <TableCell className="font-medium">{format(parseISO(entry.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">{entry.weight}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.date)}>
                                                <Trash2 className="size-4 text-destructive" />
                                                <span className="sr-only">Delete entry</span>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                            <WeightIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">No Entries Yet</h3>
                            <p className="text-sm text-muted-foreground">
                                Use the form to add your first weight entry.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progress Over Time</CardTitle>
            <CardDescription>
              Your weight changes visualized.
            </CardDescription>
          </Header>
          <CardContent className="h-[300px] w-full pr-8">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
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

export default WeightPage;
