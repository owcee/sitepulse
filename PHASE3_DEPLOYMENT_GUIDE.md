# 🚀 Phase 3 Deployment Guide

**Quick reference for deploying Firebase Phase 3 changes**

---

## Prerequisites

✅ Firebase CLI installed (`npm install -g firebase-tools`)  
✅ Logged in (`firebase login`)  
✅ Project selected (`firebase use sitepulse-2d882`)  
✅ Service account key downloaded (for migration script)

---

## Step-by-Step Deployment

### 1. Install Cloud Functions Dependencies

```bash
cd functions
npm install
cd ..
```

**Expected output:** `firebase-admin@^11.11.0`, `firebase-functions@^4.5.0` installed

---

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**What this does:**
- Updates multi-project access rules
- Adds `isEngineerForProject()` helper
- Validates against live database

**Verification:** Go to Firebase Console → Firestore → Rules tab

---

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

**Functions deployed:**
- `onProjectDelete` – cascading soft-delete
- `onNotificationCreate` – FCM push notifications

**Expected output:**
```
✔  functions[onProjectDelete(us-central1)] Successful update operation.
✔  functions[onNotificationCreate(us-central1)] Successful update operation.
```

**First-time deployment:** Will prompt for billing account (Blaze plan required for Cloud Functions).

---

### 4. Run Data Migration (Engineer Accounts)

**Download service account:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` in project root
4. **DO NOT commit to Git** (already in `.gitignore`)

**Dry run:**
```bash
node scripts/migrateActiveProjects.js --dry-run
```

**Review output**, then **execute:**
```bash
node scripts/migrateActiveProjects.js --execute
```

**What this does:**
- Adds `activeProjectIds` array to each engineer
- Sets `currentProjectId` to existing `projectId`
- Keeps old `projectId` for backward compatibility

**Verification:** Check Firestore Console → `engineer_accounts` → any document

---

### 5. Deploy Client App

**Web:**
```bash
npm run build
firebase deploy --only hosting
```

**Mobile (Expo):**
```bash
expo build:android  # or build:ios
# Then upload to Play Store / App Store
```

---

### 6. Verification Tests

#### Test 1: Photo Upload
1. Login as worker
2. Upload a task photo
3. Check Firebase Storage → `task_photos/` folder

✅ **Pass:** Photo appears in Storage console

#### Test 2: Multi-Project
1. Login as engineer
2. Create Project A
3. Check Firestore → `engineer_accounts/{uid}` → `activeProjectIds: ["A"]`
4. Create Project B
5. Verify `activeProjectIds: ["A", "B"]`

✅ **Pass:** Array updates correctly

#### Test 3: Cascade Delete
1. Create test project with materials, workers
2. Delete project
3. Check Cloud Function logs: `firebase functions:log --only onProjectDelete`
4. Check Firestore → materials/equipment docs have `deleted: true`

✅ **Pass:** Function executed, docs soft-deleted

#### Test 4: FCM Push (optional, requires token setup)
1. Register FCM token via `saveFCMToken()`
2. Create a notification via app
3. Check device for push notification

✅ **Pass:** Notification received

---

### 7. Monitor Cloud Functions

**View logs:**
```bash
firebase functions:log
```

**Filter by function:**
```bash
firebase functions:log --only onProjectDelete
firebase functions:log --only onNotificationCreate
```

**Set up alerts:**
Firebase Console → Functions → Metrics → Set up error alerts

---

## Rollback (If Needed)

### Revert Firestore Rules
```bash
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules
```

### Disable Functions
```bash
firebase functions:delete onProjectDelete
firebase functions:delete onNotificationCreate
```

### Revert Client Code
```bash
git revert <commit-hash>
git push
# Redeploy client
```

---

## Common Issues

### Issue: "Permission denied" on storage upload

**Cause:** Storage bucket mismatch  
**Fix:** Verify `firebaseConfig.js` has `storageBucket: "sitepulse-2d882.appspot.com"`

---

### Issue: Cloud Function "Cold Start" slow (5-10s)

**Cause:** Normal for first invocation  
**Fix:** Consider Firebase Functions v2 with min instances (Phase 4)

---

### Issue: Migration script fails "Service account not found"

**Cause:** Missing `firebase-service-account.json`  
**Fix:** Download from Firebase Console → Project Settings → Service Accounts

---

### Issue: Firestore rules error "Property activeProjectIds is undefined"

**Cause:** Migration not run yet  
**Fix:** Run `node scripts/migrateActiveProjects.js --execute`

---

## Post-Deployment Checklist

- [ ] Firestore rules deployed
- [ ] Cloud Functions deployed (2 functions)
- [ ] Data migration executed
- [ ] Client app updated (web/mobile)
- [ ] Photo upload tested
- [ ] Multi-project tested
- [ ] Cloud Function logs checked
- [ ] Team notified of changes

---

## Next Steps (Phase 4)

- Add project switcher UI
- Implement real-time listeners
- Add trash/recovery screens
- Enable App Check
- Analytics dashboard

---

**Need Help?** Check `FIREBASE_PHASE3_COMPLETE.md` for detailed documentation.

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Status:** _____________

