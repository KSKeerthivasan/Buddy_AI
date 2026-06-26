import { Request, Response } from 'express';
import { analyzeTask as executeTaskAnalysis } from '../executionCore/taskAnalyzer';

export const analyzeTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, deadline, role } = req.body;

    // Validate required fields
    if (!title || !deadline) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Both title and deadline are required.',
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
