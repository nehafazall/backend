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
1. Mentor CRM revenue scoped to logged-in user (non-super-admin sees only own data)
2. Super Admin mentor reassignment via student card dropdown menu
3. Mentor list includes mentor, master_of_academics, academic_master roles
4. Net Revenue dialog tested and verified working

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

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **Edwin (MoA):** edwin@clt-academy.com
- **CS Head:** falja@clt-academy.com / Falja@123
