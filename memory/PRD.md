# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Commission Engine (Complete)
- Course + Addon decomposition logic in `_match_course_commission`
- Sales Executive commission with 18K AED benchmark
- Team Leader commission (no benchmark, earns from team deals)
- CS Agent and CS Head commissions from upgrades
- Mentor commission pool, SM/CEO bonus pool
- Commission Engine page with Course Commissions tab
- Scatter chart (Net Pay = Salary + Commission)
- AsyncIO parallelization for CEO dashboard (~7.5s load)
- Course catalog caching for performance

### Per-Transaction Commission Approval (Complete — Mar 25, 2026)
- `commission_transactions` MongoDB collection
- Auto-generate transactions from enrolled leads + CS upgrades
- `POST /api/commissions/generate-transactions` — scans and creates pending transactions
- `GET /api/commissions/transactions` — list with month/department/status/agent filters
- `POST /api/commissions/transactions/{id}/approve` — CEO approves single transaction
- `POST /api/commissions/transactions/bulk-approve` — approve all pending by department
- `PUT /api/commissions/transactions/{id}` — CEO edits commission amount + notes (audit trail)
- CEO "Approve Transactions" tab with line-item table, approve/edit buttons
- Edit dialog shows original vs modified commission, CEO notes
- Non-CEO agents see only their own transactions

### TL Commission Duplication Fix (Complete — Mar 25, 2026)
- `total_tl_earned` now only sums from TL/SM rows (not SE rows which were informational)
- `is_tl_or_sm` flag used for correct filtering

### CS Dashboard Commission Sync (Complete — Mar 25, 2026)
- CS Dashboard stats now calculates commissions in real-time from `cs_upgrades` + `course_catalog`
- No longer reads from stale `cs_commissions` collection
- CS Head sees correct head commission from ALL team upgrades

### Department Head Assignment Fix (Complete — Mar 25, 2026)
- Department head dropdown now shows ALL active users (removed role filter)

### Multi-Team Leadership (Complete — Mar 25, 2026)
- Setting a team leader no longer overwrites their existing `team_id`
- Same person can lead multiple teams

### Student Portal Session (Complete — Mar 25, 2026)
- JWT expiry extended to 7 days (168 hours)
- iframe sandbox removed, uses `allow="storage-access"`

### BD CRM Stage Fix (Complete — Mar 25, 2026)
- Fixed drag-and-drop to handle drops on cards in middle of columns
- Added stage dropdown in student detail modal for direct stage changes
- Uses `closestCorners` collision detection

### Access Control (Complete — Mar 25, 2026)
- All pages added to MODULE_HIERARCHY: BD CRM, BD Dashboard, Student Portal, CS Merge Approvals, SSHR, Commission Dashboard, Reports, Forecasting, Transfer Requests, Round Robin, SLA Management, Mentor Withdrawals, Certificates

### Certificate Move (Complete — Mar 25, 2026)
- Certificates moved from Finance to Operations in sidebar

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Exec: aleesha@clt-academy.com / Aleesha@123

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
- Speed optimization for commission generate-transactions endpoint
