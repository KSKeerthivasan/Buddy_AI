import { Router, Request, Response, NextFunction } from 'express';
import { getTaskById } from '../repositories/taskRepository';
import { saveReflection, getReflectionForSession, getReflectionsForTask, updateReflection, getReflectionById } from '../repositories/reflectionRepository';
import { validateReflection, shouldAllowEdit, ReflectionEngineError } from '../executionCore/reflection/reflectionEngine';
import { eventBus } from '../executionCore/events/EventBus';
import { EventType } from '../executionCore/events/eventTypes';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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
    const existing = await getReflectionForSession(sessionId as string);
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
    eventBus.publish(EventType.REFLECTION_SUBMITTED, {
      userId: reflectionData.userId,
      taskId: reflectionData.taskId,
      sessionId: reflectionData.sessionId,
      reflectionId: (saved as any).id || 'unknown',
      payload: saved
    });

    res.json({ success: true, reflection: saved });
  } catch (error: any) {
    next(error);
  }
});

router.patch('/:reflectionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reflectionId } = req.params;
    const { completionResult, primaryReason, notes } = req.body;

    const existing = await getReflectionById(reflectionId as string);
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

    await updateReflection(reflectionId as string, updates);
    const updated = await getReflectionById(reflectionId as string);

    res.json({ success: true, reflection: updated });
  } catch (error: any) {
    next(error);
  }
});

router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const reflection = await getReflectionForSession(sessionId as string);
    res.json({ success: true, reflection });
  } catch (error: any) {
    next(error);
  }
});

router.get('/task/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const reflections = await getReflectionsForTask(taskId as string);
    res.json({ success: true, reflections });
  } catch (error: any) {
    next(error);
  }
});

export default router;
