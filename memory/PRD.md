# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~27K lines) + `commission_auto.py` + `commission_generator.py` + `mt5_client.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### MT5 Integration (Complete — Mar 26, 2026)
- **MT5 Sync Module** (`mt5_client.py`): Full Web API client with challenge-response auth, deal fetching, withdrawal extraction
- **API Endpoints**: GET /api/mt5/status, GET /api/mt5/linked-students, PUT /api/mt5/link-student, PUT /api/mt5/unlink-student, POST /api/mt5/sync, GET /api/mt5/sync-logs
- **Student MT5 Linking**: Admin/CS can link students to MT5 accounts with duplicate check and history tracking. Mentors CANNOT access.
- **Scheduled Auto-Sync**: 3x daily (8 AM, 4 PM, 12 AM UAE time) background task
- **Frontend**: Full MT5SyncPage at /mt5 with connection status, student linking table with search, sync history tab
- **Pending**: MT5 Web API auth (403) — awaiting broker (Miles Capitals) to enable Web API access for manager login 1143
- **Testing**: 100% pass rate (23/23 backend + all frontend, iteration 82)

### Salary Consistency Fix (Complete — Mar 25, 2026)
- Created `_get_employee_salary_aed()` helper: top-level `salary` (HR truth) > computed from structure > fallback

### Mentor Leaderboard Rewrite (Complete — Mar 25, 2026)
- Ranks by total redeposit effort (own + cross-mentor), NOT upgrades

### Cross-Mentor Deposits & Effort-Based Bonus (Complete — Mar 25, 2026)
- /mentor/cross-deposits page, effort summary, bonus progress, 5 tiers

### Mentor Dashboard Commission Breakdown (Complete)
- Flat (1%) + Net (1%) + Team Override (0.5%) + Total

### Customer Master Auto-Population (Complete)
### CS Dashboard: Commission & Net Pay (Complete)
### CRM Kanban Enhancements (Complete)
### Lead Closure Time Tracking (Complete)
### Commission Engine (Complete)

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
- BD Manager: rashidha@clt-academy.com / Rasha@123
- MT5 Manager: login 1143, server 217.138.195.226:443

## Prioritized Backlog

### P0 (Pending User Action)
- MT5 Web API Auth: Broker needs to enable Web API access for manager 1143

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
