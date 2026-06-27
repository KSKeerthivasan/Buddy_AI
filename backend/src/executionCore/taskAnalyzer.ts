import { classifyTask, generateMilestones } from '../services/taskAnalyzerService';
import { createTask } from '../repositories/taskRepository';
import { estimateHours } from './estimationEngine';
import { scheduleTask } from './scheduler/schedulerEngine';
import { ScheduleResult } from './scheduler/types';

export interface RawTaskInput {
  title?: string;
  description?: string;
  deadline?: string;
  role?: string;
}

export interface Milestone {
  title: string;
  estimatedHours?: number;
}

export interface TaskAnalysisResult {
  taskType: string;
  priority: string;
  complexity: string;
  confidence: number;
  milestones: Milestone[];
  estimatedHours?: number;
  scheduleDetails?: ScheduleResult;
}

export interface AnalyzeTaskResponse {
  taskId: string;
  analysis: TaskAnalysisResult;
}

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

const validateClassification = (result: any): boolean => {
  if (!result || typeof result !== 'object') return false;
  if (typeof result.taskType !== 'string') return false;
  if (typeof result.priority !== 'string') return false;
  if (typeof result.complexity !== 'string') return false;
  if (typeof result.confidence !== 'number') return false;
  return true;
};

const validateMilestones = (result: any): boolean => {
  if (!result || typeof result !== 'object') return false;
  if (!Array.isArray(result.milestones)) return false;
  for (const milestone of result.milestones) {
    if (!milestone || typeof milestone.title !== 'string') {
      return false;
    }
  }
  return true;
};

export const analyzeTask = async (input: RawTaskInput): Promise<AnalyzeTaskResponse> => {
  // 1. Validate Input
  validateInput(input);

  // 2. Classify task
  const classification = await classifyTask({
    title: input.title!,
    description: input.description || '',
    deadline: input.deadline,
    role: input.role,
  });

  if (!validateClassification(classification)) {
    throw new Error('AI returned an invalid structured classification response.');
  }

  // 3. Estimate hours using estimationEngine
  const computedHours = estimateHours(classification.taskType, classification.complexity);

  // 4. Generate milestones using the estimated hours
  const milestonesData = await generateMilestones({
    title: input.title!,
    description: input.description || '',
    taskType: classification.taskType,
    complexity: classification.complexity,
    estimatedHours: computedHours
  });

  if (!validateMilestones(milestonesData)) {
    throw new Error('AI returned an invalid structured milestones response.');
  }

  // 4.5. Assign estimated hours to milestones evenly for the scheduler
  const milestoneCount = milestonesData.milestones.length;
  if (milestoneCount > 0) {
    const hoursPerMilestone = computedHours / milestoneCount;
    milestonesData.milestones = milestonesData.milestones.map((m: any) => ({
      ...m,
      estimatedHours: hoursPerMilestone
    }));
  }

  // 5. Run schedulerEngine
  const schedulerResult = scheduleTask({
    taskId: 'temp-id', // Temporary ID since DB save happens later
    deadline: input.deadline!,
    estimatedHours: computedHours,
    milestones: milestonesData.milestones
  });

  // 6. Merge everything into one response
  const analysisResult: TaskAnalysisResult = {
    ...classification,
    estimatedHours: computedHours,
    milestones: milestonesData.milestones,
    scheduleDetails: schedulerResult
  };

  // 6. Build task object and save to DB
  const taskData = {
    title: input.title,
    description: input.description || '',
    deadline: input.deadline,
    role: input.role || null,
    analysis: analysisResult,
    status: 'analyzed',
    createdAt: new Date().toISOString()
  };

  const savedTask = await createTask(taskData);

  // 7. Return the final object
  return {
    taskId: savedTask.id,
    analysis: analysisResult
  };
};
