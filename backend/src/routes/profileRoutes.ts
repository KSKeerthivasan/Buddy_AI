import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/profileController';

const router = Router();

router.get('/:userId', getUserProfile);
router.put('/:userId', updateUserProfile);

export default router;
