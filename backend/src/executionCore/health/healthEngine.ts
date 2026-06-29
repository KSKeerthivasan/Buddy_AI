import { getActiveTasksWithSessions } from '../../repositories/taskRepository';
import { HealthAnalysisInput, HealthReport, ConflictType, WorkloadLabel, BufferStatus, PressureLevel } from './healthTypes';

function determineWorkloadLabel(score: number): WorkloadLabel {
  if (score <= 50) return 'Excellent';
  if (score <= 75) return 'Healthy';
  if (score <= 90) return 'Busy';
  if (score <= 100) return 'Heavy';
  return 'Critical';
}

function determineBufferStatus(utilization: number): BufferStatus {
  if (utilization <= 50) return 'SAFE';
  if (utilization < 100) return 'LOW';
  return 'NONE';
}

function determineDeadlinePressure(bufferStatus: BufferStatus, priority: string): PressureLevel {
  if (priority === 'HIGH' && bufferStatus === 'NONE') return 'CRITICAL';
  if (priority === 'HIGH' && bufferStatus === 'LOW') return 'HIGH';
  if (bufferStatus === 'NONE') return 'HIGH';
  if (bufferStatus === 'LOW') return 'MEDIUM';
  return 'LOW';
}

export async function analyzeExecutionHealth(input: HealthAnalysisInput): Promise<HealthReport> {
  const { executionPlan, taskInfo, userId, taskId } = input;
  const conflicts: { type: ConflictType; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }[] = [];

  // 1. Feasibility
  const executionFeasibility = executionPlan.feasibility.status;

  // 2. Buffer Protection
  const deadlineDate = new Date(taskInfo.deadline).getTime();
  const completionDate = new Date(executionPlan.estimatedCompletion).getTime();
  
  let remainingDays = 0;
  if (deadlineDate >= completionDate) {
    remainingDays = Math.floor((deadlineDate - completionDate) / (1000 * 60 * 60 * 24));
  }
  
  const requestedBuffer = taskInfo.safetyBufferDays || 0;
  const consumedBuffer = Math.max(0, requestedBuffer - remainingDays);
  const bufferUtilization = requestedBuffer > 0 ? (consumedBuffer / requestedBuffer) * 100 : (remainingDays > 0 ? 0 : 100);
  
  const bufferStatus = determineBufferStatus(bufferUtilization);
  
  if (bufferStatus === 'NONE' || remainingDays < requestedBuffer) {
    conflicts.push({
      type: 'BUFFER_LOSS',
      severity: remainingDays <= 0 ? 'HIGH' : 'MEDIUM',
      message: `Safety buffer reduced to ${remainingDays} days (requested ${requestedBuffer}).`
    });
  }

  // 3. Deadline Pressure
  const deadlinePressure = determineDeadlinePressure(bufferStatus, taskInfo.priority || 'MEDIUM');
  if (deadlineDate < completionDate) {
    conflicts.push({
      type: 'DEADLINE_COLLISION',
      severity: 'HIGH',
      message: `Task is estimated to complete after the deadline.`
    });
  }

  // 4. Session Fragmentation & Quality
  let totalDuration = 0;
  let sessionQuality: 'Too short' | 'Too long' | 'Well balanced' = 'Well balanced';
  let shortSessions = 0;
  let longSessions = 0;

  for (const session of executionPlan.sessions) {
    const dur = session.durationMinutes || 0;
    totalDuration += dur;
    if (dur < 20) shortSessions++;
    if (dur > 120) longSessions++;
  }
  
  const sessionCount = executionPlan.sessions.length;
  const avgDuration = sessionCount > 0 ? totalDuration / sessionCount : 0;
  
  if (avgDuration < 30 && sessionCount > 3) {
    sessionQuality = 'Too short';
    conflicts.push({ type: 'SHORT_SESSION', severity: 'LOW', message: 'Many small fragmented sessions.' });
  } else if (avgDuration > 90) {
    sessionQuality = 'Too long';
    conflicts.push({ type: 'LONG_SESSION', severity: 'MEDIUM', message: 'Sessions are very long.' });
  }

  const fragmentationScore = sessionCount > 0 ? Math.min(100, (shortSessions / sessionCount) * 100) : 0;
  if (fragmentationScore > 50) {
    conflicts.push({ type: 'SESSION_FRAGMENTATION', severity: 'MEDIUM', message: 'High schedule fragmentation.' });
  }

  // 5. Workload & Capacity Score
  const capacityScore = executionPlan.feasibility.capacityShortfall > 0 ? 0 : 100;
  const workloadScoreVal = executionPlan.feasibility.capacityShortfall > 0 ? 100 : (executionPlan.capacityUtilization || 50);

  if (executionPlan.feasibility.capacityShortfall > 0) {
    conflicts.push({ type: 'TIME_CAPACITY', severity: 'HIGH', message: `Shortfall of ${executionPlan.feasibility.capacityShortfall} minutes.` });
  }

  // 6. Cross-task High Priority Overlaps
  const activeTasks = await getActiveTasksWithSessions(userId);
  const executionDates = new Set(executionPlan.sessions.map((s: any) => s.scheduledDate));
  
  for (const date of executionDates) {
    let otherHighPriorityCount = 0;
    for (const otherTask of activeTasks as any[]) {
      if (otherTask.id === taskId) continue;
      
      if (otherTask.priority === 'HIGH' && otherTask.sessions && Array.isArray(otherTask.sessions)) {
        const hasSessionOnDate = otherTask.sessions.some((s: any) => s.scheduledDate === date);
        if (hasSessionOnDate) otherHighPriorityCount++;
      }
    }

    if (taskInfo.priority === 'HIGH' && otherHighPriorityCount > 0) {
      conflicts.push({
        type: 'HIGH_PRIORITY_COLLISION',
        severity: 'HIGH',
        message: `Date ${date} has multiple high-priority tasks scheduled.`
      });
    }
  }

  // Calculate Overall Health
  let overallHealth = 100;
  if (executionFeasibility === 'NOT_FEASIBLE') overallHealth -= 50;
  if (executionFeasibility === 'PARTIALLY_FEASIBLE') overallHealth -= 20;
  overallHealth -= conflicts.filter(c => c.severity === 'HIGH').length * 15;
  overallHealth -= conflicts.filter(c => c.severity === 'MEDIUM').length * 5;
  overallHealth -= conflicts.filter(c => c.severity === 'LOW').length * 2;
  
  overallHealth = Math.max(0, Math.min(100, overallHealth));

  return {
    overallHealth,
    executionFeasibility,
    workloadScore: { score: workloadScoreVal, label: determineWorkloadLabel(workloadScoreVal) },
    capacityScore,
    bufferProtection: {
      remainingDays,
      utilization: bufferUtilization,
      status: bufferStatus
    },
    deadlinePressure,
    fragmentation: {
      score: fragmentationScore,
      sessionCount,
      avgDuration
    },
    sessionQuality,
    conflicts,
    recommendationsNeeded: conflicts.length > 0
  };
}
