import { Router } from 'express';
import { analyzeTask, createTask, getTasks, updateTaskStatus, updateSessionProgress } from '../controllers/taskController';
import { startSession, pauseSession, resumeSession, cancelSession, completeSessionAction as completeSession } from '../controllers/sessionLifecycleController';

const router = Router();

// POST /analyze -> analyze a task using the Execution Core
router.post('/analyze', analyzeTask);

// GET / -> get all tasks
router.get('/', getTasks);

// POST / -> create a task directly
router.post('/', createTask);

// PATCH /:id/status -> update a task status
router.patch('/:id/status', updateTaskStatus);

// POST /:id/sessions/:sessionId/complete -> complete a specific session
router.post('/:id/sessions/:sessionId/complete', completeSession);

// PATCH /:id/sessions/:sessionId/progress -> update session progress
router.patch('/:id/sessions/:sessionId/progress', updateSessionProgress);

// POST /:id/sessions/:sessionId/start -> start session
router.post('/:id/sessions/:sessionId/start', startSession);

// POST /:id/sessions/:sessionId/pause -> pause session
router.post('/:id/sessions/:sessionId/pause', pauseSession);

// POST /:id/sessions/:sessionId/resume -> resume session
router.post('/:id/sessions/:sessionId/resume', resumeSession);

// POST /:id/sessions/:sessionId/cancel -> cancel session
router.post('/:id/sessions/:sessionId/cancel', cancelSession);

export default router;
