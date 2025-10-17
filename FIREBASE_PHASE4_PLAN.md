# 🚀 Firebase Phase 4 Plan – Production-Ready

> **Draft Date:** October 17 2025  
> **Maintainers:** @SitePulse-DevOps  
> **Scope:** Connect all remaining mock UI to Firebase, finish critical workflows, and push the project to GitHub.  

---

## 0  Guiding Principles

1. No UI redesigns – Phase 4 wires data to existing screens.  
2. CNN photo classification & delay-prediction ML are **out of scope** (Phase 5).  
3. Prioritise critical engineer↔worker flows.  
4. All new features must include security-rule coverage & basic unit tests.  
5. Real-time listeners where useful; fall back to one-shot reads otherwise.

---

## 1  High-Level Goals

| ID | Goal | Outcome |
|----|------|---------|
| G-1 | Remove hard-coded `project-1` | Every user sees *their* active project(s) |
| G-2 | Full Task system | Tasks persist in Firestore; dashboard uses live counts |
| G-3 | Worker invitation response | Workers can accept/reject invites in-app |
| G-4 | Live Notifications UI | Badge & list update in real time |
| G-5 | Real-time Chat | Messages sync across all users |
| G-6 | Replace dashboard mock numbers | Budget, tasks, resources all live |
| G-7 | Minor bug fixes (photo param, Gmail-only check) | Polished UX |
| G-9 | Updated docs & tests | Clear onboarding & safety nets |

---

## 2  Detailed Work-Items & Estimates

| Priority | ID | Feature / Fix | Effort |
|----------|----|---------------|--------|
| **P0** (blockers) | P0-1 | Remove hard-coded project-1 in `App.tsx` + Sign-Up | 1 h |
|  | P0-2 | `taskService.ts` + `tasks/` collection & security rules | 3 h |
|  | P0-3 | Wire TaskCreationModal / Tasks screens to taskService | 2 h |
|  | P0-4 | Live task counts in dashboard | 1 h |
|  | P0-5 | Worker invitation response UI (accept / reject) | 2 h |
|  | P0-6 | Connect NotificationsScreen to Firebase | 1 h |
|  | P0-7 | Fix photo upload param bug | 0.3 h |
| **P1** (high) | P1-1 | `chatService.ts` + `chat_messages/` collection | 2 h |
|  | P1-2 | Wire ChatScreen to chatService | 1 h |
|  | P1-3 | Live dashboard budget/resource numbers | 2 h |
|  | P1-4 | Remove Gmail-only email check | 0.2 h |
| **P2** (polish) | P2-1 | Unit tests & emulator rule tests for new services | 1 h |
|  | P2-2 | Update deployment docs (`PHASE4_DEPLOYMENT_GUIDE.md`) | 0.5 h |

_Total engineering ≈ 14 hours._

---

## 3  Sprint Timeline (2 Weeks)

| Day | Tasks |
|-----|-------|
| 1 | P0-1, P0-7, start P0-5 |
| 2 | Finish P0-5, start P0-2 backend & rules |
| 3 | Finish P0-2, implement P0-3 wiring |
| 4 | P0-4 dashboard hookup, regression test |
| 5 | P0-6 live notifications |
| 6 | P1-1 chatService backend |
| 7 | P1-2 connect ChatScreen |
| 8 | P1-3 dashboard budget/resource live data |
| 9 | P1-4 email-validation update, QA auth |
| 10 | P2-1 unit & rule tests |
| 11 | P2-2 docs |
| 12 | P2-3 docs, P2-4 CI workflow |
| 13 | Buffer / UAT / bug-fix |
| 14 | Prod deploy (rules, hosting, functions) |

---

## 4  New Firestore Schemas

### 4.1 `tasks/{taskId}`
```json
{
  "projectId": "string",
  "title": "string",
  "category": "string",
  "status": "not_started | in_progress | completed | blocked | cancelled",
  "planned_start_date": "YYYY-MM-DD",
  "planned_end_date": "YYYY-MM-DD",
  "assigned_worker_ids": ["uid1", "uid2"],
  "cnnEligible": true,
  "notes": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```
### 4.2 `chat_messages/{messageId}`
```json
{
  "projectId": "string",
  "senderId": "uid",
  "senderName": "string",
  "senderRole": "engineer | worker",
  "content": "string | imageUrl",
  "type": "text | image",
  "timestamp": "timestamp",
  "readBy": ["uid"]
}
```

---

## 5  Firestore Rule Updates

```rules
match /tasks/{taskId} {
  allow read:  if isEngineerForProject(projectId) || isWorkerForTask(taskId);
  allow write: if isEngineerForProject(projectId);
}
match /chat_messages/{msgId} {
  allow read, write: if isInProject(projectId);
}
```
_(Helper functions exist in rules file)_

---

## 6  GitHub Repository Setup

_Removed: Deferred to Phase 5._

---

## 7  Acceptance Criteria

- Engineer and worker each see only their own projects (no hard-coding).  
- Creating a task persists in Firestore and appears for workers.  
- Worker can accept invite → app re-routes to project dashboards.  
- Chat messages sync in < 1 s across two devices.  
- Dashboard charts update automatically (no manual refresh).  
- All new collections covered by security-rule emulator tests.  
- CI pipeline passes on every PR.  
- Phase 4 deployment checklist complete and documented.

---

## 8  Out-of-Scope (Phase 5+)

- CNN photo classification integration (TensorFlow.js)  
- Delay-prediction ML model  
- Invite queue/expiry & multi-invite support  
- App Check & Cloud Logging enhancements  
- Any major UI redesigns

---

## 9  Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Unsubscribed real-time listeners | Memory leaks / perf | Always return unsubscribe in `useEffect` |
| Increased Firestore costs | Higher bill | Use indexed queries; batch writes |
| Rule mistakes lock users out | No access | Deploy to staging; run emulator tests before prod |
| Git history too large | Slow clones | Ensure `node_modules` not committed |

---

## 10  Next Steps

1. Review & approve this plan (or request edits).  
2. Decide whether to kick off GitHub repo first or begin coding P0-1.  
3. After approval – start implementation following sprint timeline.
