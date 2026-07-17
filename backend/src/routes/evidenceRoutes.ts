import { Router, Request, Response , NextFunction } from 'express';
import multer from 'multer';
import { evidenceEngine } from '../executionCore/evidence/evidenceEngine';

const router = Router();

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max size
  },
  fileFilter: (req, file, cb) => {
    // Valid formats: PDF, Images, TXT
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// POST /api/sessions/:sessionId/evidence
router.post('/sessions/:sessionId/evidence', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const sessionId = req.params.sessionId as string;
    // user ID should ideally come from auth context, here we pass it from body for simplicity.
    const { userId, taskId, milestoneId } = req.body;

    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    
    if (!userId || !taskId) {
      res.status(400).json({ success: false, message: 'userId and taskId are required' });
      return;
    }

    const evidence = await evidenceEngine.uploadEvidence(
      file.buffer,
      file.size,
      file.mimetype,
      file.originalname,
      userId as string,
      taskId as string,
      sessionId,
      milestoneId as string
    );

    res.status(201).json({ success: true, evidence });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/sessions/:sessionId/evidence
router.get('/sessions/:sessionId/evidence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const evidenceList = await evidenceEngine.getEvidenceForSession(sessionId);
    
    // Attach signed URLs for previews
    const evidenceWithUrls = await Promise.all(evidenceList.map(async (ev) => {
      try {
        const url = await evidenceEngine.getSignedUrl(ev.evidenceId);
        return { ...ev, previewUrl: url };
      } catch (err) {
        return ev; // If we can't get URL, return without it
      }
    }));

    res.json({ success: true, evidence: evidenceWithUrls });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/evidence/:evidenceId
router.delete('/evidence/:evidenceId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const evidenceId = req.params.evidenceId as string;
    await evidenceEngine.deleteEvidence(evidenceId);
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;
