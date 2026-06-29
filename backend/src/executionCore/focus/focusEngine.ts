import { FocusSessionData, SessionState, SessionSummary } from './focusTypes';

export class FocusEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FocusEngineError';
  }
}

export const startSession = (sessionData: FocusSessionData, currentTime?: Date): FocusSessionData => {
  if (['COMPLETED', 'PARTIALLY_COMPLETED', 'CANCELLED', 'SKIPPED', 'FAILED'].includes(sessionData.status)) {
    throw new FocusEngineError(`Cannot start a session that is already ${sessionData.status}`);
  }
  
  if (sessionData.status === 'RUNNING') {
    throw new FocusEngineError('Session is already RUNNING');
  }

  const now = currentTime ? currentTime.toISOString() : new Date().toISOString();

  return {
    ...sessionData,
    status: 'RUNNING',
    startedAt: sessionData.startedAt || now,
    pauses: sessionData.pauses || []
  };
};

export const pauseSession = (sessionData: FocusSessionData, currentTime?: Date): FocusSessionData => {
  if (sessionData.status !== 'RUNNING' && sessionData.status !== 'RESUMED') {
    throw new FocusEngineError(`Cannot pause a session in state ${sessionData.status}`);
  }

  const now = currentTime ? currentTime.toISOString() : new Date().toISOString();
  
  const pauses = [...(sessionData.pauses || [])];
  pauses.push({ startedAt: now });

  return {
    ...sessionData,
    status: 'PAUSED',
    pauses
  };
};

export const resumeSession = (sessionData: FocusSessionData, currentTime?: Date): FocusSessionData => {
  if (sessionData.status !== 'PAUSED') {
    throw new FocusEngineError(`Cannot resume a session in state ${sessionData.status}`);
  }

  const now = currentTime ? currentTime.toISOString() : new Date().toISOString();
  const pauses = [...(sessionData.pauses || [])];
  
  if (pauses.length > 0) {
    const lastPause = pauses[pauses.length - 1];
    if (lastPause && !lastPause.endedAt) {
      lastPause.endedAt = now;
    }
  }

  return {
    ...sessionData,
    status: 'RESUMED', // Actually we can use 'RUNNING' or 'RESUMED' based on requirements, prompt says RESUMED is a state.
    pauses
  };
};

export const cancelSession = (sessionData: FocusSessionData, currentTime?: Date): FocusSessionData => {
  if (['COMPLETED', 'PARTIALLY_COMPLETED'].includes(sessionData.status)) {
    throw new FocusEngineError(`Cannot cancel a completed session`);
  }

  const now = currentTime ? currentTime.toISOString() : new Date().toISOString();
  const pauses = [...(sessionData.pauses || [])];
  
  // Close any open pause
  if (pauses.length > 0) {
    const lastPause = pauses[pauses.length - 1];
    if (lastPause && !lastPause.endedAt) {
      lastPause.endedAt = now;
    }
  }

  let totalPauseTimeMs = 0;
  for (const p of pauses) {
    if (p.endedAt) {
      totalPauseTimeMs += (new Date(p.endedAt).getTime() - new Date(p.startedAt).getTime());
    }
  }

  const summary: SessionSummary = {
    estimatedDurationMinutes: sessionData.durationMinutes,
    actualDurationMinutes: Math.round(Math.max(0, sessionData.accumulatedTime || 0) / 60),
    startTime: sessionData.startedAt || now,
    endTime: now,
    numberOfPauses: pauses.length,
    totalPauseTimeMinutes: Math.round(totalPauseTimeMs / (1000 * 60)),
    completionStatus: 'CANCELLED'
  };

  return {
    ...sessionData,
    status: 'CANCELLED',
    completedAt: now,
    pauses,
    summary
  };
};

export const completeSession = (
  sessionData: FocusSessionData, 
  actualAccumulatedTimeSeconds: number, 
  completionMethod: 'full' | 'early',
  additionalData?: { earlyCompletionReason?: string; reflectionNotes?: string },
  currentTime?: Date
): FocusSessionData => {
  if (sessionData.status === 'CANCELLED') {
    throw new FocusEngineError(`Cannot complete a CANCELLED session`);
  }

  const now = currentTime ? currentTime.toISOString() : new Date().toISOString();
  const pauses = [...(sessionData.pauses || [])];
  
  // Close any open pause
  if (pauses.length > 0) {
    const lastPause = pauses[pauses.length - 1];
    if (lastPause && !lastPause.endedAt) {
      lastPause.endedAt = now;
    }
  }

  // Calculate total pause time
  let totalPauseTimeMs = 0;
  for (const p of pauses) {
    if (p.endedAt) {
      totalPauseTimeMs += (new Date(p.endedAt).getTime() - new Date(p.startedAt).getTime());
    }
  }

  const finalStatus: SessionState = completionMethod === 'early' ? 'PARTIALLY_COMPLETED' : 'COMPLETED';

  const summary: SessionSummary = {
    estimatedDurationMinutes: sessionData.durationMinutes,
    actualDurationMinutes: Math.round(Math.max(0, actualAccumulatedTimeSeconds) / 60),
    startTime: sessionData.startedAt || now,
    endTime: now,
    numberOfPauses: pauses.length,
    totalPauseTimeMinutes: Math.round(totalPauseTimeMs / (1000 * 60)),
    completionStatus: finalStatus,
    ...(additionalData?.earlyCompletionReason && { earlyCompletionReason: additionalData.earlyCompletionReason }),
    ...(additionalData?.reflectionNotes && { reflectionNotes: additionalData.reflectionNotes })
  };

  return {
    ...sessionData,
    status: finalStatus,
    accumulatedTime: Math.max(0, actualAccumulatedTimeSeconds),
    completedAt: now,
    pauses,
    summary
  };
};
