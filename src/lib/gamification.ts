
import type { UserProfile, DailyLog, Badge, UnexpectedQuest } from './types';
import { parseISO, differenceInCalendarDays, format, subDays } from 'date-fns';
import { Book, Calendar, Flame, Target } from 'lucide-react';
import { collection, query, where, getDocs, doc, Transaction, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// --- XP & Leveling Configuration ---
const BASE_XP_FOR_LEVEL_UP = 100; // XP needed to get from level 1 to 2
const LEVEL_GROWTH_FACTOR = 1.2; // Each level requires 20% more XP than the last

export const XP_REWARDS = {
  STUDY_PER_30_MIN: 5,
  QURAN_PER_PAGE: 1,
  EXPENSE_LOGGED: 5,
  ABSTAINED: 30,
  CUSTOM_HABIT: 15,
  CALORIE_LOGGED: 10,
  WEIGHT_GAIN: 100,
  UNEXPECTED_QUEST: 150,
  UNEXPECTED_QUEST_PENALTY: -50,
};

/**
 * Calculates the total XP required to reach a given level, starting from level 0.
 * @param level The target level.
 * @returns The total cumulative XP required to reach that level.
 */
export const getXpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  let requiredXp = 0;
  for (let i = 1; i < level; i++) {
    requiredXp += Math.floor(BASE_XP_FOR_LEVEL_UP * Math.pow(LEVEL_GROWTH_FACTOR, i - 1));
  }
  return requiredXp;
};


/**
 * Determines the user's current level based on their total XP.
 * @param xp The user's total XP.
 * @returns The user's current level.
 */
export const getLevel = (xp: number): number => {
  let level = 1;
  while (xp >= getXpForLevel(level + 1)) {
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

interface ProcessGamificationArgs {
    userProfile: UserProfile;
    allLogs: DailyLog[];
    newLog: Partial<DailyLog>;
    userId: string;
    transaction: Transaction;
    customXp?: number;
}


/**
 * Processes gamification updates for a user based on a new daily log or custom event.
 * @returns An updated user profile object and a flag indicating if a level-up occurred.
 */
export const processGamification = async ({
    userProfile, 
    allLogs, 
    newLog, 
    userId,
    transaction,
    customXp
}: ProcessGamificationArgs) => {
  // --- 1. Calculate XP for the new log ---
  let earnedXp = customXp || 0;

  if (Object.keys(newLog).length > 0) {
      if (newLog.studyDuration && newLog.studyDuration > 0) {
        earnedXp += (newLog.studyDuration / 0.5) * XP_REWARDS.STUDY_PER_30_MIN;
      }
      if (newLog.quranPagesRead && newLog.quranPagesRead > 0) {
        earnedXp += newLog.quranPagesRead * XP_REWARDS.QURAN_PER_PAGE;
      }
      if (newLog.expenses && newLog.expenses > 0) earnedXp += XP_REWARDS.EXPENSE_LOGGED;
      if (newLog.abstained) earnedXp += XP_REWARDS.ABSTAINED;
      if (newLog.caloriesLogged) earnedXp += XP_REWARDS.CALORIE_LOGGED;
      if (newLog.customHabits) {
        const completedHabits = Object.values(newLog.customHabits).filter(Boolean).length;
        earnedXp += completedHabits * XP_REWARDS.CUSTOM_HABIT;
      }
  }

  // --- 2. Check for Unexpected Quest Penalty ---
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const penaltyQuestRef = doc(db, 'users', userId, 'unexpectedQuests', yesterdayStr);
  const penaltyQuestSnap = await transaction.get(penaltyQuestRef);
  
  if (penaltyQuestSnap.exists()) {
      const quest = penaltyQuestSnap.data() as UnexpectedQuest;
      if (!quest.isCompleted) {
          earnedXp += XP_REWARDS.UNEXPECTED_QUEST_PENALTY;
          // Mark as completed to avoid double penalty
          transaction.update(penaltyQuestRef, { isCompleted: true });
      }
  }


  let currentXp = userProfile.xp ?? 0;
  let currentLevel = userProfile.level ?? 1;
  let newXp = currentXp + earnedXp;

  // --- 3. Check for Level Up ---
  let leveledUp = false;
  let xpForNextLevel = getXpForLevel(currentLevel + 1);
  
  while (newXp >= xpForNextLevel) {
    currentLevel++;
    leveledUp = true;
    xpForNextLevel = getXpForLevel(currentLevel + 1);
  }

  // --- 4. Check for new badges ---
  const currentBadges = new Set(userProfile.badges ?? []);
  if (newLog.date) {
    const badgeCheckContext: BadgeCheckContext = {
      userProfile,
      allLogs: [...allLogs, newLog as DailyLog], // Ensure the new log is part of the context
      newLog: newLog as DailyLog,
    };
    
    for (const badge of badges) {
      if (!currentBadges.has(badge.id)) {
        const check = badgeChecks[badge.id];
        if (check && check(badgeCheckContext)) {
          currentBadges.add(badge.id);
        }
      }
    }
  }


  // --- 5. Return updated profile data ---
  const updatedProfile: Partial<UserProfile> = {
    xp: newXp,
    level: currentLevel,
    badges: Array.from(currentBadges),
  };

  return { updatedProfile, leveledUp };
};
