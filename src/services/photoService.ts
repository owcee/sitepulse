// Photo Service for SitePulse
// Handles task photo uploads to Firebase Storage and metadata in Firestore

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
  uploadBytesResumable,
  getDownloadURL,
  UploadResult
} from 'firebase/storage';
import { Auth } from 'firebase/auth';
import { db, storage, auth } from '../firebaseConfig';
import { uploadFileToStorage } from './storageUploadHelper';
import { uploadWithProgress } from './storageUploadHelperV2';
import { sendNotification } from './notificationService';
import { getProject } from './projectService';

// Type assertion for auth from JS config file
const typedAuth = auth as Auth;

export interface TaskPhoto {
  id: string;
  taskId: string;
  projectId: string;
  uploaderId: string;
  uploaderName: string;
  imageUrl: string;
  cnnClassification?: string;
  confidence?: number;
  cnnPrediction?: {
    status: 'not_started' | 'in_progress' | 'completed';
    confidence: number;
    progressPercent: number;
    taskMatch: boolean;
    predictedTask?: string;
    timestamp: string;
  };
  verificationStatus: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejectionReason?: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

/**
 * Upload a task photo to Firebase Storage and create Firestore metadata
 * @param taskId - Task ID
 * @param imageUri - Local image URI or blob
 * @param metadata - Photo metadata (classification, notes, etc.)
 * @returns Promise<TaskPhoto> - Created photo document
 */
export async function uploadTaskPhoto(
  taskId: string,
  imageUri: string,
  metadata: {
    projectId: string;
    uploaderName: string;
    uploaderId?: string;
    cnnClassification?: { classification: string; confidence: number } | null;
    cnnPrediction?: {
      status: 'not_started' | 'in_progress' | 'completed';
      confidence: number;
      progressPercent: number;
      taskMatch: boolean;
      predictedTask?: string;
      timestamp: string;
    } | null;
    notes?: string;
  }
): Promise<TaskPhoto> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Generate unique photo ID
    const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Storage reference
    const storageRef = ref(
      storage,
      `task_photos/${metadata.projectId}/${taskId}/${photoId}`
    );

    // Upload to Firebase Storage using REST API (bypasses SDK issues)
    const storagePath = `task_photos/${metadata.projectId}/${taskId}/${photoId}`;
    console.log('🚀 Uploading task photo (REST API method)...');
    
    const downloadURL = await uploadWithProgress(
      storagePath,
      imageUri,
      (progress) => {
        console.log(`Task photo upload: ${progress.toFixed(1)}%`);
      }
    );
    
    console.log('✅ Task photo uploaded successfully!');

    // Create Firestore metadata document
    const taskPhotosRef = collection(db, 'task_photos');
    const photoDoc = await addDoc(taskPhotosRef, {
      taskId,
      projectId: metadata.projectId,
      uploaderId: metadata.uploaderId || typedAuth.currentUser.uid,
      uploaderName: metadata.uploaderName,
      imageUrl: downloadURL,
      storagePath, // Use the path string directly
      cnnClassification: metadata.cnnClassification?.classification || null,
      confidence: metadata.cnnClassification?.confidence || null,
      cnnPrediction: metadata.cnnPrediction || null,
      verificationStatus: 'pending',
      notes: metadata.notes || null,
      uploadedAt: serverTimestamp(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    });

    const createdPhoto: TaskPhoto = {
      id: photoDoc.id,
      taskId,
      projectId: metadata.projectId,
      uploaderId: metadata.uploaderId || typedAuth.currentUser.uid,
      uploaderName: metadata.uploaderName,
      imageUrl: downloadURL,
      cnnClassification: metadata.cnnClassification?.classification,
      confidence: metadata.cnnClassification?.confidence,
      cnnPrediction: metadata.cnnPrediction || undefined,
      verificationStatus: 'pending',
      notes: metadata.notes,
      uploadedAt: new Date()
    };

    console.log('Task photo uploaded successfully:', photoDoc.id);

    // Send notification to engineer
    try {
      const project = await getProject(metadata.projectId);
      if (project && project.engineerId) {
        await sendNotification(project.engineerId, {
          title: 'New Task Photo',
          body: `${metadata.uploaderName} uploaded a photo for a task`,
          type: 'task_approval',
          relatedId: photoDoc.id,
          projectId: metadata.projectId,
          status: 'info'
        });
        console.log('Notification sent to engineer');
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the whole operation if notification fails
    }

    return createdPhoto;
  } catch (error: any) {
    console.error('❌ Error uploading task photo:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      serverResponse: error.serverResponse,
      customData: error.customData
    });
    throw new Error(`Failed to upload task photo: ${error.message || error.code || 'Unknown error'}`);
  }
}

