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

## Batch A (Current) — Data Model + Backend Core

### Schema Changes (backward-compatible, all new fields default)

**Session** — added:
- entry_source_type, entry_source_id, entry_source_label, entry_campaign
- customer_card_media_id
- route_distance_value, route_distance_unit
- started_at, completed_at, abandoned_at
- location_consent_granted, location_consent_at, location_permission_state
- last_known_lat, last_known_lng, last_known_location_text, last_location_at
- assigned_helpdesk_user_id, assistance_mode, assistance_status
- last_recovery_checkpoint_id

**Route** — added:
- distance_value, distance_unit, distance_label
- route_video_media_id, offline_pack_enabled

**Checkpoint** — added:
- recovery_tags (list), recovery_image_urls (list)

**QR Source** — added:
- source_label, default_route_id, entry_mode (fast/assisted)

**Helpdesk Case** — added:
- priority (low/normal/high/urgent), last_notification_at

### New API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /sessions/{id}/location-consent | Public | Grant/deny location |
| POST | /sessions/{id}/location-update | Public | Periodic GPS update |
| POST | /sessions/{id}/select-route | Public | Route selection with distance |
| GET | /sessions/{id}/recovery-candidates | Public | Checkpoints for recovery |
| POST | /sessions/{id}/recover | Public | Resume from matched checkpoint |
| POST | /sessions/{id}/assist-event | Public | Log WhatsApp/call events |
| GET | /helpdesk/live-customers | Helpdesk+ | Live active customer queue |
| POST | /helpdesk/sessions/{id}/claim | Helpdesk+ | Claim session |
| POST | /helpdesk/sessions/{id}/unclaim | Helpdesk+ | Unclaim session |
| GET | /admin/stats/enhanced | Admin | Central KPIs with route/source usage |
| GET | /admin/reports/sessions | Admin | Filtered session report |
| GET | /admin/reports/export | Admin | CSV/XLSX download |
| GET | /admin/users/{id}/performance | Admin | User performance metrics |

### Modified Endpoints
- POST /sessions/create — now includes source tracking, helpdesk notification
- POST /scan/{qr}/register — same enhancements
- GET /scan/{qr}/info — returns entry_mode, default_route
- POST /admin/routes — accepts distance_value, distance_unit, route_video_media_id

### Build/Test Status
- `yarn build`: PASS
- Backend regression (11/11): PASS
- New API endpoints: ALL verified via curl
- RBAC: trainer blocked from export (403), helpdesk can see live customers (200)

## Previous Phases (Completed)
- Phase 1+1R: Hardening, reproducibility, JWT fail-fast
- Phase 2: Admin Route CMS with DnD, duplicate, import/export
- Phase 3: Media UX with drag-drop, library, filters
- Phase 4: Schematic SVG map, list fallback
- Tutorial PDF generator (Hindi+English)

## Next: Batch B
- Customer flow upgrade (fast/assisted entry)
- Navigation hub (distance, time, map preview, video)
- Sticky quick-action bar
- Location consent UI
- WhatsApp video handoff

## Backlog
- Batch C: Checkpoint recovery / no-location fallback UI
- Batch D: Helpdesk dashboard upgrade
- Batch E: Admin dashboard + reports UI + exports UI
- Batch F: Route/media CMS polish
- Batch G: Offline route packs (last)
