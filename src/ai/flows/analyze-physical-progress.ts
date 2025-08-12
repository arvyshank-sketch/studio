'use server';

/**
 * @fileOverview Analyzes weekly photo uploads to identify and describe changes in user’s physical appearance.
 *
 * - analyzePhysicalProgress - A function that handles the analysis of physical progress based on photo uploads.
 * - AnalyzePhysicalProgressInput - The input type for the analyzePhysicalProgress function.
 * - AnalyzePhysicalProgressOutput - The return type for the analyzePhysicalProgress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePhysicalProgressInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the user's physical appearance, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  previousPhotoDataUri: z
    .string()
    .describe(
      "A photo of the user's physical appearance from the previous week, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    )
    .optional(),
  description: z.string().describe('Any additional description of the user or the photos.'),
});
export type AnalyzePhysicalProgressInput = z.infer<typeof AnalyzePhysicalProgressInputSchema>;

const AnalyzePhysicalProgressOutputSchema = z.object({
  analysis: z.string().describe('The analysis of changes in physical appearance between the photos.'),
});
export type AnalyzePhysicalProgressOutput = z.infer<typeof AnalyzePhysicalProgressOutputSchema>;

export async function analyzePhysicalProgress(input: AnalyzePhysicalProgressInput): Promise<AnalyzePhysicalProgressOutput> {
  return analyzePhysicalProgressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePhysicalProgressPrompt',
  input: {schema: AnalyzePhysicalProgressInputSchema},
  output: {schema: AnalyzePhysicalProgressOutputSchema},
  prompt: `You are a personal trainer analyzing the physical progress of a user based on their weekly photo uploads.

You will compare the current photo with the previous photo (if available) to identify and describe changes in their physical appearance, such as muscle mass gains or losses.

Description: {{{description}}}
Current Photo: {{media url=photoDataUri}}
{{#if previousPhotoDataUri}}Previous Photo: {{media url=previousPhotoDataUri}}{{/if}}
{{#unless previousPhotoDataUri}}This is the first photo. Focus on describing the user's current physique.{{/unless}}

Analyze the photos and provide a summary of the changes in physical appearance.
`,
});

const analyzePhysicalProgressFlow = ai.defineFlow(
  {
    name: 'analyzePhysicalProgressFlow',
    inputSchema: AnalyzePhysicalProgressInputSchema,
    outputSchema: AnalyzePhysicalProgressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
