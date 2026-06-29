import crypto from 'crypto';
import { getAvailabilityForDate } from '../availability/availabilityEngine';
import { getCapacityForDate } from '../capacity/capacityEngine';
import { ExecutionSession } from './sessionGenerator';
import { SchedulerV2Input, ExecutionPlanV2, ExecutionFeasibility } from './schedulerTypesV2';
import { Milestone } from './types';

// Helper: Convert "HH:mm" to minutes
function timeToMins(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return h * 60 + m;
}

// Helper: Convert minutes to "HH:mm"
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Helper: Get YYYY-MM-DD
function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] as string;
}

function chopMilestonesToSessions(milestones: Milestone[], taskTitle: string): Partial<ExecutionSession>[] {
  const sessions: Partial<ExecutionSession>[] = [];
  
  for (const ms of milestones) {
    const mins = ms.estimatedHours ? ms.estimatedHours * 60 : 30; // default 30 mins
    
    // Chunking logic based on Sprint 2.2 rules
    if (mins <= 60) {
      sessions.push({
        sessionId: crypto.randomUUID(),
        sessionTitle: `${taskTitle} - ${ms.title}`,
        durationMinutes: mins,
        status: 'PENDING',
        tasks: [ms]
      });
    } else if (mins <= 120) {
      // Split into 2
      const half = Math.floor(mins / 2);
      sessions.push({
        sessionId: crypto.randomUUID(),
        sessionTitle: `${taskTitle} - ${ms.title} (Part 1)`,
        durationMinutes: half,
        status: 'PENDING',
        tasks: [ms]
      });
      sessions.push({
        sessionId: crypto.randomUUID(),
        sessionTitle: `${taskTitle} - ${ms.title} (Part 2)`,
        durationMinutes: mins - half,
        status: 'PENDING',
        tasks: [ms]
      });
    } else {
      // Large Tasks > 120min -> split into ~60min chunks
      let remaining = mins;
      let part = 1;
      while (remaining > 0) {
        const chunk = remaining > 90 ? 60 : remaining;
        sessions.push({
          sessionId: crypto.randomUUID(),
          sessionTitle: `${taskTitle} - ${ms.title} (Part ${part})`,
          durationMinutes: chunk,
          status: 'PENDING',
          tasks: [ms]
        });
        remaining -= chunk;
        part++;
      }
    }
  }
  
  return sessions;
}

export async function scheduleExecutionPlan(input: SchedulerV2Input): Promise<ExecutionPlanV2> {
  const unscheduled = chopMilestonesToSessions(input.milestones, input.taskTitle);
  const scheduledSessions: ExecutionSession[] = [];
  
  const totalRequiredMinutes = unscheduled.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  
  let currentDateStr = input.startDate || new Date().toISOString().split('T')[0] as string;
  const deadlineStr = input.deadline;
  
  let availableMinutesBeforeDeadline = 0;
  let capacityShortfall = 0;
  let isFeasible = true;
  
  let currentIndex = 0;
  
  // Try to schedule all sessions
  while (currentIndex < unscheduled.length) {
    // Prevent infinite loop if something goes wrong (e.g. 5 years into future)
    if (currentDateStr > addDaysToDateString(deadlineStr, 365)) {
      throw new Error("Unable to schedule task within 1 year");
    }

    const capacity = await getCapacityForDate(input.userId, currentDateStr);
    const availability = await getAvailabilityForDate(input.userId, currentDateStr);
    
    // Add to tally if we are before or on deadline
    if (currentDateStr <= deadlineStr) {
      availableMinutesBeforeDeadline += capacity.remainingCapacity;
    }

    let dailyCapacityLeft = capacity.remainingCapacity;
    // Map blocks to easily modifiable objects
    let dailyGaps = availability.availableBlocks.map(b => ({
      startMins: timeToMins(b.start),
      duration: b.durationMinutes || 0
    }));

    let scheduledAnyToday = false;

    // Try to fit remaining sessions into today
    while (currentIndex < unscheduled.length && dailyCapacityLeft > 0) {
      const session = unscheduled[currentIndex] as Partial<ExecutionSession>;
      const duration = session.durationMinutes || 0;
      
      if (duration > dailyCapacityLeft) {
        break; // Not enough remaining capacity today for this session
      }
      
      // Find a gap that fits the entire session (No Arbitrary Fragmentation rule)
      const gapIndex = dailyGaps.findIndex(g => g.duration >= duration);
      
      if (gapIndex === -1) {
        // No single continuous block fits this session today
        break; 
      }
      
      // Schedule it
      const gap = dailyGaps[gapIndex]!;
      const startTimeStr = minsToTime(gap.startMins);
      const endTimeStr = minsToTime(gap.startMins + duration);
      
      scheduledSessions.push({
        ...session,
        scheduledDate: currentDateStr,
        estimatedCompletion: endTimeStr,
        startTime: startTimeStr, // Optional custom field if UI needs it
        endTime: endTimeStr
      } as any); // Cast as any because we might have injected custom fields
      
      // Deduct capacity and availability
      dailyCapacityLeft -= duration;
      gap.startMins += duration;
      gap.duration -= duration;
      
      currentIndex++;
      scheduledAnyToday = true;
    }
    
    // Move to next day
    currentDateStr = addDaysToDateString(currentDateStr, 1);
  }
  
  // Backtrack to find when we finished
  const completionDateStr = addDaysToDateString(currentDateStr, -1);
  
  // Calculate buffer days (difference between completion and deadline)
  let bufferDays = 0;
  if (completionDateStr <= deadlineStr) {
    const endMs = new Date(completionDateStr).getTime();
    const deadMs = new Date(deadlineStr).getTime();
    bufferDays = Math.floor((deadMs - endMs) / (1000 * 60 * 60 * 24));
  } else {
    isFeasible = false;
    capacityShortfall = totalRequiredMinutes - availableMinutesBeforeDeadline;
  }
  
  return {
    sessions: scheduledSessions,
    bufferDays,
    estimatedCompletion: completionDateStr,
    capacityUtilization: 100, // To be calculated properly if needed, but per-task isn't global
    schedulerVersion: 'v2',
    feasibility: {
      status: isFeasible ? 'FEASIBLE' : 'NOT_FEASIBLE',
      requiredMinutes: totalRequiredMinutes,
      availableMinutes: availableMinutesBeforeDeadline,
      capacityShortfall: capacityShortfall > 0 ? capacityShortfall : 0,
      earliestCompletionDate: completionDateStr
    }
  };
}
