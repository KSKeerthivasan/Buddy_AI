import { getProfile } from '../../repositories/profileRepository';

export interface FreeSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
  durationMinutes: number;
}

export interface BusyBlock {
  start: string;
  end: string;
  activity: string;
}

export interface AvailabilityResult {
  date: string; // YYYY-MM-DD
  workingWindow: { start: string; end: string };
  busyBlocks: BusyBlock[];
  freeSlots: FreeSlot[];
  totalAvailableMinutes: number;
  effectivePlanningCapacityMinutes: number;
}

/**
 * Helper to convert HH:mm to minutes since midnight
 */
const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Helper to convert minutes since midnight to HH:mm
 */
const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Computes availability for a single date given a User Profile
 */
export const getAvailabilityForDate = async (userId: string, dateStr: string): Promise<AvailabilityResult> => {
  const profile = await getProfile(userId);
  if (!profile) {
    return {
      date: dateStr,
      workingWindow: { start: '08:00', end: '22:00' },
      busyBlocks: [],
      freeSlots: [{ start: '08:00', end: '22:00', durationMinutes: 14 * 60 }],
      totalAvailableMinutes: 14 * 60,
      effectivePlanningCapacityMinutes: 4 * 60
    };
  }

  // Parse date and day of week
  const dateObj = new Date(dateStr);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[dateObj.getDay()];

  // Defaults if profile is incomplete
  const wakeUpStr = (profile as any).wakeUpTime || '08:00';
  const sleepStr = (profile as any).sleepTime || '22:00';
  const maxDailyWorkHours = typeof (profile as any).maxDailyWorkHours === 'number' ? (profile as any).maxDailyWorkHours : 4;
  
  const workingWindowStart = timeToMinutes(wakeUpStr);
  const workingWindowEnd = timeToMinutes(sleepStr);
  
  // Extract schedule blocks for this day
  const rawSchedule = dayName ? (profile as any).weeklySchedule?.[dayName] : [];
  
  // Filter and map to BusyBlocks within the working window
  const busyBlocks: BusyBlock[] = [];
  rawSchedule.forEach((block: any) => {
    const s = Math.max(timeToMinutes(block.start), workingWindowStart);
    const e = Math.min(timeToMinutes(block.end), workingWindowEnd);
    if (s < e) {
      busyBlocks.push({
        start: minutesToTime(s),
        end: minutesToTime(e),
        activity: block.activity
      });
    }
  });

  // Sort busy blocks by start time
  busyBlocks.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  // Merge overlapping busy blocks
  const mergedBusyBlocks: { s: number, e: number }[] = [];
  for (const block of busyBlocks) {
    const s = timeToMinutes(block.start);
    const e = timeToMinutes(block.end);
    
    if (mergedBusyBlocks.length === 0) {
      mergedBusyBlocks.push({ s, e });
    } else {
      const last = mergedBusyBlocks[mergedBusyBlocks.length - 1];
      if (last && s <= last.e) {
        last.e = Math.max(last.e, e);
      } else {
        mergedBusyBlocks.push({ s, e });
      }
    }
  }

  // Calculate free slots
  const freeSlots: FreeSlot[] = [];
  let currentStart = workingWindowStart;

  for (const busy of mergedBusyBlocks) {
    if (busy.s > currentStart) {
      freeSlots.push({
        start: minutesToTime(currentStart),
        end: minutesToTime(busy.s),
        durationMinutes: busy.s - currentStart
      });
    }
    currentStart = Math.max(currentStart, busy.e);
  }

  if (currentStart < workingWindowEnd) {
    freeSlots.push({
      start: minutesToTime(currentStart),
      end: minutesToTime(workingWindowEnd),
      durationMinutes: workingWindowEnd - currentStart
    });
  }

  // Calculate totals
  const totalAvailableMinutes = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);
  const effectivePlanningCapacityMinutes = Math.min(totalAvailableMinutes, maxDailyWorkHours * 60);

  return {
    date: dateStr,
    workingWindow: {
      start: wakeUpStr,
      end: sleepStr
    },
    busyBlocks,
    freeSlots,
    totalAvailableMinutes,
    effectivePlanningCapacityMinutes
  };
};

/**
 * Computes availability for 7 days starting from startDateStr
 */
export const getAvailabilityForWeek = async (userId: string, startDateStr: string): Promise<AvailabilityResult[]> => {
  const results: AvailabilityResult[] = [];
  const start = new Date(startDateStr);
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    // YYYY-MM-DD format strictly without timezone issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const result = await getAvailabilityForDate(userId, dateStr);
    results.push(result);
  }
  
  return results;
};
