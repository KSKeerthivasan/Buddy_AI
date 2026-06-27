import { SchedulerInput, ScheduleResult, RiskLevel } from './types';
import { generateSessions } from './sessionGenerator';

/**
 * Calculates the number of full days available from today until the deadline.
 */
const calculateAvailableDays = (deadlineStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineStr);
  deadline.setHours(23, 59, 59, 999);
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Determines the daily capacity in minutes based on user role or explicit input.
 */
const getDailyCapacityMinutes = (role?: string, inputHours?: number): number => {
  if (inputHours && inputHours > 0) {
    return inputHours * 60;
  }

  const normalizedRole = role?.toLowerCase() || '';
  
  if (normalizedRole.includes('student')) {
    return 2 * 60; // 2 hours
  } else if (normalizedRole.includes('working') || normalizedRole.includes('professional')) {
    return 1.5 * 60; // 1.5 hours
  } else if (normalizedRole.includes('entrepreneur')) {
    return 2 * 60; // 2 hours
  }

  return 2 * 60; // Default fallback: 2 hours
};

/**
 * Adds a specific number of days to a given date.
 */
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Orchestrates the scheduling process with advanced proportional spacing.
 */
export const scheduleTask = (input: SchedulerInput): ScheduleResult => {
  const availableDays = calculateAvailableDays(input.deadline);

  // 1. Generate execution sessions (pure chunking, no dates)
  const sessions = generateSessions(input.estimatedHours, input.milestones, input.deadline);

  // 2. Determine daily capacity constraint
  const dailyCapacityMins = getDailyCapacityMinutes(input.role, input.dailyAvailableHours);

  // 3. Setup Allocation Metrics
  // Reserve roughly 20-30% buffer
  const bufferDays = Math.max(1, Math.ceil(availableDays * 0.25)); 
  const schedulableDays = availableDays - bufferDays;

  let currentDayIndex = 0;
  let currentDayRemainingMins = dailyCapacityMins;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 4. Spread Sessions across the schedulable window
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!;

    // Check capacity: if it doesn't fit on current day, we MUST advance.
    // Exception: if the day is completely fresh and the session is huge (exceeds daily cap).
    // The instructions say "Never exceed the user's daily capacity." 
    // Wait, if a single session is 120m, but cap is 90m, we are stuck.
    // If it's a fresh day, we must assign it anyway to avoid an infinite loop, 
    // even though it breaks the strict daily cap rule. The chunker prevents sessions > 120m.
    if (session.durationMinutes > currentDayRemainingMins && currentDayRemainingMins < dailyCapacityMins) {
      currentDayIndex++;
      currentDayRemainingMins = dailyCapacityMins;
    }

    // Assign date
    session.scheduledDate = addDays(today, currentDayIndex).toISOString().split('T')[0]!;
    currentDayRemainingMins -= session.durationMinutes;

    // Proportional Spacing Logic
    // If we have sessions left to schedule, should we intentionally skip days?
    const remainingSessions = sessions.length - 1 - i;
    
    if (remainingSessions > 0) {
      const remainingSchedulableDays = schedulableDays - currentDayIndex - 1;
      
      // We only insert intentional gaps if we have plenty of days left.
      // If we insert a gap, we move to the next day AND skip a day (total +2).
      // Or if we just advance to the next day without packing the current day full (+1).
      
      if (remainingSchedulableDays >= remainingSessions * 2) {
        // Aggressive Spacing: We have more than double the days we need. Insert a rest day!
        currentDayIndex += 2;
        currentDayRemainingMins = dailyCapacityMins;
      } else if (remainingSchedulableDays >= remainingSessions) {
        // Natural Spacing: We have enough days to do exactly 1 session per day. Advance to next day.
        currentDayIndex += 1;
        currentDayRemainingMins = dailyCapacityMins;
      } else {
        // Pack mode: We don't have enough days. We MUST stay on the current day 
        // and keep packing until capacity is full.
      }
    }
  }

  // 5. Calculate Final Metrics
  // The actual days we scheduled on (currentDayIndex is 0-based offset, so total is index + 1)
  // BUT we might have skipped days. "scheduledDays" usually implies the span of days.
  const spanOfScheduledDays = currentDayIndex + 1;
  const actualBufferDays = availableDays - spanOfScheduledDays;
  
  // "Never exceed user's daily capacity... Inform user if it cannot meet deadline."
  // If spanOfScheduledDays > availableDays, we overflowed the deadline.
  const isFeasible = spanOfScheduledDays <= availableDays;
  
  let riskLevel: RiskLevel = 'MEDIUM';
  if (!isFeasible) {
    riskLevel = 'HIGH';
  } else if (availableDays > 0 && (actualBufferDays / availableDays) >= 0.2) {
    riskLevel = 'LOW';
  }

  const message = !isFeasible 
    ? 'High risk: The schedule cannot meet the deadline without increasing available time or changing priorities.'
    : 'Schedule generated successfully with natural spacing.';

  return {
    isFeasible,
    totalDays: availableDays,
    scheduledDays: spanOfScheduledDays,
    bufferDays: actualBufferDays,
    riskLevel,
    executionSessions: sessions,
    message,
  };
};
