
import type { UserProfile, DailyLog, Badge, UnexpectedQuest, Habit, Rank } from './types';
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
  DAILY_QUEST_MISSED_PENALTY: -50,
  CALORIE_LOG_MISSED_PENALTY: -50,
  CUSTOM_HABIT_PENALTY: -15,
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

// --- Rank System ---
const RANKS: Rank[] = [
    { name: 'E-Rank', color: 'text-gray-400' },
    { name: 'D-Rank', color: 'text-green-400' },
    { name: 'C-Rank', color: 'text-cyan-400' },
    { name: 'B-Rank', color: 'text-blue-400' },
    { name: 'A-Rank', color: 'text-red-400' },
    { name: 'S-Rank', color: 'text-purple-400' },
    { name: 'Monarch', color: 'text-yellow-400' },
];

export const getRank = (level: number): Rank => {
    if (level < 10) return RANKS[0]; // E-Rank
    if (level < 20) return RANKS[1]; // D-Rank
    if (level < 30) return RANKS[2]; // C-Rank
    if (level < 40) return RANKS[3]; // B-Rank
    if (level < 50) return RANKS[4]; // A-Rank
    if (level < 100) return RANKS[5]; // S-Rank
    return RANKS[6]; // Monarch
}


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
    previousLog: DailyLog | null;
    userId: string;
    transaction: Transaction;
    customXp?: number;
    checkForPenalties?: boolean;
    habits?: Habit[];
}


/**
 * Processes gamification updates for a user based on a new daily log or custom event.
 * @returns An updated user profile object and a flag indicating if a level-up occurred.
 */
export const processGamification = async ({
    userProfile, 
    allLogs, 
    newLog, 
    previousLog,
    userId,
    transaction,
    customXp,
    checkForPenalties = false,
    habits = [],
}: ProcessGamificationArgs) => {
  let earnedXp = 0;
  let penaltyXp = 0;
  let habitPenaltyXp = 0;

  const prev = previousLog || {};

  // --- 1. Calculate XP for the new log ---
  if (customXp) {
    earnedXp += customXp;
  }
  
  if (Object.keys(newLog).length > 0) {
      const studyDiff = (newLog.studyDuration ?? 0) - (prev.studyDuration ?? 0);
      if (studyDiff > 0) {
        earnedXp += (studyDiff / 0.5) * XP_REWARDS.STUDY_PER_30_MIN;
      }
      
      const quranDiff = (newLog.quranPagesRead ?? 0) - (prev.quranPagesRead ?? 0);
      if (quranDiff > 0) {
        earnedXp += quranDiff * XP_REWARDS.QURAN_PER_PAGE;
      }
      
      // Award only if it wasn't logged before
      if ((newLog.expenses ?? 0) > 0 && !(prev.expenses && prev.expenses > 0)) {
          earnedXp += XP_REWARDS.EXPENSE_LOGGED;
      }

      if (newLog.abstained && !prev.abstained) {
          earnedXp += XP_REWARDS.ABSTAINED;
      }

      if (newLog.caloriesLogged && !prev.caloriesLogged) {
          earnedXp += XP_REWARDS.CALORIE_LOGGED;
      }

      if (newLog.customHabits) {
          const prevHabits = prev.customHabits || {};
          Object.keys(newLog.customHabits).forEach(habitId => {
              // Award XP only if the habit is newly completed
              if (newLog.customHabits?.[habitId] && !prevHabits[habitId]) {
                  earnedXp += XP_REWARDS.CUSTOM_HABIT;
              }
          });
      }
  }

  // --- 2. Check for Penalties from the Previous Day ---
  if (checkForPenalties) {
      const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      // Penalty for failed Unexpected Quest
      const penaltyQuestRef = doc(db, 'users', userId, 'unexpectedQuests', yesterdayStr);
      const penaltyQuestSnap = await transaction.get(penaltyQuestRef);
      if (penaltyQuestSnap.exists()) {
          const quest = penaltyQuestSnap.data() as UnexpectedQuest;
          if (!quest.isCompleted) {
              penaltyXp += XP_REWARDS.UNEXPECTED_QUEST_PENALTY;
              transaction.update(penaltyQuestRef, { isCompleted: true }); // Mark as penalized to avoid double penalty
          }
      }

      // Penalty for missed logs
      const yesterdayLogRef = doc(db, 'users', userId, 'dailyLogs', yesterdayStr);
      const yesterdayLogSnap = await transaction.get(yesterdayLogRef);
      if (!yesterdayLogSnap.exists()) {
          penaltyXp += XP_REWARDS.DAILY_QUEST_MISSED_PENALTY;
          penaltyXp += XP_REWARDS.CALORIE_LOG_MISSED_PENALTY;
          if(habits.length > 0) {
            habitPenaltyXp += habits.length * XP_REWARDS.CUSTOM_HABIT_PENALTY;
          }
      } else {
          const yesterdayLog = yesterdayLogSnap.data() as DailyLog;
          const questLogged = (yesterdayLog.studyDuration ?? 0) > 0 || 
                              (yesterdayLog.quranPagesRead ?? 0) > 0 || 
                              yesterdayLog.abstained || 
                              Object.values(yesterdayLog.customHabits ?? {}).some(Boolean);
          if (!questLogged) {
              penaltyXp += XP_REWARDS.DAILY_QUEST_MISSED_PENALTY;
          }
          if (!yesterdayLog.caloriesLogged) {
              penaltyXp += XP_REWARDS.CALORIE_LOG_MISSED_PENALTY;
          }
          if (habits.length > 0) {
            habits.forEach(habit => {
                if (!yesterdayLog.customHabits?.[habit.id]) {
                    habitPenaltyXp += XP_REWARDS.CUSTOM_HABIT_PENALTY;
                }
            });
          }
      }
  }

  let currentXp = userProfile.xp ?? 0;
  let currentLevel = userProfile.level ?? 1;
  let newXp = currentXp + earnedXp + penaltyXp + habitPenaltyXp;
  if (newXp < 0) newXp = 0; // Don't let XP go negative

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

  return { updatedProfile, leveledUp, penaltyXp, habitPenaltyXp };
};
