'use client';

import { useState, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzePhysicalProgress, type AnalyzePhysicalProgressOutput } from '@/ai/flows/analyze-physical-progress';
import { Upload, Sparkles, Loader2, Dumbbell, Utensils, Target, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ProgressEntry } from '@/lib/types';
import { useSyncedLocalStorage } from '@/hooks/use-synced-local-storage';
import { PROGRESS_HISTORY_KEY } from '@/lib/constants';

const progressSchema = z.object({
  photo: z
    .any()
    .refine((files) => files?.length === 1, 'Photo is required.'),
  bodyFat: z.coerce.number().positive('Body fat must be a positive number').optional(),
  description: z.string().optional(),
});

type ProgressFormValues = z.infer<typeof progressSchema>;

function ProgressPage() {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzePhysicalProgressOutput | null>(null);
  const [history, setHistory] = useSyncedLocalStorage<ProgressEntry[]>(PROGRESS_HISTORY_KEY, []);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit: SubmitHandler<ProgressFormValues> = async (data) => {
    if (!photoPreview) {
      toast({
        variant: 'destructive',
        title: 'No Photo',
        description: 'Please select a photo to analyze.',
      });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);

    try {
      const previousPhotoDataUri = history.length > 0 ? history[history.length - 1].photoDataUri : undefined;

      const result = await analyzePhysicalProgress({
        photoDataUri: photoPreview,
        previousPhotoDataUri,
        bodyFat: data.bodyFat,
        description: data.description || 'User wants to see their physical progress.',
      });

      setAnalysis(result);
      
      if (data.bodyFat) {
        const today = format(new Date(), 'yyyy-MM-dd');
        const newEntry: ProgressEntry = {
            date: today,
            bodyFat: data.bodyFat,
            photoDataUri: photoPreview,
            analysis: result
        };

        setHistory(prev => {
            const existingIndex = prev.findIndex(e => e.date === today);
            if (existingIndex > -1) {
                const updatedEntries = [...prev];
                updatedEntries[existingIndex] = newEntry;
                return updatedEntries;
            }
            return [...prev, newEntry];
        });
      }

      toast({
        title: 'Analysis Complete',
        description: 'Your progress analysis is ready.',
      });
    } catch (error) {
      console.error('Analysis failed', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'There was an error analyzing your photo. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history]);

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          AI Progress Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload a weekly photo and let AI analyze your physical changes.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upload Photo</CardTitle>
            <CardDescription>
              Submit a new photo for this week's analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="photo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly Photo</FormLabel>
                      <FormControl>
                        <div className="relative flex h-64 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/50 transition hover:border-primary hover:bg-muted">
                          <Input
                            type="file"
                            className="absolute z-10 h-full w-full cursor-pointer opacity-0"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => {
                              field.onChange(e.target.files);
                              handleFileChange(e);
                            }}
                          />
                          {photoPreview ? (
                            <Image
                              src={photoPreview}
                              alt="Photo preview"
                              fill
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                              <Upload className="mb-2 size-8" />
                              <span>Click or drag to upload</span>
                              <span className="text-xs">
                                PNG, JPG, WEBP up to 5MB
                              </span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bodyFat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Fat % (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 15.2" {...field} />
                      </FormControl>
                      <FormDescription>Include body fat for a more accurate analysis and to track progress.</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Feeling stronger this week, focused on arms."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Any extra details for the AI to consider.</FormDescription>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Analyze Progress
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>
              Here's what our AI noticed about your progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                 <div className="space-y-3 pt-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ) : analysis ? (
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-foreground">
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Overall Physique</h3>
                  <p>{analysis.physiqueAssessment}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Muscle Groups</h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="chest">
                      <AccordionTrigger>Chest</AccordionTrigger>
                      <AccordionContent>{analysis.muscleGroups.chest}</AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="arms">
                      <AccordionTrigger>Arms</AccordionTrigger>
                      <AccordionContent>{analysis.muscleGroups.arms}</AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="back">
                      <AccordionTrigger>Back</AccordionTrigger>
                      <AccordionContent>{analysis.muscleGroups.back}</AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="abs">
                      <AccordionTrigger>Abs</AccordionTrigger>
                      <AccordionContent>{analysis.muscleGroups.abs}</AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Target className="size-5 text-primary" />
                        Areas for Improvement
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {analysis.areasForImprovement.map((area) => (
                            <Badge key={area} variant="secondary">{area}</Badge>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Dumbbell className="size-5 text-primary" />
                        Workout Recommendations
                    </h3>
                    <p>{analysis.recommendations.workout}</p>
                </div>

                 <div>
                    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Utensils className="size-5 text-primary" />
                        Diet Recommendations
                    </h3>
                    <p>{analysis.recommendations.diet}</p>
                </div>

              </div>
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                <Sparkles className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Awaiting Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Your analysis will appear here after you submit a photo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Body Fat Percentage Progress</CardTitle>
                <CardDescription>
                    Visualize your body fat changes over time.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pr-8">
            {sortedHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sortedHistory}>
                  <defs>
                    <linearGradient id="colorBodyFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value) => [`${value}%`, 'Body Fat']}
                  />
                  <Area type="monotone" dataKey="bodyFat" stroke="hsl(var(--accent))" fill="url(#colorBodyFat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <TrendingUp className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Not Enough Data</h3>
                    <p className="text-sm text-muted-foreground">
                        Log your body fat for a few days to see a chart of your progress.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProgressPage;
