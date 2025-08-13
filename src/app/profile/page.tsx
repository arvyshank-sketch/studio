
'use client';

import { useState, useEffect, useMemo } from 'react';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/context/auth-context";
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import type { UserProfile, UserReward, Reward } from '@/lib/types';
import { getLevel, getXpForLevel, XP_REWARDS } from '@/lib/gamification';
import { ALL_REWARDS } from '@/lib/rewards';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Shield, CheckCircle, XCircle, LogOut, Award, MessageSquare, Star, Lock, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


const rarityStyles = {
  common: {
    badge: 'bg-muted/80 text-muted-foreground/80 border-transparent',
    card: 'border-muted/20',
    glow: '',
  },
  rare: {
    badge: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    card: 'border-blue-700/60',
    glow: 'shadow-lg shadow-blue-900/50',
  },
  legendary: {
    badge: 'bg-yellow-900/50 text-yellow-300 border-yellow-600/50',
    card: 'border-yellow-600/60',
    glow: 'shadow-2xl shadow-yellow-800/60',
  },
};

const getRewardIcon = (type: string) => {
    switch (type) {
        case 'title': return <Award className="size-8 text-foreground/80" />;
        case 'badge': return <Star className="size-8 text-foreground/80" />;
        case 'quote': return <MessageSquare className="size-8 text-foreground/80" />;
        default: return <Award className="size-8 text-foreground/80" />;
    }
}

