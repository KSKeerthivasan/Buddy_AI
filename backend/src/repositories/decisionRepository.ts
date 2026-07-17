import { db } from '../config/firebase';
import { DecisionCard, DecisionState, DecisionType } from '../executionCore/decision/decisionTypes';

const DECISIONS_COLLECTION = 'decisions';

export const createDecision = async (decision: DecisionCard): Promise<DecisionCard> => {
  const existingActive = await getActiveDecisionForTaskAndType(decision.taskId, decision.decisionType);
  if (existingActive) {
    // Return existing if we already have a pending decision for this issue to prevent duplicates
    return existingActive;
  }
  
  const docRef = db.collection(DECISIONS_COLLECTION).doc(decision.decisionId);
  await docRef.set(decision);
  
  return { id: docRef.id, ...decision };
};

export const getDecisionById = async (decisionId: string): Promise<DecisionCard | null> => {
  const doc = await db.collection(DECISIONS_COLLECTION).doc(decisionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as DecisionCard;
};

export const getDecisionsForTask = async (taskId: string): Promise<DecisionCard[]> => {
  const snapshot = await db.collection(DECISIONS_COLLECTION)
    .where('taskId', '==', taskId)
    .orderBy('generatedAt', 'desc')
    .get();
    
  if (snapshot.empty) return [];
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DecisionCard));
};

export const updateDecisionState = async (decisionId: string, status: DecisionState): Promise<boolean> => {
  const docRef = db.collection(DECISIONS_COLLECTION).doc(decisionId);
  await docRef.update({ status });
  return true;
};

export const getActiveDecisionForTaskAndType = async (taskId: string, decisionType: DecisionType): Promise<DecisionCard | null> => {
  const snapshot = await db.collection(DECISIONS_COLLECTION)
    .where('taskId', '==', taskId)
    .where('decisionType', '==', decisionType)
    .where('status', '==', 'PENDING')
    .limit(1)
    .get();
    
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  if (!doc) return null;
  return { id: doc.id, ...doc.data() } as DecisionCard;
};
