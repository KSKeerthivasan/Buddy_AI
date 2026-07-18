import { DispatchConfig, Notification } from './notificationTypes';
import { NotificationState } from './NotificationState';
import { getRecentNotifications, saveNotification } from '../../repositories/notificationRepository';

export const notificationEngine = {
  
  /**
   * Evaluates if a notification should be sent, and if so, saves it.
   */
  async dispatch(config: DispatchConfig): Promise<Notification | null> {
    const currentHourUTC = new Date().getUTCHours();
    
    // 1. Check Suppression Rules
    if (NotificationState.isSuppressed(config, currentHourUTC)) {
      console.log(`[Notification Engine] Suppressed ${config.priority} notification: "${config.title}"`);
      return null;
    }

    // Load recent history for state checking
    const recentHistory = await getRecentNotifications(config.userId, 20);

    // 2. Check Deduplication
    if (NotificationState.isDuplicate(config, recentHistory)) {
      console.log(`[Notification Engine] Deduplicated identical active notification: "${config.title}"`);
      return null;
    }

    // 3. Check Cooldowns
    if (NotificationState.isCoolingDown(config, recentHistory)) {
      console.log(`[Notification Engine] Cooldown active for category ${config.category}. Dropped: "${config.title}"`);
      return null;
    }

    // 4. Calculate Expiration (if ephemeral)
    let expiresAt = undefined;
    if (config.ttlMinutes) {
      const d = new Date();
      d.setMinutes(d.getMinutes() + config.ttlMinutes);
      expiresAt = d.toISOString();
    }

    // 5. Persist the Notification
    console.log(`[Notification Engine] Dispatching ${config.priority} notification: "${config.title}"`);
    const notification = await saveNotification({
      userId: config.userId,
      title: config.title,
      message: config.message,
      category: config.category,
      priority: config.priority,
      status: 'UNREAD',
      actionPayload: config.actionPayload,
      expiresAt
    });

    return notification;
  }
};
