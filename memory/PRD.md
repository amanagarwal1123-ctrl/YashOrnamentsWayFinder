# Yash Ornaments WayFinder - PRD

## Overview
Navigation PWA guiding customers from Chandni Chowk origins to Yash Ornaments / AJPL. QR-driven sessions, step-by-step navigation, helpdesk support, admin CMS, media, schematic map, reports/export.

## Tech Stack
- Backend: FastAPI (Python 3.11) on port 8001
- Frontend: React 18 (CRA + Craco) on port 3000
- Database: MongoDB (motor 3.3)
- Auth: JWT RBAC (admin, helpdesk, trainer)
- Package: yarn 1.22 with yarn.lock (frozen)
- Build: `cd /app/frontend && yarn build` on Node v20.20.0

## Roles
- **Admin**: Full access (dashboard, users, routes, media, reports, export, live monitoring)
- **Trainer**: Route/checkpoint/media authoring (no user mgmt, no deletion, no export)
- **Helpdesk**: Live customer queue, cases, claim/unclaim, notifications
- **Customer**: Public navigation (QR/link entry)

## Completed

### Batch A — Data Model + Backend Core
- Extended all models: Session, Route, Checkpoint, QRSource, HelpdeskCase
- Source tracking, location consent, assistance mode, recovery fields
- All backend endpoints for consent, location, select-route, recovery, assist-event, live-customers, claim/unclaim, enhanced stats, reports, export, user performance

### Batch B — Customer Flow + Quick Actions (Mar 17)
- Fast/assisted entry via QR scan (/scan/:code)
- Navigation Hub (/hub): route selection, distance, time, video, map preview, "Save for Offline"
- Location consent dialog (grant/deny → manual recovery mode)
- Sticky quick-action bar: Can't find, Where am I?, Need Help, More (Call, WhatsApp, WhatsApp Video, Share Location)
- WhatsApp video handoff via deep-link + assist-event logging

### Batch C — Checkpoint Recovery (Mar 17)
- Picture-based recovery flow at /recovery
- "Do you see this place?" with checkpoint images/tags
- Resume from matched checkpoint or escalate to helpdesk

### Batch D — Helpdesk Dashboard Upgrade (Mar 17)
- Queue categories: All, New, Active, Needs Help, Assisted, Recently Completed
- Full customer details + quick actions (Call, WhatsApp, Video, Claim/Unclaim, Note, Detail)
- Non-blocking SSE notifications

### Batch E — Admin Dashboard + Reports + Export (Mar 17)
- 6 KPI cards, route/source usage charts, helpdesk team performance
- Reports page with filters + session table + CSV/XLSX export
- RBAC enforced

### Batch G — Offline Route Packs (Mar 17)
- Service worker (sw.js) with cache strategies
- "Save for Offline" via navigator.serviceWorker.ready
- Caches route data, checkpoint data, images, schematic map

### Cleanup Pass (Mar 17)
1. **Offline SW**: Rewrote registration to use `serviceWorker.ready` — button appears on first load
2. **Reports filters**: Strip `all_*` sentinel values before building request params
3. **Visiting card upload**: Yash-only, optional, public /api/public/upload-card endpoint (no auth)
4. **Admin live monitoring**: Replaced decorative dot grid with location-based table (Customer, Checkpoint, GPS coordinates, Last Location, Activity, Status)
5. **Auth context**: Synchronous localStorage restore eliminates redirect race on hard navigation
6. **Build**: Node v20.20.0, yarn 1.22.22, `yarn build` deterministic with yarn.lock

## Key API Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/public/upload-card | Public | Visiting card upload (Yash) |
| GET | /api/helpdesk/recent-completed | Helpdesk+ | Recently completed sessions |
| GET | /api/admin/stats/enhanced | Admin | KPIs + usage |
| GET | /api/admin/reports/sessions | Admin | Filtered report |
| GET | /api/admin/reports/export | Admin | CSV/XLSX download |

## Backlog
- **Batch F**: Route/media CMS polish
- Backend refactor: split server.py into APIRouter modules
