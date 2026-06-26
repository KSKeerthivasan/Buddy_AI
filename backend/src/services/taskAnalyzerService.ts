import { aiClient } from '../ai/client';
import { TASK_ANALYZER_PROMPT } from '../prompts/taskAnalyzerPrompt';

interface AIAnalysisInput {
  title: string;
  description: string;
  deadline?: string | undefined;
  role?: string | undefined;
}

export const analyzeTaskWithAI = async (input: AIAnalysisInput): Promise<any> => {
  // Construct the final prompt
  const finalPrompt = `
${TASK_ANALYZER_PROMPT}

User Task Details:
- Title: ${input.title}
- Description: ${input.description || 'N/A'}
- Deadline: ${input.deadline || 'N/A'}
- Role: ${input.role || 'N/A'}
`;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });

    const text = response.text;
    
    if (!text) {
      throw new Error('Received empty response from Gemini.');
    }

    // Try to parse the JSON output strictly without business validation
    try {
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Invalid JSON returned by Gemini:', text);
      throw new Error('Failed to parse Gemini response as JSON.');
    }
  } catch (error) {
    console.error('Error analyzing task with Gemini:', error);
    throw error;
  }
};
