import { Router, Request, Response } from 'express';
import { getRoutineForDate, getRoutineForWeek } from '../executionCore/routine/routineEngine';

const router = Router();

router.get('/:userId/:date', async (req: Request, res: Response) => {
  try {
    const { userId, date } = req.params;
    const routine = await getRoutineForDate(userId, date);
    res.json({ success: true, routine });
  } catch (error: any) {
    console.error('Error fetching routine for date:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

router.get('/:userId/week/:startDate', async (req: Request, res: Response) => {
  try {
    const { userId, startDate } = req.params;
    const routines = await getRoutineForWeek(userId, startDate);
    res.json({ success: true, routines });
  } catch (error: any) {
    console.error('Error fetching routine for week:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

export default router;
