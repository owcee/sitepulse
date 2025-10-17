// Chat Service for SitePulse
// Handles real-time chat messages for project communication

import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'engineer' | 'worker';
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  readBy: string[];
  imageUrl?: string;
}

/**
 * Send a chat message
 * @param projectId - Project ID
 * @param content - Message content
 * @param senderName - Sender's name
 * @param senderRole - Sender's role
 * @param type - Message type (text or image)
 * @param imageUrl - Image URL (if type is image)
 * @returns Promise<ChatMessage> - Created message
 */
export async function sendMessage(
  projectId: string,
  content: string,
  senderName: string,
  senderRole: 'engineer' | 'worker',
  type: 'text' | 'image' = 'text',
  imageUrl?: string
): Promise<ChatMessage> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messagesRef = collection(db, 'chat_messages');
    const messageDoc = await addDoc(messagesRef, {
      projectId,
      senderId: auth.currentUser.uid,
      senderName,
      senderRole,
      content,
      type,
      timestamp: serverTimestamp(),
      readBy: [auth.currentUser.uid], // Sender has automatically read the message
      imageUrl: imageUrl || null
    });

    const createdMessage: ChatMessage = {
      id: messageDoc.id,
      projectId,
      senderId: auth.currentUser.uid,
      senderName,
      senderRole,
      content,
      type,
      timestamp: new Date(),
      readBy: [auth.currentUser.uid],
      imageUrl
    };

    console.log('Message sent successfully:', messageDoc.id);
    return createdMessage;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}

/**
 * Get chat messages for a project
 * @param projectId - Project ID
 * @param messageLimit - Maximum number of messages to fetch (default: 100)
 * @returns Promise<ChatMessage[]> - Array of messages
 */
export async function getMessages(
  projectId: string,
  messageLimit: number = 100
): Promise<ChatMessage[]> {
  try {
    const messagesRef = collection(db, 'chat_messages');
    const q = query(
      messagesRef,
      where('projectId', '==', projectId),
      orderBy('timestamp', 'asc'),
      limit(messageLimit)
    );

    const snapshot = await getDocs(q);
    const messages: ChatMessage[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        projectId: data.projectId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        content: data.content,
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        readBy: data.readBy || [],
        imageUrl: data.imageUrl
      });
    });

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw new Error('Failed to fetch messages');
  }
}

/**
 * Subscribe to real-time chat messages for a project
 * @param projectId - Project ID
 * @param callback - Function to call when messages update
 * @param messageLimit - Maximum number of messages to subscribe to (default: 100)
 * @returns Unsubscribe function
 */
export function subscribeToMessages(
  projectId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 100
): Unsubscribe {
  const messagesRef = collection(db, 'chat_messages');
  const q = query(
    messagesRef,
    where('projectId', '==', projectId),
    orderBy('timestamp', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        projectId: data.projectId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderRole: data.senderRole,
        content: data.content,
        type: data.type || 'text',
        timestamp: data.timestamp?.toDate() || new Date(),
        readBy: data.readBy || [],
        imageUrl: data.imageUrl
      });
    });
    callback(messages);
  }, (error) => {
    console.error('Error in message subscription:', error);
  });
}

/**
 * Mark message as read by current user
 * @param messageId - Message ID
 * @returns Promise<void>
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messageRef = doc(db, 'chat_messages', messageId);
    await updateDoc(messageRef, {
      readBy: arrayUnion(auth.currentUser.uid)
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw new Error('Failed to mark message as read');
  }
}

/**
 * Get unread message count for a project
 * @param projectId - Project ID
 * @returns Promise<number> - Count of unread messages
 */
export async function getUnreadCount(projectId: string): Promise<number> {
  try {
    if (!auth.currentUser) {
      return 0;
    }

    const messagesRef = collection(db, 'chat_messages');
    const q = query(
      messagesRef,
      where('projectId', '==', projectId)
    );

    const snapshot = await getDocs(q);
    let unreadCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const readBy = data.readBy || [];
      if (!readBy.includes(auth.currentUser!.uid)) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Delete a message (soft delete by updating content)
 * Note: Consider implementing proper deletion permissions
 * @param messageId - Message ID
 * @returns Promise<void>
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const messageRef = doc(db, 'chat_messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();
    if (messageData.senderId !== auth.currentUser.uid) {
      throw new Error('Unauthorized: You can only delete your own messages');
    }

    // Soft delete by updating content
    await updateDoc(messageRef, {
      content: '[Message deleted]',
      deleted: true,
      deletedAt: serverTimestamp()
    });

    console.log('Message deleted:', messageId);
  } catch (error) {
    console.error('Error deleting message:', error);
    throw new Error('Failed to delete message');
  }
}

// Import getDoc for delete function
import { getDoc } from 'firebase/firestore';

