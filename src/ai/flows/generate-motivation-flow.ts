'use server';

/**
 * @fileOverview Generates a motivational quote.
 * 
 * - generateMotivation - A function that returns a motivational quote.
 * - GenerateMotivationOutput - The return type for the generateMotivation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateMotivationOutputSchema = z.object({
  title: z.string().describe('A short, catchy title for the quote. e.g. "You Got This"'),
  quote: z.string().describe('The motivational quote.'),
});

export type GenerateMotivationOutput = z.infer<typeof GenerateMotivationOutputSchema>;

export async function generateMotivation(): Promise<GenerateMotivationOutput> {
    return generateMotivationFlow();
}

const prompt = ai.definePrompt({
    name: 'generateMotivationPrompt',
    output: { schema: GenerateMotivationOutputSchema },
    prompt: `You are a world-class motivational coach.
    Generate a short, powerful, and inspiring quote for someone working on self-improvement and building better habits.
    The quote should be encouraging and focus on progress, not perfection.
    Keep the quote to a single sentence.
    Provide a short, catchy title for the quote as well.`
});


const generateMotivationFlow = ai.defineFlow(
    {
        name: 'generateMotivationFlow',
        outputSchema: GenerateMotivationOutputSchema,
    },
    async () => {
        const { output } = await prompt();
        return output!;
    }
);
