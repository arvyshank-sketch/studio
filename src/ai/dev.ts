'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-physical-progress.ts';
import '@/ai/flows/generate-journal-prompt.ts';
