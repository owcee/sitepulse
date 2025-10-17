# 🚀 Firebase Phase 3 Roadmap

> **Status:** Draft — October 17 2025  
> **Maintainers:** @SitePulse-DevOps  
> **Related Docs:** `FIREBASE_PHASE2_COMPLETE.md`, `firestore.rules`, `storage.rules`

---

## 1  Scope & Objectives
Phase 3 focuses on production-hardening and scalability.  The high-level goals:

1. **Storage Reliability** – ensure photo/usage uploads work in every environment.  
2. **Security Rules Overhaul** – lock down Firestore & Storage for new collections.  
3. **Multi-Project Support** – allow engineers to manage multiple active projects.  
4. **Cascading Deletes** – automatic cleanup of orphaned data & storage objects.  
5. **Codebase Cleanup** – remove duplication, improve typing, prep for Phase 4 (Realtime sync).

## 2  Detailed Work-Items

| ID | Feature | Description | Owner | Priority |
|----|---------|-------------|-------|----------|
| A | Storage Bucket Fix | Update `firebaseConfig.js` bucket to `sitepulse-2d882.appspot.com`. | @frontend | P0 |
| B | Storage Rules v2 | Align rules with paths `task_photos/**` & `usage_photos/**`; deny everything else. | @backend | P0 |
| C | Firestore Rules v3 | Add granular rules for `worker_assignments`, `usage_submissions`, `task_photos`, `notifications`. | @backend | P0 |
| D | Multi-Project Schema | Migrate `projectId → activeProjectIds: array<string>` in `engineer_accounts`. Refactor queries & UI. | @frontend | P1 |
| E | Cascading Delete CF | Cloud Function `onProjectDelete` removes child docs + Storage folders. | @cloud | P1 |
| F | Profile Util Refactor | Extract `getUserProfile()` to `src/utils/user.ts` & de-duplicate. | @frontend | P2 |
| G | Docs & Scripts | Update seeder scripts, README, onboarding docs for Phase 3. | @dx | P2 |
| H | Soft-Delete Implementation | Add `deleted`, `deletedAt`, `deletedBy` flags; update queries & CF to soft-delete instead of hard. | @backend | P1 |
| I | FCM Push Notifications | Integrate Firebase Cloud Messaging; store tokens, Cloud Function to mirror in-app notifications. | @backend | P1 |

### Deliverable Checklist
- [ ] Bucket fix merged & deployed
- [ ] New `storage.rules` deployed (`firebase deploy --only storage`)
- [ ] `firestore.rules` v3 deployed (`firebase deploy --only firestore`)
- [ ] Data migration script for multi-project schema executed
- [ ] Cloud Function deployed & verified (`firebase deploy --only functions:onProjectDelete`)
- [ ] All Jest/E2E tests green
- [ ] `FIREBASE_PHASE3_COMPLETE.md` authored

## 3  Architecture Decisions

### 3.1 Storage Paths
```
root
└── task_photos/{projectId}/{taskId}/{photoId}.jpg
└── usage_photos/{projectId}/{submissionId}/{photoId}.jpg
```
• Each folder is bucket-isolated by `projectId` for simpler rule-checks.

### 3.2 Security Rules Principles
1. Auth required for **all** reads & writes.  
2. Role-based rules implemented via custom claims in Phase 4; Phase 3 uses simple field checks.  
3. No public wildcard reads.

### 3.3 Multi-Project Model
```
engineer_accounts
  └── {uid}
        activeProjectIds: array<string>
        currentProjectId: string | null   // convenience, optional
```
UI picks a “context project” from `activeProjectIds` each session.

## 4  Data Migration Plan
1. Export `engineer_accounts` to CSV (Firestore export tool).  
2. Script: for each doc with `projectId != null` → write `activeProjectIds = [projectId]`, delete old field.  
3. Run smoke test: dashboard lists projects correctly.

## 5  Cloud Function — `onProjectDelete`
Pseudo-code:
```ts
exports.onProjectDelete = functions.firestore
  .document('projects/{projectId}')
  .onDelete(async (snap, ctx) => {
    const id = ctx.params.projectId;
    await deleteQueryBatch(db, db.collection('materials').where('projectId', '==', id));
    await deleteQueryBatch(db, db.collection('equipment').where('projectId', '==', id));
    await deleteQueryBatch(db, db.collection('workers').where('projectId', '==', id));
    await deleteStorageFolder(`task_photos/${id}`);
    await deleteStorageFolder(`usage_photos/${id}`);
  });
```
Helper `deleteQueryBatch` paginates 500-doc chunks.

## 6  Testing Strategy
1. **Unit Tests** – new util functions + rules simulator tests.  
2. **Integration** – Cypress: create dummy project, upload photo, delete project, assert zero orphan files/docs.  
3. **Load** – seed 10k usage submissions then run delete to ensure CF completes < 120 s.

## 7  Deployment Steps (TL;DR)
```bash
# 1 Bucket string fix
pnpm lint && pnpm test && pnpm build

# 2 Deploy rules
firebase deploy --only storage,firestore

# 3 Deploy functions
firebase deploy --only functions:onProjectDelete

# 4 Run migration
node scripts/migrateActiveProjects.js --dry-run  # verify
node scripts/migrateActiveProjects.js --execute  # live
```

## 8  Rollback Plan
1. Re-import automated Firestore backup.
2. Re-upload bucket snapshot (GCS versioning on).
3. Re-deploy previous `firestore.rules` and Cloud Functions.

## 9  Notes
- ~~Should we add soft-delete flags instead of hard deletes?~~ **Resolved:** implement soft-delete (Task H).  
**Note on Storage IAM:** We decided a single bucket (`sitepulse-2d882.appspot.com`) is sufficient for now.  Per-project buckets are only required when strict tenant isolation or per-bucket lifecycle rules are needed — not in scope for Phase 3.  
~~Will Phase 3 introduce FCM push notifications?~~ **Resolved:** yes, include FCM integration (Task I).

---

> **Next Action:** Merge PR #phase-3-bootstrap containing bucket fix + new rules, **then** begin multi-project refactor.
