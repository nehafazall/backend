# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Latest Updates (March 14, 2026)

### Completed: Operational Controls Frontend (P0)
- **Round Robin Controls Page** (`/round-robin`): CS Distribution Window status (10AM-10PM GST+4), agent pause/resume toggles with reason modal, tabs for CS/Sales/Mentor agents, process queue button, stats cards (Total/Active/Paused/Window)
- **Transfer Requests Page** (`/transfer-requests`): Dual-approval workflow UI, tabs for Pending 1st Approval/Awaiting CEO/Approved/Rejected, new transfer request modal (Lead/Student/Mentor Student), approval chain display, approve/reject modal with comments
- **Salary Estimation Widget** on HR Dashboard: Total Gross/Net/Deductions/Employees, department breakdown, detailed employee drill-down modal
- **Navigation**: Both pages added to Operations sidebar section in Layout

### Previously Completed
- Interactive Drill-Down Analytics V2 (All Dashboards)
- Auto Dark/Light Mode (GST+4)
- INR Currency in Finance Settings
- Enhanced Lead Pool (Assignment Tracking, Bulk Assign, History)
- Google Sheets Agent Connector (5-min sync)
- Backend for Dual-Approval Reassignments, CS Round Robin Time Window, Email Notifications on Assignment
- Salary Estimation API endpoint

### New Routes Added
- `/transfer-requests` → TransferRequestsPage
- `/round-robin` → RoundRobinPage

### Key API Endpoints
- `GET /api/round-robin/status` — Agent list with pause status, CS window info
- `POST /api/round-robin/toggle-agent` — Pause/resume agent
- `POST /api/round-robin/process-cs-queue` — Process queued students
- `GET /api/transfers/requests` — Transfer requests filtered by status
- `POST /api/transfers/request` — Create new transfer request
- `POST /api/transfers/{request_id}/approve` — Approve/reject transfer
- `GET /api/hr/salary-estimation` — Salary breakdown by dept/team/employee

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
