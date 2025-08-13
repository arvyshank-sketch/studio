'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Habit } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface HabitManagerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  profile: UserProfile | null;
}

const habitSchema = z.object({
  name: z.string().min(3, 'Habit name must be at least 3 characters long').max(50, 'Habit name is too long'),
});

type HabitFormValues = z.infer<typeof habitSchema>;

export function HabitManager({ isOpen, setIsOpen, profile }: HabitManagerProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const userDocRef = profile?.uid ? doc(db, 'users', profile.uid) : null;

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: '' },
  });

  const onSubmit: SubmitHandler<HabitFormValues> = async (data) => {
    if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'User profile not available.' });
        return;
    }

    setIsSubmitting(true);
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      name: data.name,
      createdAt: serverTimestamp() as any, // Firestore will convert this
    };

    try {
      await updateDoc(userDocRef, {
        habits: arrayUnion(newHabit),
      });
      toast({ title: 'Success', description: `Habit "${data.name}" added.` });
      form.reset();
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add the new habit.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteHabit = async (habitToDelete: Habit) => {
    if (!userDocRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'User profile not available.' });
        return;
    }
    if (!window.confirm(`Are you sure you want to delete the habit "${habitToDelete.name}"? This cannot be undone.`)) {
        return;
    }
    
    // Find the specific habit object in the profile's habits array to ensure the correct one is removed
    const habitToRemove = profile?.habits?.find(h => h.id === habitToDelete.id);
    if (!habitToRemove) {
      toast({ variant: 'destructive', title: 'Error', description: 'Habit not found in profile.' });
      return;
    }

    try {
      await updateDoc(userDocRef, {
        habits: arrayRemove(habitToRemove),
      });
      toast({ title: 'Success', description: 'Habit removed.' });
    } catch (error) {
      console.error('Error deleting habit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove the habit.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Habits</DialogTitle>
          <DialogDescription>Add new habits or remove existing ones from your daily log.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">Add New Habit</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel className="sr-only">Habit Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Meditate for 10 minutes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting || !userDocRef}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Add'}
                </Button>
              </form>
            </Form>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Existing Habits</h3>
            <ScrollArea className="h-[200px] pr-4">
                {profile?.habits && profile.habits.length > 0 ? (
                <div className="space-y-2">
                    {profile.habits.map((habit) => (
                    <div key={habit.id} className="flex items-center justify-between rounded-md border p-3">
                        <span className="text-sm truncate pr-2">{habit.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => deleteHabit(habit)} disabled={!userDocRef}>
                            <Trash2 className="size-4 text-destructive" />
                            <span className="sr-only">Delete habit</span>
                        </Button>
                    </div>
                    ))}
                </div>
                ) : (
                <p className="text-sm text-muted-foreground">No habits yet. Add one above!</p>
                )}
            </ScrollArea>
          </div>
        </div>
         <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
