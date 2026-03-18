# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, and Finance departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~24K lines)
- **Frontend:** React + Shadcn UI + Recharts
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler

## What's Been Implemented

### Latest Session (March 18, 2026)
1. **Dashboard Time Period Filters** - 11 filter options (Today, Yesterday, This/Last Week, This/Last Month, This/Last Quarter, This/Last Year, All Time) with full backend support via `_get_date_range()` and dynamic period queries
2. **Performance Optimization** - TTLCache (60s TTL) for dashboard endpoints, pre-serialized JSON responses via orjson (5.5s→0.001s cached), user auth caching (30s), compound MongoDB indexes on leads/cs_upgrades/ltv_transactions/customers
3. **Customer Master Backfill** - 137 new customer records created from enrolled leads, 12 existing updated with transaction history
4. **Quick Reassign from Kanban** - Super admin can click agent name (blue text) on Sales/CS Kanban cards → dropdown shows available agents → instant reassignment without approval
5. **CS Historical Import Fix** - Fixed `import io` error, corrected field mapping (`course_amount`→`amount`, `upgraded_at`→`date`), auto-creates student records on import
6. **Team-wise Revenue Chart Fix** - Added `resolve_agent_team_name()` helper, patched 446 leads with missing team_name
7. **Top CS Performers Fix** - Fixed `agent_id`→`cs_agent_id` in aggregation query

### Previous Sessions
- Overall Dashboard with revenue, treasury, HR stats, top performers
- Sales recording bug fix (enrolled_at timestamp)
- Super Admin direct lead assignment
- Customer Master sorting
- API optimization with asyncio.gather

## Revenue Verification (March 18, 2026)
| Period | Sales | CS | Mentors | Total |
|--------|-------|-----|---------|-------|
| This Month | AED 225,898 | AED 61,693 | AED 0 | AED 287,591 |
| All Time | AED 488,152 | AED 198,592 | AED 0 | AED 686,744 |

## Prioritized Backlog
### P1
- Per-Course Commission Calculation
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)

### P2
- Refactor `server.py` into domain-driven route files
- Admin UI for dynamic commission configuration
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded`
- Visually confirm Duplicate Lead Merge Dialog

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **Sales Executive:** kiran@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
