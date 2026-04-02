# Yash Ornaments WayFinder - Product Requirements Document

## Original Problem Statement
A full-stack PWA (FastAPI, React, MongoDB) providing step-by-step navigation guidance for customers visiting Yash Ornaments in Chandni Chowk, Delhi. Pure wayfinding app — no catalogue, gallery, or gold rate features.

## Core Features Implemented

### Batch A: Foundational Backend APIs (Complete)
- Data models, session management, route/checkpoint CRUD, auth system

### Batch B: Customer Flow UI (Complete)
- NavigationHub, ScanLandingPage, CheckpointNavPage, quick-action bar
- Auto location tracking, WhatsApp video handoff, recovery mode

### Batch D: Helpdesk Dashboard (Complete)
- Real-time queue with statuses, session detail, claim/unclaim, notes

### Batch E: Admin Dashboard & Reports (Complete)
- KPIs, live monitoring, filtered reports, CSV/XLSX export

### Batch G: Offline Route Packs (Complete)
- Service worker at /sw.js, route caching, offline navigation fallback

### UI/Content Cleanup (Complete - March 17, 2026)
- Screenshot-first role-specific guides at /help-guide, /manual/helpdesk, /manual/trainer, /admin/manuals
- Staff login at /staff, /login redirects to /staff
- Role-aware sidebar

### Streamlining to Pure Wayfinder (Complete - April 2, 2026)
- **Removed** gold rates, gallery, catalogue from all customer pages
- **Removed** Gold Rates from admin sidebar
- **Removed** AJPL-specific sections (gold rate display, design gallery, rate calculator)
- **Auto location tracking**: Browser geolocation requested automatically, no consent dialog
- **GPS status indicators** on Navigation Hub and Checkpoint Nav page
- **QR Code generation** confirmed working at /admin/qr-codes
- **PWA/Offline**: Service worker registered, route caching, Save for Offline button
- Legacy routes /gold-rates and /gallery redirect to home

## Pending / Upcoming

### P0: Batch C - Checkpoint Recovery / No-Location Fallback UI
- Picture-based recovery flow using trainer-provided images
- "Do you see this place?" UI for location identification
- Resume navigation from selected checkpoint
- Escalate to helpdesk if no match

### P1: Batch F - Remaining CMS Polish
- UI/admin polish for route, media, and QR code management

### P2: Refactor server.py Monolith
- Break 2,500+ line backend into smaller modules using FastAPI APIRouter

## Architecture
```
/app/
├── backend/
│   ├── server.py (main API)
│   ├── models.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── ScreenshotGuide.jsx
│   │   │   ├── shared.jsx (role-aware sidebar, no gold rates)
│   │   │   └── ui/ (shadcn)
│   │   ├── data/
│   │   │   └── guideData.js
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx (pure wayfinder, no AJPL extras)
│   │   │   ├── NavigationHub.jsx (auto-location, GPS status)
│   │   │   ├── CheckpointNavPage.jsx (auto-location, GPS indicator)
│   │   │   ├── AdminQRGeneration.jsx (QR code generation)
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.js
│   │       ├── context.js
│   │       └── offline.js (SW registration, route caching)
│   └── public/
│       ├── sw.js (service worker)
│       ├── manifest.json (PWA manifest)
│       └── screenshots/ (guide screenshots)
```

## Test Credentials
- Admin: username `admin`, OTP `admin123`
- Helpdesk: username `helpdesk1`, OTP `admin123`
- Trainer: username `trainer1`, OTP `admin123`
- Customer QR codes: `AJPL-DEFAULT`, `YASH-DEFAULT`
