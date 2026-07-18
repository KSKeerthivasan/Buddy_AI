import { Router, Request, Response, NextFunction } from 'express';
import { conversationEngine } from '../executionCore/conversation/conversationEngine';
import { getConversationForTask } from '../repositories/conversationRepository';

const router = Router();

// GET /api/tasks/:taskId/conversation
router.get('/:taskId/conversation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const conversation = await getConversationForTask(taskId as string);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'No active conversation found for this task.' });
    }

    res.json({ success: true, conversation });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/tasks/:taskId/conversation
router.post('/:taskId/conversation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ success: false, message: 'userId and message are required.' });
    }

    const updatedContext = await conversationEngine.processMessage(taskId as string, userId, message);

    res.json({ success: true, conversation: updatedContext });
  } catch (error: any) {
    next(error);
  }
});

export default router;
