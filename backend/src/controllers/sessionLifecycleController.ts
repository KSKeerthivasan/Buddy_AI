import { Request, Response } from 'express';
import { getTaskById, updateTask as repoUpdateTask } from '../repositories/taskRepository';
import { startSession as engineStartSession, pauseSession as enginePauseSession, resumeSession as engineResumeSession, cancelSession as engineCancelSession, completeSession as engineCompleteSession } from '../executionCore/focus/focusEngine';
import { getObservationForSession, saveObservation } from '../repositories/observationRepository';
import { generateObservationFromSession } from '../executionCore/observation/observationEngine';

const processSessionAction = async (
  taskId: string, 
  sessionId: string, 
  action: (session: any) => any, 
  res: Response
) => {
  try {
    const task: any = await getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const sessions = task.analysis?.scheduleDetails?.executionSessions;
    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ success: false, message: 'Task has no execution sessions' });
    }

    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId || sessions.indexOf(s).toString() === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const currentSession = sessions[sessionIndex];
    // Map existing structure to FocusSessionData
    const sessionData = {
      ...currentSession,
      status: currentSession.status || (currentSession.isCompleted ? 'COMPLETED' : 'SCHEDULED'),
      pauses: currentSession.pauses || []
    };

    // Execute engine action
    const updatedSession = action(sessionData);

    // Merge back
    sessions[sessionIndex] = { ...currentSession, ...updatedSession };
    
    // Legacy mapping
    if (updatedSession.status === 'COMPLETED' || updatedSession.status === 'PARTIALLY_COMPLETED') {
      sessions[sessionIndex].isCompleted = true;
    }

    const updates: any = { 
      'analysis.scheduleDetails.executionSessions': sessions,
      updatedAt: new Date().toISOString()
    };
    
    // Check if task is globally complete
    if (updatedSession.status === 'COMPLETED' || updatedSession.status === 'PARTIALLY_COMPLETED') {
      const allCompleted = sessions.every((s: any) => s.status === 'COMPLETED' || s.status === 'PARTIALLY_COMPLETED' || s.isCompleted);
      if (allCompleted) {
        updates.status = 'completed';
        updates.completedAt = new Date().toISOString();
      }
    }

    await repoUpdateTask(taskId, updates);

    res.json({ success: true, session: sessions[sessionIndex] });
  } catch (error: any) {
    console.error(`Error in session action:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.',
    });
  }
};

export const startSession = async (req: Request, res: Response): Promise<void> => {
  const { id, sessionId } = req.params;
  await processSessionAction(id as string, sessionId as string, (s) => engineStartSession(s), res);
};

export const pauseSession = async (req: Request, res: Response): Promise<void> => {
  const { id, sessionId } = req.params;
  await processSessionAction(id as string, sessionId as string, (s) => enginePauseSession(s), res);
};

export const resumeSession = async (req: Request, res: Response): Promise<void> => {
  const { id, sessionId } = req.params;
  await processSessionAction(id as string, sessionId as string, (s) => engineResumeSession(s), res);
};

export const cancelSession = async (req: Request, res: Response): Promise<void> => {
  const { id, sessionId } = req.params;
  
  // Idempotency check
  const existingObservation = await getObservationForSession(sessionId as string);
  if (existingObservation) {
    console.log(`Duplicate cancel request for session ${sessionId}. Returning existing observation.`);
    res.json({ success: true, observation: existingObservation });
    return;
  }
  
  try {
    const task: any = await getTaskById(id as string);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const sessions = task.analysis?.scheduleDetails?.executionSessions;
    if (!sessions || !Array.isArray(sessions)) {
      res.status(400).json({ success: false, message: 'Task has no execution sessions' });
      return;
    }

    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId || sessions.indexOf(s).toString() === sessionId);
    if (sessionIndex === -1) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const currentSession = sessions[sessionIndex];
    const sessionData = {
      ...currentSession,
      status: currentSession.status || (currentSession.isCompleted ? 'COMPLETED' : 'SCHEDULED'),
      pauses: currentSession.pauses || []
    };

    const updated = engineCancelSession(sessionData);
    
    // Generate Observation
    const observation = generateObservationFromSession(updated, 'Cancelled');
    const savedObservation = await saveObservation(observation);

    // Merge back
    sessions[sessionIndex] = { ...currentSession, ...updated };

    const updates: any = { 
      'analysis.scheduleDetails.executionSessions': sessions,
      updatedAt: new Date().toISOString()
    };
    
    await repoUpdateTask(id as string, updates);

    res.json({ success: true, session: sessions[sessionIndex], observation: savedObservation });
  } catch (error: any) {
    console.error(`Error in cancel session action:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.',
    });
  }
};

export const completeSessionAction = async (req: Request, res: Response): Promise<void> => {
  const { id, sessionId } = req.params;
  const { notes, accumulatedTime, completionMethod, earlyCompletionReason, reflectionNotes, attachment, referenceLink } = req.body;
  
  // Idempotency check
  const existingObservation = await getObservationForSession(sessionId as string);
  if (existingObservation) {
    console.log(`Duplicate complete request for session ${sessionId}. Returning existing observation.`);
    res.json({ success: true, observation: existingObservation });
    return;
  }
  
  try {
    const task: any = await getTaskById(id as string);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const sessions = task.analysis?.scheduleDetails?.executionSessions;
    if (!sessions || !Array.isArray(sessions)) {
      res.status(400).json({ success: false, message: 'Task has no execution sessions' });
      return;
    }

    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId || sessions.indexOf(s).toString() === sessionId);
    if (sessionIndex === -1) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const currentSession = sessions[sessionIndex];
    const sessionData = {
      ...currentSession,
      status: currentSession.status || (currentSession.isCompleted ? 'COMPLETED' : 'SCHEDULED'),
      pauses: currentSession.pauses || []
    };

    const updated = engineCompleteSession(
      sessionData, 
      accumulatedTime || 0, 
      completionMethod || 'full', 
      { earlyCompletionReason, reflectionNotes }
    );
    if (notes) updated.notes = notes;
    if (attachment) updated.attachment = attachment;
    if (referenceLink) updated.referenceLink = referenceLink;

    // Generate Observation
    const endMethod = completionMethod === 'early' ? 'Manual Complete' : 'Timer Finished';
    const observation = generateObservationFromSession(updated, endMethod as any);
    const savedObservation = await saveObservation(observation);

    // Merge back
    sessions[sessionIndex] = { ...currentSession, ...updated };
    sessions[sessionIndex].isCompleted = true;

    const updates: any = { 
      'analysis.scheduleDetails.executionSessions': sessions,
      updatedAt: new Date().toISOString()
    };
    
    const allCompleted = sessions.every((s: any) => s.status === 'COMPLETED' || s.status === 'PARTIALLY_COMPLETED' || s.isCompleted);
    if (allCompleted) {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }

    await repoUpdateTask(id as string, updates);

    res.json({ success: true, session: sessions[sessionIndex], observation: savedObservation });
  } catch (error: any) {
    console.error(`Error in complete session action:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.',
    });
  }
};
