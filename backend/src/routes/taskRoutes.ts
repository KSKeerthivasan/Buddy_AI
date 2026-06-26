import { Router } from 'express';
import { analyzeTask } from '../controllers/taskController';

const router = Router();

// POST /analyze -> analyze a task using the Execution Core
router.post('/analyze', analyzeTask);

export default router;
