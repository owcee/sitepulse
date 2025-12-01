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
      return { canSubmit: true };
    }

    // Check if the most recent submission was rejected
    const submissions = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as any[]; // Type assertion for Firestore data
    
    // Sort by upload time, most recent first
    submissions.sort((a, b) => {
      const aTime = a.uploadedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.uploadedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    const latestSubmission = submissions[0];
    
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
    // On error, allow submission (fail open)
    return { canSubmit: true };
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
 * @returns Promise<void>
 */
export async function rejectPhoto(photoId: string, reason: string): Promise<void> {
  try {
    if (!typedAuth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoRef = doc(db, 'task_photos', photoId);
    await updateDoc(photoRef, {
      verificationStatus: 'rejected',
      rejectionReason: reason,
      verifiedAt: serverTimestamp(),
      verifiedBy: typedAuth.currentUser.uid
    });

    console.log('Photo rejected:', photoId);
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













