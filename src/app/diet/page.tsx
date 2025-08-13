
'use client';

import withAuth from "@/components/with-auth";
import { useState, useMemo, useCallback, useEffect } from 'react';
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
import type { DailyLog, MealEntry, UserProfile } from '@/lib/types';
import { UtensilsCrossed, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { format, startOfToday, endOfToday } from 'date-fns';
import { useAuth } from "@/context/auth-context";
import { runTransaction, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { processGamification, XP_REWARDS } from "@/lib/gamification";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const mealSchema = z.object({
  name: z.string().min(1, 'Meal name is required'),
  calories: z.coerce.number().min(0, 'Calories must be a positive number'),
});

type MealFormValues = z.infer<typeof mealSchema>;

function DietPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [todaysMeals, setTodaysMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: { name: '', calories: 0 },
  });
  
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const mealCollectionRef = useMemo(() => {
    if (user) {
      return collection(db, 'users', user.uid, 'mealEntries');
    }
    return null;
  }, [user]);

  useEffect(() => {
      if (!mealCollectionRef) return;
      setIsLoading(true);

      const todayStart = startOfToday();
      const todayEnd = endOfToday();

      const q = query(mealCollectionRef, 
        where('date', '>=', todayStart), 
        where('date', '<=', todayEnd), 
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const mealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealEntry));
          setTodaysMeals(mealsData);
          setIsLoading(false);
      }, (error) => {
          console.error("Error fetching meal entries:", error);
          toast({ variant: 'destructive', title: 'Error', description: "Could not fetch today's meals."});
          setIsLoading(false);
      });

      return () => unsubscribe();
  }, [mealCollectionRef, toast]);


  const onSubmit: SubmitHandler<MealFormValues> = async (data) => {
    if (!user || !mealCollectionRef) return;

    setIsSubmitting(true);
    const isFirstLogToday = todaysMeals.length === 0;

    const newMealData = { ...data, date: serverTimestamp() };
    
    try {
        await addDoc(mealCollectionRef, newMealData);
        form.reset();

        // If it's the first meal logged today, award XP
        if (isFirstLogToday) {
            const userDocRef = doc(db, 'users', user.uid);
            const dailyLogRef = doc(db, 'users', user.uid, 'dailyLogs', todayStr);

            await runTransaction(db, async (transaction) => {
                const userProfileSnap = await transaction.get(userDocRef);
                const dailyLogSnap = await transaction.get(dailyLogRef);

                if (!userProfileSnap.exists()) {
                    throw new Error("User profile not found!");
                }
                
                const profile = userProfileSnap.data() as UserProfile;
                const dailyLog = (dailyLogSnap.exists() ? dailyLogSnap.data() : {}) as Partial<DailyLog>;
                
                if (dailyLog.caloriesLogged) return;

                const { updatedProfile } = await processGamification({
                    userProfile: profile,
                    allLogs: [], 
                    newLog: { caloriesLogged: true },
                    previousLog: null,
                    userId: user.uid,
                    transaction: transaction
                });
                
                transaction.update(userDocRef, updatedProfile);
                transaction.set(dailyLogRef, { caloriesLogged: true, date: todayStr }, { merge: true });
            });
            
            toast({
                title: `+${XP_REWARDS.CALORIE_LOGGED} XP!`,
                description: "You've earned points for logging your meal.",
                action: <div className="p-2 bg-green-500 text-white rounded-full"><CheckCircle size={24} /></div>,
            });
        }
    } catch (e) {
        console.error("Failed to log meal or award XP:", e);
        toast({ variant: 'destructive', title: "Error", description: "Couldn't save your meal log." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const deleteMeal = useCallback(async (id: string) => {
    if (!mealCollectionRef) return;
    try {
        await deleteDoc(doc(mealCollectionRef, id));
    } catch (e) {
        console.error("Error deleting meal", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete meal entry.'});
    }
  },[mealCollectionRef, toast]);

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
          Log your meals to track your daily calorie intake. All data is saved securely online.
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                    Add Meal
                </Button>
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
            {isLoading ? (
                 <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : todaysMeals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meal</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Calories</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysMeals.map((meal) => (
                    <TableRow key={meal.id}>
                      <TableCell className="font-medium">{meal.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                          {meal.date instanceof Timestamp ? format(meal.date.toDate(), 'p') : '...'}
                      </TableCell>
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

export default withAuth(DietPage);
