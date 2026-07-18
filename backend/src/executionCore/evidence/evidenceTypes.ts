export type EvidenceStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED' | 'DELETED';

export type EvidenceAnalysisStatus = 'UPLOAD_COMPLETE' | 'ANALYSIS_PENDING' | 'ANALYZING' | 'ANALYZED' | 'ANALYSIS_FAILED';

export interface EvidenceAnalysis {
  summary: string;
  observedProgress: number;
  detectedWork: string;
  missingEvidence: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions: string[];
  limitations: string[];
  metadata: {
    model: string;
    promptVersion: string;
    analysisTimestamp: string;
    analysisVersion: string;
  };
}

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
  analysisStatus: EvidenceAnalysisStatus;
  aiAnalysis?: EvidenceAnalysis;
}
