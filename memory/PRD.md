# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 13, 2026)

### Completed: Interactive Drill-Down Analytics (All Dashboards)
- **Sales Dashboard**: Top 10 Agents bar click → closed students modal, Team Revenue click → agent breakdown → student list, Lead Pipeline click → stage details + agent-wise count, Monthly Trend click → month breakdown (by course & agent), Leaderboard click → agent students, Sales by Course click → table
- **CS Dashboard**: Agent Revenue click → student list, Leaderboard click → agent details, Pipeline click → per-agent breakdown, Agent Bifurcation click → stage-grouped students
- **Mentor Dashboard**: Mentor Bifurcation row click → students grouped by stage, Pipeline stage click → mentor-wise breakdown, Mentor Distribution chart click → student details
- **CEO Dashboard**: Department Pie click → employee list, Revenue Trend click → month breakdown, Monthly Enrollments click → course/agent breakdown
- **Auto Dark/Light Mode**: Based on Abu Dhabi timezone (GST+4). Day (6am-7pm) = light, Night (7pm-6am) = dark. Theme toggle cycles: Auto(Monitor icon) → Light(Moon) → Dark(Sun)
- **INR Currency**: Already available in Finance Settings > Bank Accounts

### New Drill-Down API Endpoints
- `GET /api/dashboard/agent/{agent_id}/closed-students`
- `GET /api/dashboard/team/{team_name}/agent/{agent_id}/students`
- `GET /api/dashboard/lead-pipeline/{stage}/details`
- `GET /api/dashboard/monthly-revenue/{month}/details`
- `GET /api/dashboard/department/{dept_name}/employees`
- `GET /api/cs/dashboard/agent/{agent_id}/students`
- `GET /api/cs/dashboard/pipeline/{stage}/details`
- `GET /api/mentor/dashboard/{mentor_id}/students`
- `GET /api/mentor/dashboard/pipeline/{stage}/details`

### Previously Completed
- CS Dashboard Overhaul (5 KPIs, charts, leaderboard, bifurcation)
- Dual-role views (My Students / Team Overview toggle) for CS Head and Academic Master
- CEO Pending Approvals widget on Home Dashboard
- CS Upgrade Pricing & Commission System (3 paths, 9 price tiers)
- Access Control Unification, Sales Dashboard Overhaul
- All modals scrollable, improved color contrast
- Salary payout method, last working day field, Student Code on CS cards
- Finance Settings: VAT on Fee % for Payment Gateways
- PSP Bank Mapping: Dropdown selector for bank accounts

---

## Backlog
### P1 - Upcoming
- User Verification for Google Sheets connector
- Sales Commission Configuration

### P2 - Future
- Refactor `server.py` into domain-specific route files (routes/hr.py, routes/sales.py, etc.)
- Course and Commission Configuration UI
- Payslip Generation
- Google Ads API Integration
- Resolve Babel Plugin RangeError (currently mitigated)
