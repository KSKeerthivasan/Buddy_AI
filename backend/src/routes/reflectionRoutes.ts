import { Router } from 'express';
import { getTaskById } from '../repositories/taskRepository';
import { saveReflection, getReflectionForSession, getReflectionsForTask, updateReflection, getReflectionById } from '../repositories/reflectionRepository';
import { validateReflection, shouldAllowEdit, ReflectionEngineError } from '../executionCore/reflection/reflectionEngine';

const router = Router();

// Domain Event Stub
const emitReflectionSubmittedEvent = (reflection: any) => {
  console.log(`[EVENT] ReflectionSubmitted for session ${reflection.sessionId}`);
  // Future: Learning Engine, Analytics Engine, Recovery Engine listen here.
};

router.post('/', async (req, res) => {
  try {
    const { userId, taskId, sessionId, completionResult, primaryReason, notes } = req.body;

    // 1. Validate session exists & terminal
    const task: any = await getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ success: false, message: 'User does not own this task/session' });
    }

    const sessions = task.analysis?.scheduleDetails?.executionSessions || [];
    const session = sessions.find((s: any) => s.sessionId === sessionId || sessions.indexOf(s).toString() === sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const terminalStates = ['COMPLETED', 'PARTIALLY_COMPLETED', 'CANCELLED', 'SKIPPED', 'FAILED'];
    const sessionStatus = session.status || (session.isCompleted ? 'COMPLETED' : 'SCHEDULED');
    
    if (!terminalStates.includes(sessionStatus)) {
      return res.status(400).json({ success: false, message: `Session is not in a terminal state (current: ${sessionStatus})` });
    }

    // 2. Uniqueness check
    const existing = await getReflectionForSession(sessionId);
    if (existing) {
      return res.status(409).json({ success: false, message: 'A reflection already exists for this session' });
    }

    // 3. Validate data
    const reflectionData = {
      userId,
      taskId,
      sessionId,
      completionResult,
      primaryReason,
      notes,
      submittedAt: new Date().toISOString()
    };
    validateReflection(reflectionData);

    // 4. Save
    const saved = await saveReflection(reflectionData);
    
    // 5. Emit event
    emitReflectionSubmittedEvent(saved);

    res.json({ success: true, reflection: saved });
  } catch (error: any) {
    if (error instanceof ReflectionEngineError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error submitting reflection:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.patch('/:reflectionId', async (req, res) => {
  try {
    const { reflectionId } = req.params;
    const { completionResult, primaryReason, notes } = req.body;

    const existing = await getReflectionById(reflectionId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Reflection not found' });
    }

    if (!shouldAllowEdit(existing)) {
      return res.status(409).json({ success: false, message: 'Reflection is now immutable (past 15-minute grace period)' });
    }

    const updates: any = {};
    if (completionResult !== undefined) updates.completionResult = completionResult;
    if (primaryReason !== undefined) updates.primaryReason = primaryReason;
    if (notes !== undefined) updates.notes = notes;

    validateReflection({ ...existing, ...updates });

    await updateReflection(reflectionId, updates);
    const updated = await getReflectionById(reflectionId);

    res.json({ success: true, reflection: updated });
  } catch (error: any) {
    if (error instanceof ReflectionEngineError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error updating reflection:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const reflection = await getReflectionForSession(sessionId);
    res.json({ success: true, reflection });
  } catch (error: any) {
    console.error('Error fetching reflection by session:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const reflections = await getReflectionsForTask(taskId);
    res.json({ success: true, reflections });
  } catch (error: any) {
    console.error('Error fetching reflections by task:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
