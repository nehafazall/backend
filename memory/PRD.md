# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Cross-Mentor Deposits & Effort-Based Bonus (Complete — Mar 25, 2026)
- New page at /mentor/cross-deposits for recording deposits mentors secure for other mentors' students
- Backend CRUD: GET/POST /api/mentor/cross-deposits, GET /api/mentor/cross-deposits/search-student, GET /api/mentor/effort-summary
- Effort summary cards: Own Deposits, Cross-Mentor Deposits, Total Effort, Bonus Status
- Bonus progress bar with 5 tiers ($10K/10%, $20K/15%, $30K/17.5%, $40K/20%, $50K/25%)
- Effort Leaderboard for admins/Master of Academics
- Bonus calculation updated to effort-based: includes own deposits + cross-mentor deposits
- Sidebar link added under Academics section
- Testing: 100% pass rate (21/21 backend + all frontend verified)

### Mentor Dashboard Commission Breakdown (Complete — Mar 25, 2026)
- Commission card displays: Flat (1% of deposits), Net (1% of net), Team Override (0.5%), Total
- Sensitive data toggle (eye icon) for privacy
- Team Override only visible for Master of Academics role

### Customer Master Auto-Population (Complete — Mar 25, 2026)
- Fixed enrollment flow to pass sale_amount as payment data to create_or_update_customer
- Backfilled 976 enrolled leads with proper revenue, course names, LTV

### Sidebar Navigation Fix (Complete — Mar 25, 2026)
- Fixed section switching bug: shared paths no longer jump between sections

### CS Dashboard: Commission & Net Pay (Complete — Mar 25, 2026)
- 5-box summary: Agent Commission, Head Commission, Total Commission, Base Salary, Net Pay

### CRM Kanban Enhancements (Complete — Mar 25, 2026)
- "My Leads" / "Team Overview" toggle for team leaders/heads
- Default "This Month" filter, CS CRM pagination fixed (25 to 50)

### Lead Closure Time Tracking (Complete — Mar 25, 2026)
- closure_days tracked on enrollment, backfilled 976 leads

### Commission Engine (Complete)
- Per-transaction CEO approval, auto-trigger, CS commission transactions
- Course + Addon decomposition, rate corrections

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
- BD Manager: rashidha@clt-academy.com / Rasha@123

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