/**
 * Check if worker has already submitted a photo for this task today
 * @param taskId - Task ID
 * @param workerId - Worker ID
 * @returns Promise<{canSubmit: boolean, reason?: string}> - Whether worker can submit
 */
export async function canWorkerSubmitToday(taskId: string, workerId: string): Promise<{canSubmit: boolean, reason?: string}> {
  try {
    const photosRef = collection(db, 'task_photos');
    
    // Get today's start timestamp
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Simpler query: just get photos for this task by this worker
    // Filter by date in JavaScript to avoid index requirement
    const q = query(
      photosRef,
      where('taskId', '==', taskId),
      where('uploaderId', '==', workerId)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { canSubmit: true };
    }

    // Filter to today's submissions in JavaScript
    const todaySubmissions = snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      }))
      .filter((sub: any) => {
        const uploadedAt = sub.uploadedAt?.toDate?.() || new Date(0);
        return uploadedAt >= todayStart;
      }) as any[];
    
    if (todaySubmissions.length === 0) {
      return { canSubmit: true };
    }
    
    // Sort by upload time, most recent first
    todaySubmissions.sort((a, b) => {
      const aTime = a.uploadedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.uploadedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    const latestSubmission = todaySubmissions[0];
    
    // If the latest submission was rejected, allow resubmission
    if (latestSubmission.verificationStatus === 'rejected') {
      return { canSubmit: true };
    }
    
    // If pending or approved, don't allow another submission today
    return { 
      canSubmit: false, 
      reason: latestSubmission.verificationStatus === 'pending' 
        ? 'You have already submitted a photo for this task today. Please wait for engineer review.'
        : 'You have already submitted an approved photo for this task today.'
    };
    
  } catch (error) {
    console.error('Error checking submission eligibility:', error);
    // On error, DON'T allow submission (fail closed for safety)
    return { canSubmit: false, reason: 'Unable to verify submission status. Please try again.' };
  }
}

/**
 * Get worker's submission status for today for a specific task
 * Used for displaying badges on task list
 * @param taskId - Task ID
 * @param workerId - Worker ID
 * @returns Promise<{submittedToday: boolean, status?: string}> - Submission status
 */
export async function getWorkerTodaySubmissionStatus(
  taskId: string, 
  workerId: string
): Promise<{submittedToday: boolean, status?: 'pending' | 'approved' | 'rejected'}> {
  try {
    const photosRef = collection(db, 'task_photos');
    
    // Get today's start and end timestamps
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const q = query(
      photosRef,
      where('taskId', '==', taskId),
      where('uploaderId', '==', workerId),
      where('uploadedAt', '>=', todayStart),
      where('uploadedAt', '<=', todayEnd)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { submittedToday: false };
    }

    // Get the most recent submission status
    const submissions = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as any[];
    
    // Sort by upload time, most recent first
    submissions.sort((a, b) => {
      const aTime = a.uploadedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.uploadedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    const latestSubmission = submissions[0];
    
    return { 
      submittedToday: true, 
      status: latestSubmission.verificationStatus 
    };
    
  } catch (error) {
    console.error('Error checking today submission status:', error);
    return { submittedToday: false };
  }
}

/**
 * Get submission status for multiple tasks at once (batch)
 * @param taskIds - Array of task IDs
 * @param workerId - Worker ID
 * @returns Promise<Map<string, {submittedToday: boolean, status?: string}>>
 */
export async function getBatchSubmissionStatus(
  taskIds: string[], 
  workerId: string
): Promise<Map<string, {submittedToday: boolean, status?: 'pending' | 'approved' | 'rejected'}>> {
  const results = new Map<string, {submittedToday: boolean, status?: 'pending' | 'approved' | 'rejected'}>();
  
  // Initialize all tasks as not submitted
  taskIds.forEach(id => results.set(id, { submittedToday: false }));
  
  if (taskIds.length === 0) return results;
  
  try {
    const photosRef = collection(db, 'task_photos');
    
    // Get today's start timestamp
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Simpler query: just get all photos by this worker
    // Filter by date in JavaScript to avoid index requirement
    const q = query(
      photosRef,
      where('uploaderId', '==', workerId)
    );

    const snapshot = await getDocs(q);
    
    // Group by taskId and find latest for each (only today's submissions)
    const taskSubmissions = new Map<string, any[]>();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const uploadedAt = data.uploadedAt?.toDate?.() || new Date(0);
      
      // Only include today's submissions for tasks we care about
      if (taskIds.includes(data.taskId) && uploadedAt >= todayStart) {
        if (!taskSubmissions.has(data.taskId)) {
          taskSubmissions.set(data.taskId, []);
        }
        taskSubmissions.get(data.taskId)!.push({
          ...data,
          uploadedAt: uploadedAt
        });
      }
    });
    
    // For each task, get the latest submission status
    taskSubmissions.forEach((submissions, taskId) => {
      submissions.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      const latest = submissions[0];
      results.set(taskId, {
        submittedToday: true,
        status: latest.verificationStatus
      });
    });
    
    return results;
    
  } catch (error) {
    console.error('Error getting batch submission status:', error);
    return results;
  }
}

