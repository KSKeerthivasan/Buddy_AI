import { Reflection, CompletionResult, PrimaryReason } from './reflectionTypes';
import { SessionState } from '../focus/focusTypes';

export class ReflectionEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReflectionEngineError';
  }
}

export const validateReflection = (data: Partial<Reflection>): void => {
  if (!data.completionResult) {
    throw new ReflectionEngineError('Completion result is required.');
  }

  if (['PARTIALLY', 'NO'].includes(data.completionResult) && !data.primaryReason) {
    throw new ReflectionEngineError('Primary reason is required for PARTIALLY or NO completion results.');
  }

  if (data.notes && data.notes.length > 500) {
    throw new ReflectionEngineError('Notes must be a maximum of 500 characters.');
  }
};

export const shouldAllowEdit = (reflection: Reflection, currentTime?: Date): boolean => {
  const now = currentTime ? currentTime.getTime() : new Date().getTime();
  const submittedAt = new Date(reflection.submittedAt).getTime();
  
  // 15 minutes in milliseconds
  const GRACE_PERIOD_MS = 15 * 60 * 1000;
  
  return (now - submittedAt) <= GRACE_PERIOD_MS;
};

export const requiresReflection = (sessionStatus: SessionState): boolean => {
  return ['CANCELLED', 'FAILED', 'SKIPPED'].includes(sessionStatus);
};
