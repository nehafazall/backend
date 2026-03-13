# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: CS Dashboard Overhaul
- **5 Key Metrics**: Achieved Revenue (AED 25,795), Pipeline Revenue, Agent Commission (AED 1,100), Head Commission, Total Commission
- **Individual / Team toggle** for CS Head to switch between personal and team view
- **Agent Revenue Chart**: Horizontal bar chart showing who closed how much revenue + commission
- **Leaderboard**: Top agents ranked by commission with gold/silver/bronze medals
- **Monthly Revenue Trend**: Area chart with revenue + commission over time
- **This Month vs Last Month**: Cumulative line chart comparison
- **Pipeline**: Revenue from pitched upgrades awaiting closure
- **Agent Bifurcation**: Students per agent with SLA rates
- **Period Filter**: Today, This Week, This Month, This Quarter, This Year, Overall

### Previously Completed
- Dual-role views (My Students / Team Overview toggle) for CS Head and Academic Master
- CEO Pending Approvals widget on Home Dashboard
- CS Upgrade Pricing & Commission System (3 paths, 9 price tiers)
- Access Control Unification, Sales Dashboard Overhaul
- All modals scrollable, improved color contrast
- Salary payout method, last working day field
- Student Code field on CS cards

---

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## CS Dashboard API Endpoints
- `GET /api/cs/dashboard/stats` — Key metrics (supports period + view_mode)
- `GET /api/cs/dashboard/agent-revenue` — Per-agent revenue + commission
- `GET /api/cs/dashboard/monthly-trend` — Monthly upgrade revenue
- `GET /api/cs/dashboard/month-comparison` — This month vs last month
- `GET /api/cs/dashboard/pipeline` — Pitched upgrade revenue
- `GET /api/cs/dashboard/leaderboard` — Agents ranked by commission

---

## Backlog
### P1 - Upcoming
- Sales Commission Configuration
- User Verification for Google Sheets connector

### P2 - Future
- Refactor server.py into domain-specific routes
- Payslip Generation, Google Ads API Integration
- Fix Babel Plugin RangeError

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
