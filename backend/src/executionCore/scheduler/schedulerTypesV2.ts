import { ExecutionSession } from './sessionGenerator';
import { Milestone } from './types';

export interface SchedulerV2Input {
  userId: string;
  taskId: string;
  taskTitle: string;
  milestones: Milestone[];
  totalEstimatedMinutes: number;
  deadline: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
}

export interface ExecutionFeasibility {
  status: 'FEASIBLE' | 'NOT_FEASIBLE';
  requiredMinutes: number;
  availableMinutes: number;
  capacityShortfall: number;
  earliestCompletionDate?: string;
}

export interface ExecutionPlanV2 {
  sessions: ExecutionSession[];
  bufferDays: number;
  estimatedCompletion: string; // YYYY-MM-DD
  capacityUtilization: number;
  schedulerVersion: 'v2';
  feasibility: ExecutionFeasibility;
}
