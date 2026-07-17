import { Router, Request, Response , NextFunction } from 'express';
import { getRoutineForDate, getRoutineForWeek } from '../executionCore/routine/routineEngine';

const router = Router();

router.get('/:userId/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, date } = req.params;
    const routine = await getRoutineForDate(userId as string, date as string);
    res.json({ success: true, routine });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:userId/week/:startDate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, startDate } = req.params;
    const routines = await getRoutineForWeek(userId as string, startDate as string);
    res.json({ success: true, routines });
  } catch (error: any) {
    next(error);
  }
});

export default router;
