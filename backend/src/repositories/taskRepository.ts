import { db } from '../config/firebase';
import type { Task } from '@buddy-ai/shared';

const TASKS_COLLECTION = 'tasks';

export const createTask = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
  const docRef = await db.collection(TASKS_COLLECTION).add(taskData);
  return { id: docRef.id, ...taskData };
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  const docRef = db.collection(TASKS_COLLECTION).doc(taskId);
  await docRef.update(updates);
  return { success: true };
};

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  const doc = await db.collection(TASKS_COLLECTION).doc(taskId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as Task;
};

export const getTasksByUser = async (userId: string): Promise<Task[]> => {
  const snapshot = await db.collection(TASKS_COLLECTION).where('userId', '==', userId).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const getAllTasks = async (): Promise<Task[]> => {
  const snapshot = await db.collection(TASKS_COLLECTION).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const getActiveTasksWithSessions = async (userId: string): Promise<Task[]> => {
  const snapshot = await db.collection(TASKS_COLLECTION)
    .where('userId', '==', userId)
    .get();
  
  if (snapshot.empty) {
    return [];
  }
  
  const excluded = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Task))
    .filter((task: Task) => !excluded.includes(task.status));
};
