# plan.md (Updated)

## 1. Objectives
- Deliver a mobile-first PWA that provides **checkpoint-based navigation** to a shared destination, where **QR scan selects business identity** (AJPL vs Yash) and enforces strict feature/data segregation.
- Provide a proven end-to-end core flow: **QR → business-branded landing → route select → checkpoint navigation → help/callback → helpdesk visibility**.
- Enable internal operations with Admin + Helpdesk dashboards and seed data suitable for later replacement by Map Trainers.
- Implement **Map Trainer workflow** for creating/updating routes and checkpoints with **LLM-assisted suggestions** under strict rules:
  - LLM used only as an assistant during route training
  - **Never auto-overwrite trainer input**
  - **Human review/approval required** (Trainer/Admin)
  - Store suggestion history + approvals in **audit logs**
- Deliver **business-segmented analytics** (AJPL vs Yash vs combined) and operational monitoring.
- Ensure **mobile usability across internal dashboards** (Admin/Trainer/Helpdesk) so operations work smoothly from phones.
- Prepare the product for production by completing a **production hardening pass** with security, correctness, frontend stability, and deterministic builds.

**Status update (current):**
- **Core POC complete:** LLM integration verified end-to-end.
- **V1 complete:** Core customer navigation, Helpdesk, Admin dashboards delivered.
- **Mobile admin UX hardening complete:** Admin menus behave correctly on mobile (sidebar collapses into a Sheet drawer with a hamburger header); desktop unchanged.
- **Phase 1 Production Hardening complete:** all mandatory fixes implemented and **validation fully green (28/28 checks passed)** on **Node 20 LTS**.
- **Next focus:** **Phase 2 — Admin Route CMS** is now unblocked and ready to begin.

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

3) **Helpdesk Notification POC** ✅ Completed (SSE)
- Implemented **SSE** real-time notifications path for helpdesk dashboard.
- Browser Push Notifications remain planned for Phase 4 hardening.

**Exit criteria (POC):** ✅ Met.

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
- Seeded: 2 businesses, 4 QR sources, 5 routes, 27 checkpoints, internal users.
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

8) **Mobile Admin Responsiveness Hardening** ✅
- Fixed admin menu behavior on phones:
  - Replaced always-visible sidebar with **responsive AdminSidebar**
  - **Mobile:** sticky top bar with hamburger → **Sheet drawer** navigation
  - **Desktop:** existing sidebar unchanged
- Updated all admin pages (9):
  - wrapper layout: `flex-col` on mobile / `flex-row` on desktop
  - responsive padding: `p-4 md:p-6`
- Added distinct mobile `data-testid` prefixes to avoid selector conflicts (test stability).

---

### Phase 1 — Production Hardening Pass (No behavior change intended) ✅ COMPLETED
**Goal:** production readiness via security, correctness fixes, frontend stability, and deterministic builds.

**Constraints:**
- Do not intentionally change product behavior (except bug/security fixes).
- Target runtime: **Node 20 LTS** for CRA/CRACO stability.

#### Phase 1.1 — Security Hardening (JWT role checks) ✅
Secured unprotected endpoints with JWT role enforcement:
- `POST /api/media/upload` → **admin or trainer only**
- `GET /api/media/{id}/serve?original=true` → **admin only** for originals; watermarked remains public
- `GET /api/helpdesk/notifications/stream` → **admin/helpdesk only** (SSE auth)
  - Implemented token passing via `?token=` for EventSource compatibility
- `POST /api/llm/suggest-checkpoint` → **admin/trainer only**

**Exit criteria:** ✅ anonymous rejected with 401; wrong-role rejected with 403.

#### Phase 1.2 — Role Alignment (Trainer vs Admin) ✅
- Trainers routed to `/admin/routes` after login.
- Updated backend dependencies so **trainer can manage routes/checkpoints**:
  - `GET/POST/PUT /api/admin/routes` (trainer allowed)
  - `GET/POST/PUT/DELETE /api/admin/checkpoints` (trainer allowed)
- Trainer remains blocked from admin-only APIs (sessions/users/stats/analytics).
- Route deletion remains **admin-only**.

**Exit criteria:** ✅ trainer CRUD works; admin-only endpoints return 403.

#### Phase 1.3 — Route Publish Logic Reliability ✅
- Verified create → publish → visible on customer `/routes`.
- Verified unpublish → disappears from customer `/routes`.
- Ensured public `/api/routes` remains `status: published` only.

**Exit criteria:** ✅ end-to-end publish/unpublish works without DB edits.

#### Phase 1.4 — Correctness Bug Fixes ✅
- **Where Am I** now filters checkpoints by the session’s selected `route_id`.
- **Admin analytics** now applies the `days` filter to:
  - sessions counts (created_at)
  - session events (timestamp)
  - helpdesk cases (created_at)
