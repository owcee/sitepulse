# SitePulse Setup Checklist ✅

Use this checklist to verify your Firebase setup is complete and correct.

---

## 🔧 Firebase Configuration

- [ ] `src/firebaseConfig.js` has correct Firebase config (apiKey, projectId, etc.)
- [ ] No `experimentalForceLongPolling` setting (removed)
- [ ] No `useFetchStreams: false` setting (removed)
- [ ] Connectivity check is present and runs on startup

---

## 👥 Firebase Authentication

- [ ] Engineer account exists: `engineer@sitepulse.com`
- [ ] Worker account exists: `worker@gmail.com` (or your email)
- [ ] Both accounts have UIDs copied for Firestore setup

---

## 🗄️ Firestore Database

### Engineer Accounts Collection

- [ ] Collection `engineer accounts` exists in Firestore
- [ ] Engineer user document exists:
  - [ ] Document ID matches Firebase Auth UID
  - [ ] Has field: `uid` (string)
  - [ ] Has field: `email` (string)
  - [ ] Has field: `name` (string)
  - [ ] Has field: `role` = `"engineer"` (exactly)
  - [ ] Has field: `projectId` = `null`
  - [ ] Has field: `profileImage` = `null`
  - [ ] Has field: `createdAt` (string)
  - [ ] Has field: `updatedAt` (string)

### Worker Accounts Collection

- [ ] Collection `worker accounts` exists in Firestore
- [ ] Worker user document exists:
  - [ ] Document ID matches Firebase Auth UID  
  - [ ] Has field: `uid` (string)
  - [ ] Has field: `email` (string)
  - [ ] Has field: `name` (string)
  - [ ] Has field: `role` = `"worker"` (exactly)
  - [ ] Has field: `projectId` = `null`
  - [ ] Has field: `profileImage` = `null`
  - [ ] Has field: `createdAt` (string)
  - [ ] Has field: `updatedAt` (string)

---

## 🔒 Security Rules

- [ ] File `firestore.rules` exists in project root
- [ ] Firebase CLI is installed (`firebase --version` works)
- [ ] Logged into Firebase CLI (`firebase login`)
- [ ] Firebase project initialized (`firebase init firestore`)
- [ ] Security rules deployed (`firebase deploy --only firestore:rules`)

---

## 🧪 Testing

### Console Logs
- [ ] App starts without errors
- [ ] Console shows: `"🔥 Firebase Config Loaded"`
- [ ] Console shows: `"✅ Firebase App Initialized"`
- [ ] Console shows: `"✅ Firestore Initialized"`
- [ ] Console shows: `"🔍 Testing Firestore connectivity..."`
- [ ] Console shows: `"✅ Firestore is ONLINE and reachable"`
- [ ] **NO "Firebase offline" warnings**

### Engineer Login Test
- [ ] Can log in with engineer credentials
- [ ] Header shows: "Engineer • [Name]"
- [ ] Bottom navigation shows 5 tabs: Tools, Reports, Delays, Resources, Chat
- [ ] All screens load without errors

### Worker Login Test  
- [ ] Can log in with worker credentials
- [ ] Header shows: "Worker • [Name]" or "Unassigned • [Name]"
- [ ] Bottom navigation shows 5 tabs: Tasks, Inventory, Chat, Notifications, Settings
- [ ] All screens load without errors

---

## 🎯 Verification Commands

Run these to verify your setup:

```bash
# Check Firebase CLI is installed
firebase --version

# Check you're logged in
firebase projects:list

# Check current project
firebase use

# View deployed rules
firebase firestore:rules

# Test connectivity (start the app and check console)
npm start
```

---

## 📸 What You Should See

### Firebase Console - Authentication
```
Users:
├── engineer@sitepulse.com (UID: abc123...)
└── worker@gmail.com (UID: 9GIhW6MNF...)
```

### Firebase Console - Firestore
```
Firestore Database:
├── engineer accounts/
│   └── dfw94SXdyr.../      (Engineer document)
│       ├── uid: "dfw94SXdyr..."
│       ├── email: "engineer@gmail.com"
│       ├── name: "john engineer"
│       ├── role: "engineer"
│       ├── projectId: null
│       └── profileImage: null
│
└── worker accounts/
    └── 9GIhW6MNF.../        (Worker document)
        ├── uid: "9GIhW6MNF..."
        ├── email: "worker@gmail.com"
        ├── name: "lemuel worker"
        ├── role: "worker"
        ├── projectId: null
        └── profileImage: null
```

### App Console on Startup
```
🔥 Firebase Config Loaded: { apiKey: ..., projectId: "sitepulse-2d882", ... }
✅ Firebase App Initialized
✅ Firestore Initialized
✅ Storage Initialized
✅ Auth Initialized
🔍 Testing Firestore connectivity...
✅ Firestore is ONLINE and reachable
```

---

## ❌ Common Issues

### Issue: "Firebase offline" still appears
**Fix**: Make sure you removed the long-polling settings and restarted the app

### Issue: User not found after login
**Fix**: Check that Firestore document ID matches Firebase Auth UID exactly

### Issue: Wrong navigation appears
**Fix**: Verify the `role` field is exactly `"engineer"` or `"worker"` (lowercase)

### Issue: Permission denied errors
**Fix**: Deploy the security rules: `firebase deploy --only firestore:rules`

---

## ✅ All Done!

If all boxes are checked, you're ready to start building with SitePulse! 🎉

