
import { Timestamp } from "firebase/firestore";
import { z } from 'genkit';

export type WeightEntry = {
  id: string;
  date: Timestamp | Date;
  weight: number;
};

export type MealEntry = {
  id: number;
  date: string;
  name: string;
  calories: number;
};

export type DailyLog = {
    date: string;
    studyDuration: number;
    quranPagesRead: number;
    expenses: number;
    abstained: boolean;
    notes?: string;
    customHabits?: Record<string, boolean>;
}

export type JournalEntry = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Timestamp;
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
};

export type Habit = {
    id: string;
    name: string;
    createdAt: Timestamp | Date;
    streak: number;
    lastCheckedOn: Timestamp | Date | null;
    active: boolean;
}

export type UserProfile = {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Timestamp;
    height?: number; // in cm
    xp?: number;
    level?: number;
    badges?: string[];
    habits?: Habit[];
}


export type ProgressEntry = {
  date: string;
  bodyFat: number;
  photoDataUri: string;
  analysis: AnalyzePhysicalProgressOutput;
};

export type DashboardStats = {
  weeklyWeightChange: number;
  weeklyJournalEntries: number;
  longestHabitStreak: number;
  calories: number;
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
