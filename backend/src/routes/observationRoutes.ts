import { Router, Request, Response, NextFunction } from 'express';
import { getObservationsForTask, getObservationForSession } from '../repositories/observationRepository';

const router = Router();

router.get('/task/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const observations = await getObservationsForTask(taskId as string);
    res.json({ success: true, observations });
  } catch (error: any) {
    next(error);
  }
});

router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const observation = await getObservationForSession(sessionId as string);
    if (!observation) {
      return res.status(404).json({ success: false, message: 'Observation not found' });
    }
    res.json({ success: true, observation });
  } catch (error: any) {
    next(error);
  }
});

export default router;
