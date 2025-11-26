// Firebase Storage REST API Upload - React Native Compatible
// Uses direct HTTP uploads instead of Firebase SDK to avoid compatibility issues

import { auth } from '../firebaseConfig';

const STORAGE_BUCKET = 'sitepulse-2d882.firebasestorage.app';
const FIREBASE_API_KEY = 'AIzaSyBnCa0kuR39LMNlJb_toNDlRDhfCXUsMdU';

/**
 * Upload file using Firebase Storage REST API
 * This bypasses the Firebase SDK entirely for React Native compatibility
 */
export async function uploadViaRestAPI(
  storagePath: string,
  fileUri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🔥 Using Firebase REST API upload...');
    console.log('Storage path:', storagePath);
    console.log('File URI:', fileUri);

    // Get auth token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const token = await user.getIdToken();
    console.log('✅ Got auth token');

    // Read file as blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    console.log('✅ Blob ready. Size:', blob.size, 'Type:', blob.type);

    // Encode path for URL (encode each segment separately for proper nesting)
    const pathSegments = storagePath.split('/').map(encodeURIComponent).join('%2F');
    
    // Upload using REST API
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${pathSegments}?uploadType=media`;
    
    console.log('📤 Uploading to:', uploadUrl);
    console.log('📂 Storage path:', storagePath);
    console.log('🔗 Encoded path:', pathSegments);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': blob.size.toString()
      },
      body: blob
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload successful!', uploadData);

    // Get download URL from response
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${pathSegments}?alt=media`;
    
    console.log('✅ Download URL:', downloadUrl);
    return downloadUrl;

  } catch (error: any) {
    console.error('❌ REST API upload failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Upload with XMLHttpRequest for progress tracking
 */
export async function uploadWithProgress(
  storagePath: string,
  fileUri: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log('🔥 Using XMLHttpRequest with progress...');
    
    // Get auth token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const token = await user.getIdToken();
    console.log('✅ Got auth token');

    // Read file
    const response = await fetch(fileUri);
    const blob = await response.blob();
    console.log('✅ Blob ready. Size:', blob.size);

    // Encode path for URL
    const encodedPath = encodeURIComponent(storagePath);
    
    // Upload using REST API (Standard Insert: /o?name=PATH)
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;
    
    console.log('📤 Uploading to:', uploadUrl);
    console.log('📂 Storage path:', storagePath);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          console.log(`Upload progress: ${progress.toFixed(1)}%`);
          if (onProgress) {
            onProgress(progress);
          }
        }
      });

      // Load (success)
      xhr.addEventListener('load', async () => {
        console.log('📥 Response status:', xhr.status);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadData = JSON.parse(xhr.responseText);
            // Construct download URL using the correct bucket
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${uploadData.downloadTokens}`;
            console.log('✅ Upload complete! URL:', downloadUrl);
            resolve(downloadUrl);
          } catch (e) {
            console.error('Response parse error:', e);
            reject(new Error('Failed to process response'));
          }
        } else {
          console.error('❌ Upload failed:', xhr.status, xhr.responseText);
          reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        reject(new Error('Network error during upload'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        console.error('❌ Upload timeout');
        reject(new Error('Upload timeout'));
      });

      // Open and send
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'image/jpeg');
      xhr.timeout = 120000; // 2 minute timeout
      
      console.log('📤 Sending request...');
      xhr.send(blob);
    });

  } catch (error: any) {
    console.error('❌ XHR upload failed:', error);
    throw error;
  }
}

