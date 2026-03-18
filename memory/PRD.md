# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive ERP system for CLT Academy with role-based dashboards, sales CRM, mentor management, HR modules, and commission tracking.

## Core Architecture
- **Frontend:** React + Shadcn/UI + TailwindCSS
- **Backend:** FastAPI + MongoDB Atlas (production)
- **Auth:** JWT-based with role-based access control

## Implemented Features

### Course Catalog System
- `course_catalog` collection: types `course`, `addon`, `upgrade`
- Per-course commission: sales_executive, team_leader, sales_manager
- Bulk actions: Delete, Activate, Deactivate
- Role-based visibility: Sales sees courses+addons, CS sees upgrades+addons

### Course & Add-on Split Selection (Sales CRM)
- Course dropdown + Add-on checkboxes with auto-calculated price breakdown
- Stored on lead: `selected_addons`, `course_value`, `addons_value`

### Historical Import — Two-Step Preview & Confirm
- Step 1 (Preview): Parse Excel, validate each row in-memory (pre-loaded users/teams/phones), return row-by-row status
- Step 2 (Confirm): Only valid rows pushed after user review
- Optimized: in-memory lookups, processes 133 rows in ~3 seconds
- Template: 4 sheets with Course Amount, Add-ons, Add-on Amount, commission columns

### Other Features
- Mentor Dashboard eye-toggle, salary display
- Sales Dashboard commission module
- Password management (admin view + history)
- Duplicate lead detection & merge
- Google Sheets connector

## Key API Endpoints
- `GET /api/course-catalog` — Role-filtered with commission
- `POST /api/course-catalog/bulk-action` — Bulk operations
- `POST /api/import/historical-sales-xlsx/preview` — Validate, returns preview_id
- `POST /api/import/historical-sales-xlsx/confirm/{preview_id}` — Push valid rows
- `GET /api/import/templates/historical-sales/download` — 4-sheet template

## Database
- `course_catalog` — name, price, type, is_active, commission fields
- `import_previews` — Stores validated rows (1-hour TTL)
- `leads` — selected_addons, course_value, addons_value, addons_names

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Sales: kiran@clt-academy.com / @Aqib1234
- Mentor Lead: edwin@clt-academy.com / Edwin@123

## Backlog
- Wire per-course commission into Sales Dashboard earnings
- Refactor server.py into route modules
- Payslip generation
- Google Ads API integration
- Fix Babel RangeError (recurring)
- Post-deployment: Google Sheets redirect_uri, tighten CORS
