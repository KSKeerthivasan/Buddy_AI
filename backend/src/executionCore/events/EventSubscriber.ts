import { eventBus } from './EventBus';
import { EventType } from './eventTypes';
import { analyzeExecutionHealth } from '../health/healthEngine';
import { getTaskById } from '../../repositories/taskRepository';
import { getReflectionById, updateReflection } from '../../repositories/reflectionRepository';
import { analyzeReflection } from '../reflection/reflectionEngine';
import { recoveryEngine } from '../recovery/recoveryEngine';
import { getConversationById } from '../../repositories/conversationRepository';
import { notificationEngine } from '../notifications/notificationEngine';
import { visionAnalysisEngine } from '../evidence/visionAnalysisEngine';
import { evidenceRepository } from '../../repositories/evidenceRepository';

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

      // 1. Analyze reflection with AI
      const reflection = await getReflectionById(event.reflectionId);
      let aiAnalysis;
      if (reflection) {
        aiAnalysis = await analyzeReflection(reflection, taskInfo);
        await updateReflection(event.reflectionId, { aiAnalysis });
        console.log(`[EventSubscriber] AI Reflection Analysis complete. Confidence: ${aiAnalysis.completionConfidence}`);
      }

      // 2. Health Analysis Input
      const healthInput = {
        userId: event.userId,
        taskId: event.taskId,
        executionPlan: task.analysis?.scheduleDetails || { sessions: [] },
        taskInfo,
        completionConfidence: aiAnalysis?.completionConfidence,
        detectedBlockers: aiAnalysis?.detectedBlockers
      };

      const report: any = await analyzeExecutionHealth(healthInput);
      console.log(`[EventSubscriber] Health analysis completed post-reflection. Status: ${report.overallHealth}`);
      
      // We can emit another event that the health state has changed
      eventBus.publish(EventType.HEALTH_STATE_CHANGED, {
        userId: event.userId,
        taskId: event.taskId,
        payload: {
          overallHealth: report.overallHealth,
          conflicts: report.conflicts
        }
      });
      
    } catch (error) {
      console.error(`[EventSubscriber] Error processing reflection event:`, error);
    }
  });

  // Example of reacting to Health State Changes
  eventBus.subscribe(EventType.HEALTH_STATE_CHANGED, async (event) => {
    console.log(`[EventSubscriber] Handling HEALTH_STATE_CHANGED for user ${event.userId}`);
    if (event.payload.overallHealth < 50) {
      await notificationEngine.dispatch({
        userId: event.userId,
        title: 'Health Alert',
        message: `Your task execution health has dropped to ${event.payload.overallHealth}.`,
        category: 'ALERT',
        priority: 'HIGH',
        actionPayload: {
          type: 'VIEW_HEALTH',
          targetId: event.taskId
        }
      });
    }
  // The Recovery Engine listens here to trigger plan adjustments if status is AT_RISK or CRITICAL
  });

  // When Conversation AI finishes gathering context on why a deviation happened
  eventBus.subscribe(EventType.DEVIATION_CONTEXT_GATHERED, async (event) => {
    console.log(`[EventSubscriber] Handling DEVIATION_CONTEXT_GATHERED for task ${event.taskId}`);
    try {
      const conversation = await getConversationById(event.conversationId);
      if (conversation) {
        await recoveryEngine.recoverTask(event.taskId, 'DEVIATION_DETECTED', conversation);
      } else {
        console.warn(`[EventSubscriber] Conversation ${event.conversationId} not found, generating recovery without context.`);
        await recoveryEngine.recoverTask(event.taskId, 'DEVIATION_DETECTED');
      }
    } catch (error) {
      console.error(`[EventSubscriber] Error processing deviation context event:`, error);
    }
  });

  // When a Recovery Plan is generated, notify the user immediately
  eventBus.subscribe(EventType.RECOVERY_PLAN_GENERATED, async (event) => {
    console.log(`[EventSubscriber] Handling RECOVERY_PLAN_GENERATED for user ${event.userId}`);
    await notificationEngine.dispatch({
      userId: event.userId,
      title: 'Recovery Plan Ready',
      message: 'A new recovery plan has been generated to resolve your deviation.',
      category: 'ACTION_REQUIRED',
      priority: 'URGENT',
      actionPayload: {
        type: 'VIEW_DECISION',
        targetId: event.taskId
      }
    });
  });

  // When Evidence is uploaded, trigger Vision Analysis asynchronously
  eventBus.subscribe(EventType.EVIDENCE_UPLOADED, async (event) => {
    console.log(`[EventSubscriber] Handling EVIDENCE_UPLOADED for evidence ${event.evidenceId}`);
    try {
      const evidence = await evidenceRepository.getEvidenceById(event.evidenceId);
      if (evidence && (evidence.mimeType.startsWith('image/') || evidence.mimeType === 'application/pdf')) {
        const task: any = await getTaskById(event.taskId);
        const taskTitle = task ? task.title : 'Unknown Task';
        
        await visionAnalysisEngine.processEvidence(
          evidence.evidenceId, 
          evidence.storagePath, 
          evidence.mimeType, 
          taskTitle,
          event.taskId,
          event.sessionId,
          event.userId
        );
      } else {
        console.log(`[EventSubscriber] Skipping Vision Analysis for non-image/pdf evidence ${event.evidenceId}`);
      }
    } catch (error) {
      console.error(`[EventSubscriber] Error processing evidence upload event:`, error);
    }
  });

  console.log('[EventSubscriber] Listeners registered.');
};
