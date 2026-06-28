import fs from 'fs';
import path from 'path';
import { StorageProvider, UploadedFileMetadata } from './types';

// Determine the root of the project to place /uploads folder. Assuming backend is in /backend
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export class LocalStorageProvider implements StorageProvider {
  constructor() {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, taskId?: string, sessionId?: string): Promise<UploadedFileMetadata> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `${uniqueSuffix}-${file.originalname}`;
    const destinationPath = path.join(UPLOADS_DIR, fileName);
    
    // Move the file from memory to disk (multer typically uses memory storage in our route)
    fs.writeFileSync(destinationPath, file.buffer);

    const metadata: UploadedFileMetadata = {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      localPath: `/uploads/${fileName}`,
    };

    if (taskId) metadata.linkedTaskId = taskId;
    if (sessionId) metadata.linkedSessionId = sessionId;

    return metadata;
  }
}
