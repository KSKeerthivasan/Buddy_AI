import { FocusSessionData } from '../focus/focusTypes';
import { Observation } from './observationTypes';

export const generateObservationFromSession = (
  sessionData: FocusSessionData, 
  endMethod: 'Manual Complete' | 'Timer Finished' | 'Cancelled' | 'Auto Timeout'
): Observation => {
  const summary = sessionData.summary;
  
  if (!summary) {
    throw new Error('Cannot generate observation for a session without a summary.');
  }

  // Calculate timing metrics
  const estimatedDurationMinutes = sessionData.durationMinutes || 0;
  const actualDurationMinutes = summary.actualDurationMinutes || 0;
  const differenceMinutes = actualDurationMinutes - estimatedDurationMinutes;
  
  const elapsedTimeSeconds = sessionData.accumulatedTime || 0;
  const totalPauseTimeSeconds = summary.totalPauseTimeMinutes * 60;
  const pauseCount = summary.numberOfPauses;
  
  // Calculate longest continuous focus
  let longestContinuousFocusSeconds = 0;
  
  if (sessionData.pauses && sessionData.pauses.length > 0) {
    let currentFocusStart = new Date(summary.startTime).getTime();
    
    for (const pause of sessionData.pauses) {
      const pauseStart = new Date(pause.startedAt).getTime();
      const continuousFocusDuration = Math.max(0, pauseStart - currentFocusStart) / 1000;
      
      if (continuousFocusDuration > longestContinuousFocusSeconds) {
        longestContinuousFocusSeconds = continuousFocusDuration;
      }
      
      if (pause.endedAt) {
        currentFocusStart = new Date(pause.endedAt).getTime();
      } else {
        // If pause didn't end before summary generation (which shouldn't happen based on focus engine rules)
        currentFocusStart = new Date(summary.endTime).getTime();
      }
    }
    
    // Check the final block after the last pause
    const endT = new Date(summary.endTime).getTime();
    if (endT > currentFocusStart) {
      const finalFocusDuration = (endT - currentFocusStart) / 1000;
      if (finalFocusDuration > longestContinuousFocusSeconds) {
        longestContinuousFocusSeconds = finalFocusDuration;
      }
    }
  } else {
    longestContinuousFocusSeconds = Math.max(0, new Date(summary.endTime).getTime() - new Date(summary.startTime).getTime()) / 1000;
  }

  const averageContinuousFocusDurationMinutes = pauseCount > 0 
    ? (elapsedTimeSeconds / (pauseCount + 1)) / 60 
    : elapsedTimeSeconds / 60;

  return {
    userId: sessionData.userId,
    taskId: sessionData.taskId,
    sessionId: sessionData.sessionId,
    timestamp: new Date().toISOString(),
    execution: {
      executionDate: new Date(summary.startTime).toISOString().split('T')[0]!,
      startTime: summary.startTime,
      endTime: summary.endTime,
    },
    timing: {
      estimatedDurationMinutes,
      actualDurationMinutes,
      differenceMinutes,
      elapsedTimeSeconds,
      totalPauseTimeSeconds,
      pauseCount,
      averageContinuousFocusDurationMinutes: Math.round(averageContinuousFocusDurationMinutes * 10) / 10
    },
    focus: {
      numberOfPauses: pauseCount,
      longestContinuousFocusMinutes: Math.round((longestContinuousFocusSeconds / 60) * 10) / 10,
      totalActiveTimeSeconds: elapsedTimeSeconds,
      totalIdleTimeSeconds: totalPauseTimeSeconds
    },
    progress: {
      notesAdded: !!sessionData.notes && sessionData.notes.trim().length > 0,
      evidenceUploaded: !!sessionData.attachment
    },
    completion: {
      status: summary.completionStatus,
      ...(summary.earlyCompletionReason && { earlyCompletionReason: summary.earlyCompletionReason })
    },
    interaction: {
      endMethod
    }
  };
};
