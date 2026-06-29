import { describe, it, expect } from '@jest/globals';
import { generateObservationFromSession } from '../observationEngine';
import { FocusSessionData } from '../../focus/focusTypes';

describe('Observation Engine', () => {
  it('correctly calculates longest continuous focus with pauses', () => {
    const sessionData: FocusSessionData = {
      userId: 'u1',
      taskId: 't1',
      sessionId: 's1',
      status: 'COMPLETED',
      durationMinutes: 60,
      accumulatedTime: 3600,
      pauses: [
        { 
          startedAt: new Date('2026-07-01T10:15:00Z').toISOString(), // 15 mins in
          endedAt: new Date('2026-07-01T10:20:00Z').toISOString()    // 5 min pause
        }
      ],
      summary: {
        startTime: new Date('2026-07-01T10:00:00Z').toISOString(),
        endTime: new Date('2026-07-01T11:05:00Z').toISOString(), // 60 mins active + 5 min pause = 65 total
        estimatedDurationMinutes: 60,
        actualDurationMinutes: 60,
        numberOfPauses: 1,
        totalPauseTimeMinutes: 5,
        completionStatus: 'COMPLETED'
      }
    };

    const obs = generateObservationFromSession(sessionData, 'Manual Complete');

    // 10:00 to 10:15 = 15 mins
    // 10:20 to 11:05 = 45 mins -> Longest block
    expect(obs.focus.longestContinuousFocusMinutes).toBe(45);
    expect(obs.focus.numberOfPauses).toBe(1);
    expect(obs.timing.actualDurationMinutes).toBe(60);
    expect(obs.timing.differenceMinutes).toBe(0);
    expect(obs.timing.totalPauseTimeSeconds).toBe(300);
    expect(obs.completion.status).toBe('COMPLETED');
    expect(obs.interaction.endMethod).toBe('Manual Complete');
  });

  it('correctly calculates longest continuous focus with multiple pauses', () => {
    const sessionData: FocusSessionData = {
      userId: 'u1',
      taskId: 't1',
      sessionId: 's1',
      status: 'PARTIALLY_COMPLETED',
      durationMinutes: 60,
      accumulatedTime: 3600, // 60 minutes
      pauses: [
        { 
          startedAt: new Date('2026-07-01T10:20:00Z').toISOString(), // 0 to 20 (20 min)
          endedAt: new Date('2026-07-01T10:25:00Z').toISOString()    
        },
        { 
          startedAt: new Date('2026-07-01T10:40:00Z').toISOString(), // 25 to 40 (15 min)
          endedAt: new Date('2026-07-01T10:50:00Z').toISOString()    
        }
      ],
      summary: {
        startTime: new Date('2026-07-01T10:00:00Z').toISOString(),
        endTime: new Date('2026-07-01T11:15:00Z').toISOString(), // 50 to 1:15 (25 min)
        estimatedDurationMinutes: 60,
        actualDurationMinutes: 60,
        numberOfPauses: 2,
        totalPauseTimeMinutes: 15,
        completionStatus: 'PARTIALLY_COMPLETED'
      }
    };

    const obs = generateObservationFromSession(sessionData, 'Timer Finished');

    // Expected blocks: 20, 15, 25. Longest should be 25.
    expect(obs.focus.longestContinuousFocusMinutes).toBe(25);
  });
});
