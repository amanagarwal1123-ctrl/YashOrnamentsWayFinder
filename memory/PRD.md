# Yash Ornaments WayFinder - Product Requirements Document

## Original Problem Statement
A full-stack PWA (FastAPI, React, MongoDB) providing step-by-step navigation guidance for customers visiting Yash Ornaments in Chandni Chowk, Delhi. Pure wayfinding app.

## Core Features Implemented

### Batch A: Foundational Backend APIs (Complete)
### Batch B: Customer Flow UI (Complete)
### Batch D: Helpdesk Dashboard (Complete)
### Batch E: Admin Dashboard & Reports (Complete)
### Batch G: Offline Route Packs (Complete)
### UI/Content Cleanup (Complete - March 17, 2026)
### Streamlining to Pure Wayfinder (Complete - April 2, 2026)

### Clickable Checkpoints & Arrow Overlay (Complete - April 2, 2026)
- **Schematic Map**: All checkpoint nodes are clickable — opens detail dialog showing photo, direction icon, instructions, arrow overlays, risk warnings
- **List View**: Checkpoints also clickable with "Tap to view photo" hint
- **Admin Arrow Placement**: New ArrowPlacementEditor in checkpoint editor "Arrow Map" tab
  - 6 arrow types: Straight, Turn Left, Turn Right, Straight+Left, Straight+Right, Way Sign
  - Click on checkpoint photo to place arrows at precise positions
  - Click placed arrow to remove
  - Arrows stored as `direction_arrows` field: `[{x, y, type, rotation}]`
- **Customer View**: Arrow overlays rendered on checkpoint images during navigation via ArrowOverlayRenderer

## Pending / Upcoming

### P0: Batch C - Checkpoint Recovery / No-Location Fallback UI
### P1: Batch F - Remaining CMS Polish
### P2: Refactor server.py Monolith

## Test Credentials
- Admin: username `admin`, OTP `admin123`
- Helpdesk: username `helpdesk1`, OTP `admin123`
- Trainer: username `trainer1`, OTP `admin123`
- Customer QR codes: `AJPL-DEFAULT`, `YASH-DEFAULT`