/**
 * Get all photos for a task
 * @param taskId - Task ID
 * @returns Promise<TaskPhoto[]> - Array of task photos
 */
export async function getTaskPhotos(taskId: string): Promise<TaskPhoto[]> {
  try {
    const photosRef = collection(db, 'task_photos');
    const q = query(
      photosRef,
      where('taskId', '==', taskId),
      orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const photos: TaskPhoto[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      photos.push({
        id: doc.id,
        taskId: data.taskId,
        projectId: data.projectId,
        uploaderId: data.uploaderId,
        uploaderName: data.uploaderName,
        imageUrl: data.imageUrl,
        cnnClassification: data.cnnClassification,
        confidence: data.confidence,
        cnnPrediction: data.cnnPrediction,
        verificationStatus: data.verificationStatus,
        notes: data.notes,
        rejectionReason: data.rejectionReason,
        uploadedAt: data.uploadedAt?.toDate() || new Date(),
        verifiedAt: data.verifiedAt?.toDate(),
        verifiedBy: data.verifiedBy
      });
    });

    return photos;
  } catch (error) {
    console.error('Error getting task photos:', error);
    throw new Error('Failed to fetch task photos');
  }
}

/**
 * Get pending photos for engineer review (across all tasks in a project)
 * @param projectId - Project ID
 * @returns Promise<TaskPhoto[]> - Array of pending photos
 */
export async function getPendingPhotos(projectId: string): Promise<TaskPhoto[]> {
  try {
    const photosRef = collection(db, 'task_photos');
    const q = query(
      photosRef,
      where('projectId', '==', projectId),
      where('verificationStatus', '==', 'pending'),
      orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const photos: TaskPhoto[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      photos.push({
        id: doc.id,
        taskId: data.taskId,
        projectId: data.projectId,
        uploaderId: data.uploaderId,
        uploaderName: data.uploaderName,
        imageUrl: data.imageUrl,
        cnnClassification: data.cnnClassification,
        confidence: data.confidence,
        cnnPrediction: data.cnnPrediction,
        verificationStatus: data.verificationStatus,
        notes: data.notes,
        uploadedAt: data.uploadedAt?.toDate() || new Date()
      });
    });

    return photos;
  } catch (error) {
    console.error('Error getting pending photos:', error);
    throw new Error('Failed to fetch pending photos');
  }
}

/**
 * Approve a task photo (engineer action)
 * @param photoId - Photo ID
 * @returns Promise<void>
 */
export async function approvePhoto(photoId: string): Promise<void> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoRef = doc(db, 'task_photos', photoId);
    await updateDoc(photoRef, {
      verificationStatus: 'approved',
      verifiedAt: serverTimestamp(),
      verifiedBy: typedAuth.currentUser.uid
    });

    console.log('Photo approved:', photoId);
  } catch (error) {
    console.error('Error approving photo:', error);
    throw new Error('Failed to approve photo');
  }
}

