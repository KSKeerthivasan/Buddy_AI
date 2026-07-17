import { Router, Request, Response , NextFunction } from 'express';
import { decisionEngine } from '../executionCore/decision/decisionEngine';
import { 
  getDecisionsForTask, 
  updateDecisionState, 
  getDecisionById 
} from '../repositories/decisionRepository';

const router = Router();

// GET /api/tasks/:taskId/decisions
router.get('/tasks/:taskId/decisions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const decisions = await getDecisionsForTask(taskId);
    res.json({ success: true, decisions });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/tasks/:taskId/decisions (Test endpoint to manually trigger a decision)
router.post('/tasks/:taskId/decisions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const { userId, decisionType, triggerEvent, recoveryReport } = req.body;
    
    const decision = await decisionEngine.generateDecision({
      userId: userId as string,
      taskId,
      decisionType,
      triggerEvent,
      recoveryReport
    });
    
    res.json({ success: true, decision });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/decisions/:decisionId/accept
router.post('/decisions/:decisionId/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = req.params.decisionId as string;
    await updateDecisionState(decisionId, 'ACCEPTED');
    res.json({ success: true, message: 'Decision accepted' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/decisions/:decisionId/reject
router.post('/decisions/:decisionId/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = req.params.decisionId as string;
    await updateDecisionState(decisionId, 'REJECTED');
    res.json({ success: true, message: 'Decision rejected' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/decisions/:decisionId/modify
router.post('/decisions/:decisionId/modify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = req.params.decisionId as string;
    await updateDecisionState(decisionId, 'MODIFIED');
    res.json({ success: true, message: 'Decision modified' });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/decisions/:decisionId/explain
router.post('/decisions/:decisionId/explain', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decisionId = req.params.decisionId as string;
    const explanation = await decisionEngine.explainDecisionWithAI(decisionId);
    res.json({ success: true, explanation });
  } catch (error: any) {
    next(error);
  }
});

export default router;
