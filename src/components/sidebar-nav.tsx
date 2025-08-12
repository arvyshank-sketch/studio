'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  LayoutDashboard,
  type LucideIcon,
  Flame,
  Utensils,
  DollarSign,
  PlusCircle,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
  useSidebar,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/dialog';
import { z } from 'zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { useEffect, useMemo, useState } from 'react';
import type { JournalEntry, MealEntry } from '@/lib/types';
import { format } from 'date-fns';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';
import { JOURNAL_STORAGE_KEY, MEALS_STORAGE_KEY } from '@/lib/constants';

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const links: NavLink[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/journal',
    label: 'Daily Journal',
    icon: BookMarked,
  },
  {
    href: '/weight',
    label: 'Weight Tracking',
    icon: TrendingUp,
  },
  {
    href: '/diet',
    label: 'Diet & Calories',
    icon: Utensils,
  },
  {
    href: '/progress',
    label: 'AI Analysis',
    icon: Sparkles,
  },
];

const mealSchema = z.object({
  name: z.string().min(1, 'Meal name is required'),
  calories: z.coerce.number().min(0, 'Calories must be a positive number'),
});
type MealFormValues = z.infer<typeof mealSchema>;

const expenseSchema = z.object({
  expenses: z.coerce.number().min(0, 'Expenses must be a positive number'),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function SidebarNav() {
  const pathname = usePathname();
  const [journalEntries, setJournalEntries] = useSyncedLocalStorage<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
  const [mealEntries, setMealEntries] = useSyncedLocalStorage<MealEntry[]>(MEALS_STORAGE_KEY, []);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const mealForm = useForm<MealFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: { name: '', calories: 0 },
  });

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expenses: 0 },
  });

  const today = useMemo(() => isClient ? format(new Date(), 'yyyy-MM-dd') : '', [isClient]);

  const todaysJournalEntry = useMemo(() => {
    return journalEntries.find(entry => entry.date === today);
  }, [journalEntries, today]);

  const todaysMeals = useMemo(() => {
    return mealEntries.filter(meal => meal.date === today);
  }, [mealEntries, today]);
  
  const currentStreak = useMemo(() => todaysJournalEntry?.streak ?? 0, [todaysJournalEntry]);
  const totalCalories = useMemo(() => todaysMeals.reduce((sum, meal) => sum + meal.calories, 0), [todaysMeals]);
  const totalExpenses = useMemo(() => todaysJournalEntry?.expenses ?? 0, [todaysJournalEntry]);

  const onMealSubmit: SubmitHandler<MealFormValues> = (data) => {
    const newMeal: MealEntry = { ...data, id: Date.now(), date: today };
    setMealEntries((prev) => [...prev, newMeal]);
    toast({ title: 'Meal Added', description: `${data.name} has been added to your log.` });
    mealForm.reset();
    setMealFormOpen(false);
  };
  
  const onExpenseSubmit: SubmitHandler<ExpenseFormValues> = (data) => {
    setJournalEntries((prev) => {
      const existingIndex = prev.findIndex(e => e.date === today);
      if (existingIndex > -1) {
        const updatedEntries = [...prev];
        updatedEntries[existingIndex] = { ...updatedEntries[existingIndex], expenses: (updatedEntries[existingIndex].expenses || 0) + data.expenses };
        return updatedEntries
      } else {
        const newEntry: JournalEntry = {
          date: today,
          expenses: data.expenses,
          abstained: false,
          quranPages: 0,
          studyHours: 0,
          streak: 0,
        };
        return [...prev, newEntry];
      }
    });

    toast({ title: 'Expense Added', description: `$${data.expenses} has been added.` });
    expenseForm.reset();
    setExpenseFormOpen(false);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-8 text-primary"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z"></path><path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M12 4v2"></path><path d="M12 20v-2"></path><path d="m4.9 4.9 1.4 1.4"></path><path d="m17.7 17.7 1.4 1.4"></path><path d="M4 12H2"></path><path d="M22 12h-2"></path><path d="m4.9 19.1 1.4-1.4"></path><path d="m17.7 6.3 1.4-1.4"></path></svg>
          <span className="text-xl font-semibold text-sidebar-foreground transition-opacity group-data-[collapsible=icon]:opacity-0">Synergy</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={link.label}
                  variant="ghost"
                >
                  <link.icon className="shrink-0" />
                  <span className="truncate">{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
          <Avatar className="size-9">
            <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="profile avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden transition-opacity group-data-[collapsible=icon]:opacity-0">
            <p className="truncate text-sm font-medium">User</p>
            <p className="truncate text-xs text-muted-foreground">user@synergy.app</p>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
