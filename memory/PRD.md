# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~30K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### Organization Map (New — Mar 27, 2026)
- Interactive org chart with CEO at top, departments, teams, and members
- 3 tabs: Org Chart, Approval Matrix, Statistics
- Approval Matrix: 6 workflow types (Leave, Commission, Payroll, Lead Transfer, Expense, Student Merge)
- Statistics: Role distribution bars, department distribution grid, 4 KPI cards
- Search/filter across all departments and people
- Accessible under Executive sidebar section for super_admin, admin, hr

### Payroll Attendance Validation (Verified — Mar 27, 2026)
- Soft warning when no attendance data exists for selected month
- Payroll generates with zero deductions when no attendance
- Only processes active/probation employees
- Auto-deletes old batches on re-run

### Executive Dashboard (Enriched — Mar 27, 2026)
- Merged operational dashboard into CEO executive view
- 12 KPI cards: Total/Sales/CS/Academics revenue, Salary Payout, Total Payout, New Leads, Pipeline, Activations, Employees, Present Today, Pending Approvals
- Revenue Trend, Attendance, Gender, Course Bifurcation, Top Performers, etc.

### Internal Chat System (Complete — Mar 27, 2026)
- DM conversations + group chat with online/away/offline status
- Heartbeat tracking, 5s polling

### Commission System
- Course + Addon decomposition
- CEO approval workflow (transaction-level)
- TL commission from team sales (18K benchmark removed)
- Net Pay chart with correct salary from hr_employees

### HR Module
- Payroll: multi-currency, deductions only for explicit absent/half-day
- Attendance: Grace period 30 mins, leave approval marks as on_leave
- BioCloud bulk upload optimized
- SSHR universal visibility for punch-in

### Color-Coded Closed Leads
- Enrolled: emerald green, Rejected: rose/red

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
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
- Group chat channels (#sales-team, #cs-team)

### P3
- Refactor monolithic server.py (~30K lines)
- Special Periods frontend UI for attendance rules
- Document expiry tracking data entry (HR module)