const jinwooAvatars = [
    { id: '1', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo cool'},
    { id: '2', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo monarch'},
    { id: '3', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo dagger'},
    { id: '4', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo glowing'},
    { id: '5', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo shadow'},
    { id: '6', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo smile'},
    { id: '7', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo fighting'},
    { id: '8', src: 'https://placehold.co/128x128.png', hint: 'sung jin woo portrait'},
];


const Commandment = ({ text, xp, isPenalty = false }: { text: string; xp: number; isPenalty?: boolean }) => (
    <li className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            {isPenalty ? <XCircle className="text-red-400 size-4" /> : <CheckCircle className="text-green-400 size-4" />}
            <span>{text}</span>
        </div>
        <span className={cn('font-bold', isPenalty ? 'text-red-400' : 'text-green-400')}>
            {isPenalty ? '' : '+'}{xp} XP
        </span>
    </li>
);

function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unlockedRewards, setUnlockedRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      }
    });
    
    const rewardsRef = collection(db, 'users', user.uid, 'userRewards');
    const unsubRewards = onSnapshot(rewardsRef, (snapshot) => {
      const rewardsData = snapshot.docs.map(doc => doc.data() as UserReward);
      setUnlockedRewards(rewardsData);
      setIsLoading(false);
    });

    return () => {
        unsubProfile();
        unsubRewards();
    };
  }, [user]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!user) return;
    setIsUpdatingAvatar(true);
    try {
        // Update Firebase Auth profile
        await updateProfile(user, { photoURL: avatarUrl });
        // Update Firestore document
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { photoURL: avatarUrl });
        toast({ title: "Avatar updated!", description: "Your new look is ready."});
        setIsAvatarDialogOpen(false);
    } catch (error) {
        console.error("Error updating avatar:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not update your avatar."});
    } finally {
        setIsUpdatingAvatar(false);
    }
  }

  const currentLevel = useMemo(() => profile ? getLevel(profile.xp ?? 0) : 1, [profile]);
  const xpForCurrentLevel = useMemo(() => getXpForLevel(currentLevel), [currentLevel]);
  const xpForNextLevel = useMemo(() => getXpForLevel(currentLevel + 1), [currentLevel]);
  const currentLevelProgress = useMemo(() => {
    if (!profile?.xp) return 0;
    const totalXpInLevel = xpForNextLevel - xpForCurrentLevel;
    const xpInCurrentLevel = profile.xp - xpForCurrentLevel;
    return totalXpInLevel > 0 ? (xpInCurrentLevel / totalXpInLevel) * 100 : 0;
  }, [profile, xpForCurrentLevel, xpForNextLevel]);

  const combinedRewards = useMemo(() => {
      return ALL_REWARDS.map(reward => {
        const unlockedVersion = unlockedRewards.find(ur => ur.id === reward.id);
        return {
          ...reward,
          unlocked: !!unlockedVersion,
          unlockedAt: unlockedVersion?.unlockedAt,
        };
      }).sort((a,b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  }, [unlockedRewards]);


  const InfoRow = ({ label, value }: { label: string; value: string | undefined }) => (
      <div className="flex justify-between items-center py-3 border-b border-border/50">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground font-medium">{isLoading ? <Skeleton className="h-5 w-32" /> : value}</dd>
      </div>
  );

  return (
    <div className="p-4 md:p-8">
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <header className="mb-8 flex items-center gap-4">
            {isLoading ? <Skeleton className="size-20 rounded-full" /> : (
                <DialogTrigger asChild>
                    <button className="relative group">
                        <Avatar className="size-20 border-2 border-primary">
                            <AvatarImage src={profile?.photoURL} alt={profile?.displayName} />
                            <AvatarFallback className="text-2xl bg-muted">
                                {profile?.displayName?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="size-8 text-white" />
                        </div>
                    </button>
                </DialogTrigger>
            )}
            <div>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-64" />
                    </div>
            ) : (
                <>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {profile?.displayName}
                    </h1>
                    <p className="text-muted-foreground">{profile?.email}</p>
                </>
            )}
            </div>
        </header>

        <DialogContent>
            <DialogHeader>
                <DialogTitle>Choose Your Avatar</DialogTitle>
                <DialogDescription>Select a new face for the Monarch.</DialogDescription>
            </DialogHeader>
            {isUpdatingAvatar ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="size-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4 py-4">
                    {jinwooAvatars.map(avatar => (
                        <button
                            key={avatar.id}
                            className="relative rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                            onClick={() => handleAvatarSelect(avatar.src)}
                            data-ai-hint={avatar.hint}
                        >
                            <Image
                                src={avatar.src}
                                alt={`Avatar ${avatar.id}`}
                                width={128}
                                height={128}
                                className="aspect-square object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info"><User className="mr-2" /> Player Info</TabsTrigger>
          <TabsTrigger value="rules"><Shield className="mr-2" />System Commandments</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Your personal stats and information.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                  <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </div>
              ) : (
                <dl>
                  <InfoRow label="UID" value={profile?.uid} />
                  <InfoRow label="Joined System" value={profile?.createdAt ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'} />
                  <div>
                    <div className="flex justify-between items-baseline pt-4 mb-2">
                        <span className="font-bold text-lg text-primary">Level {currentLevel}</span>
                        <span className="text-sm text-muted-foreground">
                        {profile?.xp ?? 0} / {xpForNextLevel} XP
                        </span>
                    </div>
                    <Progress value={currentLevelProgress} className="h-3" />
                  </div>
                </dl>
              )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                    <LogOut className="mr-2" />
                    Sign Out
                </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Rewards</CardTitle>
              <CardDescription>A collection of all rewards you've unlocked on your journey.</CardDescription>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {combinedRewards.map(reward => {
                    const styles = rarityStyles[reward.rarity];
                    return (
                      <Card
                        key={reward.id}
                        className={cn(
                          'flex flex-col justify-between transition-all duration-300 h-full',
                          reward.unlocked ? styles.card : 'border-dashed border-muted/20 bg-card/50',
                          reward.unlocked ? styles.glow : ''
                        )}
                      >
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            {reward.unlocked ? getRewardIcon(reward.type) : <Lock className="size-8 text-muted-foreground/50" />}
                            <span className={cn("text-base", !reward.unlocked && 'text-muted-foreground/50')}>{reward.name}</span>
                          </CardTitle>
                          <CardDescription className={cn("text-xs",!reward.unlocked && 'text-muted-foreground/30')}>
                            {reward.description}
                          </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-between items-center">
                           <Badge className={cn('capitalize', reward.unlocked ? styles.badge : 'bg-muted/30 text-muted-foreground/50 border-transparent')}>
                                {reward.rarity}
                            </Badge>
                            {reward.unlockedAt && (
                                 <p className="text-xs text-muted-foreground">
                                   Unlocked {formatDistanceToNow(reward.unlockedAt.toDate(), { addSuffix: true })}
                                 </p>
                            )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
            <div 
                className="p-8 rounded-lg text-white"
                style={{
                    backgroundImage: 'url(/system-commandments-bg.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div 
                    className="p-6 bg-black/70 backdrop-blur-sm rounded-md border-2 border-blue-400/50"
                    style={{ textShadow: '0 0 8px hsl(210 90% 60% / 0.8)'}}
                >
                    <h3 className="text-center text-2xl font-bold mb-6 text-blue-300">System Commandments</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">XP Rewards</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Gaining Weight" xp={XP_REWARDS.WEIGHT_GAIN} />
                                <Commandment text="Abstinence (Daily)" xp={XP_REWARDS.ABSTAINED} />
                                <Commandment text="Custom Habit (Each)" xp={XP_REWARDS.CUSTOM_HABIT} />
                                <Commandment text="Calorie Log (Daily)" xp={XP_REWARDS.CALORIE_LOGGED} />
                                <Commandment text="Study (per 30 min)" xp={XP_REWARDS.STUDY_PER_30_MIN} />
                                <Commandment text="Expense Log (Daily)" xp={XP_REWARDS.EXPENSE_LOGGED} />
                                <Commandment text="Qur'an (per page)" xp={XP_REWARDS.QURAN_PER_PAGE} />
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">Unexpected Quests</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Quest Completion" xp={XP_REWARDS.UNEXPECTED_QUEST} />
                                <Commandment text="Quest Failure (Penalty)" xp={XP_REWARDS.UNEXPECTED_QUEST_PENALTY} isPenalty={true}/>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3 text-lg text-blue-300 border-b border-blue-400/30 pb-1">Penalties</h4>
                            <ul className="space-y-2 text-blue-200">
                                <Commandment text="Missed Daily Quest" xp={XP_REWARDS.DAILY_QUEST_MISSED_PENALTY} isPenalty={true}/>
                                <Commandment text="Missed Calorie Log" xp={XP_REWARDS.CALORIE_LOG_MISSED_PENALTY} isPenalty={true}/>
                                <Commandment text="Unfinished Habit (Each)" xp={XP_REWARDS.CUSTOM_HABIT_PENALTY} isPenalty={true}/>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withAuth(ProfilePage);
