# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, Finance, Business Development, Reporting, and Analytics.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~26K lines)
- **Frontend:** React + Shadcn UI + Recharts + react-window + reportlab (PDF)
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler, 3CX
- **Performance:** GZip compression, MongoDB indexes, server-side pagination

## What's Been Implemented

### Session - March 23, 2026

**Batch 7 - Five New Features (Iteration 67: 100% pass)**
- **Notification Center**: Bell icon in header with popover panel, unread badge, mark read/all, 30s polling, notification types (info/success/warning/error/transfer/finance/certificate)
- **Certificate Generation**: PDF via reportlab — CLT Academy branding (red/black corner accents, dual signatures COO+CEO, award emblem), types (Course Completion, Star Performer, Excellence, Best Trader, Achievement), download + history
- **Report Builder**: 6 data sources (leads, students, cs_upgrades, mentor_redeposits, users, certificates), checkbox field selection, text/date filters, sort, limit, CSV export
- **Revenue Forecasting**: 6-month historical (enrollments + upgrades + redeposits), 3-month projections, pipeline analysis, KPIs (avg monthly, growth rate, conversion rate), trend + stacked bar charts
- **Student Portal Embed**: iframe of main.clt-academy.com/admin/students in CS section with "Open in New Tab" option

**Batch 6 - Performance + CS Bug (Iteration 66: 100% pass)**
- Pagination (25/50/100) across all 4 Kanbans — 98% payload reduction
- GZip compression, MongoDB indexes
- CS transfer bug fix (StudentUpdate missing cs_agent_name)

**Batch 5 - BD Call Center (Iteration 65: 100% pass)**
- 3CX ClickToCall in BD CRM, follow-up notes system, reminders, call recordings

**Batch 4 - Transaction History (Iteration 64: pass)**
- Unified transaction history across CS/Mentor/BD modals
- BD Dashboard visibility controls (revenue hidden from BD agents)

**Batch 3 - BD Module (Iteration 63: 100% pass)**
- Full BD CRM Kanban + Dashboard, round-robin assignment, redeposits

### Previous Sessions
- Universal Period Filter, Mentor Scoping & Reassignment
- Dashboard KPIs, Monthly Closings, Customer Master Net LTV
- Sales Search Fallback, Currency AED fix, CS Upgrade Dates

### Session - March 24, 2026

**Bug Fix - LAMIZ Data Discrepancy (P0)**
- Fixed student "LAMIZ" (ID: 2f8ebfcb) enrollment amount showing 4104 instead of 2204
- Root cause: `leads.enrollment_amount`, `ltv_transactions.amount` had incorrect value (4104) while `payment_amount` was correct (2204)
- Fixed all 3 collections: `leads`, `ltv_transactions`, `students` — all now show 2204.0 AED
- Verified via API: dashboard/overall, student transaction-history, and direct DB queries

**Bug Fix - Nasida VN Dashboard Transactions Missing (P0)**
- 2 new CS upgrade transactions (Thasleem: 1600, Kassim Kunju: 3899) not reflected on dashboard
- Root cause: `confirm_upgrade` endpoint created `ltv_transactions` but never inserted into `cs_upgrades` — which is the collection the dashboard aggregates from
- Code fix: Added `cs_upgrades` insert to `/api/cs/confirm-upgrade/{student_id}` endpoint
- Data fix: Backfilled 2 missing `cs_upgrades` records
- Nasida VN now shows 33,495 AED (11 upgrades), CS Revenue updated to 71,402 AED (27 upgrades)

**Bug Fix - CS Kanban Pitched Upgrade Students Disappearing on Refresh (P0)**
- Students added to "Pitched Upgrade" stage disappeared on page refresh
- Root cause (2 issues):
  1. Default view was `my_work` for CS Head/Admin, filtering by their own agent ID — hiding other agents' students
  2. Global pagination (50 per page) loaded only newest 50 students, burying older stage entries
- Fix: Changed default view to `team` for CS Head and Super Admin roles
- Fix: Implemented per-stage Kanban fetching (25 students per column, parallel API calls) — ensures all pipeline stages always show their students
- Verified: "Pitched Upgrade" column now shows 2 students (Akhil Madhu, Hussain PS) correctly

**Bug Fix - Transaction History Duplication / Dashboard Mismatch (P0)**
- Student card showed duplicate upgrade entries (same upgrade from both cs_upgrades AND ltv_transactions)
- Users saw 2 entries on card but leaderboard counted 1, causing confusion about "missing" dashboard data
- Fix: Skipped `type="upgrade"` from ltv_transactions in `/students/{id}/transaction-history` endpoint (canonical source is cs_upgrades)
- Vighanesh total_deposits corrected: 11,632 (inflated) → 7,733 (accurate)

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate professional PDF invoices for enrollments/upgrades
- WhatsApp Integration — Send templated messages via WhatsApp Business API
- Build UI for admins to dynamically configure commission structures

### P2
- Executive Dashboard (CEO View) — Single page high-level overview
- Workflow Automation Engine (Trigger-based actions)
- Scheduled Email Reports — Auto-send daily/weekly revenue summaries to managers
- Refactor `server.py` into domain-driven route files
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)

### P3
- Payslip generation feature
- Google Ads API integration
- Email campaign system
- Student self-service portal
- Auto lead scoring
- Document management

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
- **BD Agent (Rashida):** rashidha@clt-academy.com / Rashida@123
- **BD Agent (Farsana):** farsana@clt-academy.com / Farsana@123
