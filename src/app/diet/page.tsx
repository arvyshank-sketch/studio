'use client';

import { useState, useMemo, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MealEntry } from '@/lib/types';
import { UtensilsCrossed, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { MEALS_STORAGE_KEY } from '@/lib/constants';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';

const mealSchema = z.object({
  name: z.string().min(1, 'Meal name is required'),
  calories: z.coerce.number().min(0, 'Calories must be a positive number'),
});

type MealFormValues = z.infer<typeof mealSchema>;

function DietPage() {
  const [allMeals, setAllMeals] = useSyncedLocalStorage<MealEntry[]>(MEALS_STORAGE_KEY, []);
  
  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: { name: '', calories: 0 },
  });
  
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const todaysMeals = useMemo(() => {
    return allMeals.filter(meal => meal.date === today);
  }, [allMeals, today]);

  const onSubmit: SubmitHandler<MealFormValues> = (data) => {
    const newMeal: MealEntry = { ...data, id: Date.now(), date: today };
    setAllMeals((prev) => [...prev, newMeal]);
    form.reset();
  };

  const deleteMeal = useCallback((id: number) => {
    setAllMeals((prev) => prev.filter((meal) => meal.id !== id));
  },[setAllMeals]);

  const totalCalories = useMemo(
    () => todaysMeals.reduce((total, meal) => total + meal.calories, 0),
    [todaysMeals]
  );

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Diet &amp; Calories
        </h1>
        <p className="text-muted-foreground">
          Log your meals to track your daily calorie intake.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Log a Meal</CardTitle>
            <CardDescription>Add a new meal to your daily log.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Chicken Salad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 350" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Add Meal</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Log</CardTitle>
            <CardDescription>
              A list of all meals you've logged today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysMeals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meal</TableHead>
                    <TableHead className="text-right">Calories</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysMeals.map((meal) => (
                    <TableRow key={meal.id}>
                      <TableCell className="font-medium">{meal.name}</TableCell>
                      <TableCell className="text-right">
                        {meal.calories}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteMeal(meal.id)}>
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Delete meal</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <UtensilsCrossed className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Meals Logged Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the form to add your first meal of the day.
                </p>
              </div>
            )}
          </CardContent>
           {todaysMeals.length > 0 && (
            <CardFooter>
                <div className="w-full text-right text-lg font-bold">
                    Total: {totalCalories} Calories
                </div>
            </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}

export default DietPage;
