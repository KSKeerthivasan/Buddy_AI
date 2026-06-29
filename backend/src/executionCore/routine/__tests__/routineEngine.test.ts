import { getRoutineForDate, getRoutineForWeek } from '../routineEngine';
import { db } from '../../../config/firebase';

// Mock Firebase db
jest.mock('../../../config/firebase', () => ({
  db: {
    collection: jest.fn()
  }
}));

describe('Routine Engine', () => {
  const mockUserId = 'user123';
  const mockProfile = {
    routine: {
      wakeUpTime: '06:00',
      sleepTime: '22:00',
      morningPrepMins: 30,
      commuteMins: 45,
      lunchMins: 60,
      dinnerMins: 45,
      weekendRoutine: 'Different',
      weekendWakeUpTime: '08:00',
      weekendSleepTime: '23:30'
    }
  };

  const mockCommitments = [
    {
      title: 'College',
      category: 'Education',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '12:00',
      enabled: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    const mockGetProfile = jest.fn().mockResolvedValue({
      exists: true,
      data: () => mockProfile
    });

    const mockGetCommitments = jest.fn().mockResolvedValue({
      docs: mockCommitments.map(c => ({ data: () => c }))
    });

    const mockWhere = jest.fn().mockReturnValue({ get: mockGetCommitments });
    const mockWhereFirst = jest.fn().mockReturnValue({ where: mockWhere });
    const mockCollection = jest.fn().mockReturnValue({
      where: mockWhereFirst,
      get: mockGetCommitments
    });

    (db.collection as jest.Mock).mockImplementation((col) => {
      if (col === 'userProfiles') {
        return {
          doc: jest.fn().mockReturnValue({
            get: mockGetProfile,
            collection: mockCollection
          })
        };
      }
      return {};
    });
  });

  it('generates routine for a weekday with standard times and commitments', async () => {
    // 2026-06-29 is a Monday
    const routine = await getRoutineForDate(mockUserId, '2026-06-29');

    expect(routine.date).toBe('2026-06-29');
    expect(routine.wakeUpTime).toBe('06:00');
    expect(routine.sleepTime).toBe('22:00');
    expect(routine.workingWindow.start).toBe('06:00');
    expect(routine.workingWindow.end).toBe('22:00');
    
    // Check commitments
    expect(routine.commitmentBlocks.length).toBe(1);
    expect(routine.commitmentBlocks[0].title).toBe('College');

    // Check generated routine blocks (Prep, Morning Commute, Lunch, Evening Commute, Dinner)
    expect(routine.routineBlocks.length).toBe(5);
    
    const prep = routine.routineBlocks.find(b => b.title === 'Morning Preparation');
    expect(prep?.start).toBe('06:00');
    expect(prep?.end).toBe('06:30'); // 30 mins later
  });

  it('generates routine for a weekend with alternative times', async () => {
    // 2026-06-28 is a Sunday
    // Mock the commitments snapshot to return empty for Sunday
    const mockEmptyCommitments = jest.fn().mockResolvedValue({ docs: [] });
    const mockWhere = jest.fn().mockReturnValue({ get: mockEmptyCommitments });
    const mockWhereFirst = jest.fn().mockReturnValue({ where: mockWhere });
    const mockCollection = jest.fn().mockReturnValue({ where: mockWhereFirst, get: mockEmptyCommitments });

    (db.collection as jest.Mock).mockImplementation((col) => {
      if (col === 'userProfiles') {
        return {
          doc: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ exists: true, data: () => mockProfile }),
            collection: mockCollection
          })
        };
      }
      return {};
    });

    const routine = await getRoutineForDate(mockUserId, '2026-06-28');
    
    expect(routine.wakeUpTime).toBe('08:00');
    expect(routine.sleepTime).toBe('23:30');
    expect(routine.workingWindow.start).toBe('08:00');
    expect(routine.commitmentBlocks.length).toBe(0); // None on Sunday
  });

  it('handles missing profile gracefully by throwing an error', async () => {
    (db.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false })
      })
    }));

    await expect(getRoutineForDate(mockUserId, '2026-06-29')).rejects.toThrow('User profile not found');
  });

  it('omits routine blocks when duration is zero', async () => {
    const zeroProfile = {
      routine: { wakeUpTime: '07:00', sleepTime: '23:00', morningPrepMins: 0, commuteMins: 0, lunchMins: 0, dinnerMins: 0, weekendRoutine: 'Same as Weekdays' }
    };
    (db.collection as jest.Mock).mockImplementation(() => ({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => zeroProfile }),
        collection: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ docs: [] }) }) })
        })
      })
    }));

    const routine = await getRoutineForDate(mockUserId, '2026-06-29');
    expect(routine.routineBlocks.length).toBe(0);
  });
  
  it('generates a full week of routines', async () => {
    const routines = await getRoutineForWeek(mockUserId, '2026-06-29');
    expect(routines.length).toBe(7);
    expect(routines[0].date).toBe('2026-06-29');
    expect(routines[6].date).toBe('2026-07-05');
  });
});
