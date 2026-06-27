import { db } from '../config/firebase';

const TASKS_COLLECTION = 'tasks';

export const createTask = async (taskData: any) => {
  const docRef = await db.collection(TASKS_COLLECTION).add(taskData);
  return { id: docRef.id, ...taskData };
};

export const getTaskById = async (taskId: string) => {
  const doc = await db.collection(TASKS_COLLECTION).doc(taskId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() };
};

export const getTasksByUser = async (userId: string) => {
  const snapshot = await db.collection(TASKS_COLLECTION).where('userId', '==', userId).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAllTasks = async () => {
  const snapshot = await db.collection(TASKS_COLLECTION).get();
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
