# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~28K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### 3CX Call Minutes Tracking (Complete — Mar 26, 2026)
- `GET /api/3cx/daily-minutes` — Daily call minutes per employee, role-filtered (TL sees team, CEO sees all)
- `GET /api/3cx/yearly-summary` — Monthly aggregated call minutes per employee for yearly view
- 2 charts added to Sales Dashboard: Monthly stacked bar chart + Yearly line trend chart
- Summary table showing total and average minutes per agent

### CS Activation Flow & Migration (Complete — Mar 26, 2026)
- `POST /api/students/migrate-to-new-student` — Migrates activated students WITHOUT completed questionnaire back to "New Student" stage
- "Migrate Historic Data" button added to CS Kanban page (visible to CS Head/Admin)
- Activation Questionnaire now defaults `broker_name` to "MILES CAPITALS" (editable)

### Biocloud Attendance Sync Rewrite (Complete — Mar 26, 2026)
- Rewrote `POST /api/hr/biocloud/fetch-attendance` with API-first approach using BioCloud REST API
- Falls back to Playwright scraping if API endpoints aren't available
- Proper error handling (502 for unreachable server, not 500 crash)
- Maps `emp_code` from BioCloud to `biocloud_emp_code` in hr_employees

### Attendance Template Revamp (Complete — Mar 26, 2026)
- Removed "Fixed Incentive" column
- Added daily punch-in/punch-out columns (Day 1 In, Day 1 Out, ..., Day 31 In, Day 31 Out)
- Pre-fills existing biometric data from `hr_attendance` collection
- Auto-calculates Full Days, Half Days, Absent Days in summary columns
- Import endpoint updated to parse daily punch format and auto-determine half/full day from hours worked

### HR Module Fixes & Enhancements (Complete — Mar 26, 2026)
- Fixed Attendance Template Download 500 error (null salary_structure)
- Fixed Payroll to process ALL active employees (not skip missing salary)
- Multi-currency (AED/INR) support in salary and payroll
- Editable birthday field on Employee Details page
- SSHR Announcements page with birthday sidebar + auto-birthday generation

### Previous Session Work (Complete)
- Student Portal Login Fix, CS Kanban Overhaul, Customer Master LTV Sort
- BD Manager Access Fix, Student Directory Page, CS Kanban Search Fix
- Commission Engine, Role-based sidebar filtering, Environment badge hiding

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- BD Managers: farsana@clt-academy.com / Farsana@123, rashida@clt-academy.com / Rasha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API Auth: Broker needs to enable Web API access

### P1
- Internal Company Chat — Cross-department real-time messaging (WebSocket-based)
- Invoice Generation — Auto-generate PDF invoices for enrollments/upgrades
- WhatsApp Integration — Send templated messages via WhatsApp Business API
- CEO Commission Approval Workflow

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine (trigger-based actions)
- Scheduled Email Reports (daily/weekly to managers)

### P3
- Refactor monolithic `server.py` (~28K lines) into domain-driven route structure
- Background sheet sync error investigation
