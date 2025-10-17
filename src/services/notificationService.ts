// Notification Service for SitePulse
// Handles in-app notifications for task updates, assignments, and system messages

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'task_approval' | 'task_rejection' | 'project_assignment' | 'usage_approved' | 'usage_rejected' | 'system' | 'message';
  read: boolean;
  timestamp: Date;
  relatedId?: string;
  projectId?: string;
  assignmentId?: string;
  status?: 'pending' | 'accepted' | 'rejected' | 'completed' | 'info';
}

/**
 * Send a notification to a user
 * @param userId - User ID to send notification to
 * @param notificationData - Notification content
 * @returns Promise<string> - Created notification ID
 */
export async function sendNotification(
  userId: string,
  notificationData: {
    title: string;
    body: string;
    type: Notification['type'];
    relatedId?: string;
    projectId?: string;
    assignmentId?: string;
    status?: Notification['status'];
  }
): Promise<string> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      userId,
      title: notificationData.title,
      body: notificationData.body,
      type: notificationData.type,
      read: false,
      timestamp: serverTimestamp(),
      relatedId: notificationData.relatedId || null,
      projectId: notificationData.projectId || null,
      assignmentId: notificationData.assignmentId || null,
      status: notificationData.status || 'info'
    });

    console.log('Notification sent:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Failed to send notification');
  }
}

/**
 * Get all notifications for current user
 * @returns Promise<Notification[]> - Array of notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const notifications: Notification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        read: data.read || false,
        timestamp: data.timestamp?.toDate() || new Date(),
        relatedId: data.relatedId,
        projectId: data.projectId,
        assignmentId: data.assignmentId,
        status: data.status || 'info'
      });
    });

    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

/**
 * Subscribe to real-time notification updates
 * @param callback - Function to call when notifications update
 * @returns Unsubscribe function
 */
export function subscribeToNotifications(
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', auth.currentUser.uid),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        read: data.read || false,
        timestamp: data.timestamp?.toDate() || new Date(),
        relatedId: data.relatedId,
        projectId: data.projectId,
        assignmentId: data.assignmentId,
        status: data.status || 'info'
      });
    });
    callback(notifications);
  }, (error) => {
    console.error('Error in notification subscription:', error);
  });
}

/**
 * Mark a notification as read
 * @param notificationId - Notification ID to mark as read
 * @returns Promise<void>
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
}

/**
 * Mark all notifications as read for current user
 * @returns Promise<void>
 */
export async function markAllAsRead(): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map((document) =>
      updateDoc(doc(db, 'notifications', document.id), {
        read: true,
        readAt: serverTimestamp()
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
}

/**
 * Delete a notification
 * @param notificationId - Notification ID to delete
 * @returns Promise<void>
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    // Note: Security rules might prevent deletion
    // Consider soft-delete by updating a 'deleted' field instead
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      deleted: true,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
}

/**
 * Get unread notification count
 * @returns Promise<number> - Count of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  try {
    if (!auth.currentUser) {
      return 0;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}



