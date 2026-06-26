export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Active' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
}
