# plan.md (Updated)

## 1. Objectives
- Deliver a mobile-first PWA that provides **checkpoint-based navigation** to a shared destination, where **QR scan selects business identity** (AJPL vs Yash) and enforces strict feature/data segregation.
- Provide a proven end-to-end core flow: **QR → business-branded landing → route select → checkpoint navigation → help/callback → helpdesk visibility**.
- Enable internal operations with Admin + Helpdesk dashboards and seed data suitable for later replacement by Map Trainers.
- Implement **Map Trainer workflow** for creating/updating routes and checkpoints with **LLM-assisted suggestions (OpenAI via Emergent key)** under strict rules:
  - LLM used only as an assistant during route training
  - **Never auto-overwrite trainer input**
  - **Human review/approval required** (Trainer/Admin)
  - Store suggestion history + approvals in **audit logs**
- Deliver **business-segmented analytics** (AJPL vs Yash vs combined) and operational monitoring.

**Status update:**
- **Phase 1 complete:** LLM integration verified end-to-end.
- **Phase 2 complete:** V1 app delivered; all 5 MVP user stories passing; testing at **Backend 100%**, **Frontend 95%** with the minor issue fixed (MapPin import).
- **Now starting Phase 3:** Trainer workflow + in-product LLM assistance + Analytics V1.

---

## 2. Implementation Steps

### Phase 1 — Core POC (Isolation) ✅ COMPLETED
**Goal:** de-risk the most failure-prone parts.

1) **LLM POC (OpenAI via Emergent key)** ✅
- Implemented and verified LLM suggestions generation for:
  - checkpoint title generation
  - instruction improvement
  - route summary generation
  - warning/confusion guidance
- Confirmed JSON parsing strategy and safe prompting (“suggestions only”).

2) **PWA Offline POC** ⏸️ Deferred
- Deferred to a later hardening iteration (core navigation currently online-first with placeholders).

3) **Helpdesk Notification POC** ⏸️ Partially covered
- Implemented **SSE fallback** real-time notifications path for helpdesk dashboard.
- Browser Push Notifications remain planned for Phase 4 hardening.

**Exit criteria (POC):** ✅ Met for LLM integration.

---

### Phase 2 — V1 App Development (MVP around proven core) ✅ COMPLETED
**Scope delivered:** Core customer navigation + assistance + internal dashboards + seeded placeholder routes.

**User stories (Phase 2) — all passing** ✅
1. QR scan shows correct business branding and destination label (AJPL or Yash).
2. Route selection + checkpoint-by-checkpoint navigation works with visual-first guidance.
3. “Help Me” creates helpdesk-visible case with last checkpoint context.
4. Helpdesk can view queue and take actions.
5. Admin can monitor live sessions with **red (AJPL)** and **blue (Yash)** indicators.

**Delivered build steps (V1)** ✅
1) **Data model + seed data**
- Seeded: 2 businesses, 4 QR sources, 5 routes, 27 checkpoints, 3 internal users.
- Placeholder checkpoints designed to be replaceable by trainers later.
- Strict `business_id` tagging on sessions/events/cases/callbacks.

2) **QR → session bootstrap**
- QR code → business resolution → session creation + event timeline.

3) **Customer navigation UI (mobile-first)**
- Route selection UI (ETA, difficulty, checkpoint count).
- Checkpoint navigation UI with:
  - placeholder image cards
  - instruction + “look for” hint
  - progress indicator
  - actions: can’t find, share checkpoint, help me, call
- Treasure-map route view.
- Where Am I page (text + hint-based checkpoint match).

4) **Helpdesk dashboard (MVP)**
- Case queue with status filters.
- SSE notifications stream integrated.
- Case action logging.

5) **Admin dashboard (MVP)**
- KPI cards + live sessions “map” visualization.
- Sessions list + session timeline view.
- Route/user management pages.
- Gold rate management page.

6) **AJPL-only modules (strict gating)**
- Gold rates + gallery + rate calculator shown only for AJPL sessions.
- Verified Yash sessions never display these modules.

7) **Testing**
- Automated + manual verification.
- Backend API success: 100%.
- Frontend success: 95% → minor JS import bug fixed.

---

### Phase 3 — Feature Expansion (Trainer workflow + LLM assistance + Analytics V1) 🚧 IN PROGRESS
**Goal:** productionize route training workflows and analytics while preserving strict human approval and auditability.

