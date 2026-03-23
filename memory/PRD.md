# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, and Finance departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~25K lines)
- **Frontend:** React + Shadcn UI + Recharts
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler

## What's Been Implemented

### Latest Session (March 23, 2026)
1. **Dashboard Operational KPI Row** - Added 6 clickable KPI cards: Active Pipeline (→/sales), New Leads Today (→dialog), Pending Activations (→/cs), Mentor Students (→/mentor), Enrolled YTD (994), Enrolled MTD (dynamic).
2. **New Leads Today Dialog** - Clicking "New Leads Today" card opens a table dialog showing all leads created today with name, phone, source, assigned agent, and stage.
3. **YTD/MTD Enrolled Counts** - Enrolled YTD hardcoded to 994, Enrolled MTD dynamically counts this month's enrollments from DB.
4. **Mentor Revenue AED Fix (Dashboard)** - Fixed Overall Dashboard to aggregate `amount_aed` instead of `amount` (USD) for mentor_redeposits. Also changed period filtering from `created_at` (seed date) to `date` (actual date) for accurate time-based filtering.
5. **Mentor Revenue AED Fix (CRM)** - Fixed `/mentor/revenue-summary` and `/mentor/redeposits/summary` endpoints to use `amount_aed` with fallback. Added `unique_students` to revenue-summary response. MentorCRM banner now shows rounded AED values.
6. **Enrolled Leads Descending Sort** - Backend sorts enrolled leads by `enrolled_at` desc. Frontend KanbanColumn also sorts enrolled stage by `enrolled_at` desc for correct display order.
7. **Advanced Sales Search Fallback** - When search yields no results in Sales CRM, a deep search panel appears with a "Search All Leads" button that searches by phone, email, and name across all leads.

### Previous Sessions (March 19, 2026)
- Dashboard verification (iteration_58 100% pass)
- Custom Date Range Picker for Overall Dashboard
- Sales Dashboard Top 10 Agents vertical bar chart
- Course Catalog Upgrade Commissions
- Mentor Historical Import (Excel 3-sheet template)
- Double-Count Bug Fix (enrolled_at reset)
- CS Dashboard Kanban Runtime Error fix
- Data Issue: Corrected malformed dates in cs_upgrades
- 7 SMTP Email Templates
- CS Historical Import 4th sheet
- Student Export Excel endpoint
- Mentor Dashboard Bonus calculation fix

## Revenue Verification (March 23, 2026)
| Period | Sales | CS | Academics | Total |
|--------|-------|-----|-----------|-------|
| This Month | AED 299,065 | AED 65,903 | AED 113,828 | AED 478,796 |

## Prioritized Backlog
### P0 - COMPLETED
- Dashboard operational KPI buttons with navigation
- New Leads Today dialog
- YTD/MTD enrolled counts
- Mentor revenue AED fix (Dashboard + CRM)
- Advanced Sales Search Fallback
- Enrolled leads descending sort

### P1
- Per-Course Commission Calculation (wire commission fields into Sales Dashboard "My Earnings")
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)
- LAMIZ Revenue Data investigation (currently `new_lead` stage with no revenue fields - may need user clarification)

### P2
- Refactor `server.py` into domain-driven route files
- Admin UI for dynamic commission configuration
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)
- Visually confirm Duplicate Lead Merge Dialog

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **Sales Executive:** kiran@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
