export enum EventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_PAUSED = 'SESSION_PAUSED',
  SESSION_RESUMED = 'SESSION_RESUMED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  SESSION_CANCELLED = 'SESSION_CANCELLED',
  
  REFLECTION_SUBMITTED = 'REFLECTION_SUBMITTED',
  OBSERVATION_RECORDED = 'OBSERVATION_RECORDED',
  
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  HEALTH_STATE_CHANGED = 'HEALTH_STATE_CHANGED'
}

export interface BaseEvent {
  id: string; // UUID for the event
  type: EventType;
  timestamp: string; // ISO String
  userId: string;
}

export interface TaskEvent extends BaseEvent {
  taskId: string;
  payload: any; // Task details
}

export interface SessionEvent extends BaseEvent {
  taskId: string;
  sessionId: string;
  payload: any; // Session state transitions
}

export interface ReflectionEvent extends BaseEvent {
  taskId: string;
  sessionId: string;
  reflectionId: string;
  payload: any; // Reflection details (completionResult, primaryReason, etc.)
}

export interface ObservationEvent extends BaseEvent {
  taskId?: string;
  sessionId?: string;
  observationId: string;
  payload: any; // Context and notes
}

export interface SystemErrorEvent extends BaseEvent {
  error: any;
  context: string;
}

// Map event types to their specific payload interfaces
export type EventPayloadMap = {
  [EventType.TASK_CREATED]: TaskEvent;
  [EventType.TASK_UPDATED]: TaskEvent;
  [EventType.TASK_COMPLETED]: TaskEvent;
  
  [EventType.SESSION_STARTED]: SessionEvent;
  [EventType.SESSION_PAUSED]: SessionEvent;
  [EventType.SESSION_RESUMED]: SessionEvent;
  [EventType.SESSION_COMPLETED]: SessionEvent;
  [EventType.SESSION_CANCELLED]: SessionEvent;
  
  [EventType.REFLECTION_SUBMITTED]: ReflectionEvent;
  [EventType.OBSERVATION_RECORDED]: ObservationEvent;
  
  [EventType.SYSTEM_ERROR]: SystemErrorEvent;
  [EventType.HEALTH_STATE_CHANGED]: BaseEvent & { payload: any };
};
