export type RecoverySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecoveryTrigger = 
  | 'SESSION_SKIPPED'
  | 'SESSION_CANCELLED'
  | 'SESSION_FAILED'
  | 'PARTIAL_COMPLETION'
  | 'DEADLINE_CHANGED'
  | 'HIGH_PRIORITY_TASK_ADDED'
  | 'AVAILABILITY_CHANGED'
  | 'COMMITMENTS_CHANGED'
  | 'TEMPORARY_EVENT_ADDED'
  | 'MANUAL_REQUEST';

export interface RecoveryStrategy {
  strategyId: string;
  name: string;
  description: string;
  // Deterministic action payload for future consumption by Decision Engine
  actionPayload?: any;
}

export interface RecoveryMetrics {
  remainingEffortMinutes: number;
  remainingSessionsCount: number;
  remainingCapacityMinutes: number;
  bufferRemainingDays: number;
  deadlinePressure: number; 
  capacityDeficitMinutes: number;
  riskIncrease: number;
  recoveryUrgency: number;
}

export interface RecoveryReport {
  taskId: string;
  sessionId?: string;
  triggerReason: string;
  severity: RecoverySeverity;
  metrics: RecoveryMetrics;
  recommendedStrategies: RecoveryStrategy[];
  requiresDecision: boolean;
  earliestCompletionDate?: string;
  generatedAt: string;
}