**User stories (Phase 3)**
1. As a **Map Trainer**, I can draft routes/checkpoints, upload/replace media, and submit for review.
2. As a **Trainer/Admin**, I can click **Generate Suggestions** to get LLM outputs for checkpoint titles, instructions, route summary, warnings.
3. LLM suggestions **never overwrite** trainer text; Trainer/Admin must explicitly accept edits.
4. As an **Admin**, I can review trainer drafts and publish routes/checkpoints.
5. As an **Admin**, I can view **business-segmented analytics** (AJPL vs Yash vs combined).

**Build steps (Phase 3)**
1) **Route/Checkpoint Draft + Review Workflow**
- Add entities/fields for:
  - route status lifecycle: `draft → pending_review → published → archived`
  - checkpoint versioning (keep published stable while edits are in draft)
- Admin review UI:
  - diff-style view (current vs proposed)
  - approve/reject with comments
- Ensure all changes are recorded in `audit_logs`.

2) **Trainer Console (UI)**
- Trainer route list (drafts + published).
- Checkpoint editor:
  - text fields + media placeholders
  - replace media uploads (photo/video/arrow maps)
- “Submit for review” action.

3) **LLM Assistance (in-product)**
- Add **Generate Suggestions** button on:
  - checkpoint editing
  - route review (summary)
- Backend:
  - extend `/api/llm/suggest-checkpoint` usage to include:
    - checkpoint title suggestions
    - improved instructions
    - route summaries
    - warning/landmark suggestions
- UI:
  - show suggestions side-by-side with trainer text
  - “Apply suggestion” requires explicit click and creates audit entry
- **Audit logging requirements**:
  - store original trainer text
  - store full suggestion history (prompt type, raw response, parsed suggestion)
  - store reviewer decision (accepted/rejected/edited)

4) **Analytics V1 (segmented)**
- Admin analytics tabs: All / AJPL / Yash.
- Metrics:
  - scans → route starts → checkpoint confirmations → completion
  - drop-off/“cannot find” hotspot checkpoints
  - helpdesk KPIs: cases, resolution rate, response time (basic)
- AJPL-only metrics:
  - gold rate views
  - gallery opens
  - calculator usage

5) **Operational hardening for Phase 3**
- Enforce business segregation on analytics queries.
- Add additional indexes for analytics performance.

6) **Phase 3 testing**
- Trainer draft creation → LLM suggestions generated → manual apply → submit for review → admin approves → published route appears for customers.

---

### Phase 4 — Auth + Push Notifications + Offline/PWA Hardening + Finalization ⏳ PLANNED
**Goal:** secure internal operations and complete production-grade user experience.

**User stories (Phase 4)**
1. Admin can generate OTPs (expire after 2 hours or on use).
2. Helpdesk/Trainer can log in via username+OTP and are role-restricted.
3. Admin can deactivate users instantly.
4. Push notifications (primary) + SSE fallback for helpdesk.
5. Offline-first PWA caching for routes/checkpoints/media + queued event sync.

**Build steps (Phase 4)**
- Replace current login bypass with real OTP enforcement.
- Role-based guards on admin/helpdesk/trainer routes.
- Implement Browser Push Notifications subscription + server send (retain SSE fallback).
- Service worker caching strategy:
  - cache routes/checkpoints JSON
  - cache media thumbnails
  - store offline event queue and sync on reconnect
- Regression testing across both business identities.

---

## 3. Next Actions
1. Implement Phase 3 **Trainer workflow** pages (draft/edit/submit).
2. Add in-product **LLM suggestion UI** (Generate Suggestions + review/approve + audit history).
3. Expand analytics endpoints + UI to support segmented metrics and hotspot checkpoints.
4. Add structured audit log entries for:
   - trainer edits
   - LLM suggestion generation
   - admin approvals/rejections

---

## 4. Success Criteria
- **Business segregation:** AJPL-only features never appear in Yash sessions (UI + API + analytics).
- **Navigation reliability:** users can complete the route using checkpoint visuals; core flow remains usable under weak GPS/network.
- **Assistance responsiveness:** helpdesk receives help requests (SSE now; Push in Phase 4) and can resolve with action logs.
- **Trainer + LLM compliance:** suggestions generated on demand, never overwrite trainer text; approvals + history persisted in audit logs.
- **Operational visibility:** Admin can monitor live sessions (red AJPL / blue Yash), review timelines, and see segmented analytics.
- **AJPL gold rates:** manually managed by admin with “last updated” timestamp; never shown in Yash sessions.