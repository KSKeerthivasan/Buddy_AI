export type FeasibilityStatus = 'FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'NOT_FEASIBLE';
export type WorkloadLabel = 'Excellent' | 'Healthy' | 'Busy' | 'Heavy' | 'Critical';
export type BufferStatus = 'SAFE' | 'LOW' | 'NONE';
export type PressureLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConflictType = 
  | 'TIME_CAPACITY'
  | 'BUFFER_LOSS'
  | 'HIGH_PRIORITY_COLLISION'
  | 'DEADLINE_COLLISION'
  | 'OVERBOOKED_DAY'
  | 'NO_AVAILABLE_SLOT'
  | 'SESSION_FRAGMENTATION'
  | 'LONG_SESSION'
  | 'SHORT_SESSION';

export interface HealthReport {
  overallHealth: number; // 0-100
  executionFeasibility: FeasibilityStatus;
  workloadScore: { score: number; label: WorkloadLabel };
  capacityScore: number;
  bufferProtection: { remainingDays: number; utilization: number; status: BufferStatus };
  deadlinePressure: PressureLevel;
  fragmentation: { score: number; sessionCount: number; avgDuration: number };
  sessionQuality: 'Too short' | 'Too long' | 'Well balanced';
  conflicts: { type: ConflictType; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }[];
  recommendationsNeeded: boolean;
}

export interface HealthAnalysisInput {
  userId: string;
  taskId: string;
  executionPlan: any; // ExecutionPlanV2
  taskInfo: {
    priority: string; // HIGH, MEDIUM, LOW
    deadline: string;
    safetyBufferDays: number;
    estimatedMinutes: number;
  };
}
