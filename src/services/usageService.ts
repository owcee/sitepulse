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
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import { Auth } from 'firebase/auth';
// @ts-expect-error - auth is imported from JS config file
import { db, storage, auth } from '../firebaseConfig';
import { sendNotification } from './notificationService';
import { uploadFileToStorage } from './storageUploadHelper';
import { uploadWithProgress } from './storageUploadHelperV2';
import { getProject } from './projectService';

// Type assertion for auth from JS config file
// @ts-expect-error - Casting auth from JS import
const typedAuth = auth as Auth;

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
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get worker info
    const workerDoc = await getFirestoreDoc('worker_accounts', typedAuth.currentUser.uid);
    const workerData = workerDoc.data();
    const projectId = workerData?.projectId;

    if (!projectId) {
      throw new Error('Worker not assigned to any project');
    }

    // Upload photo to Storage using REST API (bypasses SDK issues)
    let photoUrl = '';
    if (reportData.localPhotoUri) {
      const submissionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const storagePath = `usage_photos/${projectId}/${submissionId}`;
      
      console.log('🚀 Uploading usage photo (REST API method)...');
      
      // Use REST API upload
      photoUrl = await uploadWithProgress(
        storagePath,
        reportData.localPhotoUri,
        (progress) => {
          console.log(`Usage photo upload: ${progress.toFixed(1)}%`);
        }
      );
      
      console.log('✅ Photo uploaded! URL:', photoUrl);
    }

    // Create submission document
    const submissionsRef = collection(db, 'usage_submissions');
    const submissionDoc = await addDoc(submissionsRef, {
      projectId,
      workerId: typedAuth.currentUser.uid,
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
      workerId: typedAuth.currentUser.uid,
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

    console.log('✅ Usage report submitted:', submissionDoc.id);

    // Send notification to engineer
    try {
      const project = await getProject(projectId);
      if (project && project.engineerId) {
        await sendNotification(project.engineerId, {
          title: `New ${reportData.type === 'damage' ? 'Damage Report' : 'Usage Submission'}`,
          body: `${workerData?.name || 'A worker'} submitted a ${reportData.type} report`,
          type: 'usage_approved', // Using existing type, logic will handle it as 'pending'
          relatedId: submissionDoc.id,
          projectId: projectId,
          status: reportData.type === 'damage' ? 'rejected' : 'info' // Use 'rejected' status color for damage reports (urgent)
        });
        console.log('Notification sent to engineer');
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }

    return submission;
  } catch (error: any) {
    console.error('❌ Error submitting usage report:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      serverResponse: error.serverResponse
    });
    throw new Error(`Failed to submit usage report: ${error.message || error.code || 'Unknown error'}`);
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
 * Updates inventory counts and equipment status upon approval
 * @param submissionId - Submission ID
 * @returns Promise<void>
 */
export async function approveUsageSubmission(submissionId: string): Promise<void> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const submissionRef = doc(db, 'usage_submissions', submissionId);
    const submissionSnap = await getDoc(submissionRef);
    
    if (!submissionSnap.exists()) {
      throw new Error('Submission not found');
    }

    const submission = submissionSnap.data() as UsageSubmission;

    // Update inventory or equipment status based on type
    if (submission.type === 'equipment') {
      // Update equipment status to 'in_use'
      const equipmentRef = doc(db, 'equipment', submission.itemId);
      await updateDoc(equipmentRef, {
        status: 'in_use',
        lastUsedBy: submission.workerId,
        lastUsedAt: serverTimestamp()
      });
      console.log(`Equipment ${submission.itemId} marked as in_use`);
    } else if (submission.type === 'material') {
      // Update material quantity
      const materialRef = doc(db, 'materials', submission.itemId);
      const materialSnap = await getDoc(materialRef);
      
      if (materialSnap.exists()) {
        const materialData = materialSnap.data();
        const currentQuantity = materialData.quantity || 0;
        const usedQuantity = submission.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - usedQuantity);
        
        await updateDoc(materialRef, {
          quantity: newQuantity,
          lastUpdated: serverTimestamp()
        });
        console.log(`Material ${submission.itemId} quantity updated to ${newQuantity}`);

        // Check for low stock (threshold: 10 units or 20% of previous if we tracked it, default 10)
        const LOW_STOCK_THRESHOLD = 10;
        if (newQuantity <= LOW_STOCK_THRESHOLD) {
          // Send low stock alert to engineer
          const project = await getProject(submission.projectId);
          if (project && project.engineerId) {
            await sendNotification(project.engineerId, {
              title: 'Low Stock Alert',
              body: `Stock for ${materialData.name} is low (${newQuantity} ${materialData.unit || 'units'} remaining).`,
              type: 'low_stock',
              relatedId: submission.itemId,
              projectId: submission.projectId,
              status: 'warning'
            });
            console.log('Low stock alert sent');
          }
        }
      }
    }

    // Update submission status
    await updateDoc(submissionRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewerId: typedAuth.currentUser.uid
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
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const submissionRef = doc(db, 'usage_submissions', submissionId);
    await updateDoc(submissionRef, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: serverTimestamp(),
      reviewerId: typedAuth.currentUser.uid
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
 * Helper: Convert URI to Blob (React Native compatible)
 */
async function uriToBlob(uri: string): Promise<Blob> {
  try {
    console.log('Converting URI to Blob:', uri);
    
    // React Native specific: Create blob from file URI
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Ensure blob has proper type for JPEG
    if (!blob.type || blob.type === '' || blob.type === 'application/octet-stream') {
      // Create a new blob with explicit MIME type
      const typedBlob = new Blob([blob], { type: 'image/jpeg' });
      console.log('Blob created with explicit type. Size:', typedBlob.size, 'Type:', typedBlob.type);
      return typedBlob;
    }
    
    console.log('Blob created successfully. Size:', blob.size, 'Type:', blob.type);
    return blob;
  } catch (error) {
    console.error('Error converting URI to Blob:', error);
    throw new Error(`Failed to process image: ${error}`);
  }
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













