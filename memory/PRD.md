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

### Historical Import - Two-Step Preview & Confirm
- Step 1 (Preview): Parse Excel, validate each row in-memory
- Step 2 (Confirm): Only valid rows pushed after user review
- Optimized: in-memory lookups, processes 133 rows in ~3 seconds
- Historical imports now create Customer Master records

### Super Admin Lead Assignment (NEW - Mar 2026)
- When super_admin creates a lead, they can assign it directly to any sales agent
- Bypasses automatic round-robin distribution
- Frontend shows agent selection dropdown only for super_admin role
- Default option: "Auto (Round Robin)"

### Customer Master Sorting (NEW - Mar 2026)
- "Total Spent" column header is clickable/sortable (ascending/descending)
- Backend supports `sort_by` and `sort_order` query parameters
- Allowed sort fields: created_at, total_spent, full_name, transaction_count
- Historical sales imports now create/update customer records

### Rejected Leads to Pool (NEW - Mar 2026)
- When a lead stage is set to "rejected" or "not_interested", it auto-moves to Leads Pool
- Sets `in_pool: True` and records assignment_history
- Pool query includes rejected/not_interested leads

### Duplicate Lead Detection & Merge (Confirmed Working - Mar 2026)
- Creating a lead with existing phone returns 409 with duplicate info
- Frontend shows merge dialog with existing lead details
- Merge fills in missing fields only

### Other Features
- Mentor Dashboard eye-toggle, salary display
- Sales Dashboard commission module
- Password management (admin view + history)
- Google Sheets connector
- CS Historical Import (separate page with Excel template)

## Key API Endpoints
- `GET /api/course-catalog` - Role-filtered with commission
- `POST /api/course-catalog/bulk-action` - Bulk operations
- `POST /api/import/historical-sales-xlsx/preview` - Validate
- `POST /api/import/historical-sales-xlsx/confirm/{preview_id}` - Push valid rows
- `GET /api/customers?sort_by=total_spent&sort_order=desc` - Sortable customers
- `POST /api/leads` - Create lead (super_admin can include assigned_to)
- `GET /api/leads/pool` - Includes rejected leads
- `PUT /api/leads/{id}` - Stage changes; rejected -> auto pool

## Database
- `course_catalog` - name, price, type, is_active, commission fields
- `import_previews` - Stores validated rows (1-hour TTL)
- `leads` - selected_addons, course_value, addons_value, assigned_to
- `customers` - total_spent, transaction_count, transactions array

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Sales: kiran@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Mentor Lead: edwin@clt-academy.com / Edwin@123

## Backlog (Prioritized)
- P1: Wire per-course commission into Sales Dashboard earnings
- P1: Post-deployment: Google Sheets redirect_uri, tighten CORS
- P1: User verification for Google Sheets redirect_uri fix
- P2: Refactor server.py into route modules
- P2: Dynamic commission structure UI
- P2: Payslip generation
- P2: Google Ads API integration
- P2: Fix Babel RangeError (recurring)
