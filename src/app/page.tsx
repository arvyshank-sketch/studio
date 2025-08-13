'use client';

import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { ArrowRight, BookMarked, Sparkles, TrendingUp, UtensilsCrossed } from 'lucide-react';

const featureCards = [
  {
    title: 'Daily Journal',
    description: "Log your studies, reading, and daily habits.",
    href: '/journal',
    icon: <BookMarked className="size-8 text-primary" />,
  },
  {
    title: 'Weight Tracking',
    description: 'Log your weight and see your progress over time.',
    href: '/weight',
    icon: <TrendingUp className="size-8 text-primary" />,
  },
  {
    title: 'Diet & Calories',
    description: 'Keep a log of your meals and daily calorie intake.',
    href: '/diet',
    icon: <UtensilsCrossed className="size-8 text-primary" />,
  },
  {
    title: 'AI Progress Analysis',
    description: 'Analyze your physique changes with AI.',
    href: '/progress',
    icon: <Sparkles className="size-8 text-primary" />,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Welcome to Synergy
        </h1>
        <p className="text-muted-foreground">Your personal dashboard for holistic growth.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((feature) => (
          <Link href={feature.href} key={feature.title} className="flex">
            <Card className="flex w-full flex-col justify-between transition-all hover:shadow-lg hover:scale-[1.02] dark:bg-secondary dark:hover:border-primary/50">
              <CardHeader>
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                 <span className="text-sm font-medium text-primary">
                    Go to {feature.title} <ArrowRight className="ml-1 inline size-4" />
                 </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
