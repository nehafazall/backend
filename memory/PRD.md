# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 13, 2026)

### Completed: Interactive Drill-Down Analytics V2 (All Dashboards)
- Sales: Top 10 Agents, Team Revenue, Lead Pipeline, Monthly Trend, Leaderboard — all clickable
- CS: Agent Revenue, Leaderboard, Pipeline, Bifurcation — all clickable with proper student data
- Mentor: Bifurcation, Pipeline — all clickable
- CEO: Department Pie, Revenue/Enrollment trends — all clickable

### Completed: Auto Dark/Light Mode (GST+4)
- Auto/Light/Dark cycling with Monitor/Moon/Sun icons

### Completed: INR Currency
- Added to Finance Settings > Bank Accounts & Payment Gateways

### Completed: Enhanced Lead Pool (Assignment Tracking)
- Auto-move rejected/not_interested leads to pool
- Track assignment history: who rejected, which team, when, reason
- Times assigned counter (how many times reassigned)
- Team and Agent filters on the pool page
- Bulk assignment (select multiple → assign to one agent)
- Assignment history modal per lead
- Round-robin or manual assign from pool

### New API Endpoints
- `POST /api/leads/pool/bulk-assign` — Bulk assign leads from pool
- `GET /api/leads/pool?team_filter=X&agent_filter=Y` — Enhanced pool with filters
- Drill-down: /dashboard/drill/agent-students, /dashboard/drill/team-agents, /dashboard/drill/pipeline-stage
- CS Drill: /cs/drill/agent-students, /cs/drill/pipeline-stage
- Mentor Drill: /mentor/drill/students, /mentor/drill/pipeline-stage

### Google Sheets Agent Connector (Pre-existing)
- Marketing > Connectors page: paste URL, assign agent, auto-sync every 5 min
- Supports column mapping for name, phone, city, etc.
- Each connector maps one sheet to one agent

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
