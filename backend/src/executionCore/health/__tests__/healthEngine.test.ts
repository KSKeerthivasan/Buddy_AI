import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { analyzeExecutionHealth } from '../healthEngine';
import { getActiveTasksWithSessions } from '../../../repositories/taskRepository';

jest.mock('../../../repositories/taskRepository', () => ({
  getActiveTasksWithSessions: jest.fn()
}));

describe('Execution Health Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveTasksWithSessions as jest.Mock<any>).mockResolvedValue([]);
  });

  it('reports healthy metrics for a perfectly feasible plan', async () => {
    const input = {
      userId: 'user1',
      taskId: 'task1',
      executionPlan: {
        sessions: [
          { scheduledDate: '2026-07-02', durationMinutes: 60 }
        ],
        estimatedCompletion: '2026-07-02',
        feasibility: { status: 'FEASIBLE', capacityShortfall: 0 }
      },
      taskInfo: {
        priority: 'MEDIUM',
        deadline: '2026-07-05',
        safetyBufferDays: 2,
        estimatedMinutes: 60
      }
    };

    const report = await analyzeExecutionHealth(input);
    expect(report.overallHealth).toBe(100);
    expect(report.executionFeasibility).toBe('FEASIBLE');
    expect(report.bufferProtection.status).toBe('SAFE');
    expect(report.deadlinePressure).toBe('LOW');
    expect(report.conflicts.length).toBe(0);
  });

  it('flags DEADLINE_COLLISION and CRITICAL pressure if completion is past deadline', async () => {
    const input = {
      userId: 'user1',
      taskId: 'task2',
      executionPlan: {
        sessions: [
          { scheduledDate: '2026-07-06', durationMinutes: 60 }
        ],
        estimatedCompletion: '2026-07-06',
        feasibility: { status: 'NOT_FEASIBLE', capacityShortfall: 60 }
      },
      taskInfo: {
        priority: 'HIGH',
        deadline: '2026-07-05',
        safetyBufferDays: 1,
        estimatedMinutes: 60
      }
    };

    const report = await analyzeExecutionHealth(input);
    expect(report.executionFeasibility).toBe('NOT_FEASIBLE');
    expect(report.bufferProtection.status).toBe('NONE');
    expect(report.deadlinePressure).toBe('CRITICAL');
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({ type: 'DEADLINE_COLLISION', severity: 'HIGH' })
    );
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({ type: 'TIME_CAPACITY', severity: 'HIGH' })
    );
    expect(report.overallHealth).toBeLessThan(100);
  });

  it('detects HIGH_PRIORITY_COLLISION when other high priority tasks are scheduled on the same date', async () => {
    (getActiveTasksWithSessions as jest.Mock<any>).mockResolvedValue([
      {
        id: 'task3',
        priority: 'HIGH',
        sessions: [
          { scheduledDate: '2026-07-02' }
        ]
      }
    ]);

    const input = {
      userId: 'user1',
      taskId: 'task1',
      executionPlan: {
        sessions: [
          { scheduledDate: '2026-07-02', durationMinutes: 60 }
        ],
        estimatedCompletion: '2026-07-02',
        feasibility: { status: 'FEASIBLE', capacityShortfall: 0 }
      },
      taskInfo: {
        priority: 'HIGH',
        deadline: '2026-07-05',
        safetyBufferDays: 0,
        estimatedMinutes: 60
      }
    };

    const report = await analyzeExecutionHealth(input);
    expect(report.conflicts).toContainEqual(
      expect.objectContaining({ type: 'HIGH_PRIORITY_COLLISION', severity: 'HIGH' })
    );
  });
});
