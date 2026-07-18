import fs from 'fs';
import path from 'path';
import { StorageProvider } from './StorageProvider';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

export class LocalFileSystemProvider implements StorageProvider {
  constructor() {
    // Ensure base uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, originalName: string, mimeType: string, pathPrefix: string): Promise<string> {
    const fileId = randomUUID();
    const fileName = `${fileId}-${originalName}`;
    const targetDir = path.join(UPLOADS_DIR, pathPrefix);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);
    await fs.promises.writeFile(filePath, fileBuffer);

    // Return the relative path from the uploads root as the storage identifier
    return path.join(pathPrefix, fileName).replace(/\\/g, '/');
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${storagePath}`);
    }
    return await fs.promises.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    // We will serve the uploads directory statically at /uploads
    return `${API_BASE_URL}/uploads/${storagePath}`;
  }
}

export const localFileSystemProvider = new LocalFileSystemProvider();
