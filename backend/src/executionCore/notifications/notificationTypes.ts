export type NotificationCategory = 'ACTION_REQUIRED' | 'ALERT' | 'INFORMATIONAL' | 'ACHIEVEMENT';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED' | 'EXPIRED';

export interface ActionPayload {
  type: 'VIEW_DECISION' | 'VIEW_TASK' | 'VIEW_HEALTH' | 'CUSTOM';
  targetId?: string; // id of the task or decision or report
  data?: any;
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  actionPayload?: ActionPayload;
  expiresAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Config used by NotificationEngine to dispatch
export interface DispatchConfig {
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionPayload?: ActionPayload;
  ttlMinutes?: number; // Time to live before expiring
}
