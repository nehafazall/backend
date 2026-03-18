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
4. **Historical Import** — Excel upload with round-robin assignment for CS/Mentors
5. **User Management** — Password visibility, history tracking
6. **Course Catalog** — Manage courses, add-ons, upgrades with per-course commission and bulk actions
7. **HR Module** — Employee master, salary structures
8. **Operations** — Teams, departments, SLA management

## Implemented Features (Latest Session)

### Course Catalog System (NEW)
- **Collection:** `course_catalog` with types: `course`, `addon`, `upgrade`
- **Commission per item:** `commission_sales_executive`, `commission_team_leader`, `commission_sales_manager`
- **Bulk actions:** Delete, Activate, Deactivate via checkbox multi-select
- **Role-based visibility:** Sales sees courses+addons, CS sees upgrades+addons, Admin sees all
- **22 seeded items:** 10 courses, 6 add-ons, 6 upgrades

### Course & Add-on Split Selection (Sales CRM)
- Course dropdown + Add-on checkboxes (separate from courses)
- Auto-calculated price breakdown: Course Price + Add-on Prices = Estimated Total
- Stored on lead: `selected_addons`, `course_value`, `addons_value`

### Historical Import Template Update
- **Sheet 1:** Full Name, Phone, Course Enrolled, Course Amount, Add-ons, Add-on Amount, Agent Name, Team Name, Enrolled Amount, Date, Email, Country, City, Source
- **Sheet 2:** Courses & Prices (with Commission SE/TL/SM columns)
- **Sheet 3:** Add-ons & Prices
- **Sheet 4:** Teams & Agents

### Previous Session Features
- Mentor Dashboard eye-toggle, salary display
- Sales Dashboard commission module
- Historical Sales Data Import with round-robin
- Password management (admin view + history)
- Duplicate lead detection & merge
- Deployment issue resolution (MongoDB Atlas)

## Key API Endpoints
- `GET /api/course-catalog` — Role-filtered catalog
- `POST /api/course-catalog` — Create with commission
- `PUT /api/course-catalog/{id}` — Update
- `DELETE /api/course-catalog/{id}` — Delete single
- `POST /api/course-catalog/bulk-action` — Bulk delete/activate/deactivate
- `GET /api/import/templates/historical-sales/download` — Updated template

## Database Collections
- `course_catalog` — id, name, price, type, is_active, commission_sales_executive, commission_team_leader, commission_sales_manager
- `leads` — Added: selected_addons, course_value, addons_value
- `students` — Added: course_value, addons_value, addons_names

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Sales Executive: kiran@clt-academy.com / @Aqib1234
- Mentor Lead: edwin@clt-academy.com / Edwin@123

## Backlog (P2)
- Refactor server.py into domain-specific route files
- Payslip generation
- Google Ads API integration
- Fix Babel RangeError (recurring)
- Post-deployment: Update Google Sheets redirect_uri, tighten CORS
