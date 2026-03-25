# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Customer Master Auto-Population (Complete — Mar 25, 2026)
- Fixed enrollment flow to pass sale_amount as payment data to create_or_update_customer
- Fixed CS upgrade flow to update customer master with upgrade revenue
- Backfilled 976 enrolled leads → customer records with proper revenue, course names, LTV
- Backfilled CS upgrade revenue into customer transaction histories
- All 976 enrolled leads linked to customer_master_id
- Only 7 zero-revenue records remain (all test data)

### Sidebar Navigation Fix (Complete — Mar 25, 2026)
- Fixed section switching bug: shared paths (e.g. /commission-dashboard) no longer jump between sections
- Prioritizes currently active section when matching paths

### CS Dashboard: Commission & Net Pay (Complete — Mar 25, 2026)
- 5-box summary: Agent Commission, Head Commission, Total Commission, Base Salary, Net Pay
- Fixed commission table showing 0 (wrong field reference)

### CRM Kanban Enhancements (Complete — Mar 25, 2026)
- "My Leads" / "Team Overview" toggle for team leaders/heads
- Default "This Month" filter on all CRM Kanban boards
- Unified date filter (date_field=any) shows created + enrolled leads together
- CS CRM pagination fixed (25 → 50 per stage)

### Lead Closure Time Tracking (Complete — Mar 25, 2026)
- closure_days tracked on enrollment, backfilled 976 leads
- GET /api/dashboard/closure-time endpoint with role-based visibility
- Closure Time Analytics table on Sales Dashboard

### Commission Engine (Complete)
- Per-transaction CEO approval, auto-trigger, CS commission transactions
- Course + Addon decomposition, rate corrections

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Team Leader (Ajmal): ajmal@clt-academy.com / Ajmal@123

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports, Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
