
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import type { Habit } from '@/lib/types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HabitInputProps {
  onAdded: (habit: Habit) => void;
  className?: string;
}

/**
 * A self-contained component for adding a new habit to Firestore.
 * Handles input, loading, errors, and optimistic updates.
 */
export function HabitInput({ onAdded, className }: HabitInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddHabit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !user) return;

    setIsLoading(true);
    setError(null);

    const newHabitData = {
      name: trimmedName,
      createdAt: serverTimestamp(),
      streak: 0,
      lastCheckedOn: null,
      active: true,
    };

    try {
      const userHabitsRef = collection(db, 'users', user.uid, 'habits');
      const docRef = await addDoc(userHabitsRef, newHabitData);

      // Optimistic update
      onAdded({
        ...newHabitData,
        id: docRef.id,
        createdAt: new Date(), // Approximate timestamp for UI
      });

      setName(''); // Reset input
    } catch (err) {
      console.error('Error adding habit:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to add habit. Please try again.`);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission if it's in a form
      handleAddHabit();
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <label htmlFor="habit-input" className="sr-only">
          New habit name
        </label>
        <Input
          id="habit-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Read for 15 minutes"
          disabled={isLoading}
          className="rounded-lg bg-muted/50 px-4 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
        />
        <Button
          type="button"
          onClick={handleAddHabit}
          disabled={isLoading || name.trim().length === 0}
          className="rounded-lg px-4 py-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

// --- Usage Example ---
/*
import { useState } from 'react';
import { HabitInput } from './HabitInput';
import type { Habit } from '../lib/types';

function MyHabitPage() {
  const [habits, setHabits] = useState<Habit[]>([]);

  const handleHabitAdded = (newHabit: Habit) => {
    setHabits(prev => [newHabit, ...prev]);
  };

  return (
    <div>
      <HabitInput onAdded={handleHabitAdded} />
      <ul>
        {habits.map(h => <li key={h.id}>{h.name}</li>)}
      </ul>
    </div>
  );
}
*/
