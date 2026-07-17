import { Router, Request, Response , NextFunction } from 'express';
import { recoveryEngine } from '../executionCore/recovery/recoveryEngine';
import { RecoveryTrigger } from '../executionCore/recovery/recoveryTypes';

const router = Router();

// POST /api/recovery/task/:taskId
router.post('/task/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { triggerReason } = req.body;
    
    const trigger = (triggerReason as RecoveryTrigger) || 'MANUAL_REQUEST';
    const report = await recoveryEngine.recoverTask(taskId as string, trigger);
    
    res.json({ success: true, report });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/recovery/session/:sessionId
router.post('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { triggerReason } = req.body;
    
    const trigger = (triggerReason as RecoveryTrigger) || 'MANUAL_REQUEST';
    const report = await recoveryEngine.recoverSession(sessionId as string, trigger);
    
    res.json({ success: true, report });
  } catch (error: any) {
    next(error);
  }
});

export default router;
