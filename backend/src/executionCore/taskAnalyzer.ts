import { analyzeTaskWithAI } from '../services/taskAnalyzerService';

export interface RawTaskInput {
  title?: string;
  description?: string;
  deadline?: string;
  role?: string;
}

export interface Milestone {
  title: string;
  estimatedHours: number;
}

export interface TaskAnalysisResult {
  taskType: string;
  priority: string;
  complexity: string;
  estimatedHours: number;
  milestones: Milestone[];
}

/**
 * Validates the raw input before sending to the AI service.
 */
const validateInput = (input: RawTaskInput): void => {
  if (!input) {
    throw new Error('Input payload is missing entirely.');
  }
  if (!input.title || input.title.trim() === '') {
    throw new Error('Validation Error: Task title is strictly required.');
  }
  if (!input.deadline || input.deadline.trim() === '') {
    throw new Error('Validation Error: Task deadline is strictly required.');
  }
};

/**
 * Validates the AI response to ensure it adheres to the expected schema.
 */
const validateResponse = (result: any): result is TaskAnalysisResult => {
  if (!result || typeof result !== 'object') return false;
  if (typeof result.taskType !== 'string') return false;
  if (typeof result.priority !== 'string') return false;
  if (typeof result.complexity !== 'string') return false;
  if (typeof result.estimatedHours !== 'number') return false;
  if (!Array.isArray(result.milestones)) return false;

  for (const milestone of result.milestones) {
    if (!milestone || typeof milestone.title !== 'string' || typeof milestone.estimatedHours !== 'number') {
      return false;
    }
  }

  return true;
};

/**
 * Execution Core: Task Analyzer
 * Orchestrates the validation, AI analysis, and response formatting for new tasks.
 */
export const analyzeTask = async (input: RawTaskInput): Promise<TaskAnalysisResult> => {
  // 1. Validate Input
  validateInput(input);

  // 2. Call AI Service (Role is accepted but not yet utilized in the prompt strictly, can be passed if needed)
  const analysisResult = await analyzeTaskWithAI({
    title: input.title!,
    description: input.description || '',
    deadline: input.deadline,
    role: input.role,
  });

  // 3. Validate Response
  if (!validateResponse(analysisResult)) {
    throw new Error('AI returned an invalid structured response.');
  }

  // 4. Return structured result (No DB or scheduling logic here)
  return analysisResult;
};
