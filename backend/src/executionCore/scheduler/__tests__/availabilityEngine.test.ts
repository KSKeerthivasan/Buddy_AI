import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { getAvailabilityForDate } from '../availabilityEngine';
import * as profileRepository from '../../../repositories/profileRepository';

jest.mock('../../../repositories/profileRepository');

describe('Availability Engine', () => {
  const mockUserId = 'test-user';
  const mockDate = '2026-06-30'; // A Tuesday

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const setupMockProfile = (schedule: any = []) => {
    (profileRepository.getProfile as jest.Mock<any>).mockResolvedValue({
      wakeUpTime: '07:00',
      sleepTime: '23:00',
      maxDailyWorkHours: 4,
      weeklySchedule: {
        Tuesday: schedule
      }
    });
  };

  test('Fully Free Day: No activities scheduled', async () => {
    setupMockProfile([]);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.busyBlocks).toHaveLength(0);
    expect(result.freeSlots).toHaveLength(1);
    expect(result.freeSlots[0]).toEqual({
      start: '07:00',
      end: '23:00',
      durationMinutes: 16 * 60 // 960
    });
    expect(result.totalAvailableMinutes).toBe(960);
    expect(result.effectivePlanningCapacityMinutes).toBe(240); // 4 * 60
  });

  test('Single Activity: Splits the day into two free slots', async () => {
    setupMockProfile([
      { start: '12:00', end: '14:00', activity: 'Lunch' }
    ]);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.busyBlocks).toHaveLength(1);
    expect(result.freeSlots).toHaveLength(2);
    expect(result.freeSlots).toEqual([
      { start: '07:00', end: '12:00', durationMinutes: 300 },
      { start: '14:00', end: '23:00', durationMinutes: 540 }
    ]);
    expect(result.totalAvailableMinutes).toBe(840);
  });

  test('Multiple Activities: Calculates gaps properly', async () => {
    setupMockProfile([
      { start: '08:00', end: '10:00', activity: 'Java' },
      { start: '13:00', end: '15:00', activity: 'AI' }
    ]);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.freeSlots).toHaveLength(3);
    expect(result.freeSlots).toEqual([
      { start: '07:00', end: '08:00', durationMinutes: 60 },
      { start: '10:00', end: '13:00', durationMinutes: 180 },
      { start: '15:00', end: '23:00', durationMinutes: 480 }
    ]);
  });

  test('Back-to-Back Activities: Merges overlapping or adjacent busy blocks', async () => {
    setupMockProfile([
      { start: '10:00', end: '12:00', activity: 'Class A' },
      { start: '12:00', end: '14:00', activity: 'Class B' }
    ]);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.freeSlots).toHaveLength(2);
    expect(result.freeSlots).toEqual([
      { start: '07:00', end: '10:00', durationMinutes: 180 },
      { start: '14:00', end: '23:00', durationMinutes: 540 }
    ]);
  });

  test('Fully Occupied Day: Returns 0 free slots', async () => {
    setupMockProfile([
      { start: '07:00', end: '23:00', activity: 'Hackathon' }
    ]);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.freeSlots).toHaveLength(0);
    expect(result.totalAvailableMinutes).toBe(0);
    expect(result.effectivePlanningCapacityMinutes).toBe(0);
  });

  test('Invalid Profile Fallbacks', async () => {
    (profileRepository.getProfile as jest.Mock<any>).mockResolvedValue(null);

    const result = await getAvailabilityForDate(mockUserId, mockDate);

    expect(result.workingWindow).toEqual({ start: '08:00', end: '22:00' });
    expect(result.freeSlots).toHaveLength(1);
    expect(result.totalAvailableMinutes).toBe(840);
  });
});
