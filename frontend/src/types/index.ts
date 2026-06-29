export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Active' | 'Completed' | 'completed' | 'pending' | 'analyzed' | 'approved';

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO String
  role?: string;
  status: TaskStatus;
  createdAt: string; // ISO String
  analysis?: any; // The full execution core analysis output
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type CommitmentCategory = 'Education' | 'Work' | 'Health' | 'Personal' | 'Travel' | 'Other';

export interface WeeklyCommitment {
  id: string;
  title: string;
  category: CommitmentCategory;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  location?: string;
  isRecurring: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}
