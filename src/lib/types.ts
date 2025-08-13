
import { Timestamp } from "firebase/firestore";

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
    caloriesLogged?: boolean;
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

export type Reward = {
    id: string;
    name: string;
    description: string;
    type: 'title' | 'badge' | 'quote';
    rarity: 'common' | 'rare' | 'legendary';
    icon?: React.ElementType;
}

export type UserReward = Reward & {
    unlockedAt: Timestamp | any;
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

export type DashboardStats = {
  weeklyWeightChange: number;
  weeklyJournalEntries: number;
  longestHabitStreak: number;
  calories: number;
};