- Update/delete operations now return **404 when id not found** for:
  - routes update/delete
  - checkpoints update/delete
  - gallery delete
  - session terminate uses a pre-check to avoid false 404s

**Exit criteria:** ✅ verified via tests.

#### Phase 1.5 — Frontend Stability & Env Safety ✅
- Fixed API interceptor precedence for 401 auto-logout:
  - `401 && (pathname startsWith /admin || /helpdesk)`
- Added EventSource SSE token query-param support.
- Added safe fallback handling for missing backend URL (`REACT_APP_BACKEND_URL`).

**Exit criteria:** ✅ no accidental logout triggers; SSE works with auth.

#### Phase 1.6 — Dependency & Build Determinism ✅
- Kept `react-day-picker` v8.
- Pinned `date-fns` to `^3.6.0` for compatibility.
- Resolved CRA build break (ajv/ajv-keywords/schema-utils) by removing `ForkTsCheckerWebpackPlugin` in CRACO config (TypeScript checker not needed).
- Regenerated lockfile deterministically.

**Exit criteria:** ✅ `yarn install` and `yarn build` succeed on Node 20 LTS.

#### Phase 1.7 — Validation Report (Gate to Phase 2) ✅
**Result: 28/28 checks green**
- Node: v20.20.0
- Build: PASS
- Protected endpoints: anonymous 401, wrong-role 403
- Trainer route/checkpoint CRUD: PASS
- Publish flow: PASS
- where-am-i route scoping: PASS
- analytics days filter: PASS
- 404 on missing IDs: PASS

**Exit criteria:** ✅ met; Phase 2 is unblocked.

---

### Phase 2 — Admin Route CMS (Ready to Begin) ⏳ PLANNED
**Goal:** make route/checkpoint operations non-technical-staff friendly.

**Scope (Phase 2)**
1) **Full route CRUD**
- Create, edit, publish/unpublish, archive, delete, duplicate route
- Editable fields: name, start_type, start_label, difficulty, ETA, status
- Include `start_type` option: **gurudwara**

2) **Full checkpoint CRUD**
- Add/edit/delete/reorder checkpoints via drag-and-drop
- Inline validation for required fields

3) **Bulk operations**
- Duplicate checkpoint
- Reorder and save all
- Import/export route JSON

4) **Safety + UX hardening**
- Confirm dialogs for destructive actions
- Clear toast/error messages (remove silent catches)
- Ensure customer-facing `/routes` only shows published routes

**Exit criteria:**
- Admin can fully maintain routes without touching the database.
- No silent failures on 401/403/404/500.
- Trainer can manage routes/checkpoints but not admin-only pages.

---

### Phase 3 — Media Management UX (Deferred until Phase 2 complete) ⏳ PLANNED
**Goal:** admins can upload/manage photo/video media quickly and safely.

(Starts after Phase 2 completion.)

---

### Phase 4 — Multi-Origin Schematic Map (Deferred until Phase 2/3 complete) ⏳ PLANNED
**Goal:** metro-style multi-origin map experience for AJPL Wayfinder.

**Data source constraint:** map routes/checkpoints are sourced from MongoDB; seed/migrate canonical origin routes (including **Gurudwara**) and store schematic metadata in DB (no hardcoded JSX layout).

(Starts after Phase 2/3 completion.)

---

## 3. Next Actions
1) Begin **Phase 2 — Admin Route CMS** implementation.
2) Add admin UX improvements with clear validation and no silent catches.
3) After Phase 2 is shipped, start Phase 3 (Media Management), then Phase 4 (Schematic Map).

---

## 4. Success Criteria
**Phase 1 (gate criteria):** ✅ Completed
- `yarn install` and `yarn build` succeed on **Node 20 LTS**.
- Protected endpoints reject anonymous access (401) and wrong role (403).
- Trainer can manage routes/checkpoints but cannot access admin-only APIs/pages.
- Route create/edit/publish/unpublish flow works end-to-end.
- where-am-i results are route-scoped.
- analytics `days` filter applies to all relevant queries.
- update/delete APIs return 404 on missing ids.
- Lockfile deterministic after cleanup.

**Phase 2 (next criteria):**
- Admin can fully maintain routes/checkpoints without DB edits.
- Customer `/routes` shows published routes only.
- Non-technical staff can reorder checkpoints and publish safely.
- No silent failures; errors surfaced clearly.

**Overall product criteria (unchanged):**
- Business segregation enforced (AJPL-only features never appear in Yash sessions).
- Navigation reliability maintained.
- Mobile operations readiness maintained (menus collapse and do not block content).
