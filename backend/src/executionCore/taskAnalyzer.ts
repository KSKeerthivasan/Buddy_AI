import { analyzeTaskWithAI } from '../services/taskAnalyzerService';
import { createTask } from '../repositories/taskRepository';
import { estimateHours } from './estimationEngine';

export interface RawTaskInput {
  title?: string;
  description?: string;
  deadline?: string;
  role?: string;
}

export interface Milestone {
  title: string;
}

export interface TaskAnalysisResult {
  taskType: string;
  priority: string;
  complexity: string;
  confidence: number;
  milestones: Milestone[];
  estimatedHours?: number;
}

export interface AnalyzeTaskResponse {
  taskId: string;
  analysis: TaskAnalysisResult;
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
  if (typeof result.confidence !== 'number') return false;
  if (!Array.isArray(result.milestones)) return false;

  for (const milestone of result.milestones) {
    if (!milestone || typeof milestone.title !== 'string') {
      return false;
    }
  }

  return true;
};

/**
 * Execution Core: Task Analyzer
 * Orchestrates the validation, AI analysis, and response formatting for new tasks.
 */
export const analyzeTask = async (input: RawTaskInput): Promise<AnalyzeTaskResponse> => {
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

  // 4. Calculate Estimates
  const computedHours = estimateHours(analysisResult.taskType, analysisResult.complexity);
  analysisResult.estimatedHours = computedHours;

  // 5. Build task object
  const taskData = {
    title: input.title,
    description: input.description || '',
    deadline: input.deadline,
    role: input.role || null,
    analysis: analysisResult,
    status: 'analyzed',
    createdAt: new Date().toISOString()
  };

  // 5. Save to database
  const savedTask = await createTask(taskData);

  // 6. Return structured result
  return {
    taskId: savedTask.id,
    analysis: analysisResult
  };
};
