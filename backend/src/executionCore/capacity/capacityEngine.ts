import { getAvailabilityForDate, getAvailabilityForWeek } from '../availability/availabilityEngine';
import { getSessionsForDate, getSessionsForDateRange } from '../../repositories/sessionRepository';
import { getProfile } from '../../repositories/profileRepository';
import { CapacityDay, CapacityStatus, CapacityScore } from './capacityTypes';
import { ExecutionSession } from '../scheduler/sessionGenerator';

// Helper: Convert "HH:mm" to total minutes from midnight
function timeToMins(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = Number(parts[0] || 0);
  const m = Number(parts[1] || 0);
  return h * 60 + m;
}

// Helper: Convert minutes from midnight to "HH:mm"
function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Helper: Get current time in specified timezone (fallback to UTC if missing)
function getCurrentTimeInTimezone(timezone: string | undefined, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // Formatter returns something like "14:30" or "24:00"
    let timeStr = formatter.format(date);
    if (timeStr.startsWith('24')) {
      timeStr = '00' + timeStr.slice(2);
    }
    return timeStr;
  } catch (err) {
    console.warn(`[Capacity Engine] Invalid timezone ${timezone}, falling back to UTC.`);
    return date.toISOString().substr(11, 5); // "HH:mm"
  }
}

// Helper: Check if a date string is today
function isTodayInTimezone(dateStr: string, timezone: string | undefined, date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date) === dateStr;
  } catch {
    return date.toISOString().split('T')[0] === dateStr;
  }
}

// Internal worker
async function calculateCapacity(
  userId: string,
  date: string,
  currentTimeOverride?: Date
): Promise<CapacityDay> {
  const profile: any = await getProfile(userId);
  if (!profile) {
    throw new Error(`Profile not found for user: ${userId}`);
  }

  // 1. Determine max capacity
  const maxDailyWorkHours = profile.planning?.maxDailyWorkHours || profile.maxDailyWorkHours || 8;
  const maximumDailyCapacity = maxDailyWorkHours * 60;

  // 2. Load Availability
  const availability = await getAvailabilityForDate(userId, date);

  // 3. Load Sessions
  const sessions = await getSessionsForDate(userId, date);
  let plannedMinutes = 0;
  let completedMinutes = 0;

  for (const session of sessions) {
    const status = session.status?.toUpperCase() || 'PENDING';
    if (status === 'COMPLETED') {
      completedMinutes += (session.durationMinutes || 0);
    } else if (status === 'PENDING' || status === 'IN_PROGRESS') {
      plannedMinutes += (session.durationMinutes || 0);
    }
    // Ignore skipped/cancelled
  }

  // 4. Current Time Awareness
  // Check if date is today in user's timezone, or if it's in the past/future
  let futureAvailableMinutes = availability.totalAvailableMinutes;
  
  const tz = profile.basic?.timezone || profile.timezone;
  const currentEngineDate = currentTimeOverride || new Date();
  
  if (isTodayInTimezone(date, tz, currentEngineDate)) {
    const currentTimeStr = getCurrentTimeInTimezone(tz, currentEngineDate);
    const currentMins = timeToMins(currentTimeStr);

    let futureMins = 0;
    for (const block of availability.availableBlocks) {
      const blockStart = timeToMins(block.start);
      const blockEnd = timeToMins(block.end);
      
      if (blockEnd > currentMins) {
        const effectiveStart = Math.max(blockStart, currentMins);
        futureMins += (blockEnd - effectiveStart);
      }
    }
    futureAvailableMinutes = futureMins;
  } else {
    // Past dates have 0 future available minutes
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
      const todayStr = formatter.format(currentEngineDate);
      if (date < todayStr) {
        futureAvailableMinutes = 0;
      }
    } catch {
      if (date < currentEngineDate.toISOString().split('T')[0]!) {
        futureAvailableMinutes = 0;
      }
    }
  }

  // 5. Calculate Remaining Capacity
  // We can't plan more than maxCapacity minus what's already planned/completed
  const theoreticalRemaining = Math.max(0, maximumDailyCapacity - plannedMinutes - completedMinutes);
  
  // We can't plan more than the actual available free time left today
  const timeBasedRemaining = Math.max(0, futureAvailableMinutes);
  
  const remainingCapacity = Math.min(theoreticalRemaining, timeBasedRemaining);

  // 6. Utilization
  const utilization = maximumDailyCapacity > 0 
    ? Math.round(((plannedMinutes + completedMinutes) / maximumDailyCapacity) * 100)
    : 100;

  // 7. Determine Status
  let status: CapacityStatus = 'EMPTY';
  if (plannedMinutes + completedMinutes > maximumDailyCapacity) {
    status = 'OVERBOOKED';
  } else if (utilization >= 90) {
    status = 'FULL';
  } else if (utilization >= 75) {
    status = 'BUSY';
  } else if (utilization >= 40) {
    status = 'NORMAL';
  } else if (utilization > 0) {
    status = 'LIGHT';
  } else {
    status = 'EMPTY';
  }

  // 8. Calculate Capacity Score
  const rawScore = maximumDailyCapacity > 0 ? (remainingCapacity / maximumDailyCapacity) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  
  let scoreLabel = 'No Capacity';
  if (score >= 80) scoreLabel = 'Wide Open';
  else if (score >= 50) scoreLabel = 'Healthy';
  else if (score >= 20) scoreLabel = 'Limited';

  console.log(`[Capacity Engine] Date: ${date} | Available: ${availability.totalAvailableMinutes}m (Future: ${futureAvailableMinutes}m) | Max: ${maximumDailyCapacity}m | Planned: ${plannedMinutes}m | Completed: ${completedMinutes}m | Remaining: ${remainingCapacity}m | Util: ${utilization}%`);

  return {
    date,
    availableMinutes: availability.totalAvailableMinutes, // Keep original available minutes for context
    maximumDailyCapacity,
    plannedMinutes,
    completedMinutes,
    remainingCapacity,
    utilization,
    capacityScore: {
      score,
      label: scoreLabel
    },
    status
  };
}

export async function getCapacityForDate(userId: string, date: string): Promise<CapacityDay> {
  return calculateCapacity(userId, date);
}

// For unit tests/simulations to inject current time
export async function getCapacityForDateWithTime(userId: string, date: string, currentTime: Date): Promise<CapacityDay> {
  return calculateCapacity(userId, date, currentTime);
}

export async function getCapacityForWeek(userId: string, startDateStr: string): Promise<CapacityDay[]> {
  const start = new Date(startDateStr);
  const capacityDays: CapacityDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0] as string;
    const capacity = await calculateCapacity(userId, dateStr);
    capacityDays.push(capacity);
  }
  
  return capacityDays;
}
