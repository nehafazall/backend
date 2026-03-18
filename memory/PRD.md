# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive ERP system for CLT Academy with role-based dashboards, sales CRM, mentor management, HR modules, and commission tracking.

## Core Architecture
- **Frontend:** React + Shadcn/UI + TailwindCSS
- **Backend:** FastAPI + MongoDB Atlas (production)
- **Auth:** JWT-based with role-based access control

## Key Modules
1. **Sales CRM** — Kanban pipeline, lead management, duplicate detection, course & addon selection
2. **Mentor Dashboard** — Commission tracking, eye-toggle for sensitive data, salary from HR
3. **Sales Dashboard** — Commission card with tiered salary structure
4. **Historical Import** — Two-step flow: Preview → Confirm. Excel upload with round-robin CS/Mentor assignment
5. **User Management** — Password visibility, history tracking
6. **Course Catalog** — Courses, add-ons, upgrades with per-course commission and bulk actions
7. **HR Module** — Employee master, salary structures
8. **Operations** — Teams, departments, SLA management

## Implemented Features

### Course Catalog System
- **Collection:** `course_catalog` with types: `course`, `addon`, `upgrade`
- **Commission per item:** `commission_sales_executive`, `commission_team_leader`, `commission_sales_manager`
- **Bulk actions:** Delete, Activate, Deactivate via checkbox multi-select
- **Role-based visibility:** Sales sees courses+addons, CS sees upgrades+addons, Admin sees all
- **22 seeded items:** 10 courses, 6 add-ons, 6 upgrades

### Course & Add-on Split Selection (Sales CRM)
- Course dropdown + Add-on checkboxes (separate from courses)
- Auto-calculated price breakdown: Course Price + Add-on Prices = Estimated Total
- Stored on lead: `selected_addons`, `course_value`, `addons_value`

### Historical Import — Two-Step Preview & Confirm
- **Step 1 (Preview):** Parse Excel, validate each row against DB (agents, teams, duplicates), return row-by-row status with errors. NO data written.
- **Step 2 (Confirm):** Only valid rows pushed to DB after user reviews and clicks Confirm.
- **Validation catches:** Missing fields, unknown agents/teams, duplicate phones (in DB & within file), NaN handling
- **Template:** 4 sheets — Sales Data (14 cols incl. Course Amount, Add-ons, Add-on Amount), Courses & Prices (with commission cols), Add-ons & Prices, Teams & Agents

### Previous Features
- Mentor Dashboard eye-toggle, salary display
- Sales Dashboard commission module
- Password management (admin view + history)
- Duplicate lead detection & merge
- Deployment issue resolution (MongoDB Atlas)

## Key API Endpoints
- `GET /api/course-catalog` — Role-filtered catalog with commission fields
- `POST /api/course-catalog` — Create with commission
- `POST /api/course-catalog/bulk-action` — Bulk delete/activate/deactivate
- `POST /api/import/historical-sales-xlsx/preview` — Validate file, return preview
- `POST /api/import/historical-sales-xlsx/confirm/{preview_id}` — Push valid rows
- `GET /api/import/templates/historical-sales/download` — Updated 4-sheet template

## Database Collections
- `course_catalog` — id, name, price, type, is_active, commission_sales_executive/team_leader/sales_manager
- `import_previews` — Stores validated rows for confirmation (1-hour TTL)
- `leads` — Added: selected_addons, course_value, addons_value, addons_names
- `students` — Added: course_value, addons_value, addons_names

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Sales Executive: kiran@clt-academy.com / @Aqib1234
- Mentor Lead: edwin@clt-academy.com / Edwin@123

## Backlog (P2)
- Wire per-course commission into Sales Dashboard earnings calculation
- Refactor server.py into domain-specific route files
- Payslip generation
- Google Ads API integration
- Fix Babel RangeError (recurring)
- Post-deployment: Update Google Sheets redirect_uri, tighten CORS
