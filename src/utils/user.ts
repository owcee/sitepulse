// User Profile Utilities for SitePulse
// Centralized helper functions for user profile management

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'engineer' | 'worker';
  projectId?: string | null;
  activeProjectIds?: string[]; // Phase 3: multi-project support
  currentProjectId?: string | null; // Phase 3: active context project
  profileImage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fetch user profile from Firestore
 * Checks both engineer_accounts and worker_accounts collections
 * @param uid - User's Firebase Auth UID
 * @returns User profile data or null if not found
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    // Try engineer_accounts first
    const engineerDocRef = doc(db, 'engineer_accounts', uid);
    const engineerDoc = await getDoc(engineerDocRef);
    
    if (engineerDoc.exists()) {
      const data = engineerDoc.data();
      return {
        uid,
        email: data.email,
        name: data.name,
        role: 'engineer',
        projectId: data.projectId || null,
        activeProjectIds: data.activeProjectIds || (data.projectId ? [data.projectId] : []),
        currentProjectId: data.currentProjectId || data.projectId || null,
        profileImage: data.profileImage,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    }

    // Try worker_accounts
    const workerDocRef = doc(db, 'worker_accounts', uid);
    const workerDoc = await getDoc(workerDocRef);
    
    if (workerDoc.exists()) {
      const data = workerDoc.data();
      return {
        uid,
        email: data.email,
        name: data.name,
        role: 'worker',
        projectId: data.projectId || null,
        profileImage: data.profileImage,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Check if user is an engineer
 * @param uid - User's UID
 * @returns true if engineer, false otherwise
 */
export async function isEngineer(uid: string): Promise<boolean> {
  try {
    const engineerDocRef = doc(db, 'engineer_accounts', uid);
    const engineerDoc = await getDoc(engineerDocRef);
    return engineerDoc.exists();
  } catch (error) {
    console.error('Error checking engineer status:', error);
    return false;
  }
}

/**
 * Check if user is a worker
 * @param uid - User's UID
 * @returns true if worker, false otherwise
 */
export async function isWorker(uid: string): Promise<boolean> {
  try {
    const workerDocRef = doc(db, 'worker_accounts', uid);
    const workerDoc = await getDoc(workerDocRef);
    return workerDoc.exists();
  } catch (error) {
    console.error('Error checking worker status:', error);
    return false;
  }
}




