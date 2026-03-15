# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 15, 2026)

### Completed: Top 10 Agents Chart Fix + Performance Insight Banner
- **Bug Fix:** `/api/dashboard/sales-agent-closings` was restricted to admin/manager roles, returning 403 for `sales_executive` and `team_leader`. Changed to `get_current_user` to allow all authenticated users. Top 10 Agents chart now shows data for all roles.
- **Enhancement: Performance Insight Banner** — New role-specific banner on both CS and Sales dashboards:
  - **Agents:** Individual deal/upgrade count, revenue, rank, and comparison to team average (e.g., "+30% vs avg")
  - **Team Leaders:** Team name, team deals, revenue, agent count, and company totals
  - **Admins:** Company-wide totals, active agents, and per-agent averages
  - CS dashboard uses "upgrades" terminology; Sales uses "deals"
  - Handles zero activity with motivational message
- **New endpoints:** `GET /api/dashboard/performance-insight`, `GET /api/cs/dashboard/performance-insight`
- **New component:** `/app/frontend/src/components/PerformanceInsightBanner.jsx`
- **Testing:** 100% pass — 11 backend + 5 frontend tests across all roles

### Previously Completed: P0 Role-Based Dashboard Visibility Fix
- Frontend `Promise.allSettled` to gracefully handle partial API failures
- Backend role-based filtering on all dashboard endpoints
- Visibility rules: Agents (individual stats, team charts, no drill-down), Leaders (team-level), Admins (full access)
- Head Commission card hidden for non-managerial roles

### Earlier Completed
- SLA Management System (full CRUD, multi-level escalation)
- Operational Controls (Round Robin, Transfer Requests, Salary Estimation)
- Google Sheets Connector Fix
- Dashboard Quick Stats Fix (Enrolled MTD accuracy)
- CS Data Import & Enhancement (147 records, course_level tracking, commission backfill)
- Interactive Drill-Down Analytics V2
- Auto Dark/Light Mode (GST+4)

## Key API Endpoints
- **NEW:** `GET /api/dashboard/performance-insight`, `GET /api/cs/dashboard/performance-insight`
- **FIXED:** `GET /api/dashboard/sales-agent-closings` (now open to all authenticated users)
- SLA: `GET/POST/PUT/DELETE /api/sla/rules`
- CS Dashboard: `/api/cs/dashboard/stats`, `/agent-revenue`, `/monthly-trend`, `/month-comparison`, `/pipeline`, `/leaderboard`
- Sales Dashboard: `/api/dashboard/filtered-stats`, `/monthly-trend`, `/sales-agent-closings`, `/team-revenue`, `/leaderboard`, `/month-comparison`

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
