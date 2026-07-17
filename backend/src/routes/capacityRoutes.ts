import express, { Request, Response, NextFunction } from 'express';
import { getCapacityForDate, getCapacityForWeek } from '../executionCore/capacity/capacityEngine';

const router = express.Router();

router.get('/:userId/:date', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId as string;
  const date = req.params.date as string;
  
  if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const result = await getCapacityForDate(userId, date);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

router.get('/:userId/week/:startDate', async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId as string;
  const startDate = req.params.startDate as string;
  
  if (!startDate || !startDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  try {
    const results = await getCapacityForWeek(userId, startDate);
    res.json(results);
  } catch (error: any) {
    next(error);
  }
});

export default router;
