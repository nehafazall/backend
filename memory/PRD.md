# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive ERP system for CLT Academy with role-based dashboards, sales CRM, mentor management, HR modules, and commission tracking.

## Core Architecture
- **Frontend:** React + Shadcn/UI + TailwindCSS + Recharts
- **Backend:** FastAPI + MongoDB Atlas (production)
- **Auth:** JWT-based with role-based access control

## Implemented Features

### Overall Dashboard (NEW - Mar 2026)
Comprehensive dashboard at `/dashboard` for super_admin/admin with:
- Revenue KPI cards: Overall, Sales, CS, Mentors with % change vs last month
- Treasury: In Bank, Pending Settlements, Monthly Expenses
- Monthly Revenue Trend (6-month area chart, split by department)
- Revenue Bifurcation bar chart (Sales vs CS vs Mentors)
- This Month vs Last Month comparison cards
- Top 5 Sales, Top 3 CS, Top 3 Mentors performers
- HR: Active employees count, Gender bifurcation pie chart, Attendance today
- Document Expiry alerts (next 60 days)
- Recent Enrollments feed, SLA breaches, Pending verifications
- Optimized with `asyncio.gather` (~4s response, down from 10s)

### Bug Fix: Sales Not Showing in Dashboard (Mar 2026)
**Root Causes (3 issues):**
1. Enrollments never created `ltv_transactions` → "Today Transactions" was always empty for sales
2. `enrolled_today` count used `updated_at` instead of `enrolled_at` → showed 147 instead of actual 3
3. `sales-by-course` grouped by `course_id` and looked up old `courses` collection → showed "Not Specified" instead of proper names

**Fixes Applied:**
- Create `ltv_transaction` record on enrollment (in `update_lead`)
- Enhanced `today-transactions` endpoint to also pull from `leads` with `enrolled_at` today
- Fixed `enrolled_today` to filter on `enrolled_at` not `updated_at`
- Rewrote `sales-by-course` to group by display name, including `course_of_interest` fallback

### Previous Features (Still Active)
- Course Catalog System (course_catalog collection)
- Course & Add-on Split Selection
- Historical Import (Two-Step Preview & Confirm)
- Super Admin Lead Assignment (bypass round-robin)
- Customer Master Sorting (Total Spent)
- Rejected Leads to Pool
- Duplicate Lead Detection & Merge
- enrolled_at + enrollment_amount set on enrollment

## Key API Endpoints
- `GET /api/dashboard/overall` — Comprehensive dashboard (super_admin/admin only)
- `GET /api/dashboard/today-transactions` — Includes enrollments + ltv_transactions
- `GET /api/dashboard/sales-by-course` — Groups by course display name
- `GET /api/dashboard/stats` — Main stats (enrolled_today uses enrolled_at)
- `POST /api/leads` — Super admin can include assigned_to
- `PUT /api/leads/{id}` — Sets enrolled_at, creates ltv_transaction on enrollment

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Sales: kiran@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123

## Backlog (Prioritized)
- P1: Wire per-course commission into Sales Dashboard earnings
- P1: Post-deployment: Google Sheets redirect_uri, tighten CORS
- P2: Refactor server.py into route modules (24K+ lines)
- P2: Dynamic commission structure UI
- P2: Payslip generation
- P2: Google Ads API integration
- P2: Fix Babel RangeError (recurring)
