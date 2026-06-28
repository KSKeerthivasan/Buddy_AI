import { Router } from 'express';
import { analyzeTask, createTask, getTasks, updateTaskStatus, completeSession, updateSessionProgress } from '../controllers/taskController';

const router = Router();

// POST /analyze -> analyze a task using the Execution Core
router.post('/analyze', analyzeTask);

// GET / -> get all tasks
router.get('/', getTasks);

// POST / -> create a task directly
router.post('/', createTask);

// PATCH /:id/status -> update a task status
router.patch('/:id/status', updateTaskStatus);

// PATCH /:id/sessions/:sessionId/complete -> complete a specific session
router.patch('/:id/sessions/:sessionId/complete', completeSession);

// PATCH /:id/sessions/:sessionId/progress -> update session progress
router.patch('/:id/sessions/:sessionId/progress', updateSessionProgress);

export default router;
