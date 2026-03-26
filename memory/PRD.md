# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~28K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### Biocloud Attendance Sync — File Upload (Complete — Mar 26, 2026)
- `POST /api/hr/biocloud/upload-attendance` — Accepts raw BioCloud XLSX export
- Parses Check-In/Check-Out punches, groups by employee+date
- Extracts first Check-In as biometric_in, last Check-Out as biometric_out
- Matches by `biocloud_emp_code` OR `employee_id`
- Calculates work hours, late minutes, half/full day status
- Tested: 1220 punches → 343 attendance records across 24 days (19 matched employees)
- Frontend: BioCloud Upload card added to Attendance → Manual Import tab

### Attendance Template Revamp (Complete — Mar 26, 2026)
- Removed "Fixed Incentive" column
- Added daily punch-in/punch-out columns (Day 1 In, Day 1 Out ... Day 31 In, Day 31 Out)
- Pre-fills existing biometric data from hr_attendance collection
- Auto-calculates Full Days, Half Days, Absent Days summary
- Import endpoint updated to parse daily punch format

### 3CX Call Minutes Tracking (Complete — Mar 26, 2026)
- `GET /api/3cx/daily-minutes` — Per employee per day, role-filtered
- `GET /api/3cx/yearly-summary` — Monthly aggregated per employee
- 2 charts on Sales Dashboard: Monthly stacked bar + Yearly line trend
- TL sees team, CEO/COO sees all, SE sees own data only

### CS Activation Flow & Migration (Complete — Mar 26, 2026)
- `POST /api/students/migrate-to-new-student` — Migrates activated students without questionnaire to new_student
- "Migrate Historic Data" button on CS Kanban (CS Head/Admin)
- Activation Questionnaire defaults broker_name to "MILES CAPITALS"

### HR Module Fixes (Complete — Mar 26, 2026)
- Fixed Attendance Template Download 500 error
- Fixed Payroll to process ALL active employees
- Multi-currency (AED/INR) salary & payroll support
- Editable birthday field on Employee Details
- SSHR Announcements page with auto-birthday generation

### Previous Session Work
- Student Portal Login Fix, CS Kanban Overhaul, Customer Master LTV
- BD Manager Access, Student Directory, Commission Engine

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- BD Managers: farsana@clt-academy.com / Farsana@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API Auth: Broker needs to enable Web API access

### P1
- Internal Company Chat — Cross-department real-time messaging
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages
- CEO Commission Approval Workflow

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports

### P3
- Refactor monolithic server.py (~28K lines)
