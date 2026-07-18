import express from 'express';
import { getUnreadNotificationsForUser, updateNotificationStatus } from '../repositories/notificationRepository';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await getUnreadNotificationsForUser(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. 'READ' or 'DISMISSED'
    
    if (!status || !['READ', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await updateNotificationStatus(id, status as any);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification status:', error);
    res.status(500).json({ error: 'Failed to update notification status' });
  }
});

export default router;
