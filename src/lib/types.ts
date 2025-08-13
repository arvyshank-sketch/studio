
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
}

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

export type DashboardStats = {
  weeklyWeightChange: number;
  weeklyJournalEntries: number;
  longestHabitStreak: number;
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

    
