import { Router } from 'express';
import { analyzeTask, createTask, getTasks, updateTaskStatus } from '../controllers/taskController';

const router = Router();

// POST /analyze -> analyze a task using the Execution Core
router.post('/analyze', analyzeTask);

// GET / -> get all tasks
router.get('/', getTasks);

// POST / -> create a task directly
router.post('/', createTask);

// PATCH /:id/status -> update a task status
router.patch('/:id/status', updateTaskStatus);

export default router;
