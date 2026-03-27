# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~29.5K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### Executive Dashboard (Complete — Mar 27, 2026)
- `GET /api/executive/dashboard` — CEO single-page overview
- KPIs: revenue, enrollments, new leads, CS upgrades, employees, pending approvals
- Revenue Trend (6 months), Revenue by Course (pie chart)
- Top 5 Sales Agents, Department Headcount, Lead Sources
- Commission approval status (Sales/CS pending or approved)
- Route: `/executive` (super_admin, admin only)

### Internal Company Chat System (Complete — Mar 27, 2026)
- `GET/POST /api/chat/conversations` — List/create DM and group conversations
- `GET/POST /api/chat/conversations/{id}/messages` — Fetch/send messages
- `GET /api/chat/unread-count` — Badge count
- `GET /api/chat/users` — Available users for new chats
- Full messaging UI with conversation list, message bubbles, 5s polling
- Route: `/chat` (all authenticated users)

### CEO Commission Approval Workflow (Complete — Mar 27, 2026)
- `POST /api/commissions/approve` — CEO approve/revoke sales/CS commissions
- `GET /api/commissions/approval-status` — Check approval status
- Transaction-level approval with edit and bulk approve
- Pending/Approved status banners for agents
- CEO sees approval controls in Commission Dashboard

### Color-Coded Closed Leads (Complete — Mar 27, 2026)
- Enrolled leads: emerald green background + ring styling + "Enrolled" badge with amount
- Rejected leads: rose/red background + ring + opacity + "Rejected" badge with reason
- Applied via CSS classes in `index.css`

### Net Pay Chart Fix (Verified — Mar 27, 2026)
- `GET /api/commissions/scatter-data` correctly fetches salary from `hr_employees.salary_structure`
- Returns `base_salary + commission = net_pay` per month
- Chart shows dual lines: Net Pay and Commission Only

### Biocloud Upload Timeout Fix (Complete — Mar 27, 2026)
- Fixed N+1 query bottleneck in `POST /api/hr/biocloud/upload`
- Pre-fetches all existing records, warnings, shifts, rules into memory caches
- Uses `bulk_write` for all DB operations instead of per-record inserts/updates

### Previous Session Work
- Payroll multi-currency (AED/INR), Employee Birthday, SSHR Announcements
- 3CX Call Minutes tracking, CS Historic Data Migration
- Attendance Rules Engine (grace periods, warnings, half-days)
- Manual Punch-In/Out + Timesheets for remote team
- Commission decomposition (Course + Addon), TL commission fix
- Role-based sidebar filtering, environment badge hiding

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API Auth: Broker needs to enable Web API access

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Workflow Automation Engine
- Scheduled Email Reports

### P3
- Refactor monolithic server.py (~29.5K lines)
- Special Periods frontend UI for attendance rules
