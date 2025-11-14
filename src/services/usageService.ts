// Usage Service for SitePulse
// Handles material/equipment usage submissions and reviews

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { db, storage, auth } from '../firebaseConfig';
import { sendNotification } from './notificationService';

export interface UsageSubmission {
  id: string;
  projectId: string;
  workerId: string;
  workerName: string;
  type: 'material' | 'equipment' | 'damage';
  itemId: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  notes: string;
  photoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  timestamp: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  taskId?: string;
}

/**
 * Submit usage report with photo evidence
 * @param reportData - Usage report data
 * @returns Promise<UsageSubmission> - Created submission
 */
export async function submitUsageReport(reportData: {
  type: 'material' | 'equipment' | 'damage';
  itemId: string;
  itemName: string;
  quantity?: number;
  unit?: string;
  notes: string;
  localPhotoUri: string | null;
  taskId?: string;
}): Promise<UsageSubmission> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get worker info
    const workerDoc = await getFirestoreDoc('worker_accounts', auth.currentUser.uid);
    const workerData = workerDoc.data();
    const projectId = workerData?.projectId;

    if (!projectId) {
      throw new Error('Worker not assigned to any project');
    }

    // Upload photo to Storage
    let photoUrl = '';
    if (reportData.localPhotoUri) {
      const submissionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storageRef = ref(
        storage,
        `usage_photos/${projectId}/${submissionId}`
      );

      const blob = await uriToBlob(reportData.localPhotoUri);
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg'
      });

      photoUrl = await getDownloadURL(uploadResult.ref);
    }

    // Create submission document
    const submissionsRef = collection(db, 'usage_submissions');
    const submissionDoc = await addDoc(submissionsRef, {
      projectId,
      workerId: auth.currentUser.uid,
      workerName: workerData?.name || 'Unknown Worker',
      type: reportData.type,
      itemId: reportData.itemId,
      itemName: reportData.itemName,
      quantity: reportData.quantity || null,
      unit: reportData.unit || null,
      notes: reportData.notes,
      photoUrl,
      status: 'pending',
      rejectionReason: null,
      timestamp: serverTimestamp(),
      reviewedAt: null,
      reviewerId: null,
      taskId: reportData.taskId || null
    });

    const submission: UsageSubmission = {
      id: submissionDoc.id,
      projectId,
      workerId: auth.currentUser.uid,
      workerName: workerData?.name || 'Unknown Worker',
      type: reportData.type,
      itemId: reportData.itemId,
      itemName: reportData.itemName,
      quantity: reportData.quantity,
      unit: reportData.unit,
      notes: reportData.notes,
      photoUrl,
      status: 'pending',
      timestamp: new Date(),
      taskId: reportData.taskId
    };

    console.log('Usage report submitted:', submissionDoc.id);
    return submission;
  } catch (error) {
    console.error('Error submitting usage report:', error);
    throw new Error('Failed to submit usage report');
  }
}

/**
 * Get usage submissions for a project
 * @param projectId - Project ID
 * @param status - Optional status filter
 * @returns Promise<UsageSubmission[]> - Array of submissions
 */
