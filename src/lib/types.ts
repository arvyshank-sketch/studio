export type WeightEntry = {
  date: string;
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
  name: string;
  icon: React.ReactNode;
};

export type HabitEntry = {
  date: string; // "yyyy-MM-dd"
  completedHabitIds: string[];
};

export type JournalEntry = {
  date: string;
  studyHours: number;
  quranPages: number;
  expenses: number;
  abstained: boolean;
  streak: number; // Current streak count
};

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
