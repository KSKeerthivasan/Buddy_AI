import { getTaskById } from '../../repositories/taskRepository';
import { getCapacityForDate } from '../capacity/capacityEngine';
import { 
  RecoverySeverity,
  RecoveryTrigger, 
  RecoveryReport, 
  RecoveryStrategy,
  RecoveryMetrics 
} from './recoveryTypes';
import { aiClient } from '../../ai/client';
import { RECOVERY_SYSTEM_INSTRUCTION, recoveryStrategySchema } from '../../prompts/recoveryPrompt';
import { ConversationContext } from '@buddy-ai/shared';
import { saveRecoveryReport } from '../../repositories/recoveryRepository';
import { eventBus } from '../events/EventBus';
import { EventType } from '../events/eventTypes';

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] as string;
}

export const recoveryEngine = {
  async recoverSession(sessionId: string, trigger: RecoveryTrigger): Promise<RecoveryReport> {
    // In a real implementation, we would find the taskId from the sessionId.
    // For MVP, we will assume this delegates to recoverTask or we fetch the task via the session.
    // Since taskRepository doesn't have getTaskBySessionId, we'll just throw for now or mock it.
    throw new Error('Not fully implemented yet. Use recoverTask.');
  },

  async recoverTask(taskId: string, trigger: RecoveryTrigger = 'MANUAL_REQUEST', conversation?: ConversationContext): Promise<RecoveryReport> {
    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      throw new Error(`Cannot recover task in status: ${task.status}`);
    }

    const todayStr = new Date().toISOString().split('T')[0] as string;
    const deadlineStr = task.deadline; // format YYYY-MM-DD
    
    // 1. Calculate Remaining Effort
    let remainingEffortMinutes = 0;
    let remainingSessionsCount = 0;
    
    if (task.executionPlan?.sessions) {
      for (const session of task.executionPlan.sessions) {
        if (session.status === 'PENDING' || session.status === 'IN_PROGRESS') {
          remainingEffortMinutes += (session.durationMinutes || 0);
          remainingSessionsCount++;
        }
      }
    } else {
      // Fallback
      remainingEffortMinutes = task.totalEstimatedMinutes || 0;
      remainingSessionsCount = 1;
    }

    // 2. Calculate Available Capacity and Earliest Completion Date
    let currentStr = todayStr;
    let availableCapacityToDeadline = 0;
    let remainingToSchedule = remainingEffortMinutes;
    let earliestCompletionDate = currentStr;

    // We look up to 365 days into the future to avoid infinite loops
    let daysLooked = 0;
    while (remainingToSchedule > 0 && daysLooked < 365) {
      const capacity = await getCapacityForDate(task.userId, currentStr);
      
      if (currentStr <= deadlineStr) {
        availableCapacityToDeadline += capacity.remainingCapacity;
      }
      
      if (capacity.remainingCapacity > 0) {
        remainingToSchedule -= capacity.remainingCapacity;
      }
      
      earliestCompletionDate = currentStr;
      currentStr = addDaysToDateString(currentStr, 1);
      daysLooked++;
    }

    // Continue tallying available capacity up to the deadline if we finished early
    while (currentStr <= deadlineStr && daysLooked < 365) {
      const capacity = await getCapacityForDate(task.userId, currentStr);
      availableCapacityToDeadline += capacity.remainingCapacity;
      currentStr = addDaysToDateString(currentStr, 1);
      daysLooked++;
    }

    // 3. Compute Metrics
    const capacityDeficitMinutes = Math.max(0, remainingEffortMinutes - availableCapacityToDeadline);
    
    let bufferRemainingDays = 0;
    if (earliestCompletionDate <= deadlineStr) {
      const endMs = new Date(earliestCompletionDate).getTime();
      const deadMs = new Date(deadlineStr).getTime();
      bufferRemainingDays = Math.floor((deadMs - endMs) / (1000 * 60 * 60 * 24));
    } else {
      const endMs = new Date(earliestCompletionDate).getTime();
      const deadMs = new Date(deadlineStr).getTime();
      bufferRemainingDays = Math.floor((deadMs - endMs) / (1000 * 60 * 60 * 24)); // Will be negative
    }

    const deadlinePressure = availableCapacityToDeadline > 0 
      ? remainingEffortMinutes / availableCapacityToDeadline 
      : (remainingEffortMinutes > 0 ? 999 : 0);

    const riskIncrease = Math.min(100, Math.round(deadlinePressure * 100));
    const recoveryUrgency = capacityDeficitMinutes > 0 ? 100 : Math.max(0, 100 - (bufferRemainingDays * 10));

    const metrics: RecoveryMetrics = {
      remainingEffortMinutes,
      remainingSessionsCount,
      remainingCapacityMinutes: availableCapacityToDeadline,
      bufferRemainingDays,
      deadlinePressure,
      capacityDeficitMinutes,
      riskIncrease,
      recoveryUrgency
    };

    // 4. Determine Severity & Strategies
    let severity: RecoverySeverity = 'LOW';
    const recommendedStrategies: RecoveryStrategy[] = [];

    if (capacityDeficitMinutes > 0 || bufferRemainingDays < 0 || deadlinePressure > 1) {
      severity = 'CRITICAL';
    } else if (bufferRemainingDays === 0 || deadlinePressure > 0.8) {
      severity = 'HIGH';
    } else if (bufferRemainingDays <= 2 || deadlinePressure > 0.5) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    // AI Generation of Strategies
    const promptContext = `
      Task Deadline: ${deadlineStr}
      Remaining Effort (Minutes): ${remainingEffortMinutes}
      Remaining Sessions: ${remainingSessionsCount}
      Available Capacity to Deadline: ${availableCapacityToDeadline}
      Buffer Remaining (Days): ${bufferRemainingDays}
      Capacity Deficit (Minutes): ${capacityDeficitMinutes}
      
      Conversation Context (Why this happened):
      ${conversation ? conversation.messages.map(m => `${m.role}: ${m.text}`).join('\n') : 'No conversation context provided.'}
    `;

    const aiResponse = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction: RECOVERY_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recoveryStrategySchema,
        temperature: 0.2
      }
    });

    let generatedStrategies: RecoveryStrategy[] = [];
    try {
      if (aiResponse.text) {
        generatedStrategies = JSON.parse(aiResponse.text);
      }
    } catch (err) {
      console.error('Failed to parse Gemini recovery strategy JSON:', err);
      // Fallback
      generatedStrategies.push({
        strategyId: 'CONTINUE_EXISTING',
        name: 'Continue Existing Schedule',
        description: 'An error occurred while generating strategies. Continue with caution.'
      });
    }

    recommendedStrategies.push(...generatedStrategies);

    const report: RecoveryReport = {
      taskId,
      triggerReason: trigger,
      severity,
      metrics,
      recommendedStrategies,
      requiresDecision: severity === 'HIGH' || severity === 'CRITICAL',
      earliestCompletionDate,
      generatedAt: new Date().toISOString()
    };

    const savedReport = await saveRecoveryReport(report);

    console.log(`[Recovery Engine] Task ${taskId} | Severity: ${severity} | Deficit: ${capacityDeficitMinutes}m`);

    eventBus.publish(EventType.RECOVERY_PLAN_GENERATED, {
      userId: task.userId,
      taskId,
      reportId: savedReport.id || 'unknown',
      payload: savedReport
    });

    return savedReport;
  }
};
