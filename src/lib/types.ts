export type WeightEntry = {
  date: string;
  weight: number;
};

export type MealEntry = {
  id: number;
  name: string;
  calories: number;
};

export type JournalEntry = {
  date: string;
  studyHours: number;
  quranPages: number;
  expenses: number;
  abstained: boolean;
};
