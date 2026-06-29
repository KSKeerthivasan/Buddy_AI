import { Request, Response } from 'express';
import { getProfile, saveProfile } from '../repositories/profileRepository';

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const profile = await getProfile(userId);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Profile not found' });
      return;
    }

    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const profileData = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }
    
    if (!profileData) {
      res.status(400).json({ success: false, message: 'Profile data is required' });
      return;
    }

    const updatedData = { ...profileData };

    // Validation
    if (updatedData.routine) {
      const r = updatedData.routine;
      if (r.morningPrepMins < 0 || r.morningPrepMins > 240) return res.status(400).json({ success: false, message: 'Invalid morningPrepMins' }) as any;
      if (r.commuteMins < 0 || r.commuteMins > 240) return res.status(400).json({ success: false, message: 'Invalid commuteMins' }) as any;
      if (r.lunchMins < 0 || r.lunchMins > 180) return res.status(400).json({ success: false, message: 'Invalid lunchMins' }) as any;
      if (r.dinnerMins < 0 || r.dinnerMins > 180) return res.status(400).json({ success: false, message: 'Invalid dinnerMins' }) as any;
      
      // Backward compatibility copying
      if (r.wakeUpTime) updatedData.wakeUpTime = r.wakeUpTime;
      if (r.sleepTime) updatedData.sleepTime = r.sleepTime;
    }

    if (updatedData.planning) {
      const p = updatedData.planning;
      if (p.maxDailyWorkHours < 1 || p.maxDailyWorkHours > 16) return res.status(400).json({ success: false, message: 'Invalid maxDailyWorkHours' }) as any;
      if (![25, 45, 60, 90].includes(p.preferredSessionLength)) return res.status(400).json({ success: false, message: 'Invalid preferredSessionLength' }) as any;
      
      // Backward compatibility copying
      if (p.maxDailyWorkHours) updatedData.maxDailyWorkHours = p.maxDailyWorkHours;
    }

    const updatedProfile = await saveProfile(userId, updatedData);
    res.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
