import { classifyTask, generateMilestones } from '../services/taskAnalyzerService';
import { createTask } from '../repositories/taskRepository';
import { estimateHours } from './estimationEngine';
import { scheduleTask } from './scheduler/schedulerEngine';
import { ScheduleResult } from './scheduler/types';
import { analyzeConflicts, ConflictAnalysisResult } from './scheduler/conflictAnalyzer';
import { getTasksByUser } from '../repositories/taskRepository';

export interface RawTaskInput {
  title?: string;
  description?: string;
  deadline?: string;
  role?: string;
  userId?: string;
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
  conflictDetails?: ConflictAnalysisResult;
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
  const computedHours = estimateHours(
    classification.taskType, 
    classification.complexity,
    input.title,
    input.description
  );

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
  let activeTasks: any[] = [];
  if (input.userId) {
    activeTasks = await getTasksByUser(input.userId);
  }

  const schedulerResult = scheduleTask({
    taskId: 'temp-id', // Temporary ID since DB save happens later
    deadline: input.deadline!,
    estimatedHours: computedHours,
    milestones: milestonesData.milestones,
    activeTasks: activeTasks // Pass activeTasks to scheduler
  });

  // 6. Run Conflict Analyzer
  const conflictResult = analyzeConflicts(schedulerResult, activeTasks, input.deadline!, input.role);

  // 7. Merge everything into one response
  const analysisResult: TaskAnalysisResult = {
    ...classification,
    estimatedHours: computedHours,
    milestones: milestonesData.milestones,
    scheduleDetails: schedulerResult,
    conflictDetails: conflictResult
  };

  // 8. Return the final stateless object
  return {
    taskId: 'preview', // No longer saved to DB here
    analysis: analysisResult
  };
};
