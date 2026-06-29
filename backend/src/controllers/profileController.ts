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

    const updatedProfile = await saveProfile(userId, profileData);
    res.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    console.error('Error in updateUserProfile:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
