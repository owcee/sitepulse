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
import { db, storage, auth } from '../firebaseConfig';

export interface TaskPhoto {
  id: string;
  taskId: string;
  projectId: string;
  uploaderId: string;
  uploaderName: string;
  imageUrl: string;
  cnnClassification?: string;
  confidence?: number;
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
    cnnClassification?: { classification: string; confidence: number } | null;
    notes?: string;
  }
): Promise<TaskPhoto> {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Generate unique photo ID
    const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create Storage reference
    const storageRef = ref(
      storage,
      `task_photos/${metadata.projectId}/${taskId}/${photoId}`
    );

    // Convert URI to blob for upload
    const blob = await uriToBlob(imageUri);

    // Upload to Firebase Storage
    const uploadResult = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Create Firestore metadata document
    const taskPhotosRef = collection(db, 'task_photos');
    const photoDoc = await addDoc(taskPhotosRef, {
      taskId,
      projectId: metadata.projectId,
      uploaderId: auth.currentUser.uid,
      uploaderName: metadata.uploaderName,
      imageUrl: downloadURL,
      storagePath: uploadResult.ref.fullPath,
      cnnClassification: metadata.cnnClassification?.classification || null,
      confidence: metadata.cnnClassification?.confidence || null,
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
      uploaderId: auth.currentUser.uid,
      uploaderName: metadata.uploaderName,
      imageUrl: downloadURL,
      cnnClassification: metadata.cnnClassification?.classification,
      confidence: metadata.cnnClassification?.confidence,
      verificationStatus: 'pending',
      notes: metadata.notes,
      uploadedAt: new Date()
    };

    console.log('Task photo uploaded successfully:', photoDoc.id);
    return createdPhoto;
  } catch (error) {
    console.error('Error uploading task photo:', error);
    throw new Error('Failed to upload task photo');
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
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoRef = doc(db, 'task_photos', photoId);
    await updateDoc(photoRef, {
      verificationStatus: 'approved',
      verifiedAt: serverTimestamp(),
      verifiedBy: auth.currentUser.uid
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
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const photoRef = doc(db, 'task_photos', photoId);
    await updateDoc(photoRef, {
      verificationStatus: 'rejected',
      rejectionReason: reason,
      verifiedAt: serverTimestamp(),
      verifiedBy: auth.currentUser.uid
    });

    console.log('Photo rejected:', photoId);
  } catch (error) {
    console.error('Error rejecting photo:', error);
    throw new Error('Failed to reject photo');
  }
}

/**
 * Helper function to convert URI to Blob for upload
 * @param uri - Image URI
 * @returns Promise<Blob>
 */
async function uriToBlob(uri: string): Promise<Blob> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error converting URI to Blob:', error);
    throw new Error('Failed to process image');
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
    cnnClassification?: { classification: string; confidence: number } | null;
    notes?: string;
  },
  onProgress?: (progress: number) => void
): Promise<TaskPhoto> {
  try {
    if (!auth.currentUser) {
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
            uploaderId: auth.currentUser!.uid,
            uploaderName: metadata.uploaderName,
            imageUrl: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
            cnnClassification: metadata.cnnClassification?.classification || null,
            confidence: metadata.cnnClassification?.confidence || null,
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
            uploaderId: auth.currentUser!.uid,
            uploaderName: metadata.uploaderName,
            imageUrl: downloadURL,
            cnnClassification: metadata.cnnClassification?.classification,
            confidence: metadata.cnnClassification?.confidence,
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












