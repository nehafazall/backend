# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 15, 2026)

### Completed: P0 Role-Based Dashboard Visibility Fix
- **Root Cause:** `Promise.all` in frontend caused entire dashboard to fail when a single API returned 403 (permission denied). The `/api/dashboard/sales-agent-closings` endpoint was restricted to admin/manager roles only.
- **Fix Applied:**
  1. Frontend already used `Promise.allSettled` (fix from previous session) to gracefully handle partial API failures
  2. Backend: Changed `sales-agent-closings` endpoint from `require_roles(['super_admin', 'admin', 'sales_manager'])` to `get_current_user` (all authenticated users)
- **Verification:** All 5 role-specific scenarios verified via automated testing (19 backend tests + Playwright frontend tests)
- **Visibility Rules Implemented:**
  - CS/Sales Agents: Individual stats in top-line cards, team-wide data in charts/leaderboards, drill-down disabled
  - CS Head / Team Leaders: Team-level stats and charts with drill-down enabled
  - CEO/Admins: Full unrestricted access with drill-down
  - Head Commission card hidden for non-managerial roles

### Previously Completed (March 14, 2026)
- SLA Management System (full CRUD, multi-level escalation, department filters)
- Operational Controls Frontend (Round Robin, Transfer Requests, Salary Estimation)
- Google Sheets Connector Fix (redirect_uri_mismatch + UI error)
- Dashboard Quick Stats Fix (Enrolled MTD accuracy)
- CS Data Import & Enhancement (147 upgrade records, course_level tracking, commission backfill)
- Role-Based Commission Visibility (Head Commission hidden for agents)

### Previously Completed (Earlier)
- Interactive Drill-Down Analytics V2 (All Dashboards)
- Auto Dark/Light Mode (GST+4)
- INR Currency in Finance Settings
- Enhanced Lead Pool (Assignment Tracking, Bulk Assign, History)
- Google Sheets Agent Connector (5-min sync)
- Backend for Dual-Approval Reassignments, CS Round Robin Time Window, Email Notifications

## Key API Endpoints
- SLA: `GET/POST/PUT/DELETE /api/sla/rules`
- CS Dashboard: `/api/cs/dashboard/stats`, `/api/cs/dashboard/agent-revenue`, `/api/cs/dashboard/monthly-trend`, `/api/cs/dashboard/month-comparison`, `/api/cs/dashboard/pipeline`, `/api/cs/dashboard/leaderboard`
- Sales Dashboard: `/api/dashboard/filtered-stats`, `/api/dashboard/monthly-trend`, `/api/dashboard/sales-agent-closings`, `/api/dashboard/team-revenue`, `/api/dashboard/leaderboard`, `/api/dashboard/month-comparison`

## Test Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- CS Agent: della@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / @Aqib1234
- Sales Agent: aleesha@clt-academy.com / @Aqib1234
- Team Leader: mohammed@clt-academy.com / @Aqib1234

---

## Backlog
### P1
- User Verification for Google Sheets connector (17 agent sheets)
- Sales Commission Configuration

### P2
- Refactor server.py into domain-specific route files
- Course and Commission Configuration UI
- Payslip Generation
- Google Ads API Integration
- Resolve Babel Plugin RangeError
