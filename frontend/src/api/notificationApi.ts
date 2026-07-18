const API_BASE_URL = 'http://localhost:5000/api';

export interface ActionPayload {
  type: 'VIEW_DECISION' | 'VIEW_TASK' | 'VIEW_HEALTH' | 'CUSTOM';
  targetId?: string;
  data?: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'ACTION_REQUIRED' | 'ALERT' | 'INFORMATIONAL' | 'ACHIEVEMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'UNREAD' | 'READ' | 'DISMISSED' | 'EXPIRED';
  actionPayload?: ActionPayload;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  const response = await fetch(`${API_BASE_URL}/notifications/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'READ' })
  });
  if (!response.ok) throw new Error('Failed to update notification');
};
