# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~30K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### SSHR Monthly Attendance View (Mar 27, 2026)
- Full month-by-month attendance list with day-by-day status (Present/Absent/Half Day/On Leave/Late/No Data/Weekend)
- Month picker + shift badge display (Morning Shift: 10:00 - 19:00)
- 6 summary cards: Present, Absent, Half Day, On Leave, Late, No Data
- Click any day to apply regularization (pre-fills attendance times + shift schedule)
- Color-coded left border per status for quick visual scanning
- API: `GET /hr/my-monthly-attendance?year=YYYY&month=MM`

### IT Assets Removed from HR Panel (Mar 27, 2026)
- IT Assets now only accessible via dedicated IT & Assets module on home page
- HR sidebar cleaned up — no longer shows Assets link

### Welcome Page (Mar 27, 2026)
- Shows "Welcome, {Full Name}!" + designation (CEO, etc.) from hr_employees

### COO Full Access (Mar 27, 2026)
- `coo` role has identical permissions to `super_admin`

### Task Management System (Mar 27, 2026)
- 13 categories incl. IT, Web Development, Video Editing, Script Writing
- Manager assigns tasks with priority tracking (Open → In Progress → Completed)
- Enhanced timesheet: pick assigned tasks or add custom, log hours + notes

### Organization Map (Mar 27, 2026)
- Interactive org chart: CEO → Departments → Teams → Members
- Approval Matrix + Statistics tabs

### Payroll System
- Attendance validation, only active/probation employees, deductions only for explicit absent/half-day

### Commission System
- Course + Addon decomposition, TL commission from team sales

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
