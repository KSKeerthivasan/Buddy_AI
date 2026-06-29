import { ScheduleResult } from './types';
import { ExecutionSession } from './sessionGenerator';

export interface ConflictInfo {
  type: 'WORKLOAD' | 'BUFFER' | 'DEADLINE' | 'PRIORITY' | 'INSUFFICIENT_TIME_TODAY';
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface Recommendation {
  action: string;
  suggestion: string;
  workloadImprovement: string;
  riskReduction: string;
  actionParams: any;
}

export interface ConflictAnalysisResult {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  workloadScore: {
    score: number;
    label: 'Comfortable' | 'Moderate' | 'Busy' | 'Overloaded';
  };
  dailyCapacity: {
    plannedMinutes: number;
    capacityMinutes: number;
  };
  bufferProtection: {
    days: number;
    status: 'Safe' | 'Limited' | 'None';
  };
  deadlinePressure: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
  };
  conflicts: ConflictInfo[];
  primaryRecommendation: Recommendation;
  alternativeRecommendations: Recommendation[];
}

const getDailyCapacityMinutes = (role?: string, inputHours?: number): number => {
  if (inputHours && inputHours > 0) return inputHours * 60;
  const normalizedRole = role?.toLowerCase() || '';
  if (normalizedRole.includes('student')) return 2 * 60;
  if (normalizedRole.includes('working') || normalizedRole.includes('professional')) return 1.5 * 60;
  if (normalizedRole.includes('entrepreneur')) return 2 * 60;
  return 2 * 60;
};

