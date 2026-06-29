export type SessionState = 
  | 'SCHEDULED' 
  | 'READY' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'RESUMED' 
  | 'COMPLETED' 
  | 'PARTIALLY_COMPLETED' 
  | 'SKIPPED' 
  | 'CANCELLED' 
  | 'FAILED';

export interface SessionPause {
  startedAt: string; // ISO String
  endedAt?: string; // ISO String
}

export interface SessionSummary {
  estimatedDurationMinutes: number;
  actualDurationMinutes: number;
  startTime: string; // ISO
  endTime: string; // ISO
  numberOfPauses: number;
  totalPauseTimeMinutes: number;
  completionStatus: SessionState;
  earlyCompletionReason?: string;
  reflectionNotes?: string;
}

export interface FocusSessionData {
  sessionId: string;
  taskId: string;
  userId: string;
  status: SessionState;
  durationMinutes: number;
  accumulatedTime: number; // in seconds
  startedAt?: string;
  completedAt?: string;
  pauses: SessionPause[];
  summary?: SessionSummary;
  notes?: string;
  attachment?: any;
  referenceLink?: string;
}
