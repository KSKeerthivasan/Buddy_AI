import { db } from '../../config/firebase';
import { RoutineBlock, RoutineDay } from './routineTypes';

const PROFILES_COLLECTION = 'userProfiles';

// Helper to add minutes to "HH:mm"
function addMinutesToTime(timeStr: string, minsToAdd: number): string {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);

  m += minsToAdd;
  h += Math.floor(m / 60);
  m = m % 60;
  
  if (h >= 24) h = h % 24;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function getRoutineForDate(userId: string, dateStr: string): Promise<RoutineDay> {
  console.log(`[Routine Engine] Generating routine for user ${userId} on ${dateStr}`);
  
  // 1. Load Profile
  const profileDoc = await db.collection(PROFILES_COLLECTION).doc(userId).get();
  if (!profileDoc.exists) {
    throw new Error('User profile not found');
  }
  const profile = profileDoc.data();
  console.log(`[Routine Engine] Loaded profile for user ${userId}`);

  // 2. Load Commitments
  const dateObj = new Date(dateStr);
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysOfWeek[dateObj.getDay()];
  const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';

  const commitmentsRef = db.collection(PROFILES_COLLECTION).doc(userId).collection('weeklyCommitments');
  const commitmentsSnapshot = await commitmentsRef.where('dayOfWeek', '==', dayName).where('enabled', '==', true).get();
  const commitments = commitmentsSnapshot.docs.map(d => d.data());
  console.log(`[Routine Engine] Loaded ${commitments.length} commitments for ${dayName}`);

  // 3. Determine Wake/Sleep times based on Weekday/Weekend
  const routineSettings = profile?.routine || {};
  let wakeUpTime = routineSettings.wakeUpTime || '07:00';
  let sleepTime = routineSettings.sleepTime || '23:00';

  if (isWeekend && routineSettings.weekendRoutine === 'Different') {
    wakeUpTime = routineSettings.weekendWakeUpTime || wakeUpTime;
    sleepTime = routineSettings.weekendSleepTime || sleepTime;
  }

  // 4. Generate Commitment Blocks
  const commitmentBlocks: RoutineBlock[] = commitments.map(c => ({
    title: c.title,
    category: c.category,
    start: c.startTime,
    end: c.endTime,
    type: 'COMMITMENT' as const
  }));
  console.log(`[Routine Engine] Generated ${commitmentBlocks.length} commitment blocks`);

  // 5. Generate Routine Blocks (Duration-based Fallbacks)
  const routineBlocks: RoutineBlock[] = [];
  
  const prepMins = routineSettings.morningPrepMins || 0;
  if (prepMins > 0) {
    routineBlocks.push({
      title: 'Morning Preparation',
      category: 'Personal',
      start: wakeUpTime,
      end: addMinutesToTime(wakeUpTime, prepMins),
      type: 'ROUTINE'
    });
  }

  const commuteMins = routineSettings.commuteMins || 0;
  if (commuteMins > 0) {
    // Start morning commute right after prep
    const commuteStart = addMinutesToTime(wakeUpTime, prepMins);
    routineBlocks.push({
      title: 'Morning Commute',
      category: 'Travel',
      start: commuteStart,
      end: addMinutesToTime(commuteStart, commuteMins),
      type: 'ROUTINE'
    });

    // Evening Commute fixed at 18:00
    routineBlocks.push({
      title: 'Evening Commute',
      category: 'Travel',
      start: '18:00',
      end: addMinutesToTime('18:00', commuteMins),
      type: 'ROUTINE'
    });
  }

  const lunchMins = routineSettings.lunchMins || 0;
  if (lunchMins > 0) {
    // Fixed at 13:00
    routineBlocks.push({
      title: 'Lunch',
      category: 'Health',
      start: '13:00',
      end: addMinutesToTime('13:00', lunchMins),
      type: 'ROUTINE'
    });
  }

  const dinnerMins = routineSettings.dinnerMins || 0;
  if (dinnerMins > 0) {
    // Fixed at 20:00
    routineBlocks.push({
      title: 'Dinner',
      category: 'Health',
      start: '20:00',
      end: addMinutesToTime('20:00', dinnerMins),
      type: 'ROUTINE'
    });
  }
  
  console.log(`[Routine Engine] Generated ${routineBlocks.length} routine blocks`);
  console.log(`[Routine Engine] Routine generation completed for ${dateStr}`);

  return {
    date: dateStr,
    wakeUpTime,
    sleepTime,
    workingWindow: {
      start: wakeUpTime,
      end: sleepTime
    },
    routineBlocks,
    commitmentBlocks
  };
}

export async function getRoutineForWeek(userId: string, startDateStr: string): Promise<RoutineDay[]> {
  const start = new Date(startDateStr);
  const routines: RoutineDay[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const routine = await getRoutineForDate(userId, dateStr);
    routines.push(routine);
  }
  
  return routines;
}
