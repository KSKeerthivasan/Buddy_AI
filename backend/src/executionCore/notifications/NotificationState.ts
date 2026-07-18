import { NotificationCategory, NotificationPriority, DispatchConfig, Notification } from './notificationTypes';

/**
 * Encapsulates the Notification State and Orchestration rules
 */
export class NotificationState {
  
  /**
   * Cooldown definitions in milliseconds.
   * If a notification of this category was sent recently, subsequent ones might be dropped or queued.
   */
  private static COOLDOWNS: Record<NotificationCategory, number> = {
    'ACTION_REQUIRED': 0, // Never cooldown action required
    'ALERT': 60 * 60 * 1000, // 1 hour for alerts (e.g. Health drops)
    'INFORMATIONAL': 4 * 60 * 60 * 1000, // 4 hours for info
    'ACHIEVEMENT': 0
  };

  /**
   * Determines if a notification should be suppressed (e.g. during silent hours)
   * Future: Integrate with actual user profile preferences (focus mode, timezone)
   */
  public static isSuppressed(config: DispatchConfig, currentHourUTC: number): boolean {
    if (config.priority === 'URGENT') {
      return false; // Never suppress urgent
    }

    // Example Silent Hours: 23:00 to 07:00 UTC
    if (currentHourUTC >= 23 || currentHourUTC < 7) {
      // Don't wake the user up for low/medium/high priority unless urgent
      return true;
    }

    return false;
  }

  /**
   * Determines if a notification should be dropped due to cooldowns
   */
  public static isCoolingDown(config: DispatchConfig, recentNotifications: Notification[]): boolean {
    if (config.priority === 'URGENT') return false;

    const cooldownMs = this.COOLDOWNS[config.category];
    if (cooldownMs === 0) return false;

    const now = new Date().getTime();

    // Look for notifications of the same category in the recent list
    const lastOfCategory = recentNotifications.find(n => n.category === config.category);
    if (!lastOfCategory) return false;

    const lastTime = new Date(lastOfCategory.createdAt).getTime();
    return (now - lastTime) < cooldownMs;
  }

  /**
   * Determines if this exact notification is already active and unread (Deduplication)
   */
  public static isDuplicate(config: DispatchConfig, recentNotifications: Notification[]): boolean {
    return recentNotifications.some(n => 
      n.status === 'UNREAD' &&
      n.category === config.category &&
      n.title === config.title &&
      // Specifically check for identical action targets so we don't spam 5 links to the same decision
      n.actionPayload?.targetId === config.actionPayload?.targetId
    );
  }
}
