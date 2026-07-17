import { recoveryEngine } from '../recoveryEngine';
import { getTaskById } from '../../../repositories/taskRepository';
import { getCapacityForDate } from '../../capacity/capacityEngine';

jest.mock('../../../repositories/taskRepository');
jest.mock('../../capacity/capacityEngine');

describe('recoveryEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseTask = {
    userId: 'user1',
    id: 'task1',
    status: 'IN_PROGRESS',
    deadline: '2026-07-05',
    executionPlan: {
      sessions: [
        { status: 'COMPLETED', durationMinutes: 60 },
        { status: 'PENDING', durationMinutes: 60 },
        { status: 'PENDING', durationMinutes: 60 }
      ]
    }
  };

  it('throws an error if the task is already completed', async () => {
    (getTaskById as jest.Mock).mockResolvedValue({ ...baseTask, status: 'COMPLETED' });
    await expect(recoveryEngine.recoverTask('task1', 'SESSION_SKIPPED')).rejects.toThrow('Cannot recover task in status: COMPLETED');
  });

  it('calculates metrics for a low severity recovery (plenty of capacity)', async () => {
    (getTaskById as jest.Mock).mockResolvedValue(baseTask);
    
    // Total remaining effort = 120 mins
    // Capacity for today (let's mock next 3 days)
    (getCapacityForDate as jest.Mock).mockResolvedValue({
      remainingCapacity: 120 // 120 mins every day
    });

    const report = await recoveryEngine.recoverTask('task1', 'SESSION_SKIPPED');
    
    expect(report.metrics.remainingEffortMinutes).toBe(120);
    expect(report.severity).toBe('LOW'); // because there's plenty of buffer and capacity
    expect(report.recommendedStrategies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ strategyId: 'CONTINUE_EXISTING' })
      ])
    );
  });

  it('flags CRITICAL severity when there is a capacity deficit', async () => {
    (getTaskById as jest.Mock).mockResolvedValue(baseTask);
    
    // Remaining effort = 120 mins
    // But 0 capacity remaining on all days
    (getCapacityForDate as jest.Mock).mockResolvedValue({
      remainingCapacity: 0
    });

    const report = await recoveryEngine.recoverTask('task1', 'SESSION_FAILED');

    expect(report.severity).toBe('CRITICAL');
    expect(report.metrics.capacityDeficitMinutes).toBe(120);
    expect(report.recommendedStrategies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ strategyId: 'EXTEND_DEADLINE' })
      ])
    );
  });
});
