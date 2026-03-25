# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines)
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Commission Engine (Complete)
- Course + Addon decomposition logic in `_match_course_commission`
- Sales Executive commission with 18K AED benchmark
- Team Leader commission (no benchmark, earns from team deals)
- CS Agent and CS Head commissions from upgrades
- Mentor commission pool
- SM/CEO bonus pool
- Commission Engine page with Course Commissions tab
- Scatter chart (Net Pay = Salary + Commission)
- AsyncIO parallelization for CEO dashboard (~7.5s load)

### CEO Commission Approval Workflow (Complete — Mar 25, 2026)
- `commission_approvals` MongoDB collection
- `POST /api/commissions/approve` — CEO approves/revokes by department & month
- `GET /api/commissions/approval-status` — returns approval status
- CEO dashboard shows Approve/Revoke buttons per department
- Non-CEO users see "Pending CEO Approval" / "Approved" banners
- Role-gated: only `super_admin` can approve

### UI/UX & Access Control (Complete)
- Strict role-based sidebar filtering in `Layout.jsx`
- Environment badge hidden for non-admins
- Master of Academics = Team Leader permissions
- Color-coded closed leads: enrolled (emerald bg), rejected (rose bg)

### RangeError Fix (Complete)
- `babel-metadata-plugin.js` disabled via `enableVisualEdits: false` in `craco.config.js`

### Sheet Sync Error Logging (Improved — Mar 25, 2026)
- Enhanced logging in `google_sheets_service.py` for missing phone rows
- Better error context in exception handlers

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Exec: aleesha@clt-academy.com / Aleesha@123
- Master of Academics: edwin@clt-academy.com / Edwin@123

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate PDF invoices for enrollments/upgrades
- WhatsApp Integration — Send templated messages via WhatsApp Business API

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine (Trigger-based actions)
- Scheduled Email Reports — Auto-send daily/weekly revenue summaries

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Investigate remaining sheet sync errors (185 errors on one sheet — likely bad column mapping)
