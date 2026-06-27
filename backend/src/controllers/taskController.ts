import { Request, Response } from 'express';
import { analyzeTask as executeTaskAnalysis } from '../executionCore/taskAnalyzer';
import { createTask as repoCreateTask, getTasksByUser as repoGetTasksByUser } from '../repositories/taskRepository';

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
