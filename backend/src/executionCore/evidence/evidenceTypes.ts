export type EvidenceStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED' | 'DELETED';

export interface Evidence {
  evidenceId: string;
  userId: string;
  taskId: string;
  sessionId: string;
  milestoneId?: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: EvidenceStatus;
}
