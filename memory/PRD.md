# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 14, 2026)

### Completed: SLA Management System
- **SLA Management Page** (`/sla-management`) under Operations
- Full CRUD for SLA rules: create, edit, toggle active/inactive, delete
- Multi-level escalation builder: each rule can have unlimited escalation levels
- Per-level config: name, time threshold (hours), action (warning/breach/reassign/notify), in-app & email notification toggles, notify roles selection
- Department filter tabs: All, Sales, CS, HR, Mentor, Operations, Finance
- 6 default rules seeded: New Lead First Contact, Inactive Lead Warning, Pipeline Stale Lead, CS Activation Call, HR Leave Approval, HR Regularization Approval
- SLA rules stored in DB (`sla_rules` collection) with in-memory cache for performance
- Changes effective immediately (cache refreshes on any CRUD operation)

### Completed: Operational Controls Frontend (P0)
- **Round Robin Controls** (`/round-robin`): CS window status, agent pause/resume toggles
- **Transfer Requests** (`/transfer-requests`): Dual-approval workflow UI
- **Salary Estimation Widget** on HR Dashboard

### Completed: Connector Fix
- Fixed "Failed to create connector" error (MongoDB `_id` serialization bug)

### Previously Completed
- Interactive Drill-Down Analytics V2 (All Dashboards)
- Auto Dark/Light Mode (GST+4)
- INR Currency in Finance Settings
- Enhanced Lead Pool (Assignment Tracking, Bulk Assign, History)
- Google Sheets Agent Connector (5-min sync)
- Backend for Dual-Approval Reassignments, CS Round Robin Time Window, Email Notifications

### Key API Endpoints (New)
- `GET /api/sla/rules` — All SLA rules (optional `?department=X` filter)
- `POST /api/sla/rules` — Create new SLA rule
- `PUT /api/sla/rules/{id}` — Update SLA rule
- `PATCH /api/sla/rules/{id}/toggle` — Toggle active/inactive
- `DELETE /api/sla/rules/{id}` — Delete SLA rule

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
