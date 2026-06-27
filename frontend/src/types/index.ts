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
