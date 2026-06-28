import { Router, Request, Response } from 'express';
import multer from 'multer';
import { LocalStorageProvider } from '../services/storage/localStorage';
import { db } from '../config/firebase';

const router = Router();

// Configure multer to use memory storage since we will pass the buffer to our Provider
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max size
  },
  fileFilter: (req, file, cb) => {
    // Valid formats: PDF, Images, DOC/DOCX, PPT/PPTX, ZIP, TXT
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

const storageProvider = new LocalStorageProvider();

router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    const { taskId, sessionId } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Pass the file to our pluggable storage abstraction
    const metadata = await storageProvider.uploadFile(file, taskId, sessionId);

    // Save only metadata to Firestore
    const uploadRef = db.collection('uploads').doc();
    await uploadRef.set({
      id: uploadRef.id,
      ...metadata
    });

    res.json({
      success: true,
      uploadId: uploadRef.id,
      metadata
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

export default router;
