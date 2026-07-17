import { getTaskById } from '../../repositories/taskRepository';
import { getCapacityForDate } from '../capacity/capacityEngine';
import { 
  RecoverySeverity, 
  RecoveryTrigger, 
  RecoveryReport, 
  RecoveryStrategy, 
  RecoveryMetrics 
} from './recoveryTypes';

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

  async recoverTask(taskId: string, trigger: RecoveryTrigger = 'MANUAL_REQUEST'): Promise<RecoveryReport> {
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
      recommendedStrategies.push({
        strategyId: 'EXTEND_DEADLINE',
        name: 'Request Deadline Extension',
        description: 'You do not have enough capacity to finish this task by the deadline. You need more days.',
        actionPayload: { suggestedDays: Math.abs(bufferRemainingDays) + 1 }
      });
      recommendedStrategies.push({
        strategyId: 'INCREASE_CAPACITY',
        name: 'Increase Daily Workload',
        description: 'Increase your maximum allowed daily work hours to create more capacity.',
      });
    } else if (bufferRemainingDays === 0 || deadlinePressure > 0.8) {
      severity = 'HIGH';
      recommendedStrategies.push({
        strategyId: 'REDUCE_SAFETY_BUFFER',
        name: 'Reduce Safety Buffer',
        description: 'You are cutting it close. Every remaining session is now critical.',
      });
      recommendedStrategies.push({
        strategyId: 'SPREAD_WORK',
        name: 'Spread Remaining Work',
        description: 'Rebalance the remaining effort evenly across the remaining days.',
      });
    } else if (bufferRemainingDays <= 2 || deadlinePressure > 0.5) {
      severity = 'MEDIUM';
      recommendedStrategies.push({
        strategyId: 'CONTINUE_EXISTING',
        name: 'Continue Existing Schedule',
        description: 'The schedule is tighter, but still fully feasible.',
      });
      recommendedStrategies.push({
        strategyId: 'SPREAD_WORK',
        name: 'Spread Remaining Work',
        description: 'Rebalance the remaining effort evenly.',
      });
    } else {
      severity = 'LOW';
      recommendedStrategies.push({
        strategyId: 'CONTINUE_EXISTING',
        name: 'Continue Existing Schedule',
        description: 'You still have plenty of buffer. No action needed.',
      });
    }

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

    console.log(`[Recovery Engine] Task ${taskId} | Severity: ${severity} | Deficit: ${capacityDeficitMinutes}m`);

    return report;
  }
};
