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
- Per-transaction CEO approval workflow with approve/edit/bulk-approve
- Auto-trigger: commission transactions created instantly on enrollment or CS upgrade
- CS commission transaction generation fixed (date field bug)
- Retroactive corrections for "Advance Course-2"

### CRM Kanban Enhancements (Complete — Mar 25, 2026)
- "My Leads" / "Team Overview" toggle on Sales CRM for team leaders/heads
- "My Students" / "Team Overview" on CS CRM for cs_head
- Default "This Month" filter on all CRM Kanban boards
- Unified date filter: `date_field=any` shows leads created OR enrolled in period (no toggle needed)

### Lead Closure Time Tracking (Complete — Mar 25, 2026)
- Tracks `closure_days` and `closure_hours` from lead assignment to enrollment
- Backfilled 976 existing enrolled leads
- New endpoint: `GET /api/dashboard/closure-time` with role-based visibility
  - Sales executives: see own stats
  - Team leaders: see team results
  - CEO/admin: see entire floor
- Closure Time Analytics table on Sales Dashboard

### Dashboard Performance Optimization (Complete — Mar 25, 2026)
- SLA breach calculation: replaced Python loop over 10K leads with single MongoDB count_documents query
- Added `avg_closure_days` and `closures_this_month` to dashboard stats

### Personnel Changes (Complete — Mar 25, 2026)
- Anzil transferred from cs_agent to quality_control
- His 6 students reassigned: 3 to Della, 3 to Falja

### Other Completed Features
- Multi-team leadership, BD CRM drag-and-drop fix
- Student portal session persistence (7-day JWT)
- Access control page updated with all modules
- Certificates moved from Finance to Operations in sidebar
- Testing environment badge hidden from non-admins
- Role-based sidebar filtering (strict)

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Team Leader (Ajmal): ajmal@clt-academy.com / Ajmal@123
- Sales Exec: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P1
- Invoice Generation — Auto-generate PDF invoices for enrollments/upgrades
- WhatsApp Integration — Send templated messages via WhatsApp Business API

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
