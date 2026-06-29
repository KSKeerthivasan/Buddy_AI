import { Router } from 'express';
import { getObservationsForTask, getObservationForSession } from '../repositories/observationRepository';

const router = Router();

router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const observations = await getObservationsForTask(taskId);
    res.json({ success: true, observations });
  } catch (error: any) {
    console.error('Error fetching observations for task:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const observation = await getObservationForSession(sessionId);
    if (!observation) {
      return res.status(404).json({ success: false, message: 'Observation not found' });
    }
    res.json({ success: true, observation });
  } catch (error: any) {
    console.error('Error fetching observation for session:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;
