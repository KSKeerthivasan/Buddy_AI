import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { scheduleExecutionPlan } from '../schedulerEngineV2';
import { getAvailabilityForDate } from '../../availability/availabilityEngine';
import { getCapacityForDate } from '../../capacity/capacityEngine';

jest.mock('../../availability/availabilityEngine', () => ({
  getAvailabilityForDate: jest.fn()
}));

jest.mock('../../capacity/capacityEngine', () => ({
  getCapacityForDate: jest.fn()
}));

describe('Scheduler Engine v2', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getCapacityForDate as jest.Mock<any>).mockResolvedValue({
      remainingCapacity: 120
    });

    (getAvailabilityForDate as jest.Mock<any>).mockResolvedValue({
      availableBlocks: [
        { start: '10:00', end: '11:00', durationMinutes: 60 },
        { start: '14:00', end: '15:00', durationMinutes: 60 }
      ]
    });
  });

  it('chops a medium milestone into two sessions and schedules them', async () => {
    const input = {
      userId: 'user1',
      taskId: 'task1',
      taskTitle: 'Study Physics',
      milestones: [{ id: 'm1', title: 'Chapter 1', estimatedHours: 2 }],
      totalEstimatedMinutes: 120,
      deadline: '2026-07-10',
      startDate: '2026-07-02'
    };

    const plan = await scheduleExecutionPlan(input);

    expect(plan.schedulerVersion).toBe('v2');
    expect(plan.sessions.length).toBe(2);
    expect(plan.sessions[0].durationMinutes).toBe(60);
    expect(plan.sessions[1].durationMinutes).toBe(60);

    // Both should fit on day 1 since capacity is 120 and there are two 60 min blocks
    expect(plan.sessions[0].scheduledDate).toBe('2026-07-02');
    expect(plan.sessions[1].scheduledDate).toBe('2026-07-02');
    expect(plan.feasibility.status).toBe('FEASIBLE');
  });

  it('rolls over to the next day if a session does not fit in remaining continuous gaps', async () => {
    (getAvailabilityForDate as jest.Mock<any>).mockImplementation((userId, dateStr) => {
      if (dateStr === '2026-07-02') {
        return Promise.resolve({
          availableBlocks: [ { start: '10:00', end: '10:30', durationMinutes: 30 } ]
        });
      }
      return Promise.resolve({
        availableBlocks: [ { start: '10:00', end: '12:00', durationMinutes: 120 } ]
      });
    });

    const input = {
      userId: 'user1',
      taskId: 'task2',
      taskTitle: 'Math Homework',
      milestones: [{ id: 'm1', title: 'Part 1', estimatedHours: 1 }], // 60 mins
      totalEstimatedMinutes: 60,
      deadline: '2026-07-10',
      startDate: '2026-07-02'
    };

    const plan = await scheduleExecutionPlan(input);

    expect(plan.sessions.length).toBe(1);
    expect(plan.sessions[0].scheduledDate).toBe('2026-07-03');
    expect(plan.bufferDays).toBe(7); // 10 - 3 = 7
  });

  it('reports NOT_FEASIBLE if capacity is exhausted before deadline', async () => {
    (getCapacityForDate as jest.Mock<any>).mockImplementation((userId, dateStr) => {
      if (dateStr <= '2026-07-03') {
        return Promise.resolve({ remainingCapacity: 0 }); // No capacity before deadline
      }
      return Promise.resolve({ remainingCapacity: 120 }); // Time found after deadline
    });

    const input = {
      userId: 'user1',
      taskId: 'task3',
      taskTitle: 'Impossible Task',
      milestones: [{ id: 'm1', title: 'Part 1', estimatedHours: 2 }], // 120 mins
      totalEstimatedMinutes: 120,
      deadline: '2026-07-03',
      startDate: '2026-07-02'
    };

    const plan = await scheduleExecutionPlan(input);

    expect(plan.feasibility.status).toBe('NOT_FEASIBLE');
    expect(plan.feasibility.capacityShortfall).toBe(120);
    // Still schedules it eventually because the engine searches until it finds time
    // But since capacity is ALWAYS 0 in the mock, it will throw the 1-year error.
    // Wait, let's fix the mock so it finds time *after* the deadline.
  });
});
