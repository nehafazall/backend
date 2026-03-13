# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 13, 2026)

### Completed: Interactive Drill-Down Analytics V2 (All Dashboards)
**Sales Dashboard:**
- Top 10 Agents: Click bar → modal with closed students (name, course, amount, enrolled date)
- Team Revenue: Click bar → modal with agents breakdown (deals + revenue) → click agent → their students
- Lead Pipeline: Click stage → modal with agent-wise count + individual lead list (name, agent, team, course)
- Monthly Trend: Click month → breakdown by course & agent
- Leaderboard: Click agent → their enrolled students with amounts

**CS Dashboard:**
- Agent Revenue: Click bar → modal with agent's students (name, stage, course, upgrade count, upgrade revenue)
- Leaderboard: Click agent → student details (Nasida VN → 153 students, 5 upgrades, 17,997 AED)
- Pipeline: Click item → per-agent breakdown + student list
- Agent Bifurcation: Click bar → students grouped by stage

**Mentor Dashboard:**
- Mentor Bifurcation: Click row → students grouped by stage (Ashwin Sudarsh → 224 students)
- Pipeline: Click stage → mentor-wise breakdown + student list
- Distribution chart: Click bar → mentor details

**CEO Dashboard:**
- Department Pie: Click slice → employee list per department
- Revenue Trend: Click month → course & agent breakdown
- Enrollments: Click month → detailed breakdown

### Completed: Auto Dark/Light Mode
- Based on Abu Dhabi timezone (GST+4)
- Day (6am-7pm) = light, Night (7pm-6am) = dark
- Theme toggle cycles: Auto(Monitor) → Light(Moon) → Dark(Sun)
- Re-checks every 60 seconds in auto mode

### Completed: INR Currency
- Added to Finance Settings > Bank Accounts (AED, USD, EUR, GBP, SAR, INR)
- Added to Finance Settings > Payment Gateways

### New Drill-Down API Endpoints (V2 — name-based queries)
- `GET /api/dashboard/drill/agent-students?agent_name=X`
- `GET /api/dashboard/drill/team-agents?team_name=X`
- `GET /api/dashboard/drill/pipeline-stage?stage=X`
- `GET /api/dashboard/monthly-revenue/{month}/details`
- `GET /api/dashboard/department/{dept}/employees`
- `GET /api/cs/drill/agent-students?agent_name=X`
- `GET /api/cs/drill/pipeline-stage?stage=X`
- `GET /api/mentor/drill/students?mentor_name=X`
- `GET /api/mentor/drill/pipeline-stage?stage=X`

### Previously Completed
- CS Dashboard (5 KPIs, charts, leaderboard, bifurcation)
- Dual-role views (My Students / Team Overview toggle)
- CEO Pending Approvals widget
- CS Upgrade Pricing & Commission System
- Access Control Unification, Sales Dashboard
- Modals scrollable, color contrast improvements
- Salary payout method, last working day, Student Code
- Finance: VAT on Fee %, PSP Bank Mapping dropdown

---

## Backlog
### P1
- User Verification for Google Sheets connector
- Sales Commission Configuration

### P2
- Refactor server.py into domain-specific route files
- Course and Commission Configuration UI
- Payslip Generation
- Google Ads API Integration
- Resolve Babel Plugin RangeError
