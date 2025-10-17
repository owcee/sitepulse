// Firebase Cloud Messaging Service for SitePulse
// Handles push notification token management and registration

import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Import auth separately to avoid type issues
const { auth } = require('../firebaseConfig') as { auth: Auth };

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register for push notifications
 * @returns Promise<string | null> - Returns the push token or null if permission denied
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device (required for push notifications)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '85b89d22-8736-4be1-9fd2-064ed1d8fd96' // Your EAS project ID
    });
    
    const token = tokenData.data;
    console.log('Push token obtained:', token);

    // Save token to Firestore
    await saveFCMToken(token);

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Save FCM token to user's profile
 * @param token - FCM device token
 * @returns Promise<void>
 */
export async function saveFCMToken(token: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const uid = auth.currentUser.uid;

    // Try to update engineer account first
    const engineerRef = doc(db, 'engineer_accounts', uid);
    const engineerDoc = await getDoc(engineerRef);

    if (engineerDoc.exists()) {
      await updateDoc(engineerRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      });
      console.log('FCM token saved to engineer account');
      return;
    }

    // Try worker account
    const workerRef = doc(db, 'worker_accounts', uid);
    const workerDoc = await getDoc(workerRef);

    if (workerDoc.exists()) {
      await updateDoc(workerRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      });
      console.log('FCM token saved to worker account');
      return;
    }

    console.warn('User profile not found, could not save FCM token');
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw new Error('Failed to save FCM token');
  }
}

/**
 * Clear FCM token from user's profile (on logout)
 * @returns Promise<void>
 */
export async function clearFCMToken(): Promise<void> {
  try {
    if (!auth.currentUser) {
      return;
    }

    const uid = auth.currentUser.uid;

    // Try engineer account
    const engineerRef = doc(db, 'engineer_accounts', uid);
    const engineerDoc = await getDoc(engineerRef);

    if (engineerDoc.exists()) {
      await updateDoc(engineerRef, {
        fcmToken: null,
        fcmTokenClearedAt: new Date().toISOString()
      });
      return;
    }

    // Try worker account
    const workerRef = doc(db, 'worker_accounts', uid);
    const workerDoc = await getDoc(workerRef);

    if (workerDoc.exists()) {
      await updateDoc(workerRef, {
        fcmToken: null,
        fcmTokenClearedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error clearing FCM token:', error);
  }
}

/**
 * Get user's current FCM token from Firestore
 * @returns Promise<string | null>
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      return null;
    }

    const uid = auth.currentUser.uid;

    // Try engineer account
    const engineerRef = doc(db, 'engineer_accounts', uid);
    const engineerDoc = await getDoc(engineerRef);

    if (engineerDoc.exists()) {
      return engineerDoc.data().fcmToken || null;
    }

    // Try worker account
    const workerRef = doc(db, 'worker_accounts', uid);
    const workerDoc = await getDoc(workerRef);

    if (workerDoc.exists()) {
      return workerDoc.data().fcmToken || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

