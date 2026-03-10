# Yash Ornaments WayFinder - Product Requirements Document

## Overview
Navigation PWA guiding customers from various Chandni Chowk origins to Yash Ornaments / AJPL. QR-driven sessions, step-by-step checkpoint navigation, helpdesk support, admin CMS, media management, and schematic map visualization.

## Tech Stack
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React (CRA + Craco) on port 3000
- **Database**: MongoDB (motor driver)
- **Auth**: JWT with RBAC (admin, helpdesk, trainer)
- **Package Manager**: yarn (yarn.lock committed, no npm lockfile)
- **3rd Party**: OpenAI GPT via Emergent LLM Key

## Roles
- **Admin**: Full access
- **Trainer**: Route/checkpoint/media authoring (no user mgmt, no route deletion, no media deletion)
- **Helpdesk**: Case management
- **Customer**: Public navigation

## What's Implemented

### Phase 1 + 1R: Hardening & Reproducibility
- JWT role-based endpoint security, fail-fast JWT_SECRET in production
- Clean `yarn install --frozen-lockfile` + `yarn build` pipeline
- Proper `pytest.skip()` for optional deps in test_core_llm.py
- Responsive admin sidebar (Sheet component for mobile)
- date-fns/ajv dependency conflicts resolved

### Phase 2: Admin Route CMS
- Full Route CRUD: create, edit, publish/unpublish/archive, delete, duplicate
- Route JSON export/import
- Checkpoint CRUD with field-level validation
- Drag-and-drop reorder via @dnd-kit (persisted via API)
- Checkpoint duplicate
- AlertDialog confirmations for all destructive actions
- Role enforcement: admin-only route deletion
- Gurudwara added as 6th origin with 6 checkpoints

### Phase 3: Media UX & Management
- Drag-and-drop multi-file upload zone
- Multi-file queue with per-file progress, retry, cancel
- File type/size validation (50MB max, images + videos only)
- Media library with search, type filter, route filter
- Grid and list view toggle
- Lazy-loaded thumbnails, watermark badges
- AlertDialog for delete confirmation
- Trainers can upload but cannot delete (admin-only)

### Phase 4: Multi-Origin Schematic Map
- DB-driven schematic map auto-generated from published routes
- Metro-style SVG rendering: 5 origins (Metro, Red Fort, Omaxe, Town Hall, Gurudwara) converging to destination
- Route selector dropdown + legend buttons for switching
- Current checkpoint highlighting with pulse animation
- Completed segment tracking
- List-view fallback for accessibility
- Public endpoint: `/api/map/schematic`
- Customer page: `/schematic`

## Key API Endpoints
- `POST /api/auth/login` - JWT auth
- `GET /api/routes` - Public published routes only
- `GET /api/map/schematic` - Schematic map data (public)
- `POST /api/admin/routes/{id}/duplicate` - Duplicate route
- `GET /api/admin/routes/{id}/export` - Export JSON
- `POST /api/admin/routes/import` - Import JSON
- `POST /api/admin/checkpoints/reorder` - Bulk reorder
- `POST /api/admin/checkpoints/{id}/duplicate` - Duplicate checkpoint
- `GET /api/admin/media` - Library with search/filter params
- `POST /api/media/upload` - Upload with validation (admin/trainer)

## Routes (6 Published)
1. Metro Gate 5 (metro) - 7 CPs, 12min
2. Red Fort Side (red_fort) - 7 CPs, 18min
3. Omaxe Mall (omaxe) - 5 CPs, 10min
4. Town Hall (town_hall) - 6 CPs, 15min
5. Building Entrance (building_entrance) - 3 CPs, 3min
6. Gurudwara Sis Ganj (gurudwara) - 6 CPs, 14min

## Test Credentials
- Admin: admin / admin123
- Trainer: trainer1 / admin123
- Helpdesk: helpdesk1 / admin123

### Tutorial PDF Generator
- Bilingual (Hindi + English) 15-page PDF with 10 embedded screenshots
- Covers: app scope, user roles, login, routes, checkpoints, media upload, media library, schematic map, customer flow, bug testing checklist, quick reference card
- Written in simple language ("like teaching a 5-year-old")
- Accessible from admin sidebar: "Tutorial PDF" page with one-click download
- Backend: `/api/admin/tutorial/download` (admin/trainer only, helpdesk blocked)
- Generated on-the-fly using ReportLab with FreeSans (Devanagari-capable) fonts

## Remaining / Backlog
- **Route Preview mode**: Admin/trainer simulate customer journey without real sessions
- **Admin map metadata editor**: Let admin fine-tune node positions in the schematic
- **server.py refactoring**: Split into modular APIRouter files
- **PWA enhancements**: Offline support, push notifications
- **Real OTP delivery**: Currently DEV_MODE bypass only

## Key Files
- `/app/backend/server.py` - All API endpoints (~1750 lines)
- `/app/frontend/src/pages/AdminRoutes.jsx` - Route CMS with DnD
- `/app/frontend/src/pages/AdminMediaManagement.jsx` - Media library
- `/app/frontend/src/pages/SchematicMapPage.jsx` - SVG schematic map
- `/app/frontend/src/lib/api.js` - API client
- `/app/backend/seed_data.py` - Seeder with 6 routes including Gurudwara
- `/app/backend/tests/` - Backend test files
