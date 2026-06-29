import { describe, it, expect } from '@jest/globals';
import { startSession, pauseSession, resumeSession, completeSession, cancelSession, FocusEngineError } from '../focusEngine';
import { FocusSessionData } from '../focusTypes';

describe('Focus Session Engine', () => {
  const getBaseSession = (): FocusSessionData => ({
    sessionId: 's1',
    taskId: 't1',
    userId: 'u1',
    status: 'SCHEDULED',
    durationMinutes: 60,
    accumulatedTime: 0,
    pauses: []
  });

  it('handles normal execution lifecycle', () => {
    const t0 = new Date('2026-07-01T10:00:00Z');
    let session = startSession(getBaseSession(), t0);
    expect(session.status).toBe('RUNNING');
    expect(session.startedAt).toBe(t0.toISOString());

    const t1 = new Date('2026-07-01T10:30:00Z');
    session = pauseSession(session, t1);
    expect(session.status).toBe('PAUSED');
    expect(session.pauses.length).toBe(1);
    expect(session.pauses[0]!.startedAt).toBe(t1.toISOString());

    const t2 = new Date('2026-07-01T10:35:00Z');
    session = resumeSession(session, t2);
    expect(session.status).toBe('RESUMED');
    expect(session.pauses[0]!.endedAt).toBe(t2.toISOString());

    const t3 = new Date('2026-07-01T11:05:00Z');
    // 60 minutes worked
    session = completeSession(session, 3600, 'full', undefined, t3);
    
    expect(session.status).toBe('COMPLETED');
    expect(session.summary?.actualDurationMinutes).toBe(60);
    expect(session.summary?.numberOfPauses).toBe(1);
    expect(session.summary?.totalPauseTimeMinutes).toBe(5);
  });

  it('prevents starting completed sessions', () => {
    const session = getBaseSession();
    session.status = 'COMPLETED';
    expect(() => startSession(session)).toThrow(FocusEngineError);
  });

  it('prevents pausing a session that is not running', () => {
    const session = getBaseSession();
    expect(() => pauseSession(session)).toThrow(FocusEngineError);
  });

  it('handles early completion correctly', () => {
    let session = startSession(getBaseSession());
    session = completeSession(session, 1800, 'early', { earlyCompletionReason: 'Done faster' });
    
    expect(session.status).toBe('PARTIALLY_COMPLETED');
    expect(session.summary?.earlyCompletionReason).toBe('Done faster');
    expect(session.summary?.actualDurationMinutes).toBe(30);
  });

  it('handles cancelling a session', () => {
    let session = startSession(getBaseSession());
    session = cancelSession(session);
    expect(session.status).toBe('CANCELLED');
    
    expect(() => completeSession(session, 0, 'full')).toThrow(FocusEngineError);
  });
});
