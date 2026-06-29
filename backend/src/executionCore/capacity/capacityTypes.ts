export type CapacityStatus = 'EMPTY' | 'LIGHT' | 'NORMAL' | 'BUSY' | 'FULL' | 'OVERBOOKED';

export interface CapacityScore {
  score: number;
  label: string;
}

export interface CapacityDay {
  date: string;
  availableMinutes: number; // Raw from Availability Engine
  maximumDailyCapacity: number; // From Profile (e.g., max 5 hours = 300)
  plannedMinutes: number; // Scheduled/In Progress session durations
  completedMinutes: number; // Completed session durations
  remainingCapacity: number; // The actual remaining bandwidth
  utilization: number; // (completed + planned) / maxCapacity * 100
  capacityScore: CapacityScore;
  status: CapacityStatus;
}
