# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud

## What's Been Implemented

### Commission Engine (Complete)
- Course + Addon decomposition logic in `_match_course_commission`
- Course catalog caching for performance
- Sales Executive commission with 18K AED benchmark
- Team Leader commission (no benchmark, earns from team deals)
- CS Agent and CS Head commissions from upgrades
- Mentor commission pool, SM/CEO bonus pool
- Commission Engine page with Course Commissions tab
- Scatter chart (Net Pay = Salary + Commission)
- AsyncIO parallelization for CEO dashboard

### Auto-Trigger Commission Transactions (Complete — Mar 25, 2026)
- **Instant trigger**: When a lead enrolls, CS upgrade records, or BD redeposit happens, a pending commission approval request is AUTOMATICALLY created
- Wired at: server.py enrollment handler, CS upgrade insert, BD redeposit insert
- `commission_auto.py` handles all transaction creation logic
- Creates both SE and TL transactions for sales enrollments
- Creates CS agent transactions for CS upgrades
- Creates BD agent transactions for BD redeposits
- Idempotent: won't create duplicates for same source_id

### Per-Transaction Commission Approval (Complete — Mar 25, 2026)
- `commission_transactions` MongoDB collection
- CEO "Approve Transactions" tab with line-item table
- Individual approve/edit buttons per transaction
- Bulk approve all pending by department
- CEO can edit commission amounts with audit trail (original vs modified)
- CEO notes field for modification justification
- Non-CEO agents see "My Transactions" table with deal-level status

### TL Commission Duplication Fix (Complete — Mar 25, 2026)
- `total_tl_earned` only sums TL/SM rows

### CS Dashboard Commission Sync (Complete — Mar 25, 2026)
- Real-time calculation from `cs_upgrades` + `course_catalog`

### Other Fixes (Complete — Mar 25, 2026)
- Department head assignment: all active users shown
- Multi-team leadership: same person can lead multiple teams
- Student Portal: 7-day JWT, storage-access iframe
- BD CRM: drag-and-drop fix + stage dropdown in modal
- Access Control: all pages added to MODULE_HIERARCHY
- Certificates moved from Finance to Operations

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
- Workflow Automation Engine
- Scheduled Email Reports

### P3
- Refactor monolithic `server.py` into domain-driven routes
