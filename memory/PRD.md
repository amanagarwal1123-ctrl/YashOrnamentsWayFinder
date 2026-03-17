# Yash Ornaments WayFinder - Product Requirements Document

## Original Problem Statement
A full-stack PWA (FastAPI, React, MongoDB) providing step-by-step navigation guidance for customers visiting Yash Ornaments in Chandni Chowk, Delhi. Features include QR-based session management, checkpoint-by-checkpoint navigation, helpdesk support, admin analytics, and offline capabilities.

## Core Features Implemented

### Batch A: Foundational Backend APIs (Complete)
- Data models, session management, route/checkpoint CRUD, auth system

### Batch B: Customer Flow UI (Complete)
- NavigationHub, ScanLandingPage, CheckpointNavPage, quick-action bar
- Location consent, WhatsApp video handoff, recovery mode

### Batch D: Helpdesk Dashboard (Complete)
- Real-time queue with statuses, session detail, claim/unclaim, notes

### Batch E: Admin Dashboard & Reports (Complete)
- KPIs, live monitoring, filtered reports, CSV/XLSX export

### Batch G: Offline Route Packs (Complete)
- Service worker caching, route metadata/checkpoints/images

### UI/Content Cleanup (Complete - March 17, 2026)
- **Removed** Staff Login from all public/customer pages
- **Removed** old App Guide / Tutorial / User Manual CTAs
- **Replaced** text-heavy mixed tutorial with screenshot-first role-specific guides
- **New routes:**
  - `/staff` - Dedicated staff login page
  - `/login` - Backward-compatible redirect to `/staff`
  - `/help-guide` - Public lightweight customer help guide (11 steps)
  - `/manual/helpdesk` - Helpdesk-only manual (8 steps)
  - `/manual/trainer` - Trainer-only manual (6 steps)
  - `/admin/manuals` - Admin manual center with all guides via tabs
  - `/tutorial` - Redirects to `/help-guide`
  - `/admin/tutorial-pdf` - Redirects to `/admin/manuals`
- **Reusable components:** ScreenshotGuide, EmbeddedGuide, guideData.js
- **32 real screenshots** captured from the running app
- **Role-aware sidebar:** Admin sees full nav, Trainer sees Routes/Media/Manual, Helpdesk sees Helpdesk/Manual

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
│   ├── server.py (main API - needs refactoring)
│   ├── models.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── ScreenshotGuide.jsx (NEW)
│   │   │   ├── shared.jsx (role-aware sidebar)
│   │   │   └── ui/ (shadcn)
│   │   ├── data/
│   │   │   └── guideData.js (NEW)
│   │   ├── pages/
│   │   │   ├── HelpGuidePage.jsx (NEW)
│   │   │   ├── HelpdeskManualPage.jsx (NEW)
│   │   │   ├── TrainerManualPage.jsx (NEW)
│   │   │   ├── AdminManualsPage.jsx (NEW)
│   │   │   ├── LandingPage.jsx (modified)
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.js
│   │       ├── context.js
│   │       └── offline.js
│   └── public/
│       └── screenshots/ (NEW - 32 real app screenshots)
│           ├── customer/ (11 screenshots)
│           ├── helpdesk/ (8 screenshots)
│           ├── trainer/ (6 screenshots)
│           └── admin/ (7 screenshots)
```

## Test Credentials
- Admin: username `admin`, OTP `admin123`
- Helpdesk: username `helpdesk1`, OTP `admin123`
- Trainer: username `trainer1`, OTP `admin123`
- Customer QR codes: `AJPL-DEFAULT`, `YASH-DEFAULT`

## Tech Stack
- **Backend:** FastAPI, MongoDB (Beanie ODM), Python
- **Frontend:** React, Tailwind CSS, Shadcn UI, Framer Motion
- **PWA:** Service Workers for offline caching
- **LLM:** OpenAI GPT via Emergent LLM Key
