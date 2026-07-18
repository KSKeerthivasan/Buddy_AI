import { db } from '../config/firebase';
import { Notification } from '../executionCore/notifications/notificationTypes';
import { v4 as uuidv4 } from 'uuid';

export async function saveNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const doc: any = {
    ...notification,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // Firestore doesn't like undefined values
  if (doc.expiresAt === undefined) delete doc.expiresAt;
  if (doc.actionPayload === undefined) delete doc.actionPayload;

  await db.collection('notifications').doc(id).set(doc);
  return doc as Notification;
}

export async function getUnreadNotificationsForUser(userId: string): Promise<Notification[]> {
  const snapshot = await db.collection('notifications')
    .where('userId', '==', userId)
    .where('status', '==', 'UNREAD')
    .get();

  // Firestore requires composite index if we combine where and orderBy.
  // Sort in memory to avoid index requirement for MVP.
  const notifications = snapshot.docs.map(doc => doc.data() as Notification);
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return notifications;
}

export async function getRecentNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  const snapshot = await db.collection('notifications')
    .where('userId', '==', userId)
    .get();

  const notifications = snapshot.docs.map(doc => doc.data() as Notification);
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return notifications.slice(0, limit);
}

export async function updateNotificationStatus(id: string, status: Notification['status']): Promise<void> {
  await db.collection('notifications').doc(id).update({
    status,
    updatedAt: new Date().toISOString()
  });
}
