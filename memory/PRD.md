# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 16, 2026)

### Completed: Mentor Dashboard + Finance Withdrawals
- **Mentor Dashboard** at `/mentor/dashboard`:
  - **Role-based views:** Edwin (master_of_academics) gets Individual/Team toggle + drill-down; regular mentors see individual only
  - **Revenue cards:** 3 separate metrics — Deposits, Withdrawals, Net Revenue (in AED with USD subtitle)
  - **Commission system:** 1% flat on deposits + 1% net monthly; Edwin gets 1.5% net (1% + 0.5% team override)
  - **Bonus slabs:** $10K=10%, $20K=15%, $30K=17.5%, $40K=20%, $50K=25% of salary; progress bar + slab indicators
  - **Charts:** Monthly Trend (composed bar+line), Mentor-wise Revenue (horizontal bar), Leaderboard (ranked list)
  - **Student overview:** Total/Connected/Pending counts
  - **Period filters:** This Month, Quarter, Year, Overall
- **Finance Withdrawals Page** at `/finance/mentor-withdrawals`:
  - Student Deposits tab with search, deposit/withdrawal/net per student, and inline "Withdraw" buttons
  - Withdrawal History tab with all recorded withdrawals
  - Record Withdrawal modal with amount, date, notes fields
  - Only accessible by `finance`, `admin`, `super_admin` roles
- **Commission logic:** Negative net commission carries forward — next payout withheld until deficit recovered
- **Edwin's override:** 0.5% on entire team's net deposits (visible only to him)
- **New backend endpoints:** `GET /api/mentor/dashboard`, `GET /api/mentor/dashboard/monthly-trend`, `GET /api/mentor/dashboard/leaderboard`, `GET /api/mentor/dashboard/revenue-chart`, `GET /api/finance/mentor-student-deposits`, `POST /api/finance/mentor-withdrawal`, `GET /api/finance/mentor-withdrawals`
- **Testing:** 100% — 19 backend + all Playwright frontend tests (iteration_51)

### Previous: Top 10 Agents Fix + Performance Insight Banner (March 15)
- Fixed sales-agent-closings endpoint (was 403 for agents)
- Added role-specific Performance Insight Banner on CS/Sales dashboards

### Earlier Completed
- P0 Role-Based Dashboard Visibility Fix
- SLA Management System
- Operational Controls (Round Robin, Transfer Requests, Salary Estimation)
- Google Sheets Connector Fix
- CS Data Import & Enhancement
- Interactive Drill-Down Analytics V2
- Auto Dark/Light Mode (GST+4)

## Test Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- CS Agent: della@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / @Aqib1234
- Sales Agent: aleesha@clt-academy.com / @Aqib1234
- Team Leader: mohammed@clt-academy.com / @Aqib1234
- Edwin (Master of Academics): edwin@clt-academy.com / Edwin@123
- Regular Mentor: ashwin@clt-academy.com / @Aqib1234
- Financier: finance@clt-academy.com / @Aqib1234

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
