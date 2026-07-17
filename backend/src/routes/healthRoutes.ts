import { Router, Request, Response, NextFunction } from 'express';
import { analyzeExecutionHealth } from '../executionCore/health/healthEngine';
import { scheduleExecutionPlan } from '../executionCore/scheduler/schedulerEngineV2';
import { getTaskById } from '../repositories/taskRepository';

const router = Router();

// [TEMPORARY] API to generate health report for a specific task
router.get('/:userId/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, taskId } = req.params;
    
    const taskIdStr = taskId as string;
    const userIdStr = userId as string;
    
    // 1. Fetch Task
    const task: any = await getTaskById(taskIdStr);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.userId !== userIdStr) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // 2. Mock missing data if the task isn't fully structured yet
    const taskInfo = {
      priority: task.priority || 'MEDIUM',
      deadline: task.deadline || new Date().toISOString().split('T')[0],
      safetyBufferDays: task.safetyBufferDays || 1,
      estimatedMinutes: task.estimatedHours ? task.estimatedHours * 60 : 120
    };
    
    // 3. Generate Execution Plan V2 on the fly (for testing purposes)
    const planInput = {
      userId: userIdStr,
      taskId: taskIdStr,
      taskTitle: task.title,
      milestones: task.milestones || [],
      totalEstimatedMinutes: taskInfo.estimatedMinutes,
      deadline: taskInfo.deadline
    };
    
    const executionPlan = await scheduleExecutionPlan(planInput);
    
    // 4. Analyze Health
    const healthInput = {
      userId: userIdStr,
      taskId: taskIdStr,
      executionPlan,
      taskInfo
    };
    
    const report = await analyzeExecutionHealth(healthInput);
    
    // 5. Send Report along with generated plan for visibility
    res.json({
      healthReport: report,
      executionPlan
    });
    
  } catch (error: any) {
    next(error);
  }
});

export default router;
