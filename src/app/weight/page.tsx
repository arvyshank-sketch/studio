
'use client';

import withAuth from "@/components/with-auth";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import type { WeightEntry, UserProfile } from '@/lib/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Trash2, Weight as WeightIcon, Ruler, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";

const weightSchema = z.object({
  weight: z.coerce.number().positive('Weight must be a positive number'),
});

const heightSchema = z.object({
  height: z.coerce.number().positive('Height must be a positive number (in cm)'),
});

type WeightFormValues = z.infer<typeof weightSchema>;
type HeightFormValues = z.infer<typeof heightSchema>;

function WeightPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHeightDialogOpen, setIsHeightDialogOpen] = useState(false);

  // Firestore collection references
  const weightCollectionRef = useMemo(() => {
    if (user) {
      return collection(db, 'users', user.uid, 'weightEntries');
    }
    return null;
  }, [user]);

  const userDocRef = useMemo(() => {
      if (user) {
          return doc(db, 'users', user.uid);
      }
      return null;
  }, [user]);


  const weightForm = useForm<WeightFormValues>({
    resolver: zodResolver(weightSchema),
    defaultValues: { weight: undefined },
  });

  const heightForm = useForm<HeightFormValues>({
    resolver: zodResolver(heightSchema),
    defaultValues: { height: undefined },
  });

  // Fetch user profile (for height)
  const fetchProfile = useCallback(async () => {
    if (!userDocRef) return;
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setProfile(data);
      if (data.height) {
        heightForm.setValue('height', data.height);
      }
    }
  }, [userDocRef, heightForm]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);


  // Fetch weight entries
  useEffect(() => {
    if (!weightCollectionRef) return;
    setIsLoading(true);
    const q = query(weightCollectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightEntry));
        setEntries(entriesData);
        setIsLoading(false);
      }, (error) => {
        console.error('Error fetching weight entries:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch weight entries.',
        });
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [weightCollectionRef, toast]);


  const handleWeightSubmit: SubmitHandler<WeightFormValues> = async (data) => {
    if (!weightCollectionRef) return;
    setIsSubmitting(true);
    
    const today = new Date();
    const todayStart = new Date(today.setHours(0,0,0,0));
    const todayEnd = new Date(today.setHours(23,59,59,999));

    try {
        const q = query(weightCollectionRef, where('date', '>=', todayStart), where('date', '<=', todayEnd));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Update today's entry
            const entryDoc = querySnapshot.docs[0];
            await updateDoc(doc(weightCollectionRef, entryDoc.id), { weight: data.weight });
            toast({ title: 'Success', description: "Today's weight entry updated." });
        } else {
            // Add new entry
            await addDoc(weightCollectionRef, { weight: data.weight, date: serverTimestamp() });
            toast({ title: 'Success', description: 'Weight logged successfully.' });
        }
        weightForm.reset({ weight: undefined });
    } catch(error) {
        console.error('Error saving weight entry:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save the weight entry.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleHeightSubmit: SubmitHandler<HeightFormValues> = async (data) => {
    if (!userDocRef) return;
    setIsSubmitting(true);
    try {
        await setDoc(userDocRef, { height: data.height }, { merge: true });
        toast({ title: 'Success', description: 'Height updated successfully.' });
        await fetchProfile(); // re-fetch profile to update state
        setIsHeightDialogOpen(false);
    } catch(error) {
        console.error('Error updating height:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save your height.',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const deleteEntry = async (id: string) => {
    if (!weightCollectionRef) return;
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteDoc(doc(weightCollectionRef, id));
      toast({ title: 'Success', description: 'Entry deleted.' });
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Could not delete entry."});
    }
  };
  
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => (a.date as Timestamp).toMillis() - (b.date as Timestamp).toMillis())
      .map(e => ({
          ...e,
          date: format((e.date as Timestamp).toDate(), 'yyyy-MM-dd')
      }));
  }, [entries]);

  const bmi = useMemo(() => {
    if (profile?.height && entries.length > 0) {
      const latestWeight = entries[0].weight;
      const heightInMeters = profile.height / 100;
      const bmiValue = latestWeight / (heightInMeters * heightInMeters);
      return {
          value: bmiValue.toFixed(1),
          category: bmiValue < 18.5 ? 'Underweight' : bmiValue < 25 ? 'Normal' : bmiValue < 30 ? 'Overweight' : 'Obese',
          color: bmiValue < 18.5 ? 'text-blue-500' : bmiValue < 25 ? 'text-green-500' : bmiValue < 30 ? 'text-yellow-500' : 'text-red-500'
      };
    }
    return null;
  }, [profile, entries]);

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
                  Enter your weight for today. It will update if an entry already exists.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...weightForm}>
                  <form onSubmit={weightForm.handleSubmit(handleWeightSubmit)} className="space-y-6">
                    <FormField
                      control={weightForm.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 75.5" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Weight
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>BMI & History</CardTitle>
                        <CardDescription>
                            Your Body Mass Index and log history.
                        </CardDescription>
                    </div>
                     <Dialog open={isHeightDialogOpen} onOpenChange={setIsHeightDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Ruler className="size-4" />
                                <span className="sr-only">Set Height</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Update Your Height</DialogTitle>
                                <DialogDescription>Your height is needed to calculate your BMI. Please provide it in centimeters.</DialogDescription>
                            </DialogHeader>
                            <Form {...heightForm}>
                                <form onSubmit={heightForm.handleSubmit(handleHeightSubmit)} className="space-y-4">
                                    <FormField
                                        control={heightForm.control}
                                        name="height"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Height (cm)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 180" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Height
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {bmi ? (
                        <div className="mb-6 text-center">
                            <p className="text-muted-foreground">Current BMI</p>
                            <p className={`text-4xl font-bold ${bmi.color}`}>{bmi.value}</p>
                            <Badge variant="secondary" className={bmi.color}>{bmi.category}</Badge>
                        </div>
                    ) : (
                         <div className="mb-6 text-center text-sm text-muted-foreground">
                            Enter your height and at least one weight entry to calculate your BMI.
                         </div>
                    )}
                    {isLoading ? (
                         <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : entries.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Weight (kg)</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">{format((entry.date as Timestamp).toDate(), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">{entry.weight}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
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
          </CardHeader>
          <CardContent className="h-[400px] w-full pr-8">
            {isLoading ? (
                <div className="flex h-full items-center justify-center">
                     <Loader2 className="size-8 animate-spin text-primary" />
                </div>
            ) : chartData.length > 1 ? (
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
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value, name) => [`${value} kg`, 'Weight']}
                  />
                  <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill="url(#colorWeight)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <TrendingUp className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Not Enough Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Log your weight for at least two days to see a chart of your progress.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(WeightPage);
