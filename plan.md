# plan.md

## 1. Objectives
- Deliver a mobile-first PWA that provides **checkpoint-based navigation** to a shared destination, where **QR scan selects business identity** (AJPL vs Yash) and enforces strict feature/data segregation.
- Prove the **core flow** works end-to-end: QR → business-branded landing → route select → checkpoint navigation (offline-capable) → help request → helpdesk sees case + notifications.
- Enable internal route creation with **Map Trainer workflow**, including **LLM-assisted suggestions** (OpenAI via Emergent key) with **human review + audit trail**.
- Provide Admin controls for **routes/checkpoints/media**, **live session monitoring**, **AJPL-only gold rate module**, and **segmented analytics**.

## 2. Implementation Steps

### Phase 1 — Core POC (Isolation) (must pass before building full app)
**Goal:** de-risk the most failure-prone parts: LLM calls, PWA offline caching, and push/SSE notification loop.

1) **LLM POC (OpenAI via Emergent key)**
- Create a small Python script that sends: checkpoint draft text → returns suggestions for title/instructions/warnings/landmarks + route summary.
- Validate response shape + rate-limit handling + safe prompting (no overwrite; “suggestions only”).
- Store sample “trainer text + suggestions” into Mongo to validate audit log schema.

2) **PWA Offline POC**
- Minimal React page that caches a small JSON route + placeholder images via service worker.
- Verify: airplane mode still shows route + checkpoints; event queue stores actions and syncs later.

3) **Helpdesk Notification POC**
- Implement web push subscription + send test notification from FastAPI.
- Implement SSE fallback endpoint and a dashboard client that receives events when push blocked.
- Verify payload includes: business, checkpoint/approx location, phone provided, time since.

**Exit criteria (POC):** LLM suggestions generated reliably; offline route loads with cached media; helpdesk receives push or SSE event within 2–5s.

### Phase 2 — V1 App Development (MVP around proven core; delay internal auth)
**Scope:** Core customer navigation + assistance + basic internal dashboards + data model + seeded placeholder routes.

**User stories (Phase 2)**
1. As a customer, I can scan a QR and immediately see the correct branding and destination label (AJPL or Yash).
2. As a customer, I can choose my starting point and follow checkpoints with photos/arrow maps even with weak GPS.
3. As a customer, I can tap “Help Me” and the helpdesk sees my request with my last checkpoint.
4. As a helpdesk agent, I can view active sessions and open a case timeline to guide the customer.
5. As an admin, I can see live sessions on a simple map/list with red (AJPL) and blue (Yash) indicators.

**Build steps (V1)**
1) **Data model + seed data**
- Create collections listed in prompt; seed 4–6 routes with 5–8 checkpoints each using **labeled placeholders** (images/cards/arrow maps), easily replaceable.
- Implement strict `business_id` tagging and query filtering on all session/events/analytics endpoints.

2) **QR → session bootstrap**
- `qr_sources` map QR token → business_id + default route set.
- Customer landing page creates `session` and starts `session_events` timeline.

3) **Customer navigation UI (mobile-first)**
- Route selection; checkpoint-by-checkpoint view: image, short text instruction, optional short video, arrow-map image.
- Actions: “I am here”, “Can’t find”, “Share checkpoint”, “Share location (best-effort)”, “Help Me”, “Request callback”, “Call/WhatsApp”.
- Treasure-map style route view (simple horizontal/vertical stepper with checkpoint cards + progress).
- Where Am I mode (shows last checkpoint + nearby checkpoint list + “send to helpdesk” button).

4) **Secondary camera/compass mode (lightweight)**
- Optional camera screen with device orientation/compass prompts (no dependency for core nav).
- If sensors denied/unavailable, fallback to standard checkpoint view.

5) **Helpdesk dashboard (MVP)**
- Assistance queue (help requests + callback requests), session detail, action logging.
- Browser push notifications + SSE fallback.

6) **Admin dashboard (MVP)**
- Live sessions list + simple map panel (approx points if available; otherwise last checkpoint).
- CRUD for routes/checkpoints/media placeholders.
- Gold rates module **visible only when viewing AJPL context**.

7) **PWA packaging**
- Service worker caching for routes, checkpoint media placeholders, and core shell.
- Offline event queue + sync endpoint.

8) **V1 testing (end-to-end)**
- QR scan simulation → session created → route started → checkpoint events → help request → helpdesk notified → case resolved.

### Phase 3 — Feature Expansion (productionizing workflows + segmentation + audits)

**User stories (Phase 3)**
1. As a map trainer, I can draft a route with checkpoints and upload/replace media without breaking published routes.
2. As a map trainer, I can click “Generate Suggestions” and review LLM outputs without overwriting my text.
3. As an admin, I can review trainer drafts, approve edits, and publish to customers.
4. As an admin, I can view segmented analytics by business and combined.
5. As a helpdesk agent, I can see stuck/diversion flags and intervene faster.

**Build steps (Phase 3)**
1) **Trainer workflow**
- Draft → review → publish pipeline; trainer run capture entities (`trainer_route_runs`, frames/media).
- Checkpoint media replacement UI (placeholders swapped with real uploads).

2) **LLM assistance (in-product)**
- “Generate Suggestions” button on checkpoint edit + route review.
- Store suggestion history + approvals in `audit_logs` (original text, prompt metadata, suggested variants, reviewer decision).

3) **Analytics V1**
- Segmented metrics: scans, starts, completions, drop-offs; helpdesk KPIs.
- AJPL-only: gold rate views, gallery interactions, calculator usage.

4) **Stuck/diversion heuristics (lightweight)**
- Detect repeated “Can’t find” or long time at checkpoint; create `diversion_flags`.

5) **Hardening**
- Backend enforcement: business-based access rules on all reads/writes; audit log coverage.
- Media upload validation + size limits.

6) **Phase 3 testing**
- Trainer draft route + LLM suggestions + admin approval + customer uses newly published route.

### Phase 4 — Auth + Operational Controls + Finalization

**User stories (Phase 4)**
1. As an admin, I can create internal users and generate OTPs that expire on use or after 2 hours.
2. As a helpdesk agent, I can log in with username+OTP and only see helpdesk tools.
3. As an admin, I can deactivate a user instantly.
4. As an admin, I can audit all sensitive actions (publishes, text approvals, helpdesk resolutions).
5. As an AJPL customer, I can view gold rates with “last updated” timestamp, while Yash never sees this module.

**Build steps (Phase 4)**
- OTP auth (admin-generated), role-based access control for Admin/Helpdesk/Trainer.
- Helpdesk performance auditing; admin oversight tools.
- AJPL modules: gold rate management, gallery, calculator settings (strict gating).
- Comprehensive regression testing across businesses and roles.

## 3. Next Actions
1. Implement Phase 1 POCs (LLM script, offline caching mini-app, push+SSE test) and confirm exit criteria.
2. Finalize initial seed routes + checkpoint placeholder asset set (consistent naming + easy replacement).
3. Lock API contracts for: session bootstrap, navigation events, help requests, notifications.

## 4. Success Criteria
- **Business segregation:** AJPL-only features never appear in Yash sessions (UI + API + analytics).
- **Navigation reliability:** Users can complete a route using checkpoint visuals with weak GPS/network; offline mode functions.
- **Assistance responsiveness:** Helpdesk receives help requests via push (or SSE fallback) and can resolve with logged actions.
- **Trainer + LLM:** Suggestions generated on demand, never overwrite; approvals logged with full history.
- **Operational visibility:** Admin can monitor active sessions and review event timelines; gold rates update shows timestamp (AJPL only).
