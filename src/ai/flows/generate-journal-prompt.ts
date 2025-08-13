
'use server';
/**
 * @fileOverview Generates a random, insightful journal prompt.
 *
 * - generateJournalPrompt - A function that returns a journal prompt.
 */

import {ai} from '@/ai/genkit';
import { GenerateJournalPromptOutput, GenerateJournalPromptOutputSchema } from '@/lib/types';


export async function generateJournalPrompt(): Promise<GenerateJournalPromptOutput> {
  return generateJournalPromptFlow();
}

const prompt = ai.definePrompt({
  name: 'generateJournalPrompt',
  output: {schema: GenerateJournalPromptOutputSchema},
  prompt: `You are a helpful assistant that provides insightful and thought-provoking journal prompts for self-reflection.

Generate a single, concise journal prompt. The prompt should encourage deep thought but be approachable. It should be a question or a statement to reflect upon.

Do not add any preamble, just return the prompt itself.

Example prompts:
- What is one thing you are taking for granted?
- Describe a recent challenge and what it taught you.
- What does your ideal day look like, and what is one small step you can take to make it a reality?
- What is a belief you hold that you haven't questioned in a while?
`,
});

const generateJournalPromptFlow = ai.defineFlow(
  {
    name: 'generateJournalPromptFlow',
    outputSchema: GenerateJournalPromptOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
