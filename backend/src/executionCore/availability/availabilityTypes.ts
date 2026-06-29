export interface TimeBlock {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  durationMinutes?: number;
}

export type FragmentationScore = 'LOW' | 'MEDIUM' | 'HIGH';
export type AvailabilityLabel = 'Excellent' | 'Good' | 'Moderate' | 'Limited' | 'Very Limited';

export interface AvailabilityScore {
  score: number; // 0-100
  label: AvailabilityLabel;
}

export interface AvailabilityDay {
  date: string;
  workingWindow: TimeBlock;
  occupiedBlocks: TimeBlock[];
  availableBlocks: TimeBlock[];
  totalAvailableMinutes: number;
  longestContinuousBlock: TimeBlock | null;
  fragmentationScore: FragmentationScore;
  availabilityScore: AvailabilityScore;
}
