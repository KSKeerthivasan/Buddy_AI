import { storage } from '../../config/firebase';
import { evidenceRepository } from '../../repositories/evidenceRepository';
import { Evidence } from './evidenceTypes';
import { randomUUID } from 'crypto';

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
    const storagePath = `evidence/${userId}/${sessionId}/${evidenceId}-${originalName}`;
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    console.log(`[Evidence Engine] Upload Started: ${evidenceId}`);

    const evidence: Evidence = {
      evidenceId,
      userId,
      taskId,
      sessionId,
      milestoneId,
      storagePath,
      fileName: originalName,
      fileSize,
      mimeType,
      uploadedAt: new Date().toISOString(),
      status: 'UPLOADING',
    };

    try {
      await evidenceRepository.createEvidence(evidence);

      // Upload buffer to Firebase Storage
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
        }
      });
      
      evidence.status = 'UPLOADED';
      await evidenceRepository.updateEvidenceStatus(evidenceId, 'UPLOADED');
      console.log(`[Evidence Engine] Upload Completed: ${evidenceId}`);
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
      const bucket = storage.bucket();
      const file = bucket.file(evidence.storagePath);
      await file.delete();
    } catch (error: any) {
      // If file doesn't exist in storage (e.g. upload failed), we still want to mark as deleted.
      if (error.code !== 404) {
        throw error;
      }
    }

    await evidenceRepository.updateEvidenceStatus(evidenceId, 'DELETED');
    console.log(`[Evidence Engine] Evidence Deleted: ${evidenceId}`);
  },
  
  /**
   * Get a signed URL for previewing evidence (if needed).
   */
  async getSignedUrl(evidenceId: string): Promise<string> {
    const evidence = await evidenceRepository.getEvidenceById(evidenceId);
    if (!evidence || evidence.status === 'DELETED') {
      throw new Error('Evidence not found or deleted.');
    }
    
    const bucket = storage.bucket();
    const file = bucket.file(evidence.storagePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    return url;
  }
};
