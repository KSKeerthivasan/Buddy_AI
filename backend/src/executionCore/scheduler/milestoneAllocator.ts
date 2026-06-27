import { Milestone } from './types';
import { calculateWorkload } from './workloadBalancer';

const round1 = (num: number) => Math.round(num * 10) / 10;

/**
 * Allocates milestones to days based on strict scheduling rules.
 */
export const allocateMilestones = (milestones: Milestone[], availableDays: number): Milestone[][] => {
  if (availableDays <= 0 || milestones.length === 0) return [];

  const totalHours = milestones.reduce((sum, m) => sum + (m.estimatedHours || 0), 0);
  const dailyCapacity = calculateWorkload(totalHours, availableDays);

  const result: Milestone[][] = [];
  let currentDay: Milestone[] = [];
  let currentHours = 0;

  const queue = milestones.map(m => ({ 
    title: m.title, 
    estimatedHours: m.estimatedHours || 0, 
    remainingHours: m.estimatedHours || 0 
  }));

  while (queue.length > 0) {
    const m = queue[0]!;

    if (m.remainingHours <= 0) {
      queue.shift();
      continue;
    }
    
    // Check if current day is full and we can move to the next day
    if (round1(currentHours) >= dailyCapacity && currentHours > 0) {
      if (result.length < availableDays - 1) {
        result.push(currentDay);
        currentDay = [];
        currentHours = 0;
        continue;
      }
    }

    const availableToday = round1(dailyCapacity - currentHours);

    if (round1(m.remainingHours) <= availableToday) {
      // Milestone fits entirely in the remaining time today
      const hoursToAllocate = round1(m.remainingHours);
      currentDay.push({ title: m.title, estimatedHours: hoursToAllocate });
      currentHours = round1(currentHours + hoursToAllocate);
      queue.shift();
    } else {
      // Milestone exceeds available time today
      if (round1(m.estimatedHours) > dailyCapacity) {
        // SPLIT the milestone because it's larger than a full day's capacity
        const baseChunk = availableToday > 0 ? availableToday : (dailyCapacity > 0 ? dailyCapacity : m.remainingHours);
        // Ensure we never over-allocate a milestone
        const chunk = Math.min(baseChunk, m.remainingHours);
        
        const hoursToAllocate = round1(chunk);
        
        currentDay.push({ title: m.title, estimatedHours: hoursToAllocate });
        currentHours = round1(currentHours + hoursToAllocate);
        m.remainingHours = round1(m.remainingHours - hoursToAllocate);
      } else {
        // DO NOT SPLIT. Push it to the next day, or force it today if we are out of days.
        if (result.length < availableDays - 1) {
          if (currentDay.length > 0) {
            result.push(currentDay);
            currentDay = [];
            currentHours = 0;
          }
        } else {
          // Out of days (High Risk scenario). Force allocate here exceeding capacity.
          const hoursToAllocate = round1(m.remainingHours);
          currentDay.push({ title: m.title, estimatedHours: hoursToAllocate });
          currentHours = round1(currentHours + hoursToAllocate);
          queue.shift();
        }
      }
    }
  }

  if (currentDay.length > 0) {
    result.push(currentDay);
  }

  return result;
};
