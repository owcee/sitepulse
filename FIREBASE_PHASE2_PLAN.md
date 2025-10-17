# 🚀 SitePulse – Firebase Phase 2 Implementation Plan

*(This file supersedes the old Firebase rebuild plan)*

---

## 0 · Scope & Objectives
Complete all remaining Firebase-dependent features that are still stubbed:

| # | Feature | Goal |
|---|----------|------|
| 1 | Notifications | Real-time in-app inbox (and later push) |
| 2 | Task photo upload & approval | Upload to Cloud Storage, metadata in Firestore, engineer approves/rejects |
| 3 | Worker assignment flow | Engineers invite workers, workers accept/reject |
| 4 | Usage / inventory reports | Workers submit usage; engineers review |
| 5 | Project creation & CRUD | Persist projects, link to engineer, list engineer’s projects |
| 6 | Security rules & Indexes | Rules/Indexes for new collections |
| 7 | Offline caching | Enable Firestore persistence, show offline badge |
| 8 | Dev scripts | Seed & cleanup utilities |

---

## 1 · Data-Model Additions

| Collection | Doc ID | Core Fields |
|------------|-------|-------------|
| **notifications** | auto | `userId`, `title`, `body`, `type`, `read`, `timestamp`, `relatedId` |
| **task_photos** | auto | `taskId`, `uploaderId`, `imageUrl`, `cnnClassification`, `confidence`, `verificationStatus`, `timestamp` |
| **usage_submissions** | auto | `projectId`, `workerId`, `itemId`, `type`, `quantity`, `unit`, `photoUrl`, `notes`, `status`, `timestamp`, `reviewerId` |
| **worker_assignments** | `{workerId}` | `projectId`, `status (pending|accepted|rejected)`, `invitedBy`, `invitedAt`, `decidedAt` |
| **projects** (extend) | `{projectId}` | `engineerId`, `location`, `clientName`, `budget`, `duration` |

---

## 2 · Firestore Rules (`firestore.rules`)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function isAuth()        { return request.auth != null; }
    function isEngineer()    { return isAuth() && exists(/databases/$(db)/documents/engineer_accounts/$(request.auth.uid)); }
    function isWorker()      { return isAuth() && exists(/databases/$(db)/documents/worker_accounts/$(request.auth.uid)); }
    function userProjectId() {
      return isEngineer() ?
        get(/databases/$(db)/documents/engineer_accounts/$(request.auth.uid)).data.projectId :
        get(/databases/$(db)/documents/worker_accounts/$(request.auth.uid)).data.projectId;
    }

    /* 2.1 projects */
    match /projects/{pid} {
      allow create: if isEngineer();                          // engineer creates project
      allow read  : if isEngineer() || userProjectId() == pid;
      allow update, delete: if isEngineer() &&
        get(/databases/$(db)/documents/projects/$(pid)).data.engineerId == request.auth.uid;
    }

    /* 2.2 notifications */
    match /notifications/{id} {
      allow read, update: if isAuth() && resource.data.userId == request.auth.uid;
      allow create      : if isAuth(); // server-side functions send notifications
    }

    /* 2.3 task_photos */
    match /task_photos/{id} {
      allow create: if isAuth();
      allow read  : if isAuth();
      allow update: if isEngineer(); // approve / reject by engineer
      allow delete: if false;
    }

    /* 2.4 usage_submissions */
    match /usage_submissions/{id} {
      allow create: if isWorker();
      allow read  : if isEngineer() || resource.data.workerId == request.auth.uid;
      allow update: if isEngineer();
    }

    /* 2.5 worker_assignments */
    match /worker_assignments/{wid} {
      allow create: if isEngineer();
      allow read  : if request.auth.uid == wid || isEngineer();
      allow update: if request.auth.uid == wid; // worker accepts/rejects
    }
  }
}
```

---

## 3 · Storage Rules (`storage.rules`)

```c
service firebase.storage {
  match /b/{bucket}/o {
    match /task_photos/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 4 · Indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    { "collectionGroup": "notifications", "queryScope": "COLLECTION", "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
    ]},
    { "collectionGroup": "usage_submissions", "queryScope": "COLLECTION", "fields": [
        {"fieldPath": "projectId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
    ]},
    { "collectionGroup": "task_photos", "queryScope": "COLLECTION", "fields": [
        {"fieldPath": "taskId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
    ]}
  ],
  "fieldOverrides": []
}
```

---

## 5 · Service Layer (`src/services`)

| Service file | Functions |
|--------------|-----------|
| `notificationService.ts` | `sendNotification`, `getNotifications`, `markAsRead` |
| `photoService.ts` | `pickImage`, `uploadTaskPhoto`, `approvePhoto`, `rejectPhoto` |
| `assignmentService.ts` | `inviteWorker`, `getInvites`, `acceptInvite`, `rejectInvite` |
| `usageService.ts` | `submitUsage`, `getUsageForProject`, `reviewUsage` |
| `projectService.ts` | `createProject`, `updateProject`, `deleteProject`, `getEngineerProjects` |

All functions follow the same pattern: **async**, return typed objects, centralised error handling.

---

## 6 · UI Work (screens/components)

| Screen | Key tasks |
|--------|-----------|
| **NotificationsScreen** | Live list via `onSnapshot`, badge on unread count |
| **PhotoUploadScreen** | Use `photoService.pickImage → uploadTaskPhoto` |
| **PhotoReviewScreen** | Engineer approves/rejects photos |
| **WorkerAssignmentScreen** | Engineer invites workers |
| **NotificationsScreen (worker)** | Accept/reject invite buttons |
| **InventoryUseScreen** | Submit usage with optional photo |
| **CreateNewProjectScreen** | Save via `projectService.createProject`, update engineer doc, navigate to dashboard |

*Common additions*: loading spinners, pull-to-refresh, error banners.

---

## 7 · Offline & Caching

*In `firebaseConfig` initialise persistence:*
```ts
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch(() => {});
```

UI: show `Offline` chip if `!navigator.onLine`.

---

## 8 · Dev Scripts (in `scripts/`)

*`seedAdvancedData.js`* – inserts sample notifications, photos, assignments, usage.  
*`cleanAdvancedData.js`* – deletes docs from new collections (safety for dev).

---

## 9 · Timeline (≈ 2 dev days)

| Phase | Hours |
|-------|-------|
| Rules & Indexes | 1 h |
| Service layer | 4 h |
| UI updates | 6 h |
| Offline tweaks | 1 h |
| Scripts | 1 h |
| QA / emulator tests | 3 h |
| Buffer / polish | 2 h |

---

## 10 · Acceptance Checklist

- [ ] Engineer can create project; project saved, engineer linked
- [ ] Worker invite flows → invite, notification, accept → worker linked
- [ ] Worker can submit usage; engineer approves/rejects
- [ ] Worker can upload photo; engineer approves/rejects
- [ ] Notifications show in real-time, unread badge updates
- [ ] All new writes pass Firestore security-rules tests
- [ ] IndexedDB persistence enabled; offline badge shows
- [ ] No console warnings or stub logs remain

---

> **Next step**: approve this plan; then we’ll implement phase 2 feature-by-feature.
