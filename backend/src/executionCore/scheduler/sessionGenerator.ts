import { Milestone } from './types';
import crypto from 'crypto';

export interface ExecutionSession {
  sessionId: string;
  scheduledDate?: string;
  sessionTitle: string;
  durationMinutes: number;
  tasks: Milestone[];
  estimatedCompletion?: string;
  isCompleted?: boolean;
  completedAt?: string;
  accumulatedTime?: number;
  notes?: string;
  status?: 'Pending' | 'In Progress' | 'Completed' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  technique?: string;
  cycleCount?: number;
  timerPhase?: 'idle' | 'work' | 'break';
  timeLeft?: number;
  isRunning?: boolean;
  startedAt?: string;
  updatedAt?: string;
  completionMethod?: 'early' | 'full';
  earlyCompletionReason?: string;
  reflectionNotes?: string;
  attachment?: any;
  referenceLink?: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
}

/**
 * Generates neutral session titles to avoid assuming implementation details.
 */
const determineNeutralSessionTitle = (tasks: Milestone[]): string => {
  const allTitles = tasks.map(t => t.title.toLowerCase()).join(' ');

  if (allTitles.match(/review|test|check|verify|qa|audit|debug/)) {
    return 'Review Block';
  }
  if (allTitles.match(/study|read|learn|research|analyze|understand/)) {
    return 'Deep Study Session';
  }
  
  return 'Focused Execution Block';
};

/**
 * Converts total estimated work into discrete execution sessions.
 * Respects milestone boundaries aggressively to prevent arbitrary splitting.
 */
export const generateSessions = (
  estimatedHours: number,
  milestones: Milestone[],
  deadline: string
): ExecutionSession[] => {
  const sessions: ExecutionSession[] = [];
  
  // Clone milestones into a queue of work
  const queue = milestones
    .map(m => ({ 
      original: m, 
      remainingMins: Math.round((m.estimatedHours || 0) * 60),
      isContinuation: false
    }))
    .filter(m => m.remainingMins > 0);

  let currentDuration = 0;
  let currentTasks: any[] = [];

  // Determine optimal chunk size based on total estimated time
  const totalMinutes = estimatedHours * 60;
  let optimalChunkSize = 45;
  if (totalMinutes <= 60) {
    optimalChunkSize = 60; // Try to fit in one session
  } else if (totalMinutes <= 120) {
    optimalChunkSize = totalMinutes / 2; // Split into two equal sessions
  } else {
    optimalChunkSize = 60; // Standard 60 min focus blocks
  }

  while (queue.length > 0) {
    const task = queue[0]!;

    // Avoid splitting: if the task doesn't fit in the max session size (120),
    // and we already have some tasks in the current session (>= 30m),
    // we should close the current session early so the large task gets a fresh block.
    if (currentDuration > 0 && currentDuration + task.remainingMins > 120) {
      if (currentDuration >= 30) {
        sessions.push({
          sessionId: crypto.randomUUID(),
          sessionTitle: determineNeutralSessionTitle(currentTasks.map(t => t.original)),
          durationMinutes: currentDuration,
          tasks: currentTasks.map(t => ({
            ...t.original,
            title: t.isContinuation ? `${t.original.title} (Continuation)` : t.original.title
          })),
          status: 'Pending',
          plannedStartTime: null,
          plannedEndTime: null
        });
        currentDuration = 0;
        currentTasks = [];
        continue; // Retry task with a fresh session
      }
    }

    const availableRoom = 120 - currentDuration;

    if (task.remainingMins <= availableRoom) {
      // Consume entire task
      currentTasks.push({ ...task });
      currentDuration += task.remainingMins;
      queue.shift();

      // If we've hit the optimal chunk size, close the session.
      // This preserves chunks while avoiding slicing tasks midway.
      if (currentDuration >= optimalChunkSize) {
        sessions.push({
          sessionId: crypto.randomUUID(),
          sessionTitle: determineNeutralSessionTitle(currentTasks.map(t => t.original)),
          durationMinutes: currentDuration,
          tasks: currentTasks.map(t => ({
            ...t.original,
            title: t.isContinuation ? `${t.original.title} (Continuation)` : t.original.title
          })),
          status: 'Pending',
          plannedStartTime: null,
          plannedEndTime: null
        });
        currentDuration = 0;
        currentTasks = [];
      }
    } else {
      // Task exceeds available room, we MUST split it
      const consumed = availableRoom;
      currentTasks.push({ ...task });
      currentDuration += consumed;
      
      task.remainingMins -= consumed;
      task.isContinuation = true;

      // Close the filled session
      sessions.push({
        sessionId: crypto.randomUUID(),
        sessionTitle: determineNeutralSessionTitle(currentTasks.map(t => t.original)),
        durationMinutes: currentDuration,
        tasks: currentTasks.map(t => ({
          ...t.original,
          title: t.isContinuation ? `${t.original.title} (Continuation)` : t.original.title
        })),
        status: 'Pending',
        plannedStartTime: null,
        plannedEndTime: null
      });
      currentDuration = 0;
      currentTasks = [];
    }
  }

  // Flush any remaining tasks into a final session
  if (currentDuration > 0) {
    const finalDuration = Math.max(5, currentDuration); // enforce minimum 5 for micro tasks
    sessions.push({
      sessionId: crypto.randomUUID(),
      sessionTitle: determineNeutralSessionTitle(currentTasks.map(t => t.original)),
      durationMinutes: finalDuration,
      tasks: currentTasks.map(t => ({
        ...t.original,
        title: t.isContinuation ? `${t.original.title} (Continuation)` : t.original.title
      })),
      status: 'Pending',
      plannedStartTime: null,
      plannedEndTime: null
    });
  }

  return sessions;
};
