# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Sidebar Navigation Fix (Complete — Mar 25, 2026)
- Fixed critical bug: clicking links shared across sections (e.g. "My Commissions" in CS) no longer jumps to a different section (e.g. Sales)
- Navigation now prioritizes the currently active section when matching paths
- Applies to all shared paths: `/commission-dashboard`, `/dashboard`, etc.

### CS Dashboard: Commission & Net Pay (Complete — Mar 25, 2026)
- 5-box commission summary for CS Head: Agent Commission, Head Commission, Total Commission, Base Salary, Net Pay
- Fixed commission table showing 0 (was using `agent_commission` field instead of `cs_commission`)
- Fetches salary from `/commissions/scatter-data` endpoint for Net Pay calculation
- CS agents see: Agent Commission, Base Salary, Net Pay (3 boxes)

### CS CRM Pagination Fix (Complete — Mar 25, 2026)
- Fixed Kanban `perStageLimit` from hardcoded 25 to respect `pageSize` state (default 50)

### Anzil Transfer (Complete — Mar 25, 2026)
- Role changed from `cs_agent` to `quality_control`
- 6 students reassigned: 3 to Della, 3 to Falja

### CRM Kanban Enhancements (Complete — Mar 25, 2026)
- "My Leads" / "Team Overview" toggle on Sales CRM for team leaders/heads
- Default "This Month" filter on all CRM Kanban boards
- Unified date filter: `date_field=any` shows leads created OR enrolled in period

### Lead Closure Time Tracking (Complete — Mar 25, 2026)
- Tracks `closure_days` from assignment to enrollment
- Backfilled 976 existing leads
- `GET /api/dashboard/closure-time` endpoint with role-based visibility
- Closure Time Analytics table on Sales Dashboard

### Commission Engine (Complete)
- Per-transaction CEO approval workflow
- Auto-trigger on enrollment/CS upgrade
- CS commission transactions generated (77 records)
- Course + Addon decomposition logic

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Team Leader (Ajmal): ajmal@clt-academy.com / Ajmal@123
- Sales Exec: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
