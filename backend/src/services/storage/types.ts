export interface UploadedFileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  localPath: string;
  linkedTaskId?: string;
  linkedSessionId?: string;
}

export interface StorageProvider {
  uploadFile(file: Express.Multer.File, taskId?: string, sessionId?: string): Promise<UploadedFileMetadata>;
}
