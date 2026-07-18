import { db } from '../config/firebase';
import { Evidence } from '../executionCore/evidence/evidenceTypes';

const EVIDENCE_COLLECTION = 'evidence';

export const evidenceRepository = {
  async createEvidence(evidence: Evidence): Promise<void> {
    await db.collection(EVIDENCE_COLLECTION).doc(evidence.evidenceId).set(evidence);
  },

  async getEvidenceForSession(sessionId: string): Promise<Evidence[]> {
    const snapshot = await db.collection(EVIDENCE_COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('status', '!=', 'DELETED')
      .get();
      
    return snapshot.docs.map(doc => doc.data() as Evidence);
  },

  async updateEvidenceStatus(evidenceId: string, status: Evidence['status']): Promise<void> {
    await db.collection(EVIDENCE_COLLECTION).doc(evidenceId).update({ status });
  },

  async updateEvidenceAnalysis(
    evidenceId: string, 
    analysisStatus: Evidence['analysisStatus'], 
    aiAnalysis?: Evidence['aiAnalysis']
  ): Promise<void> {
    const updateData: any = { analysisStatus };
    if (aiAnalysis) {
      updateData.aiAnalysis = aiAnalysis;
    }
    await db.collection(EVIDENCE_COLLECTION).doc(evidenceId).update(updateData);
  },

  async getEvidenceById(evidenceId: string): Promise<Evidence | null> {
    const doc = await db.collection(EVIDENCE_COLLECTION).doc(evidenceId).get();
    if (!doc.exists) return null;
    return doc.data() as Evidence;
  }
};
