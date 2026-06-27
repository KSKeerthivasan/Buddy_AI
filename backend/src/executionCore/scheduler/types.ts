export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Milestone {
  id?: string;
  title: string;
  estimatedHours?: number;
  isCompleted?: boolean;
}

export interface DailyPlan {
  date: string;
  assignedHours: number;
  milestones: Milestone[];
}

export interface SchedulerInput {
  taskId: string;
  deadline: string;
  estimatedHours: number;
  milestones: Milestone[];
  dailyAvailableHours?: number;
  role?: string;
}

import { ExecutionSession } from './sessionGenerator';

export interface ScheduleResult {
  isFeasible: boolean;
  totalDays: number;
  scheduledDays: number;
  bufferDays: number;
  riskLevel: RiskLevel;
  executionSessions: ExecutionSession[];
  message?: string;
}
