# Yash Ornaments WayFinder - Product Requirements Document

## Overview
A navigation PWA that guides customers from various origin points in Chandni Chowk, Delhi to Yash Ornaments / AJPL jewellery stores. Features QR-code-driven session creation, step-by-step checkpoint navigation, helpdesk support, and admin management tools.

## Tech Stack
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React (CRA + Craco) on port 3000
- **Database**: MongoDB (motor driver)
- **Auth**: JWT with role-based access (admin, helpdesk, trainer)
- **Package Manager**: yarn (with yarn.lock committed)
- **3rd Party**: OpenAI GPT via Emergent LLM Key for checkpoint text suggestions

## Users / Roles
- **Admin**: Full access to all features
- **Trainer**: Route/checkpoint/media authoring (no user management, no route deletion)
- **Helpdesk**: Case management, callback handling
- **Customer**: Public navigation flow via QR scan

## Core Requirements
1. QR code scan -> session creation -> route selection -> checkpoint-by-checkpoint navigation -> arrival
2. Multiple origin routes converging to a single destination (Yash Complex, 5th Floor)
3. Admin CMS for route/checkpoint lifecycle management
4. Helpdesk real-time notifications (SSE) for customer assistance
5. Media management with automatic watermarking
6. Gold rate display, gallery (AJPL-specific features)

## Data Model
- **Businesses**: AJPL (retail), Yash Ornaments (wholesale)
- **Routes**: 6 published origins (Metro, Red Fort, Omaxe, Town Hall, Building Entrance, Gurudwara)
- **Checkpoints**: Ordered steps per route with media, directions, risk levels
- **Sessions**: Customer navigation tracking
- **QR Sources**: Business-linked QR codes with campaigns

## What's Been Implemented

### Phase 1 (Previous Session): Hardening & Dependencies
- Secured all endpoints with JWT role checks
- Fixed route-scoping in where-am-i
- Fixed date filter in analytics
- Resolved date-fns/react-day-picker and ajv build conflicts
- Responsive admin sidebar (Sheet component for mobile)

### Phase 1R (Current Session): Reproducibility + Bug Closure
- JWT_SECRET fails fast in production if not set (DEV_MODE only allows random fallback)
- Test harness portability: test_core_llm.py uses relative paths, graceful skip for missing deps
- backend_test.py cleaned for cross-platform safety (no emoji encoding issues)
- Build verified: `yarn install --frozen-lockfile` + `yarn build` succeed cleanly

### Phase 2 (Current Session): Admin Route CMS
- **Full Route CRUD**: Create, edit, publish, unpublish, archive, delete with UI forms
- **Route Operations**: Duplicate (creates draft copy), Export JSON, Import JSON
- **Checkpoint CRUD**: Add/edit/delete with field-level validation
- **Drag-and-Drop Reorder**: @dnd-kit sortable checkpoints, persisted via API
- **Checkpoint Duplicate**: Creates copy at next order position
- **Confirmation Dialogs**: AlertDialog for all destructive actions
- **Inline Validation**: Route name required, checkpoint name + instruction required
- **Role Enforcement**: Only admin can delete routes; trainer can create/edit
- **Gurudwara Route**: Added as 6th published origin with 6 checkpoints
- **start_type**: Now includes 'gurudwara' in dropdown options

### New Backend Endpoints (Phase 2)
- `POST /api/admin/routes/{id}/duplicate` - Duplicate route + checkpoints
- `GET /api/admin/routes/{id}/export` - Export route as JSON
- `POST /api/admin/routes/import` - Import route from JSON
- `POST /api/admin/checkpoints/reorder` - Bulk reorder checkpoints
- `POST /api/admin/checkpoints/{id}/duplicate` - Duplicate single checkpoint

## Remaining Phases

### P1: Phase 3 - Media UX and Management
- Drag-drop + picker for checkpoint media
- Multi-file queue with progress, retry/cancel
- Media library with filter by route/checkpoint/type/date
- File type/size validation with clear messages
- Thumbnails/lazy loading

### P2: Phase 4 - Multi-Origin Schematic Map
- Metro-style SVG schematic map showing all origins converging to destination
- Data model for map nodes/edges/route paths in DB
- Customer-facing map UI with route switching, progress highlighting
- Mobile-first, accessibility fallback list view
- Admin tooling for map metadata

### Refactoring (Ongoing)
- Split server.py into modular APIRouter files (auth.py, admin.py, routes.py, etc.)

## Test Credentials
- **Admin**: username=admin, otp=admin123
- **Trainer**: username=trainer1, otp=admin123
- **Helpdesk**: username=helpdesk1, otp=admin123
- DEV_MODE=true enables admin123 bypass for all users

## Key Files
- `/app/backend/server.py` - All API endpoints (monolithic, ~1700 lines)
- `/app/backend/models.py` - Pydantic models
- `/app/backend/seed_data.py` - Database seeder with 6 routes + Gurudwara
- `/app/frontend/src/pages/AdminRoutes.jsx` - CMS page with DnD
- `/app/frontend/src/lib/api.js` - API client
- `/app/frontend/src/components/shared.jsx` - Shared components
- `/app/backend/tests/test_admin_routes_cms.py` - Phase 2 backend tests
