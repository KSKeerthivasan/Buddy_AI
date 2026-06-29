import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getCapacityForDate, getCapacityForDateWithTime } from '../capacityEngine';
import { getAvailabilityForDate } from '../../availability/availabilityEngine';
import { getSessionsForDate } from '../../../repositories/sessionRepository';
import { getProfile } from '../../../repositories/profileRepository';

jest.mock('../../availability/availabilityEngine', () => ({
  getAvailabilityForDate: jest.fn()
}));

jest.mock('../../../repositories/sessionRepository', () => ({
  getSessionsForDate: jest.fn()
}));

jest.mock('../../../repositories/profileRepository', () => ({
  getProfile: jest.fn()
}));

describe('Capacity Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getProfile as jest.Mock<any>).mockResolvedValue({
      id: 'user1',
      maxDailyWorkHours: 5,
      basic: { timezone: 'UTC' }
    });

    (getAvailabilityForDate as jest.Mock<any>).mockResolvedValue({
      totalAvailableMinutes: 420,
      availableBlocks: [
        { start: '10:00', end: '12:00' }, // 120m
        { start: '14:00', end: '19:00' }  // 300m
      ]
    });
  });

  it('calculates remaining capacity with no sessions', async () => {
    (getSessionsForDate as jest.Mock<any>).mockResolvedValue([]);
    
    // Simulate current time is 08:00
    const currentTime = new Date('2026-07-02T08:00:00Z');
    
    const capacity = await getCapacityForDateWithTime('user1', '2026-07-02', currentTime);
    
    expect(capacity.maximumDailyCapacity).toBe(300); // 5 hours
    expect(capacity.plannedMinutes).toBe(0);
    expect(capacity.completedMinutes).toBe(0);
    
    // Remaining capacity should be the lesser of (maxDaily - planned - completed) and future available time
    // theoretical = 300 - 0 = 300. futureAvailable = 420. min(300, 420) = 300.
    expect(capacity.remainingCapacity).toBe(300);
    expect(capacity.status).toBe('EMPTY');
  });

  it('deducts planned and completed sessions from theoretical remaining', async () => {
    (getSessionsForDate as jest.Mock<any>).mockResolvedValue([
      { status: 'COMPLETED', durationMinutes: 60 },
      { status: 'PENDING', durationMinutes: 120 }
    ]);
    
    const currentTime = new Date('2026-07-02T08:00:00Z');
    const capacity = await getCapacityForDateWithTime('user1', '2026-07-02', currentTime);
    
    expect(capacity.completedMinutes).toBe(60);
    expect(capacity.plannedMinutes).toBe(120);
    
    // theoretical = 300 - 180 = 120. futureAvailable = 420.
    expect(capacity.remainingCapacity).toBe(120);
    expect(capacity.utilization).toBe(60); // 180 / 300 * 100
    expect(capacity.status).toBe('NORMAL');
  });

  it('restricts capacity if current time eats into availability', async () => {
    (getSessionsForDate as jest.Mock<any>).mockResolvedValue([]);
    
    // Simulate current time is 18:00 UTC
    const currentTime = new Date('2026-07-02T18:00:00Z');
    
    const capacity = await getCapacityForDateWithTime('user1', '2026-07-02', currentTime);
    
    // Available blocks: 10:00-12:00 (past), 14:00-19:00 (1 hour left)
    // Future available minutes = 60.
    // theoretical = 300. future = 60.
    expect(capacity.remainingCapacity).toBe(60);
    expect(capacity.status).toBe('EMPTY'); // 0 utilized
    expect(capacity.capacityScore.score).toBe(20); // 60/300 * 100
  });

  it('identifies overbooked status when sessions exceed daily capacity', async () => {
    (getSessionsForDate as jest.Mock<any>).mockResolvedValue([
      { status: 'COMPLETED', durationMinutes: 300 },
      { status: 'PENDING', durationMinutes: 60 }
    ]);
    
    const currentTime = new Date('2026-07-02T08:00:00Z');
    const capacity = await getCapacityForDateWithTime('user1', '2026-07-02', currentTime);
    
    expect(capacity.remainingCapacity).toBe(0);
    expect(capacity.utilization).toBe(120); // 360 / 300 * 100
    expect(capacity.status).toBe('OVERBOOKED');
    expect(capacity.capacityScore.score).toBe(0);
  });
});
