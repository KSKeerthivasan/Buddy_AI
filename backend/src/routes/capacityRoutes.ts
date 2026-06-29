import express from 'express';
import { getCapacityForDate, getCapacityForWeek } from '../executionCore/capacity/capacityEngine';

const router = express.Router();

router.get('/:userId/:date', async (req, res) => {
  const { userId, date } = req.params;
  
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const result = await getCapacityForDate(userId, date);
    res.json(result);
  } catch (error: any) {
    console.error(`[CapacityEngine API] Error calculating capacity:`, error);
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
});

router.get('/:userId/week/:startDate', async (req, res) => {
  const { userId, startDate } = req.params;
  
  if (!startDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const results = await getCapacityForWeek(userId, startDate);
    res.json(results);
  } catch (error: any) {
    console.error(`[CapacityEngine API] Error calculating capacity:`, error);
    res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
});

export default router;
