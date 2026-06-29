import express from 'express';
import { getAvailabilityForDate, getAvailabilityForWeek } from '../executionCore/scheduler/availabilityEngine';
import { getProfile } from '../repositories/profileRepository';

const router = express.Router();

router.get('/:userId/:date', async (req, res) => {
  const { userId, date } = req.params;
  
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: `User profile not found for ID: ${userId}` });
    }

    console.log(`[AvailabilityEngine API] Loaded profile for user: ${userId}`);
    console.log(`[AvailabilityEngine API] Timetable for the week:`, JSON.stringify((profile as any).weeklySchedule, null, 2));

    const result = await getAvailabilityForDate(userId, date);

    console.log(`[AvailabilityEngine API] Computed busy blocks:`, JSON.stringify(result.busyBlocks, null, 2));
    console.log(`[AvailabilityEngine API] Computed free slots:`, JSON.stringify(result.freeSlots, null, 2));
    console.log(`[AvailabilityEngine API] Final response:`, JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error: any) {
    console.error(`[AvailabilityEngine API] Error calculating availability:`, error);
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
});

router.get('/:userId/week/:startDate', async (req, res) => {
  const { userId, startDate } = req.params;
  
  if (!startDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const profile = await getProfile(userId);
    if (!profile) {
      return res.status(404).json({ error: `User profile not found for ID: ${userId}` });
    }
    
    console.log(`[AvailabilityEngine API] Loaded profile for user: ${userId}`);
    console.log(`[AvailabilityEngine API] Timetable for the week:`, JSON.stringify((profile as any).weeklySchedule, null, 2));

    const results = await getAvailabilityForWeek(userId, startDate);

    console.log(`[AvailabilityEngine API] Computed weekly response:`, JSON.stringify(results, null, 2));
    
    res.json(results);
  } catch (error: any) {
    console.error(`[AvailabilityEngine API] Error calculating availability:`, error);
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
});

export default router;
