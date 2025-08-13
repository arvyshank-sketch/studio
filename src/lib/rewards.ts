
import type { Reward, UserReward } from './types';
import { collection, getDocs, doc, setDoc, serverTimestamp, Transaction } from 'firebase/firestore';
import { db } from './firebase';
import { Award, Star, MessageSquare } from 'lucide-react';

export const ALL_REWARDS: Reward[] = [
  // Common
  { id: 'title-newbie', name: 'Newbie', description: 'A title for those just starting their journey.', type: 'title', rarity: 'common' },
  { id: 'quote-journey', name: 'A Journey of a Thousand Miles', description: '"The journey of a thousand miles begins with a single step." - Lao Tzu', type: 'quote', rarity: 'common' },
  { id: 'badge-consistency-1', name: 'Consistent', description: 'Awarded for logging in 3 days in a row.', type: 'badge', icon: Star, rarity: 'common' },
  { id: 'title-apprentice', name: 'Apprentice', description: 'You have shown dedication to learning the basics.', type: 'title', rarity: 'common' },
  
  // Rare
  { id: 'title-adept', name: 'Adept', description: 'You are becoming skilled in your disciplines.', type: 'title', rarity: 'rare' },
  { id: 'quote-discipline', name: 'Discipline', description: '"Discipline is the bridge between goals and accomplishment." - Jim Rohn', type: 'quote', rarity: 'rare' },
  { id: 'badge-scholar', name: 'Scholar', description: 'Awarded for logging over 20 hours of study.', type: 'badge', icon: Star, rarity: 'rare' },
  { id: 'title-iron-will', name: 'Iron Will', description: 'For maintaining a 14-day abstinence streak.', type: 'title', rarity: 'rare' },

  // Legendary
  { id: 'title-master', name: 'Master', description: 'You have achieved mastery over your habits.', type: 'title', rarity: 'legendary' },
  { id: 'quote-suffer', name: 'The Pain of Discipline', description: '"Suffer the pain of discipline or suffer the pain of regret."', type: 'quote', rarity: 'legendary' },
  { id: 'badge-monarch', name: 'Shadow Monarch', description: 'You have risen from the weakest to the strongest. A true sign of power.', type: 'badge', icon: Award, rarity: 'legendary' },
  { id: 'title-unstoppable', name: 'Unstoppable', description: 'For reaching level 50. A true force of nature.', type: 'title', rarity: 'legendary' },
];

const rarityWeights = {
  common: 70,  // 70% chance
  rare: 25,    // 25% chance
  legendary: 5 // 5% chance
};

/**
 * Selects a random reward based on rarity weights.
 * @param availableRewards A list of rewards that the user has not yet unlocked.
 * @returns A randomly selected Reward object or null if no rewards are available.
 */
function selectRandomReward(availableRewards: Reward[]): Reward | null {
  if (availableRewards.length === 0) {
    return null;
  }

  const weightedList: Reward[] = [];
  availableRewards.forEach(reward => {
    const weight = rarityWeights[reward.rarity] || 0;
    for (let i = 0; i < weight; i++) {
      weightedList.push(reward);
    }
  });

  if(weightedList.length === 0) {
    // Fallback in case all available rewards have 0 weight
    return availableRewards[Math.floor(Math.random() * availableRewards.length)];
  }

  const randomIndex = Math.floor(Math.random() * weightedList.length);
  return weightedList[randomIndex];
}


/**
 * Grants a new, random reward to a user and saves it to Firestore within a transaction.
 * @param userId The UID of the user.
 * @param transaction The Firestore transaction object.
 * @returns The newly granted Reward, or null if no reward could be granted.
 */
export async function grantRandomReward(userId: string, transaction: Transaction): Promise<Reward | null> {
  const userRewardsRef = collection(db, 'users', userId, 'userRewards');
  const userRewardsSnapshot = await getDocs(userRewardsRef);
  const unlockedRewardIds = new Set(userRewardsSnapshot.docs.map(doc => doc.id));

  const availableRewards = ALL_REWARDS.filter(reward => !unlockedRewardIds.has(reward.id));
  
  if (availableRewards.length === 0) {
    console.log("No new rewards available for this user.");
    return null;
  }

  const newReward = selectRandomReward(availableRewards);

  if (newReward) {
    const newRewardRef = doc(db, 'users', userId, 'userRewards', newReward.id);
    const userRewardData: UserReward = {
      ...newReward,
      unlockedAt: serverTimestamp(),
    };
    transaction.set(newRewardRef, userRewardData);
    return newReward;
  }
  
  return null;
}
