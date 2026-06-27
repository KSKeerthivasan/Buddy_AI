import { SchedulerInput, ScheduleResult, DailyPlan } from './types';
import { calculateWorkload } from './workloadBalancer';
import { calculateRisk } from './riskCalculator';
import { allocateMilestones } from './milestoneAllocator';

/**
 * Calculates the number of full days available from today until the deadline.
 */
const calculateAvailableDays = (deadlineStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const deadline = new Date(deadlineStr);
  deadline.setHours(23, 59, 59, 999); // End of the deadline day
  
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Orchestrates the scheduling process by executing all scheduler modules in order.
 */
export const scheduleTask = (input: SchedulerInput): ScheduleResult => {
  const availableDays = calculateAvailableDays(input.deadline);

  if (availableDays <= 0) {
    return {
      isFeasible: false,
      riskLevel: 'HIGH',
      schedule: [],
      message: 'Deadline has already passed or is too close.'
    };
  }

  // 1. Balance Workload
  const hoursPerDay = calculateWorkload(input.estimatedHours, availableDays);

  // 2. Calculate Risk
  const riskLevel = calculateRisk(hoursPerDay);

  // 3. Allocate Milestones
  const dailyMilestones = allocateMilestones(input.milestones, availableDays);

  // 4. Assemble Schedule
  const schedule: DailyPlan[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < availableDays; i++) {
    const planDate = new Date(today);
    planDate.setDate(planDate.getDate() + i);

    schedule.push({
      date: planDate.toISOString().split('T')[0]!,
      assignedHours: hoursPerDay,
      milestones: dailyMilestones[i] || []
    });
  }

  return {
    isFeasible: riskLevel !== 'HIGH',
    riskLevel,
    schedule,
    message: riskLevel === 'HIGH' ? 'High risk: Task requires significant daily hours to meet the deadline.' : 'Schedule generated successfully.'
  };
};
