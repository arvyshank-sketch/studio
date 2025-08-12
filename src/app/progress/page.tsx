'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { analyzePhysicalProgress } from '@/ai/flows/analyze-physical-progress';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const progressSchema = z.object({
  photo: z
    .any()
    .refine((files) => files?.length === 1, 'Photo is required.')
    .refine(
      (files) => files?.[0]?.size <= 5000000,
      `Max file size is 5MB.`
    )
    .refine(
      (files) => ['image/jpeg', 'image/png', 'image/webp'].includes(files?.[0]?.type),
      '.jpg, .png, and .webp files are accepted.'
    ),
  description: z.string().optional(),
});

type ProgressFormValues = z.infer<typeof progressSchema>;

const PREVIOUS_PHOTO_KEY = 'synergy-previous-photo';

export default function ProgressPage() {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const form = useForm<ProgressFormValues>({
    resolver: zodResolver(progressSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
      const previousPhotoDataUri = localStorage.getItem(PREVIOUS_PHOTO_KEY) || undefined;

      const result = await analyzePhysicalProgress({
        photoDataUri: photoPreview,
        previousPhotoDataUri,
        description: data.description || 'User wants to see their physical progress.',
      });

      setAnalysis(result.analysis);
      localStorage.setItem(PREVIOUS_PHOTO_KEY, photoPreview);
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

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>
              Here's what our AI noticed about your progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : analysis ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                <p>{analysis}</p>
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
    </div>
  );
}
