import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}

// Initialize and export the reusable Gemini client
export const aiClient = new GoogleGenAI({ apiKey });
