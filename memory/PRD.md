# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, and Finance departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~25K lines)
- **Frontend:** React + Shadcn UI + Recharts
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler

## What's Been Implemented

### Session - March 23, 2026

**Batch 1 - P0 Fixes (Iteration 59: 100% pass)**
- Dashboard Operational KPI Row (6 clickable cards), New Leads Dialog, Mentor Revenue AED fix, Period filtering fix, Enrolled Sort, Sales Search Fallback

**Batch 2 - Mentor Closings, CS Dates, Customer LTV (Iteration 60: ~96% pass)**
- Mentor CRM Monthly Closings Dialog (Net Revenue + students table)
- CS Kanban Upgrade Date badge, Customer Master Net LTV with deposits/withdrawals

**Batch 3 - Mentor Scoping & Reassignment (Iteration 61: Backend 100%, Frontend 85%)**
- Mentor CRM revenue scoped to logged-in user (non-super-admin sees only own data)
- Super Admin mentor reassignment via student card dropdown menu

**Batch 4 - Universal Period Filter (Iteration 62: 100% pass)**
- Reusable `PeriodFilter` component: Today, Tomorrow, This Week, Last Week, This Month, Last Month, This Quarter, Last Quarter, This Year, Custom Range
- **Sales CRM**: 2 date field toggle (Lead Created / Enrolled)
- **Customer Service**: Filter by Upgrade Date (queries cs_upgrades collection)
- **Mentor CRM**: Filter by Deposit Date (queries mentor_redeposits collection)
- Backend supports `date_from`, `date_to`, `date_field` params on `/api/leads` and `/api/students`

### Previous Sessions
- Dashboard Custom Date Range, Top 10 Sales Chart, Course Commissions
- Mentor Historical Import, Double-Count Bug Fix, CS Runtime Error Fix
- SMTP Templates, Student Export, Mentor Bonus Fix

## Prioritized Backlog

### P1
- Per-Course Commission Calculation
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)

### P2
- Refactor `server.py` into domain-driven route files
- Admin UI for dynamic commission configuration
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)

## Key Components
- `/app/frontend/src/components/PeriodFilter.jsx` — Reusable period filter
- `/app/frontend/src/pages/SalesCRMPage.jsx` — Sales Kanban
- `/app/frontend/src/pages/CustomerServicePage.jsx` — CS Kanban
- `/app/frontend/src/pages/MentorCRMPage.jsx` — Mentor Kanban
- `/app/frontend/src/pages/BirdsEyeDashboard.jsx` — Overall Dashboard
- `/app/frontend/src/pages/CustomerMasterPage.jsx` — Customer Master with Net LTV

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **Edwin (MoA):** edwin@clt-academy.com
- **CS Head:** falja@clt-academy.com / Falja@123
