import { db } from '../config/firebase';
import { Observation } from '../executionCore/observation/observationTypes';

const OBSERVATIONS_COLLECTION = 'observations';

export const saveObservation = async (observation: Observation): Promise<Observation> => {
  const docRef = await db.collection(OBSERVATIONS_COLLECTION).add(observation);
  return { ...observation, observationId: docRef.id };
};

export const getObservationForSession = async (sessionId: string): Promise<Observation | null> => {
  const snapshot = await db.collection(OBSERVATIONS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  if (!doc) return null;
  return { observationId: doc.id, ...doc.data() } as Observation;
};

export const getObservationsForTask = async (taskId: string): Promise<Observation[]> => {
  const snapshot = await db.collection(OBSERVATIONS_COLLECTION)
    .where('taskId', '==', taskId)
    .orderBy('timestamp', 'desc')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => ({ observationId: doc.id, ...doc.data() } as Observation));
};
