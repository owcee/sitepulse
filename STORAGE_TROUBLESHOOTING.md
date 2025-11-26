# Firebase Storage Upload Troubleshooting

## Issue
Getting `storage/unknown` error when uploading photos, even though:
- Blob is created successfully (1.5MB, image/jpeg)
- User is authenticated
- Storage rules are deployed
- Server response is undefined

## Firebase Project Info
- Project ID: `sitepulse-2d882`
- Storage Bucket: `sitepulse-2d882.appspot.com`
- Auth working correctly
- Firestore working correctly

## Fixes Applied

### 1. Explicit Storage Bucket Initialization
```javascript
const storage = getStorage(app, 'gs://sitepulse-2d882.appspot.com');
```

### 2. Blob Type Forcing
Ensured all blobs have explicit `image/jpeg` MIME type

### 3. Minimal Metadata Upload
Try uploading without custom metadata first, then retry with metadata if it fails

### 4. Enhanced Logging
Log full storage path, bucket name, and detailed error info

## Next Steps if Still Failing

### Check Firebase Console

1. **Enable Storage**:
   - Go to: https://console.firebase.google.com/project/sitepulse-2d882/storage
   - Click "Get Started" if storage is not enabled
   - Choose production mode or test mode for now

2. **Check Storage Location**:
   - Verify bucket exists: `sitepulse-2d882.appspot.com`
   - Ensure location is set (usually us-central1)

3. **Verify API is Enabled**:
   - Go to Google Cloud Console
   - Navigate to APIs & Services
   - Ensure "Cloud Storage API" is enabled

4. **Check Billing**:
   - Firebase Spark plan (free tier) has storage limits
   - May need to upgrade to Blaze (pay-as-you-go)

### Manual Fix Commands

```bash
# Check storage status
npx firebase deploy --only storage

# Reinitialize storage
firebase init storage

# Check current config
firebase functions:config:get
```

### Alternative Upload Method

If standard upload continues to fail, try using `uploadString` with base64:

```typescript
import { uploadString } from 'firebase/storage';

// Convert blob to base64
const reader = new FileReader();
reader.readAsDataURL(blob);
reader.onloadend = async () => {
  const base64data = reader.result;
  await uploadString(storageRef, base64data, 'data_url');
};
```

## Testing

Run the app and check console for:
```
Storage bucket: sitepulse-2d882.appspot.com
Storage ref full path: usage_photos/PROJECT_ID/SUBMISSION_ID
```

If these show correctly but upload still fails, the issue is likely:
- Storage not enabled in Firebase Console
- Billing/quota issue
- API not enabled in Google Cloud

