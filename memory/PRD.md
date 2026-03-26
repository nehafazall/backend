# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~28K lines) + `commission_auto.py` + `commission_generator.py` + `mt5_client.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### HR Module Fixes & Enhancements (Complete — Mar 26, 2026)
- **Attendance Template Download**: Fixed 500 error (`NoneType` on `salary_structure`). Now uses `emp.get("salary_structure") or {}`.
- **Payroll Extraction**: Fixed payroll skipping employees without salary data. Now processes all active employees (zeros for missing salary).
- **Multi-Currency (AED/INR)**: Added currency selector to Employee Details salary tab. Currency stored in `salary_structure.currency`, propagated to payroll records.
- **Birthday Field**: Made `date_of_birth` editable inline in Employee Details Overview. New endpoint: `PUT /api/hr/employees/{id}/personal`.
- **SSHR Announcements Page**: New page at `/sshr/announcements` with announcement feed (CRUD for HR), birthday sidebar (today + upcoming 30 days), auto-birthday announcement generation. New endpoints: `GET/POST/DELETE /api/announcements`, `GET /api/hr/birthdays`, `POST /api/hr/birthdays/auto-announce`.
- **Testing**: 100% pass (iteration 84 — 16/16 backend, all frontend verified)

### Student Portal Login Fix (Complete — Mar 26, 2026)
- Fixed CLTAnimation infinite render loop via `useRef` for onComplete callback.

### CS Kanban UI Overhaul (Complete — Mar 26, 2026)
- Summary Status Bar, Shadow Cards for upgrades, Custom Color Tags, LTV Sort toggle.

### Student Directory Page (Complete — Mar 26, 2026)
- Global searchable student database at `/cs/directory` with inline CS agent reassignment.

### Customer Master LTV Overhaul (Complete — Mar 26, 2026)
### MT5 Integration (Complete — Mar 26, 2026, BLOCKED on broker auth)
### Salary Consistency, Mentor Leaderboard, Commission Engine (Complete)

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
- BD Manager: rashidha@clt-academy.com / Rasha@123

## Prioritized Backlog

### P0 (Pending User Action)
- MT5 Web API Auth: Broker needs to enable Web API access for manager 1143
- Biocloud attendance sync: IDs mapped but Playwright scraping may need live debugging with the biometric device

### P1
- Internal Company Chat — Cross-department real-time messaging tool
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages
- CEO Commission Approval Workflow

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- HR Dashboard Revamp (currently kept as-is per user)

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
