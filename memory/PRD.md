# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Salary Consistency Fix (Complete — Mar 25, 2026)
- Created `_get_employee_salary_aed()` helper in server.py for consistent salary lookups
- Priority: top-level `salary` (HR truth) > computed from structure components > fallback to gross/net
- Fixed effort-summary endpoint returning salary=0 (was querying wrong field)
- All mentor-related endpoints now use the same helper

### Mentor Leaderboard Rewrite (Complete — Mar 25, 2026)
- Leaderboard now ranks by total redeposit effort (own + cross-mentor deposits), NOT upgrades
- Uses `$addFields` aggregation to compute effective_effort_by (handles effort_by_id vs mentor_id)
- Columns: Rank, Mentor, Students, Deposits, Effort (USD/AED), Bonus Tier
- Removed old columns: Upgrades, Commission, Satisfaction, Score

### Cross-Mentor Deposits & Effort-Based Bonus (Complete — Mar 25, 2026)
- New page at /mentor/cross-deposits for recording deposits mentors secure for other mentors' students
- Backend CRUD: GET/POST /api/mentor/cross-deposits, search-student, effort-summary
- Effort summary cards, bonus progress bar with 5 tiers, effort leaderboard for admins
- Bonus calculation updated to effort-based: includes own deposits + cross-mentor deposits

### Mentor Dashboard Commission Breakdown (Complete — Mar 25, 2026)
- Commission card: Flat (1% of deposits), Net (1% of net), Team Override (0.5%), Total
- Sensitive data toggle for privacy

### Customer Master Auto-Population (Complete — Mar 25, 2026)
- Fixed enrollment/upgrade flows, backfilled 976 leads

### CS Dashboard: Commission & Net Pay (Complete — Mar 25, 2026)
- 5-box summary: Agent Commission, Head Commission, Total Commission, Base Salary, Net Pay

### CRM Kanban Enhancements (Complete — Mar 25, 2026)
- My Leads/Team Overview toggle, default This Month filter, pagination fix

### Lead Closure Time Tracking (Complete — Mar 25, 2026)
- closure_days tracked on enrollment, backfilled 976 leads

### Commission Engine (Complete)
- Per-transaction CEO approval, auto-trigger, CS commission transactions, course + addon decomposition

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
