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
  bodyFat: z.number().optional().describe("User's current body fat percentage, if available."),
  description: z.string().describe('Any additional description of the user or the photos.'),
});
export type AnalyzePhysicalProgressInput = z.infer<typeof AnalyzePhysicalProgressInputSchema>;

const AnalyzePhysicalProgressOutputSchema = z.object({
  physiqueAssessment: z.string().describe("The user's overall physique assessment."),
  muscleGroups: z
    .object({
      chest: z.string().describe('Analysis of the chest muscles.'),
      arms: z.string().describe('Analysis of the arm muscles (biceps, triceps).'),
      back: z.string().describe('Analysis of the back muscles (lats, traps).'),
      abs: z.string().describe('Analysis of the abdominal muscles.'),
    })
    .describe('Detailed analysis of major muscle groups.'),
  areasForImprovement: z
    .array(z.string())
    .describe('A list of muscle groups or areas that need more focus.'),
  recommendations: z
    .object({
      workout: z.string().describe('Actionable workout recommendations.'),
      diet: z.string().describe('Actionable diet and nutrition recommendations.'),
    })
    .describe('Actionable recommendations for the user.'),
});
export type AnalyzePhysicalProgressOutput = z.infer<typeof AnalyzePhysicalProgressOutputSchema>;

export async function analyzePhysicalProgress(input: AnalyzePhysicalProgressInput): Promise<AnalyzePhysicalProgressOutput> {
  return analyzePhysicalProgressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePhysicalProgressPrompt',
  input: {schema: AnalyzePhysicalProgressInputSchema},
  output: {schema: AnalyzePhysicalProgressOutputSchema},
  prompt: `You are an expert personal trainer and fitness coach. Analyze the physical progress of a user based on their photo uploads and provide a detailed, encouraging, and actionable assessment.

You will compare the current photo with the previous photo (if available) to identify and describe changes in their physical appearance, such as muscle mass gains, fat loss, and definition.

Description from user: {{{description}}}
{{#if bodyFat}}Current Body Fat: {{{bodyFat}}}%{{/if}}
Current Photo: {{media url=photoDataUri}}
{{#if previousPhotoDataUri}}Previous Photo: {{media url=previousPhotoDataUri}}{{/if}}
{{#unless previousPhotoDataUri}}This is the first photo. Focus on describing the user's current physique and providing a baseline analysis.{{/unless}}

Your analysis should be structured and comprehensive. Fill out all the fields in the output schema.

1.  **Physique Assessment:** Provide an overall summary of the user's current physique. Note their body type (e.g., ectomorph, mesomorph) if possible. If body fat is provided, use it in the assessment.
2.  **Muscle Groups Analysis:** Analyze each major muscle group (Chest, Arms, Back, Abs). Be specific about development, symmetry, and definition.
3.  **Areas for Improvement:** Identify 1-3 key areas or muscle groups that would benefit most from additional focus.
4.  **Recommendations:** Provide clear, actionable advice.
    *   **Workout:** Suggest specific exercises or workout modifications to address the areas for improvement.
    *   **Diet:** Offer general nutrition tips that align with gaining muscle or losing fat, based on your analysis.

Maintain a positive and motivating tone throughout.
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
