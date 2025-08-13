
import { Timestamp } from "firebase/firestore";
import type { LucideIcon } from "lucide-react";

export type WeightEntry = {
  id: string;
  date: Timestamp;
  weight: number;
};

export type MealEntry = {
  id: number;
  date: string;
  name: string;
  calories: number;
};

export type Habit = {
  id: string;
  userId: string;
  name: string;
  icon: string; // Storing icon name as string
  createdAt: Timestamp;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
};

export type HabitEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  completedHabitIds: string[];
};

export type JournalEntry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Timestamp;
};

export type UserProfile = {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Timestamp;
    height?: number; // in cm
}


export type ProgressEntry = {
  date: string;
  bodyFat: number;
  photoDataUri: string;
  analysis: AnalyzePhysicalProgressOutput;
};

// Copied from src/ai/flows/analyze-physical-progress.ts to avoid circular dependency
export type AnalyzePhysicalProgressOutput = {
    physiqueAssessment: string;
    muscleGroups: {
        chest: string;
        arms: string;
        back: string;
        abs: string;
    };
    areasForImprovement: string[];
    recommendations: {
        workout: string;
        diet: string;
    };
};
