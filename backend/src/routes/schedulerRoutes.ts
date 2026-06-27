import { Router } from 'express';
import { testScheduler } from '../controllers/schedulerController';

const router = Router();

// [TEMPORARY] Route for development testing
router.post('/test', testScheduler);

export default router;
