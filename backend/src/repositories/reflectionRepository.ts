import { db } from '../config/firebase';
import { Reflection } from '../executionCore/reflection/reflectionTypes';

const REFLECTIONS_COLLECTION = 'reflections';

export const saveReflection = async (reflection: Reflection): Promise<Reflection> => {
  const docRef = await db.collection(REFLECTIONS_COLLECTION).add(reflection);
  return { ...reflection, reflectionId: docRef.id };
};

export const updateReflection = async (reflectionId: string, updates: Partial<Reflection>): Promise<void> => {
  await db.collection(REFLECTIONS_COLLECTION).doc(reflectionId).update(updates);
};

export const getReflectionForSession = async (sessionId: string): Promise<Reflection | null> => {
  const snapshot = await db.collection(REFLECTIONS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  if (!doc) return null;
  return { reflectionId: doc.id, ...doc.data() } as Reflection;
};

export const getReflectionById = async (reflectionId: string): Promise<Reflection | null> => {
  const doc = await db.collection(REFLECTIONS_COLLECTION).doc(reflectionId).get();
  if (!doc.exists) {
    return null;
  }
  return { reflectionId: doc.id, ...doc.data() } as Reflection;
};

export const getReflectionsForTask = async (taskId: string): Promise<Reflection[]> => {
  const snapshot = await db.collection(REFLECTIONS_COLLECTION)
    .where('taskId', '==', taskId)
    .orderBy('submittedAt', 'desc')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => ({ reflectionId: doc.id, ...doc.data() } as Reflection));
};
