import { Router } from 'express';
import { testScheduler } from '../controllers/schedulerController';
import { scheduleExecutionPlan } from '../executionCore/scheduler/schedulerEngineV2';

const router = Router();

// [TEMPORARY] Route for development testing
router.post('/test', testScheduler);

// [TEMPORARY] Route for v2 Scheduler development testing
router.post('/v2/test', async (req, res) => {
  try {
    const input = req.body;
    
    // Basic validation
    if (!input.userId || !input.taskId || !input.milestones || !input.deadline) {
      return res.status(400).json({ error: 'Missing required fields for Scheduler v2' });
    }

    const plan = await scheduleExecutionPlan(input);
    res.json(plan);
  } catch (error: any) {
    console.error(`[SchedulerEngineV2 API] Error:`, error);
    res.status(500).json({ error: 'Failed to generate schedule', details: error.message });
  }
});

export default router;