export async function getUsageSubmissions(
  projectId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<UsageSubmission[]> {
  try {
    const submissionsRef = collection(db, 'usage_submissions');
    let q;

    if (status) {
      q = query(
        submissionsRef,
        where('projectId', '==', projectId),
        where('status', '==', status),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(
        submissionsRef,
        where('projectId', '==', projectId),
        orderBy('timestamp', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const submissions: UsageSubmission[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      submissions.push({
        id: doc.id,
        projectId: data.projectId,
        workerId: data.workerId,
        workerName: data.workerName,
        type: data.type,
        itemId: data.itemId,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes,
        photoUrl: data.photoUrl,
        status: data.status,
        rejectionReason: data.rejectionReason,
        timestamp: data.timestamp?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewerId: data.reviewerId,
        taskId: data.taskId
      });
    });

    return submissions;
  } catch (error) {
    console.error('Error getting usage submissions:', error);
    throw new Error('Failed to fetch usage submissions');
  }
}

/**
 * Get worker's own usage submissions
 * @param workerId - Worker's UID
 * @returns Promise<UsageSubmission[]> - Array of submissions
 */
export async function getWorkerSubmissions(workerId: string): Promise<UsageSubmission[]> {
  try {
    const submissionsRef = collection(db, 'usage_submissions');
    const q = query(
      submissionsRef,
      where('workerId', '==', workerId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const submissions: UsageSubmission[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      submissions.push({
        id: doc.id,
        projectId: data.projectId,
        workerId: data.workerId,
        workerName: data.workerName,
        type: data.type,
        itemId: data.itemId,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes,
        photoUrl: data.photoUrl,
        status: data.status,
        rejectionReason: data.rejectionReason,
        timestamp: data.timestamp?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewerId: data.reviewerId,
        taskId: data.taskId
      });
    });

    return submissions;
  } catch (error) {
    console.error('Error getting worker submissions:', error);
    throw new Error('Failed to fetch worker submissions');
  }
}

/**
 * Approve usage submission (engineer action)
 * @param submissionId - Submission ID
 * @returns Promise<void>
 */
export async function approveUsageSubmission(submissionId: string): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const submissionRef = doc(db, 'usage_submissions', submissionId);
    await updateDoc(submissionRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewerId: auth.currentUser.uid
    });

    console.log('Usage submission approved:', submissionId);
  } catch (error) {
    console.error('Error approving usage submission:', error);
    throw new Error('Failed to approve usage submission');
  }
}

/**
 * Reject usage submission (engineer action)
 * @param submissionId - Submission ID
 * @param reason - Rejection reason
 * @returns Promise<void>
 */
export async function rejectUsageSubmission(
  submissionId: string,
  reason: string
): Promise<void> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const submissionRef = doc(db, 'usage_submissions', submissionId);
    await updateDoc(submissionRef, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: serverTimestamp(),
      reviewerId: auth.currentUser.uid
    });

    console.log('Usage submission rejected:', submissionId);
  } catch (error) {
    console.error('Error rejecting usage submission:', error);
    throw new Error('Failed to reject usage submission');
  }
}

/**
 * Check for duplicate usage submissions (to prevent double reporting)
 * @param taskId - Task ID
 * @param itemId - Item ID
 * @param quantity - Quantity
 * @param workerId - Worker ID
 * @returns Promise<UsageSubmission[]> - Matching submissions
 */
export async function checkDuplicateUsage(
  taskId: string,
  itemId: string,
  quantity: number,
  workerId: string
): Promise<UsageSubmission[]> {
  try {
    const submissionsRef = collection(db, 'usage_submissions');
    const q = query(
      submissionsRef,
      where('taskId', '==', taskId),
      where('itemId', '==', itemId),
      where('quantity', '==', quantity)
    );

    const snapshot = await getDocs(q);
    const duplicates: UsageSubmission[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only flag as duplicate if it's a different worker
      if (data.workerId !== workerId) {
        duplicates.push({
          id: doc.id,
          projectId: data.projectId,
          workerId: data.workerId,
          workerName: data.workerName,
          type: data.type,
          itemId: data.itemId,
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          notes: data.notes,
          photoUrl: data.photoUrl,
          status: data.status,
          timestamp: data.timestamp?.toDate() || new Date(),
          taskId: data.taskId
        });
      }
    });

    return duplicates;
  } catch (error) {
    console.error('Error checking duplicate usage:', error);
    return [];
  }
}

/**
 * Helper: Convert URI to Blob
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Helper: Get Firestore document
 */
async function getFirestoreDoc(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error(`Document not found: ${collectionName}/${docId}`);
  }
  return docSnap;
}

// Import getDoc
import { getDoc } from 'firebase/firestore';






