import { Router } from 'express';
import { analyzeTask, createTask, getTasks } from '../controllers/taskController';

const router = Router();

// POST /analyze -> analyze a task using the Execution Core
router.post('/analyze', analyzeTask);

// GET / -> get all tasks
router.get('/', getTasks);

// POST / -> create a task directly
router.post('/', createTask);

export default router;
