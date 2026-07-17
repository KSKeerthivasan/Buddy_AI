import { eventBus } from './EventBus';
import { EventType } from './eventTypes';
import { analyzeExecutionHealth } from '../health/healthEngine';
import { getTaskById } from '../../repositories/taskRepository';

export const registerSubscribers = () => {
  console.log('[EventSubscriber] Registering event listeners...');

  // When a task is created, we might want to initialize some health metrics
  eventBus.subscribe(EventType.TASK_CREATED, async (event) => {
    console.log(`[EventSubscriber] Handling TASK_CREATED for task ${event.taskId}`);
    // Future: Initialize task health state here
  });

  // When a reflection is submitted, the Health Engine should evaluate it
  eventBus.subscribe(EventType.REFLECTION_SUBMITTED, async (event) => {
    console.log(`[EventSubscriber] Handling REFLECTION_SUBMITTED for session ${event.sessionId}`);
    
    try {
      const task: any = await getTaskById(event.taskId);
      if (!task) return;
      
      const taskInfo = {
        priority: task.priority || 'MEDIUM',
        deadline: task.deadline || new Date().toISOString().split('T')[0],
        safetyBufferDays: task.safetyBufferDays || 1,
        estimatedMinutes: task.estimatedHours ? task.estimatedHours * 60 : 120
      };

      // We pass in minimal required inputs for the health analysis
      // This decouple the route controller from the heavy health logic
      const healthInput = {
        userId: event.userId,
        taskId: event.taskId,
        executionPlan: task.analysis?.scheduleDetails || { sessions: [] },
        taskInfo
      };

      const report: any = await analyzeExecutionHealth(healthInput);
      console.log(`[EventSubscriber] Health analysis completed post-reflection. Status: ${report.overallStatus}`);
      
      // We can emit another event that the health state has changed
      eventBus.publish(EventType.HEALTH_STATE_CHANGED, {
        userId: event.userId,
        payload: {
          taskId: event.taskId,
          report
        }
      });
      
    } catch (error) {
      console.error(`[EventSubscriber] Error processing reflection event:`, error);
    }
  });

  // Example of reacting to Health State Changes
  eventBus.subscribe(EventType.HEALTH_STATE_CHANGED, async (event) => {
    console.log(`[EventSubscriber] Handling HEALTH_STATE_CHANGED for user ${event.userId}`);
    // Future: The Recovery Engine listens here to trigger plan adjustments if status is AT_RISK or CRITICAL
  });

  console.log('[EventSubscriber] Listeners registered.');
};
