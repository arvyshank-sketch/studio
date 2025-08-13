
import type { UserProfile, DailyLog, Badge } from './types';
import { parseISO, differenceInCalendarDays } from 'date-fns';
import { Book, Calendar, Flame, Target } from 'lucide-react';

// --- XP & Leveling Configuration ---
const BASE_XP = 100;
const GROWTH_FACTOR = 1.2;

export const XP_REWARDS = {
  STUDY: 10,
  QURAN: 10,
  EXPENSE_LOGGED: 5,
  ABSTAINED: 20,
  CUSTOM_HABIT: 15,
};

/**
 * Calculates the total XP required to reach a given level.
 * @param level The target level.
 * @returns The total XP required for that level.
 */
export const getXpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(BASE_XP * Math.pow(level - 1, GROWTH_FACTOR));
};

/**
 * Determines the user's current level based on their total XP.
 * @param xp The user's total XP.
 * @returns The user's current level.
 */
export const getLevel = (xp: number): number => {
  if (xp < BASE_XP) return 1;
  let level = 1;
  while (getXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
};


// --- Badge Definitions ---
export const badges: Badge[] = [
  {
    id: 'first-log',
    name: 'First Step',
    description: 'Log your first daily activity.',
    icon: Target,
  },
  {
    id: '7-day-streak',
    name: 'Week of Discipline',
    description: 'Maintain a 7-day abstinence streak.',
    icon: Flame,
  },
  {
    id: 'scholar-1',
    name: 'Apprentice Scholar',
    description: 'Log 10 hours of study time.',
    icon: Book,
  },
  {
    id: 'quran-1',
    name: 'Quran Reader',
    description: 'Read 100 pages of the Quran.',
    icon: Calendar,
  },
];

type BadgeCheckContext = {
  userProfile: UserProfile;
  allLogs: DailyLog[]; // All logs including the new one, sorted descending by date
  newLog: DailyLog;
};

// --- Badge Unlocking Logic ---

const checkFirstLog = (ctx: BadgeCheckContext): boolean => {
  return ctx.allLogs.length === 1; // The new log is the first and only log
};

const check7DayStreak = (ctx: BadgeCheckContext): boolean => {
  if (!ctx.newLog.abstained) return false;

  const logs = [...ctx.allLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let streak = 0;
  let expectedDate = parseISO(ctx.newLog.date);

  for (const log of logs) {
    const logDate = parseISO(log.date);
    if (differenceInCalendarDays(expectedDate, logDate) === 0) {
      if (log.abstained) {
        streak++;
        expectedDate = new Date(expectedDate.setDate(expectedDate.getDate() - 1));
      } else {
        break; // Streak broken
      }
    } else {
      // Gap in dates, streak is broken
      break;
    }
  }

  return streak >= 7;
};


const checkScholar1 = (ctx: BadgeCheckContext): boolean => {
  const totalStudyHours = ctx.allLogs.reduce((sum, log) => sum + (log.studyDuration || 0), 0);
  return totalStudyHours >= 10;
};

const checkQuran1 = (ctx: BadgeCheckContext): boolean => {
  const totalPagesRead = ctx.allLogs.reduce((sum, log) => sum + (log.quranPagesRead || 0), 0);
  return totalPagesRead >= 100;
};


const badgeChecks: { [key: string]: (ctx: BadgeCheckContext) => boolean } = {
  'first-log': checkFirstLog,
  '7-day-streak': check7DayStreak,
  'scholar-1': checkScholar1,
  'quran-1': checkQuran1,
};


// --- Main Gamification Processor ---

/**
 * Processes gamification updates for a user based on a new daily log.
 * @param userProfile The user's current profile.
 * @param allLogs All historical logs for the user.
 * @param newLog The new log being submitted.
 * @returns An updated user profile object.
 */
export const processGamification = (userProfile: UserProfile, allLogs: DailyLog[], newLog: DailyLog): Partial<UserProfile> => {
  // --- 1. Calculate XP for the new log ---
  let earnedXp = 0;
  if (newLog.studyDuration > 0) earnedXp += XP_REWARDS.STUDY;
  if (newLog.quranPagesRead > 0) earnedXp += XP_REWARDS.QURAN;
  if (newLog.expenses > 0) earnedXp += XP_REWARDS.EXPENSE_LOGGED;
  if (newLog.abstained) earnedXp += XP_REWARDS.ABSTAINED;

  // Add XP for custom habits
  if (newLog.customHabits) {
    const completedHabits = Object.values(newLog.customHabits).filter(Boolean).length;
    earnedXp += completedHabits * XP_REWARDS.CUSTOM_HABIT;
  }

  const currentXp = userProfile.xp ?? 0;
  const newXp = currentXp + earnedXp;
  const newLevel = getLevel(newXp);

  // --- 2. Check for new badges ---
  const currentBadges = new Set(userProfile.badges ?? []);
  const badgeCheckContext: BadgeCheckContext = {
    userProfile,
    allLogs: [...allLogs, newLog], // Ensure the new log is part of the context
    newLog,
  };
  
  for (const badge of badges) {
    if (!currentBadges.has(badge.id)) {
      const check = badgeChecks[badge.id];
      if (check && check(badgeCheckContext)) {
        currentBadges.add(badge.id);
      }
    }
  }

  // --- 3. Return updated profile data ---
  const updatedProfile: Partial<UserProfile> = {
    xp: newXp,
    level: newLevel,
    badges: Array.from(currentBadges),
  };

  return updatedProfile;
};
