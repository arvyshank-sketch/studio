
'use client';

import { useState } from 'react';
import { doc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Habit } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { HabitInput } from './habit-input';
import { useAuth } from '@/context/auth-context';

interface HabitManagerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

export function HabitManager({ isOpen, setIsOpen, habits, setHabits }: HabitManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleHabitAdded = (newHabit: Habit) => {
    // Optimistic update handled by the parent component (DailyLog page) via onSnapshot
    toast({ title: 'Success', description: `Habit "${newHabit.name}" added.` });
  };

  const deleteHabit = async (habitToDelete: Habit) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the habit "${habitToDelete.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      // Optimistically update UI first
      setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));

      const habitDocRef = doc(db, 'users', user.uid, 'habits', habitToDelete.id);
      await deleteDoc(habitDocRef);

      toast({ title: 'Success', description: 'Habit removed.' });
    } catch (error) {
      // If Firestore update fails, revert the UI change by letting the snapshot listener correct it
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
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Manage Habits</DialogTitle>
          <DialogDescription>Add new habits or remove existing ones from your daily log.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">Add New Habit</h3>
            <HabitInput onAdded={handleHabitAdded} />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Existing Habits</h3>
            <ScrollArea className="h-[200px] pr-4">
              {habits && habits.length > 0 ? (
                <div className="space-y-2">
                  {habits.map((habit) => (
                    <div key={habit.id} className="flex items-center justify-between rounded-md border p-3">
                      <span className="text-sm truncate pr-2">{habit.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => deleteHabit(habit)}>
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

    