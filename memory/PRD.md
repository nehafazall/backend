# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~30K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### CEO Commission Approval Workflow (Mar 28, 2026)
- CEO/COO can approve or revoke commissions per department (Sales/CS) per month
- Until CEO approves, employees see commissions as "Awaiting Approval" (amber)
- Once approved, employees see "Approved Commission" (green)
- Backend returns `approved_commission`, `pending_approval_commission` for non-CEO users
- CEO has "Approve Transactions" tab: generate, review, edit, bulk-approve individual deals
- Transaction generation is now async with polling to avoid K8s ingress timeout
- COO role has same access as CEO for all commission endpoints

### Attendance Rules Engine (Mar 27, 2026)
- Company Holidays and Special Periods (e.g., Ramadan reduced hours)
- Payroll skips deductions for declared Company Holidays
- CRUD UI in AttendanceSettingsPage

### SSHR Monthly Attendance View (Mar 27, 2026)
- Full month-by-month attendance list with day-by-day status
- 6 summary cards, color-coded, direct regularization link
- API: `GET /hr/my-monthly-attendance?year=YYYY&month=MM`

### IT Assets Module (Mar 27, 2026)
- Dedicated IT & Assets module on home page (removed from HR sidebar)

### Welcome Page (Mar 27, 2026)
- Shows "Welcome, {Full Name}!" + designation from hr_employees

### COO Full Access (Mar 27, 2026)
- `coo` role has identical permissions to `super_admin`

### Task Management System (Mar 27, 2026)
- 13 categories incl. IT, Web Development, Video Editing, Script Writing
- Manager assigns tasks, enhanced timesheet

### Organization Map (Mar 27, 2026)
- Interactive org chart: CEO → Departments → Teams → Members

### Payroll System
- Attendance validation, deductions only for explicit absent/half-day

### Commission System
- Course + Addon decomposition, TL commission from team sales
- Round-robin mentor assignment on student activation

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- COO: Faizeen@clt-academy.com (role: coo)
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API: Awaiting broker whitelist

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Workflow Automation Engine
- Scheduled Email Reports
- Group chat channels

### P3
- Refactor monolithic server.py (~30K lines)
- Document expiry tracking data entry
