import { aiClient } from '../ai/client';
import { CLASSIFY_TASK_PROMPT } from '../prompts/taskAnalyzerPrompt';
import { GENERATE_MILESTONES_PROMPT } from '../prompts/milestoneGeneratorPrompt';

interface AIAnalysisInput {
  title: string;
  description: string;
  deadline?: string | undefined;
  role?: string | undefined;
  taskType?: string;
  complexity?: string;
  estimatedHours?: number;
}

const callGemini = async (prompt: string): Promise<any> => {
  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const text = response.text;
    
    if (!text) {
      throw new Error('Received empty response from Gemini.');
    }

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

export const classifyTask = async (input: AIAnalysisInput): Promise<any> => {
  const finalPrompt = `
${CLASSIFY_TASK_PROMPT}

User Task Details:
- Title: ${input.title}
- Description: ${input.description || 'N/A'}
- Deadline: ${input.deadline || 'N/A'}
- Role: ${input.role || 'N/A'}
`;
  return callGemini(finalPrompt);
};

export const generateMilestones = async (input: AIAnalysisInput): Promise<any> => {
  const finalPrompt = `
${GENERATE_MILESTONES_PROMPT}

User Task Details:
- Title: ${input.title}
- Description: ${input.description || 'N/A'}
- Task Type: ${input.taskType || 'N/A'}
- Complexity: ${input.complexity || 'N/A'}
- Estimated Hours: ${input.estimatedHours !== undefined ? input.estimatedHours : 'N/A'}
`;
  return callGemini(finalPrompt);
};

export const analyzeTaskWithAI = async (input: AIAnalysisInput): Promise<any> => {
  // Execute both calls in parallel
  const [classification, milestonesData] = await Promise.all([
    classifyTask(input),
    generateMilestones(input)
  ]);
  
  // Re-combine for the API contract
  return {
    ...classification,
    milestones: milestonesData.milestones
  };
};
