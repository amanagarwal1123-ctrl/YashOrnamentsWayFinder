# Yash Ornaments WayFinder - PRD

## Overview
Navigation PWA guiding customers from Chandni Chowk origins to Yash Ornaments / AJPL. QR-driven sessions, step-by-step navigation, helpdesk support, admin CMS, media, schematic map, reports/export.

## Tech Stack
- Backend: FastAPI (Python) on port 8001
- Frontend: React (CRA + Craco) on port 3000
- Database: MongoDB (motor)
- Auth: JWT RBAC (admin, helpdesk, trainer)
- Package: yarn

## Roles
- **Admin**: Full access (dashboard, users, routes, media, reports, export, live monitoring)
- **Trainer**: Route/checkpoint/media authoring (no user mgmt, no deletion, no export)
- **Helpdesk**: Live customer queue, cases, claim/unclaim, notifications
- **Customer**: Public navigation (QR/link entry)

## Completed Batches

### Batch A — Data Model + Backend Core (DONE)
- Extended all models: Session, Route, Checkpoint, QRSource, HelpdeskCase
- Added source tracking, location consent, assistance mode, recovery fields
- New endpoints: consent, location-update, select-route, recovery, assist-event, live-customers, claim/unclaim, enhanced stats, reports, export, user performance

### Batch B — Customer Flow + Quick Actions (DONE - Mar 17, 2026)
- Fast/assisted entry via QR scan (/scan/:code) with entry_mode support
- Navigation Hub (/hub) with route selection, distance, time, video, map preview
- Location consent dialog (grant/deny → continues in manual recovery mode)
- Sticky quick-action bar on /navigate: Can't find, Where am I?, Need Help, More (Call, WhatsApp, WhatsApp Video, Share Location)
- WhatsApp video handoff via deep-link with assist-event logging
- Periodic location tracking when consent granted

### Batch C — Checkpoint Recovery / No-Location Fallback (DONE - Mar 17, 2026)
- Picture-based recovery flow at /recovery
- "Do you see this place?" with checkpoint images/tags
- Yes → resume navigation from that checkpoint
- No match → escalation to helpdesk (Call, WhatsApp Video, Alert)
- Recovery remains route-scoped

### Batch D — Helpdesk Dashboard Upgrade (DONE - Mar 17, 2026)
- Queue categories: All, New, Active, Needs Help, Assisted, Recently Completed
- Full customer details: name, phone, source, route, distance, checkpoint, location state, assignment
- Quick actions: Call, WhatsApp, WhatsApp Video, Claim/Unclaim, Add Note, View Detail
- Non-blocking SSE notifications
- Session detail sheet

### Batch E — Admin Dashboard + Reports + Export (DONE - Mar 17, 2026)
- Enhanced KPIs: Total customers, Active, Successful visits, Incomplete, Help pending, Being assisted
- Route-wise and source-wise usage charts
- Helpdesk team performance with per-user dialog
- Reports page (/admin/reports) with filters (status, route, business, date range)
- CSV and XLSX export from filtered session data
- RBAC enforced: trainers blocked from export

### Batch G — Offline Route Packs (DONE - Mar 17, 2026)
- Service worker (sw.js) with cache strategies
- Network-first for API, cache-first for static assets
- "Save for Offline" button on Navigation Hub
- Caches route data, checkpoint data, images, schematic map
- Graceful degradation: video too large → images + instructions offline

## Previous Phases (Completed)
- Phase 1+1R: Hardening, reproducibility, JWT fail-fast
- Phase 2: Admin Route CMS with DnD, duplicate, import/export
- Phase 3: Media UX with drag-drop, library, filters
- Phase 4: Schematic SVG map, list fallback
- Tutorial PDF generator (Hindi+English)

## Architecture
```
/app/backend/
  server.py     — Main FastAPI app (all endpoints)
  models.py     — Pydantic models
  utils.py      — Serialization helpers
  watermark.py  — Image watermarking
  tutorial_pdf.py — PDF generation

/app/frontend/src/
  App.js         — Routes
  lib/api.js     — All API calls
  lib/context.js — App state
  lib/offline.js — Service worker helper
  pages/
    ScanLandingPage.jsx    — QR entry (fast/assisted)
    NavigationHub.jsx      — Route info + start navigation
    CheckpointNavPage.jsx  — Step-by-step with quick actions
    RecoveryPage.jsx       — Picture-based recovery
    HelpdeskDashboard.jsx  — Queue-based helpdesk console
    AdminDashboard.jsx     — KPIs + usage charts
    AdminReports.jsx       — Reports & export
    AdminRoutes.jsx        — Route CMS
    AdminMediaManagement.jsx — Media library
    SchematicMapPage.jsx   — Metro-style map
  components/shared.jsx — Shared UI components
  public/sw.js          — Service worker
```

## Key API Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /scan/{qr}/info | Public | QR info with entry_mode |
| POST | /scan/{qr}/register | Public | Assisted registration |
| POST | /sessions/create | Public | Fast session create |
| POST | /sessions/{id}/select-route | Public | Route selection |
| POST | /sessions/{id}/location-consent | Public | Location grant/deny |
| POST | /sessions/{id}/location-update | Public | Periodic GPS |
| GET | /sessions/{id}/recovery-candidates | Public | Recovery checkpoints |
| POST | /sessions/{id}/recover | Public | Resume from checkpoint |
| POST | /sessions/{id}/assist-event | Public | Log assist events |
| GET | /helpdesk/live-customers | Helpdesk+ | Live queue |
| GET | /helpdesk/recent-completed | Helpdesk+ | Recent completed |
| POST | /helpdesk/sessions/{id}/claim | Helpdesk+ | Claim session |
| GET | /admin/stats/enhanced | Admin | KPIs + usage |
| GET | /admin/reports/sessions | Admin | Filtered report |
| GET | /admin/reports/export | Admin | CSV/XLSX download |
| GET | /admin/users/{id}/performance | Admin | User performance |

## Backlog
- **P3: Batch F** — Route/media CMS polish (remaining UI enhancements)
- Route distance shown as 'N/A' for routes without trainer-entered distance values

## Testing
- iteration_6.json: 100% backend (30/30), 100% frontend
- All RBAC verified: trainer blocked from export, helpdesk blocked from admin stats
