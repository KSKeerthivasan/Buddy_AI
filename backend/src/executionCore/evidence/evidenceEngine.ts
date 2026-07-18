import { localFileSystemProvider } from '../../infrastructure/storage/LocalFileSystemProvider';
import { evidenceRepository } from '../../repositories/evidenceRepository';
import { Evidence } from './evidenceTypes';
import { randomUUID } from 'crypto';
import { eventBus } from '../events/EventBus';
import { EventType } from '../events/eventTypes';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
];

export const evidenceEngine = {
  /**
   * Validates and uploads a file to Firebase Storage, then saves metadata to Firestore.
   */
  async uploadEvidence(
    fileBuffer: Buffer,
    fileSize: number,
    mimeType: string,
    originalName: string,
    userId: string,
    taskId: string,
    sessionId: string,
    milestoneId?: string
  ): Promise<Evidence> {
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds the 20MB limit.');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const evidenceId = randomUUID();
    const pathPrefix = `evidence/${userId}/${sessionId}`;

    console.log(`[Evidence Engine] Upload Started: ${evidenceId}`);

    const evidence: Evidence = {
      evidenceId,
      userId,
      taskId,
      sessionId,
      milestoneId,
      storagePath: '', // Will update
      fileName: originalName,
      fileSize,
      mimeType,
      uploadedAt: new Date().toISOString(),
      status: 'UPLOADING',
      analysisStatus: 'UPLOAD_COMPLETE'
    };

    try {
      // We first create with an empty storage path or placeholder
      await evidenceRepository.createEvidence(evidence);

      // Upload buffer via Storage Provider
      const storagePath = await localFileSystemProvider.upload(fileBuffer, originalName, mimeType, pathPrefix);
      
      evidence.storagePath = storagePath;
      evidence.status = 'UPLOADED';
      evidence.analysisStatus = 'ANALYSIS_PENDING';
      
      // Update DB with final storage path and status
      await evidenceRepository.updateEvidenceStatus(evidenceId, 'UPLOADED');
      await evidenceRepository.updateEvidenceAnalysis(evidenceId, 'ANALYSIS_PENDING');
      
      console.log(`[Evidence Engine] Upload Completed: ${evidenceId}`);

      // Emit event for Vision Analysis
      eventBus.publish(EventType.EVIDENCE_UPLOADED, {
        userId,
        taskId,
        sessionId,
        evidenceId,
        payload: { evidence }
      });

    } catch (error) {
      evidence.status = 'FAILED';
      await evidenceRepository.updateEvidenceStatus(evidenceId, 'FAILED');
      console.log(`[Evidence Engine] Upload Failed: ${evidenceId}`);
      throw error;
    }

    return evidence;
  },

  /**
   * Retrieves evidence metadata for a given session.
   */
  async getEvidenceForSession(sessionId: string): Promise<Evidence[]> {
    return await evidenceRepository.getEvidenceForSession(sessionId);
  },

  /**
   * Deletes evidence from Firebase Storage and marks metadata as DELETED in Firestore.
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    const evidence = await evidenceRepository.getEvidenceById(evidenceId);
    if (!evidence) {
      throw new Error('Evidence not found.');
    }
    if (evidence.status === 'DELETED') {
      return; // Idempotent
    }

    try {
      await localFileSystemProvider.delete(evidence.storagePath);
    } catch (error: any) {
      // If file doesn't exist in storage, we still want to mark as deleted.
      console.warn(`[Evidence Engine] File deletion failed or file not found for ${evidenceId}`);
    }

    await evidenceRepository.updateEvidenceStatus(evidenceId, 'DELETED');
    console.log(`[Evidence Engine] Evidence Deleted: ${evidenceId}`);
  },
  
  /**
   * Get a public URL for previewing evidence.
   */
  async getSignedUrl(evidenceId: string): Promise<string> {
    const evidence = await evidenceRepository.getEvidenceById(evidenceId);
    if (!evidence || evidence.status === 'DELETED') {
      throw new Error('Evidence not found or deleted.');
    }
    
    return await localFileSystemProvider.getPublicUrl(evidence.storagePath);
  }
};
