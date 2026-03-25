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
- Instant trigger: When a lead enrolls, CS upgrade records, or BD redeposit happens, pending commission approval is AUTOMATICALLY created
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
- CEO can edit commission amounts with audit trail

### CRM Kanban: My vs Team Separation (Complete — Mar 25, 2026)
- Sales CRM: "My Leads" / "Team Overview" toggle for team_leader, sales_manager, master_of_academics, admin, super_admin
- CS CRM: "My Students" / "Team Overview" toggle for cs_head, admin, super_admin
- Team leaders see only their own leads in "My Leads" mode
- Team overview shows all team leads with agent filter dropdown

### Default Monthly Filter (Complete — Mar 25, 2026)
- PeriodFilter component now accepts `defaultPeriod` prop
- Sales CRM defaults to "This Month" filter on page load
- CS CRM defaults to "This Month" filter on page load
- Enrolled/closed deals visible by default without manual filter

### CS Commission Transaction Generation Fix (Complete — Mar 25, 2026)
- Fixed `commission_generator.py` date field: `upgrade_date` → `date` for cs_upgrades
- Generated 77 missing CS commission transactions across all months
- Verified: Nasida=1,475 (11 upgrades), Della=500 (3 upgrades), Falja=1,100 (11 upgrades)

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
- Team Leader (Ajmal): ajmal@clt-academy.com / Ajmal@123
- Sales Exec: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate PDF invoices for enrollments/upgrades
- WhatsApp Integration — Send templated messages via WhatsApp Business API
- CS Head personal vs team commission split on CS Dashboard (separate from Kanban)

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
