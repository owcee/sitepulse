// React Native compatible Firebase Storage upload helper
// Fixes the storage/unknown error caused by incompatible Blob implementation

import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import * as FileSystem from 'expo-file-system';

/**
 * Upload file to Firebase Storage using React Native compatible method
 * This fixes the storage/unknown error by using XMLHttpRequest instead of fetch
 */
export async function uploadFileToStorage(
  storagePath: string,
  fileUri: string,
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  },
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('📤 Starting React Native compatible upload...');
    console.log('Storage path:', storagePath);
    console.log('File URI:', fileUri);

    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Read file as blob using XMLHttpRequest (React Native compatible)
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function(e) {
        console.error('XMLHttpRequest error:', e);
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', fileUri, true);
      xhr.send(null);
    });

    console.log('✅ Blob created via XMLHttpRequest. Size:', blob.size, 'Type:', blob.type);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: metadata?.contentType || 'image/jpeg',
      customMetadata: metadata?.customMetadata
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(1)}%`);
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('❌ Upload error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          reject(error);
        },
        async () => {
          // Upload complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ Upload successful! Download URL:', downloadURL);
          resolve(downloadURL);
        }
      );
    });
  } catch (error: any) {
    console.error('❌ Upload failed:', error);
    throw new Error(`Upload failed: ${error.message || error.code || 'Unknown error'}`);
  }
}

/**
 * Alternative method using expo-file-system base64 upload
 */
export async function uploadFileAsBase64(
  storagePath: string,
  fileUri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('📤 Uploading as base64...');
    
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    console.log('✅ Base64 blob created. Size:', blob.size);

    // Upload
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        reject,
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error: any) {
    console.error('❌ Base64 upload failed:', error);
    throw error;
  }
}

