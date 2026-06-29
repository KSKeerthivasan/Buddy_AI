import { SessionState } from '../focus/focusTypes';

export type ObservationCategory = 'EXECUTION' | 'TIMING' | 'FOCUS' | 'PROGRESS' | 'COMPLETION' | 'INTERACTION';

export interface ExecutionMetrics {
  executionDate: string;
  startTime: string;
  endTime: string;
}

export interface TimingMetrics {
  estimatedDurationMinutes: number;
  actualDurationMinutes: number;
  differenceMinutes: number;
  elapsedTimeSeconds: number;
  totalPauseTimeSeconds: number;
  pauseCount: number;
  averageContinuousFocusDurationMinutes: number;
}

export interface FocusMetrics {
  numberOfPauses: number;
  longestContinuousFocusMinutes: number;
  totalActiveTimeSeconds: number;
  totalIdleTimeSeconds: number;
}

export interface ProgressMetrics {
  notesAdded: boolean;
  evidenceUploaded: boolean;
}

export interface CompletionMetrics {
  status: SessionState;
  earlyCompletionReason?: string;
}

export interface InteractionMetrics {
  endMethod: 'Manual Complete' | 'Timer Finished' | 'Cancelled' | 'Auto Timeout';
}

export interface Observation {
  observationId?: string;
  userId: string;
  taskId: string;
  sessionId: string;
  timestamp: string; // ISO
  execution: ExecutionMetrics;
  timing: TimingMetrics;
  focus: FocusMetrics;
  progress: ProgressMetrics;
  completion: CompletionMetrics;
  interaction: InteractionMetrics;
}