export const analyzeConflicts = (
  newSchedule: ScheduleResult,
  activeTasks: any[],
  deadlineStr: string,
  role?: string,
  inputHours?: number
): ConflictAnalysisResult => {
  const conflicts: ConflictInfo[] = [];
  const recommendations: Recommendation[] = [];
  
  const dailyWorkload: Record<string, number> = {};
  const dailyPriorityWorkload: Record<string, number> = {};
  const existingDeadlines = new Set<string>();

  // 1. Build workload map from existing active tasks
  activeTasks.forEach(task => {
    if (task.status === 'completed' || task.status === 'archived' || task.taskType === 'REMINDER') return;
    
    // Track deadlines of high priority tasks
    if (task.analysis?.priority?.toLowerCase() === 'high' && task.deadline) {
      existingDeadlines.add(task.deadline.split('T')[0]);
    }
    
    const isHighPriority = task.analysis?.priority?.toLowerCase() === 'high';
    const sessions = task.analysis?.scheduleDetails?.executionSessions || [];
    sessions.forEach((s: ExecutionSession) => {
      // Legacy + strict status checks
      if (s.scheduledDate && s.status !== 'COMPLETED' && !s.isCompleted) {
        dailyWorkload[s.scheduledDate] = (dailyWorkload[s.scheduledDate] || 0) + (s.durationMinutes || 0);
        if (isHighPriority) {
          dailyPriorityWorkload[s.scheduledDate] = (dailyPriorityWorkload[s.scheduledDate] || 0) + (s.durationMinutes || 0);
        }
      }
    });
  });

  // 2. Base Capacity Metrics
  const dailyCapacity = getDailyCapacityMinutes(role, inputHours);
  let maxCombinedWorkload = 0;
  let hasPriorityCollision = false;
  
  let newTotalDuration = 0;

  newSchedule.executionSessions.forEach((s: ExecutionSession) => {
    if (s.scheduledDate) {
      newTotalDuration += s.durationMinutes || 0;
      const existing = dailyWorkload[s.scheduledDate] || 0;
      const combined = existing + (s.durationMinutes || 0);
      if (combined > maxCombinedWorkload) maxCombinedWorkload = combined;
      
      const existingPriority = dailyPriorityWorkload[s.scheduledDate] || 0;
      if (existingPriority > (dailyCapacity * 0.75)) {
        hasPriorityCollision = true;
      }
    }
  });

  // Fallback if maxCombinedWorkload is 0 (no sessions scheduled)
  if (maxCombinedWorkload === 0) maxCombinedWorkload = newSchedule.executionSessions.length > 0 ? (newSchedule.executionSessions[0]?.durationMinutes || 0) : 0;

  // 3. Deadline Pressure Calculation
  let remainingActiveDuration = 0;
  Object.values(dailyWorkload).forEach(duration => {
    remainingActiveDuration += duration;
  });
  
  const remainingRequiredWork = remainingActiveDuration + newTotalDuration;
  
  // Calculate available days until deadline
  let availableDays = 1;
  if (deadlineStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(23, 59, 59, 999);
    const diffTime = deadline.getTime() - today.getTime();
    availableDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  const remainingAvailableCapacity = availableDays * dailyCapacity;
  const pressureRatio = remainingRequiredWork / remainingAvailableCapacity;
  
  let deadlinePressureLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (pressureRatio > 0.9 || !newSchedule.isFeasible) deadlinePressureLevel = 'HIGH';
  else if (pressureRatio > 0.7) deadlinePressureLevel = 'MEDIUM';

  const maxExcess = Math.max(0, maxCombinedWorkload - dailyCapacity);

  // 4. Generate Conflicts
  const todayStr = new Date().toISOString().split('T')[0];
  const firstSessionDate = newSchedule.executionSessions[0]?.scheduledDate;
  if (todayStr && firstSessionDate && firstSessionDate > todayStr) {
    conflicts.push({
      type: 'INSUFFICIENT_TIME_TODAY',
      level: 'MEDIUM',
      message: 'Today\'s remaining working hours or capacity are exhausted. The schedule automatically starts on the next available day.'
    });
  }

  if (maxExcess > 0) {
    conflicts.push({
      type: 'WORKLOAD',
      level: 'HIGH',
      message: `Daily workload peaks at ${maxCombinedWorkload} mins, exceeding your capacity by ${maxExcess} mins.`
    });
  }

  if (hasPriorityCollision) {
    conflicts.push({
      type: 'PRIORITY',
      level: 'HIGH',
      message: 'This task overlaps significantly with existing high-priority work on certain days.'
    });
  }

  if (deadlineStr) {
    const deadlineDate = deadlineStr.split('T')[0];
    if (deadlineDate && existingDeadlines.has(deadlineDate)) {
      conflicts.push({
        type: 'DEADLINE',
        level: 'HIGH',
        message: 'This task has the exact same deadline as another existing high-priority task.'
      });
    }
  }

  if (!newSchedule.isFeasible) {
    conflicts.push({
      type: 'DEADLINE',
      level: 'CRITICAL',
      message: 'The deadline is too tight to schedule this task with your current daily limits.'
    });
  } else if (newSchedule.bufferDays < 1 && newSchedule.scheduledDays > 1) {
    conflicts.push({
      type: 'BUFFER',
      level: 'MEDIUM',
      message: 'There are no buffer days left before the deadline.'
    });
  }

  // 5. Workload Score Calculation
  const capacityUtilization = Math.min(1.5, maxCombinedWorkload / dailyCapacity);
  const pressureScore = Math.min(1.5, pressureRatio);
  const priorityPenalty = hasPriorityCollision ? 0.2 : 0;
  const bufferPenalty = newSchedule.bufferDays < 1 ? 0.2 : 0;

  // Weighted sum
  let rawScore = (capacityUtilization * 40) + (pressureScore * 40) + (priorityPenalty * 100) + (bufferPenalty * 100);
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let scoreLabel: 'Comfortable' | 'Moderate' | 'Busy' | 'Overloaded' = 'Comfortable';
  if (score > 85) scoreLabel = 'Overloaded';
  else if (score > 70) scoreLabel = 'Busy';
  else if (score > 40) scoreLabel = 'Moderate';

  // 6. Calculate Overall Risk
  let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (conflicts.some(c => c.level === 'CRITICAL') || score > 90) overallRisk = 'CRITICAL';
  else if (conflicts.some(c => c.level === 'HIGH') || score > 75) overallRisk = 'HIGH';
  else if (conflicts.some(c => c.level === 'MEDIUM') || score > 50) overallRisk = 'MEDIUM';

  // 7. Recommendations
  if (conflicts.length === 0) {
    recommendations.push({
      action: 'Keep Current Plan',
      suggestion: 'Buddy AI verified all constraints. Your capacity, deadlines, and buffer days are safely protected.',
      workloadImprovement: `Workload Score remains steady at ${score}.`,
      riskReduction: `Risk remains ${overallRisk}.`,
      actionParams: { action: 'NONE' }
    });
  } else {
    if (maxExcess > 0 || !newSchedule.isFeasible) {
      const requiredHours = Math.ceil((dailyCapacity + maxExcess) / 60) + (!newSchedule.isFeasible ? 1 : 0);
      recommendations.push({
        action: 'Increase Daily Workload',
        suggestion: `Increase your daily workload limit to ${requiredHours} hours to accommodate the overlap.`,
        workloadImprovement: `Workload Score: ${score} → ${Math.max(20, score - 30)}`,
        riskReduction: `Risk: ${overallRisk} → LOW`,
        actionParams: { action: 'INCREASE_DAILY_HOURS', newValue: requiredHours }
      });
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      recommendations.push({
        action: 'Delay Task Start',
        suggestion: `Delaying this task by 7 days removes the workload spike this week.`,
        workloadImprovement: `Workload Score: ${score} → ${Math.max(20, score - 40)}`,
        riskReduction: `Risk: ${overallRisk} → LOW`,
        actionParams: { action: 'DELAY_TASK', plannerStartDate: nextWeek.toISOString() }
      });
    } else {
      recommendations.push({
        action: 'Spread Work Across More Days',
        suggestion: 'Increase your daily workload limit slightly to finish earlier and avoid the deadline pileup.',
        workloadImprovement: `Workload Score: ${score} → ${Math.max(20, score - 20)}`,
        riskReduction: `Risk: ${overallRisk} → LOW`,
        actionParams: { action: 'INCREASE_DAILY_HOURS', newValue: Math.ceil(dailyCapacity / 60) + 1 }
      });
    }
  }

  // 8. Rank Recommendations
  let primaryRecommendation: Recommendation = recommendations[0]!;
  let alternativeRecommendations: Recommendation[] = [];

  if (recommendations.length > 1) {
    const delayRec = recommendations.find(r => r.action === 'Delay Task Start');
    const increaseRec = recommendations.find(r => r.action === 'Increase Daily Workload');
    
    if (delayRec && score > 85) {
      primaryRecommendation = delayRec;
      alternativeRecommendations = recommendations.filter(r => r !== delayRec);
    } else if (increaseRec) {
      primaryRecommendation = increaseRec;
      alternativeRecommendations = recommendations.filter(r => r !== increaseRec);
    } else {
      primaryRecommendation = recommendations[0]!;
      alternativeRecommendations = recommendations.slice(1);
    }
  }

  // Formatting output
  let bufferStatus: 'Safe' | 'Limited' | 'None' = 'Safe';
  if (newSchedule.bufferDays === 0) bufferStatus = 'None';
  else if (newSchedule.bufferDays === 1) bufferStatus = 'Limited';

  let pressureExplanation = 'Plenty of capacity available.';
  if (deadlinePressureLevel === 'HIGH') pressureExplanation = 'Very little slack left in your schedule.';
  else if (deadlinePressureLevel === 'MEDIUM') pressureExplanation = 'Schedule is somewhat tight.';

  return {
    overallRisk,
    workloadScore: {
      score,
      label: scoreLabel
    },
    dailyCapacity: {
      plannedMinutes: maxCombinedWorkload,
      capacityMinutes: dailyCapacity
    },
    bufferProtection: {
      days: newSchedule.bufferDays,
      status: bufferStatus
    },
    deadlinePressure: {
      level: deadlinePressureLevel,
      explanation: pressureExplanation
    },
    conflicts,
    primaryRecommendation,
    alternativeRecommendations
  };
};
