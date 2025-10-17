# Worker Invitation Policy

> **Phase 3 Decision:** One Active Invite Per Worker

## Overview

The SitePulse worker assignment system follows a **single active invitation** model. Each worker can have only one pending project assignment at a time.

## How It Works

### Data Model
- Collection: `worker_assignments/{workerId}`
- Each worker ID maps to a single assignment document
- Status values: `pending`, `accepted`, `rejected`, `removed`

### Assignment Flow
1. **Engineer Invites Worker**  
   - Creates/overwrites `worker_assignments/{workerId}` with `status: 'pending'`
   - Sends in-app notification to worker
   - Worker sees invite in their notifications screen

2. **Worker Responds**  
   - **Accept:** Updates status to `accepted`, sets `worker_accounts.projectId = projectId`
   - **Reject:** Updates status to `rejected`, worker remains available for other invites
   
3. **Engineer Removes Worker**  
   - Sets `worker_assignments.status = 'removed'`
   - Clears `worker_accounts.projectId`

## Limitations & Rationale

### Why One Invite?
✅ **Simplicity:** Single source of truth per worker  
✅ **No Conflicts:** Worker cannot receive multiple conflicting invites  
✅ **Clear UX:** Worker sees one clear decision to make  

### Trade-offs
❌ **No Invite Queue:** If Engineer A invites a worker, Engineer B must wait until the worker responds or the invite expires  
❌ **No Multi-Project Workers:** A worker can only be assigned to one project at a time  

## Future Enhancements (Phase 4+)

If multi-invite support is needed:
1. Migrate to sub-collection: `worker_assignments/{workerId}/invites/{inviteId}`
2. Add invite expiration timestamps
3. UI to show all pending invites with priority/ordering

## Code References

- **Assignment Service:** `src/services/assignmentService.ts`
  - `inviteWorker()` - creates/overwrites single assignment
  - `acceptAssignment()`, `rejectAssignment()` - updates status
  - `getWorkerInvites()` - returns current pending invite (if any)

- **Firestore Rules:** `firestore.rules`
  - Line 73-80: `worker_assignments/{workerId}` rules

## Developer Notes

When querying available workers:
```ts
// Gets workers with projectId == null (no active assignment)
getAvailableWorkers() 
```

When sending invites:
```ts
// This OVERWRITES any existing pending invite
inviteWorker(workerId, projectId, projectName)
```

---

**Last Updated:** Phase 3 Implementation  
**Status:** ✅ Documented & Implemented

