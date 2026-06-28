import { Request, Response } from 'express';
import { analyzeTask as executeTaskAnalysis } from '../executionCore/taskAnalyzer';
import { createTask as repoCreateTask, getTasksByUser as repoGetTasksByUser, updateTask as repoUpdateTask, getTaskById } from '../repositories/taskRepository';

import { validateTaskInput } from '../utils/inputValidator';

export const analyzeTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, deadline, role } = req.body;

    // Run custom input validation before engaging the AI
    const validation = validateTaskInput(title, description, deadline);
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Validation Error',
        message: validation.message,
      });
      return;
    }

    // Call the Execution Core (Business Logic)
    const result = await executeTaskAnalysis({
      title,
      description,
      deadline,
      role,
    });

    // Return the successful structured result
    res.json(result);
  } catch (error: any) {
    console.error('Error in analyzeTask controller:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during task analysis.',
    });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskData = req.body;
    
    if (!taskData) {
      res.status(400).json({ success: false, message: 'Task data is required' });
      return;
    }

    const now = new Date().toISOString();
    taskData.createdAt = now;
    taskData.updatedAt = now;

    const savedTask = await repoCreateTask(taskData);

    res.json({
      success: true,
      taskId: savedTask.id,
    });
  } catch (error: any) {
    console.error('Error in createTask controller:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred while creating the task.',
    });
  }
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    const tasks = await repoGetTasksByUser(userId);
    res.json({
      success: true,
      tasks,
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred while fetching tasks.',
    });
  }
};

export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || !status) {
      res.status(400).json({ success: false, message: 'Task ID and status are required' });
      return;
    }

    const updates: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
    }

    await repoUpdateTask(id as string, updates);

    res.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error updating task status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred while updating the task.',
    });
  }
};

export const completeSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, sessionId } = req.params;
    const { notes, accumulatedTime, completionMethod, earlyCompletionReason, reflectionNotes, attachment, referenceLink } = req.body;

    if (!id || !sessionId) {
      res.status(400).json({ success: false, message: 'Task ID and Session ID are required' });
      return;
    }

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

    // Update the session
    sessions[sessionIndex].isCompleted = true;
    sessions[sessionIndex].completedAt = new Date().toISOString();
    if (notes) sessions[sessionIndex].notes = notes;
    if (accumulatedTime !== undefined) sessions[sessionIndex].accumulatedTime = accumulatedTime;
    if (completionMethod) sessions[sessionIndex].completionMethod = completionMethod;
    if (earlyCompletionReason) sessions[sessionIndex].earlyCompletionReason = earlyCompletionReason;
    if (reflectionNotes) sessions[sessionIndex].reflectionNotes = reflectionNotes;
    if (attachment) sessions[sessionIndex].attachment = attachment;
    if (referenceLink) sessions[sessionIndex].referenceLink = referenceLink;

    // Check if all sessions are completed
    const allCompleted = sessions.every((s: any) => s.isCompleted);

    const updates: any = { 
      'analysis.scheduleDetails.executionSessions': sessions,
      updatedAt: new Date().toISOString()
    };

    if (allCompleted) {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }

    await repoUpdateTask(id as string, updates);

    res.json({
      success: true,
      allCompleted
    });
  } catch (error: any) {
    console.error('Error completing session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.',
    });
  }
};

export const updateSessionProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, sessionId } = req.params;
    const { 
      notes, 
      accumulatedTime,
      status,
      technique,
      cycleCount,
      timerPhase,
      timeLeft,
      isRunning,
      startedAt
    } = req.body;

    if (!id || !sessionId) {
      res.status(400).json({ success: false, message: 'Task ID and Session ID are required' });
      return;
    }

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

    // Update the session progress
    if (notes !== undefined) sessions[sessionIndex].notes = notes;
    if (accumulatedTime !== undefined) sessions[sessionIndex].accumulatedTime = accumulatedTime;
    if (status !== undefined) sessions[sessionIndex].status = status;
    if (technique !== undefined) sessions[sessionIndex].technique = technique;
    if (cycleCount !== undefined) sessions[sessionIndex].cycleCount = cycleCount;
    if (timerPhase !== undefined) sessions[sessionIndex].timerPhase = timerPhase;
    if (timeLeft !== undefined) sessions[sessionIndex].timeLeft = timeLeft;
    if (isRunning !== undefined) sessions[sessionIndex].isRunning = isRunning;
    if (startedAt !== undefined && !sessions[sessionIndex].startedAt) {
      sessions[sessionIndex].startedAt = startedAt;
    }
    
    sessions[sessionIndex].updatedAt = new Date().toISOString();

    const updates: any = { 
      'analysis.scheduleDetails.executionSessions': sessions,
      updatedAt: new Date().toISOString()
    };

    await repoUpdateTask(id as string, updates);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error updating session progress:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred.',
    });
  }
};
