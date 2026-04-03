# Yash Ornaments WayFinder - Product Requirements Document

## Original Problem Statement
Pure wayfinding PWA for customers visiting Yash Ornaments in Chandni Chowk, Delhi. Step-by-step checkpoint navigation with GPS tracking, helpdesk support, and offline capabilities.

## Core Features Implemented
- QR-based session creation → route selection → checkpoint navigation
- Clickable checkpoints on schematic map with detail dialogs
- Admin arrow placement on checkpoint images (6 arrow types)
- Auto GPS tracking, location status indicators
- Simplified quick actions: Call (+919958113991), WhatsApp, Where Am I
- Browse Designs → yashornaments.in
- Service worker offline caching
- Admin dashboard, helpdesk, reports, QR generation
- Screenshot-first role-specific manuals

## Recent Changes (April 2-3, 2026)
- Fixed grey "Next Step" button bug
- Added Browse Designs button → yashornaments.in
- Simplified WhereAmI to GPS-based nearest checkpoints
- Removed: "Can't find this", "Need Help", "More" sheet, Recovery page, Help page
- Hub always shows all routes (no pre-selected)
- Hardcoded contact: +919958113991

## Pending
- P0: Batch C - Checkpoint Recovery / No-Location Fallback
- P1: CMS Polish
- P2: Refactor server.py

## Credentials
- Admin: admin / admin123
- QR codes: AJPL-DEFAULT, YASH-DEFAULT
