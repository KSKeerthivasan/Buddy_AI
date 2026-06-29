import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getAvailabilityForDate } from '../availabilityEngine';
import { getRoutineForDate } from '../../routine/routineEngine';

jest.mock('../../routine/routineEngine', () => ({
  getRoutineForDate: jest.fn(),
  getRoutineForWeek: jest.fn()
}));

describe('Availability Engine v2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles a completely free day correctly', async () => {
    (getRoutineForDate as jest.Mock).mockResolvedValue({
      date: '2026-07-02',
      workingWindow: { start: '06:00', end: '22:00' },
      routineBlocks: [],
      commitmentBlocks: []
    });

    const availability = await getAvailabilityForDate('user1', '2026-07-02');
    
    expect(availability.availableBlocks.length).toBe(1);
    expect(availability.availableBlocks[0].start).toBe('06:00');
    expect(availability.availableBlocks[0].end).toBe('22:00');
    expect(availability.totalAvailableMinutes).toBe(16 * 60); // 960
    expect(availability.longestContinuousBlock!.durationMinutes).toBe(960);
    expect(availability.fragmentationScore).toBe('LOW');
    expect(availability.availabilityScore.label).toBe('Excellent');
  });

  it('handles a fully occupied day correctly', async () => {
    (getRoutineForDate as jest.Mock).mockResolvedValue({
      date: '2026-07-02',
      workingWindow: { start: '08:00', end: '18:00' },
      routineBlocks: [],
      commitmentBlocks: [
        { start: '08:00', end: '18:00', type: 'COMMITMENT' }
      ]
    });

    const availability = await getAvailabilityForDate('user1', '2026-07-02');
    
    expect(availability.availableBlocks.length).toBe(0);
    expect(availability.totalAvailableMinutes).toBe(0);
    expect(availability.longestContinuousBlock).toBeNull();
    expect(availability.fragmentationScore).toBe('HIGH');
    expect(availability.availabilityScore.score).toBe(0);
    expect(availability.availabilityScore.label).toBe('Very Limited');
  });

  it('merges overlapping and touching occupied blocks', async () => {
    (getRoutineForDate as jest.Mock).mockResolvedValue({
      date: '2026-07-02',
      workingWindow: { start: '08:00', end: '18:00' },
      routineBlocks: [
        { start: '09:00', end: '10:00' }, // touching
        { start: '10:00', end: '11:00' }
      ],
      commitmentBlocks: [
        { start: '12:00', end: '14:00' },
        { start: '13:00', end: '15:00' }  // overlapping
      ]
    });

    const availability = await getAvailabilityForDate('user1', '2026-07-02');
    
    expect(availability.occupiedBlocks.length).toBe(2);
    expect(availability.occupiedBlocks[0].start).toBe('09:00');
    expect(availability.occupiedBlocks[0].end).toBe('11:00');
    
    expect(availability.occupiedBlocks[1].start).toBe('12:00');
    expect(availability.occupiedBlocks[1].end).toBe('15:00');
  });

  it('calculates fragmentation score correctly for highly fragmented day', async () => {
    (getRoutineForDate as jest.Mock).mockResolvedValue({
      date: '2026-07-02',
      workingWindow: { start: '08:00', end: '18:00' },
      routineBlocks: [],
      commitmentBlocks: [
        { start: '09:00', end: '09:30' },
        { start: '10:00', end: '10:30' },
        { start: '11:00', end: '11:30' },
        { start: '12:00', end: '12:30' },
        { start: '13:00', end: '13:30' },
        { start: '14:00', end: '14:30' },
        { start: '15:00', end: '15:30' },
        { start: '16:00', end: '16:30' }
      ]
    });

    const availability = await getAvailabilityForDate('user1', '2026-07-02');
    
    expect(availability.fragmentationScore).toBe('HIGH');
  });
});
