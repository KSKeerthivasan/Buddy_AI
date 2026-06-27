import { Request, Response } from 'express';
import { scheduleTask } from '../executionCore/scheduler/schedulerEngine';

/**
 * TEMPORARY DEVELOPMENT ENDPOINT
 * Tests the scheduler engine without saving to Firestore or calling Gemini.
 */
export const testScheduler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { deadline, estimatedHours, milestones } = req.body;

    if (!deadline || estimatedHours === undefined || !Array.isArray(milestones)) {
      res.status(400).json({ 
        error: 'Validation Error', 
        message: 'Missing or invalid required fields: deadline, estimatedHours, milestones array.' 
      });
      return;
    }

    // Call the scheduler engine synchronously
    const result = scheduleTask({
      taskId: 'test-task-id',
      deadline,
      estimatedHours,
      milestones
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in testScheduler:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during scheduling.'
    });
  }
};
