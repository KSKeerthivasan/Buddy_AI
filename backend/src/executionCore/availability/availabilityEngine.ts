import { getRoutineForDate, getRoutineForWeek } from '../routine/routineEngine';
import { AvailabilityDay, TimeBlock, FragmentationScore, AvailabilityScore, AvailabilityLabel } from './availabilityTypes';

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

// Helper: Duration between two times
function getDuration(start: string, end: string): number {
  return timeToMins(end) - timeToMins(start);
}

export async function getAvailabilityForDate(userId: string, date: string): Promise<AvailabilityDay> {
  console.log(`[Availability Engine] Fetching routine for ${date}`);
  const routine = await getRoutineForDate(userId, date);

  const windowStartMins = timeToMins(routine.workingWindow.start);
  const windowEndMins = timeToMins(routine.workingWindow.end);
  const workingWindowMins = windowEndMins - windowStartMins;

  // 1. Merge all occupied blocks
  const rawBlocks = [...routine.routineBlocks, ...routine.commitmentBlocks];
  const sortedBlocks = rawBlocks.sort((a, b) => timeToMins(a.start) - timeToMins(b.start));

  const occupiedBlocks: TimeBlock[] = [];
  for (const block of sortedBlocks) {
    const startMins = timeToMins(block.start);
    const endMins = timeToMins(block.end);
    
    // Ignore blocks completely outside working window for availability purposes
    if (endMins <= windowStartMins || startMins >= windowEndMins) continue;
    
    // Clamp to working window
    const clampedStart = Math.max(startMins, windowStartMins);
    const clampedEnd = Math.min(endMins, windowEndMins);

    if (occupiedBlocks.length === 0) {
      occupiedBlocks.push({ start: minsToTime(clampedStart), end: minsToTime(clampedEnd) });
    } else {
      const last = occupiedBlocks[occupiedBlocks.length - 1]!;
      const lastEnd = timeToMins(last.end);

      if (clampedStart <= lastEnd) {
        // Merge
        if (clampedEnd > lastEnd) {
          last.end = minsToTime(clampedEnd);
        }
      } else {
        occupiedBlocks.push({ start: minsToTime(clampedStart), end: minsToTime(clampedEnd) });
      }
    }
  }

  // 2. Generate Available Blocks
  const availableBlocks: TimeBlock[] = [];
  let currentStart = windowStartMins;

  for (const block of occupiedBlocks) {
    const bStart = timeToMins(block.start);
    const bEnd = timeToMins(block.end);

    if (bStart > currentStart) {
      const dur = bStart - currentStart;
      availableBlocks.push({
        start: minsToTime(currentStart),
        end: minsToTime(bStart),
        durationMinutes: dur
      });
    }
    currentStart = Math.max(currentStart, bEnd);
  }

  if (currentStart < windowEndMins) {
    availableBlocks.push({
      start: minsToTime(currentStart),
      end: minsToTime(windowEndMins),
      durationMinutes: windowEndMins - currentStart
    });
  }

  // 3. Calculate Metrics
  const totalAvailableMinutes = availableBlocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
  
  let longestContinuousBlock: TimeBlock | null = null;
  let maxDuration = 0;
  for (const b of availableBlocks) {
    if ((b.durationMinutes || 0) > maxDuration) {
      maxDuration = b.durationMinutes || 0;
      longestContinuousBlock = b;
    }
  }

  // Fragmentation
  let fragmentationScore: FragmentationScore = 'HIGH';
  if (availableBlocks.length === 0) {
    fragmentationScore = 'HIGH'; // Effectively unusable
  } else {
    const avgDuration = totalAvailableMinutes / availableBlocks.length;
    
    if (maxDuration >= 180 && avgDuration >= 120) {
      fragmentationScore = 'LOW';
    } else if (maxDuration < 60 || avgDuration < 45) {
      fragmentationScore = 'HIGH';
    } else {
      fragmentationScore = 'MEDIUM';
    }
  }

  // Score Calculation (0 - 100)
  let score = 0;
  if (totalAvailableMinutes > 0) {
    // 40% weight on proportion of free time relative to working window
    const availabilityRatio = totalAvailableMinutes / (workingWindowMins || 1);
    const freeTimeScore = Math.min(availabilityRatio * 100, 100) * 0.4;
    
    // 40% weight on longest block (caps at 4 hours / 240 mins)
    const longestBlockScore = Math.min(maxDuration / 240, 1) * 100 * 0.4;
    
    // 20% weight on fragmentation
    let fragFactor = 0;
    if (fragmentationScore === 'LOW') fragFactor = 1.0;
    if (fragmentationScore === 'MEDIUM') fragFactor = 0.6;
    if (fragmentationScore === 'HIGH') fragFactor = 0.2;
    const fragScore = fragFactor * 20;

    score = Math.round(freeTimeScore + longestBlockScore + fragScore);
    // Ensure we don't go below 0 or above 100
    score = Math.max(0, Math.min(100, score));
  }

  let label: AvailabilityLabel = 'Very Limited';
  if (score >= 90) label = 'Excellent';
  else if (score >= 70) label = 'Good';
  else if (score >= 50) label = 'Moderate';
  else if (score >= 30) label = 'Limited';

  console.log(`[Availability Engine] Total Free: ${totalAvailableMinutes}m, Longest: ${maxDuration}m, Frag: ${fragmentationScore}, Score: ${score}`);

  return {
    date,
    workingWindow: {
      start: routine.workingWindow.start,
      end: routine.workingWindow.end,
      durationMinutes: workingWindowMins
    },
    occupiedBlocks,
    availableBlocks,
    totalAvailableMinutes,
    longestContinuousBlock,
    fragmentationScore,
    availabilityScore: {
      score,
      label
    }
  };
}

export async function getAvailabilityForWeek(userId: string, startDateStr: string): Promise<AvailabilityDay[]> {
  const start = new Date(startDateStr);
  const availabilityDays: AvailabilityDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0] as string;
    const availability = await getAvailabilityForDate(userId, dateStr);
    availabilityDays.push(availability);
  }
  
  return availabilityDays;
}
