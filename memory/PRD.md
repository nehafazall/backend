# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~30K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### SSHR & HR Attendance Overhaul (Mar 28, 2026)
- **SSHR Overview**: Changed from weekly to monthly stats (Days Present, Hours Worked)
- **SSHR Calendar View**: Full monthly calendar grid (Mon-Sun), color-coded cells per status
  - Click any working day to open regularization request
  - Legend: Present (green), Late (amber), Absent (red), On Leave (blue), Holiday (purple), Off Day (gray)
- **Weekend Logic**: Only Sunday is OFF day (Fri/Sat are working days) — affects payroll, leaves, attendance
- **Late Recalculation**: Late minutes recalculated on-the-fly using current shift config, not stale stored values
- **Missing Employees**: HR Attendance now shows employees who didn't punch in with "No Record" badge
- **Loading Fix**: SSHR shows spinner during data fetch instead of premature "Employee Record Not Found"

### CEO Commission Approval Workflow (Mar 28, 2026)
- CEO/COO can approve or revoke commissions per department (Sales/CS) per month
- Until CEO approves, employees see commissions as "Awaiting Approval" (amber)
- Once approved, employees see "Approved Commission" (green)
- Transaction-level approval with generate, review, edit, bulk-approve
- COO role has same access as CEO for all commission endpoints

### Attendance Rules Engine (Mar 27, 2026)
- Company Holidays and Special Periods (e.g., Ramadan reduced hours)
- Payroll skips deductions for declared Company Holidays

### SSHR & Timesheet System (Mar 27, 2026)
- Full monthly attendance view with color-coded summary
- Task Manager for managers, enhanced employee timesheet UI

### Organization, IT, Welcome (Mar 27, 2026)
- Interactive org chart, dedicated IT Assets module, Welcome page with Full Name + Designation
- COO role has full system access equivalent to super_admin

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
- CEO Commission Approval Workflow — Complete (tested)

### P2
- Workflow Automation Engine
- Scheduled Email Reports

### P3
- Refactor monolithic server.py (~30K lines)
