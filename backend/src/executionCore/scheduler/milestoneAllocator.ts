import { Milestone } from './types';

/**
 * Distributes milestones evenly across the available days.
 * Preserves the original order and never reorders them.
 * 
 * @param milestones - Array of milestones to distribute.
 * @param availableDays - The total number of days available.
 * @returns An array of arrays, where each inner array represents the milestones assigned to a specific day.
 */
export const allocateMilestones = (milestones: Milestone[], availableDays: number): Milestone[][] => {
  if (availableDays <= 0) {
    return [];
  }

  const result: Milestone[][] = [];
  const n = milestones.length;

  for (let i = 0; i < availableDays; i++) {
    const start = Math.round((i * n) / availableDays);
    const end = Math.round(((i + 1) * n) / availableDays);
    result.push(milestones.slice(start, end));
  }

  return result;
};