/**
 * Reject a task photo (engineer action)
 * @param photoId - Photo ID
 * @param reason - Rejection reason
 * @param taskTitle - Optional task title for notification
 * @returns Promise<void>
 */
export async function rejectPhoto(photoId: string, reason: string, taskTitle?: string): Promise<void> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoRef = doc(db, 'task_photos', photoId);
    
    // Get the photo data first to get the uploader ID
    const photoSnap = await getDoc(photoRef);
    const photoData = photoSnap.data();
    
    await updateDoc(photoRef, {
      verificationStatus: 'rejected',
      rejectionReason: reason,
      verifiedAt: serverTimestamp(),
      verifiedBy: typedAuth.currentUser.uid
    });

    console.log('Photo rejected:', photoId);
    
    // Send notification to the worker
    if (photoData?.uploaderId) {
      try {
        await sendNotification(photoData.uploaderId, {
          title: 'Photo Rejected',
          body: `Your photo for "${taskTitle || 'a task'}" was rejected. Reason: ${reason}. Please upload a new photo.`,
          type: 'task_rejected',
          relatedId: photoId,
          projectId: photoData.projectId,
          status: 'warning'
        });
        console.log('Rejection notification sent to worker:', photoData.uploaderId);
      } catch (notifError) {
        console.error('Failed to send rejection notification:', notifError);
        // Don't fail the whole operation if notification fails
      }
    }
  } catch (error) {
    console.error('Error rejecting photo:', error);
    throw new Error('Failed to reject photo');
  }
}

/**
 * Helper function to convert URI to Blob for upload (React Native compatible)
 * @param uri - Image URI
 * @returns Promise<Blob>
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
 * Upload with progress tracking
 * @param taskId - Task ID
 * @param imageUri - Local image URI
 * @param metadata - Photo metadata
 * @param onProgress - Progress callback (0-100)
 * @returns Promise<TaskPhoto>
 */
export async function uploadTaskPhotoWithProgress(
  taskId: string,
  imageUri: string,
  metadata: {
    projectId: string;
    uploaderName: string;
    uploaderId?: string;
    cnnClassification?: { classification: string; confidence: number } | null;
    cnnPrediction?: {
      status: 'not_started' | 'in_progress' | 'completed';
      confidence: number;
      progressPercent: number;
      taskMatch: boolean;
      predictedTask?: string;
      timestamp: string;
    } | null;
    notes?: string;
  },
  onProgress?: (progress: number) => void
): Promise<TaskPhoto> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const storageRef = ref(
      storage,
      `task_photos/${metadata.projectId}/${taskId}/${photoId}`
    );

    const blob = await uriToBlob(imageUri);

    // Create upload task for progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(new Error('Failed to upload photo'));
        },
        async () => {
          // Upload complete, get download URL and create Firestore doc
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const taskPhotosRef = collection(db, 'task_photos');
          const photoDoc = await addDoc(taskPhotosRef, {
            taskId,
            projectId: metadata.projectId,
            uploaderId: typedAuth.currentUser!.uid,
            uploaderName: metadata.uploaderName,
            imageUrl: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
            cnnClassification: metadata.cnnClassification?.classification || null,
            confidence: metadata.cnnClassification?.confidence || null,
            cnnPrediction: metadata.cnnPrediction || null,
            verificationStatus: 'pending',
            notes: metadata.notes || null,
            uploadedAt: serverTimestamp(),
            verifiedAt: null,
            verifiedBy: null,
            rejectionReason: null
          });

          resolve({
            id: photoDoc.id,
            taskId,
            projectId: metadata.projectId,
            uploaderId: metadata.uploaderId || typedAuth.currentUser!.uid,
            uploaderName: metadata.uploaderName,
            imageUrl: downloadURL,
            cnnClassification: metadata.cnnClassification?.classification,
            confidence: metadata.cnnClassification?.confidence,
            cnnPrediction: metadata.cnnPrediction || undefined,
            verificationStatus: 'pending',
            notes: metadata.notes,
            uploadedAt: new Date()
          });
        }
      );
    });
  } catch (error) {
    console.error('Error uploading photo with progress:', error);
    throw new Error('Failed to upload photo');
  }
}













