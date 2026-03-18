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
- Role-based visibility

### Course & Add-on Split Selection (Sales CRM)
- Course dropdown + Add-on checkboxes with auto-calculated price breakdown

### Historical Import - Two-Step Preview & Confirm
- Step 1 (Preview): Parse Excel, validate each row in-memory
- Step 2 (Confirm): Only valid rows pushed after user review
- Historical imports now create Customer Master records

### Super Admin Lead Assignment (Mar 2026)
- Super admin bypasses round-robin, assigns leads directly to any sales agent
- Agent selection dropdown in create lead form (super_admin only)

### Customer Master Sorting (Mar 2026)
- "Total Spent" column sortable (ASC/DESC via clickable header)
- Backend `sort_by` and `sort_order` query params

### Rejected Leads to Pool (Mar 2026)
- Rejecting a lead sets `in_pool: True`, appears in Leads Pool

### Duplicate Lead Detection & Merge (Confirmed Mar 2026)
- 409 response on duplicate phone, merge dialog in frontend

### Bug Fix: enrolled_at Not Set (Mar 2026)
**Root Cause:** Two issues:
1. `enrolled_at` was never set when a lead transitioned to "enrolled" stage via `update_lead`
2. `LeadResponse` Pydantic model had `extra="ignore"` and didn't include `enrolled_at`, `enrollment_amount`, `team_name`, etc. — so even after DB writes, the API response stripped these fields

**Fix:** 
- Added `enrolled_at = now.isoformat()` and `enrollment_amount = sale_amount` to the enrollment block in `update_lead`
- Added missing fields to `LeadResponse` model
- Patched existing Selvakumar record directly in Atlas DB

## Key API Endpoints
- `GET /api/leads` - response_model=List[LeadResponse]
- `POST /api/leads` - response_model=LeadResponse, super_admin can include assigned_to
- `PUT /api/leads/{id}` - response_model=LeadResponse, sets enrolled_at on enrollment
- `GET /api/customers?sort_by=total_spent&sort_order=desc`
- `GET /api/leads/pool` - Includes rejected leads
- Course catalog, import endpoints (unchanged)

## Database
- `course_catalog` - name, price, type, is_active, commission fields
- `import_previews` - Validated rows (1-hour TTL)
- `leads` - enrolled_at, enrollment_amount, selected_addons, course_value, addons_value
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
- P2: Refactor server.py into route modules (critical — 24K+ lines)
- P2: Dynamic commission structure UI
- P2: Payslip generation
- P2: Google Ads API integration
- P2: Fix Babel RangeError (recurring)
