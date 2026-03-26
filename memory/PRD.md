# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy. The system manages sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~28K lines) + `commission_auto.py` + `commission_generator.py` + `mt5_client.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## What's Been Implemented

### Student Portal Login Fix (Complete — Mar 26, 2026)
- **Root Cause**: CLTAnimation had `onComplete` in useEffect dependency array. Parent re-renders (from /auth/me verification) created new function references, restarting the 13s animation infinitely.
- **Fix**: Stored `onComplete` in a ref (`onCompleteRef`), removed from deps. Added `useCallback` in WelcomePage.
- **Testing**: 100% pass (iteration 83)

### CS Kanban UI Overhaul (Complete — Mar 26, 2026)
- **Summary Status Bar**: Shows per-stage student counts + Total + Period Revenue (AED). API: GET /api/students/stage-summary
- **Shadow Cards**: Upgraded column displays records from `cs_upgrades` collection as shadow cards. Each shows green banner with amount. API: GET /api/students/upgrade-shadows. Shadow cards persist indefinitely and are filtered by page date filter.
- **Custom Color Tags**: 5 tags (Handle With Care, Do Not Disturb, VIP, Priority, Follow Up). API: PATCH /api/students/{id}/color-tag. Tags sync across CS, BDM, and Mentor CRM pages.
- **Testing**: 100% pass rate (24/24 backend + all frontend, iteration 83)

### MT5 Integration (Complete — Mar 26, 2026)
- MT5 Sync Module, API Endpoints, Student MT5 Linking, Scheduled Auto-Sync
- **Pending**: MT5 Web API auth (403) — awaiting broker (Miles Capitals)
- Testing: 100% pass (iteration 82)

### Salary Consistency Fix (Complete — Mar 25, 2026)
- Created `_get_employee_salary_aed()` helper

### Mentor Leaderboard Rewrite (Complete — Mar 25, 2026)
- Ranks by total redeposit effort (own + cross-mentor)

### Cross-Mentor Deposits & Effort-Based Bonus (Complete — Mar 25, 2026)
### Mentor Dashboard Commission Breakdown (Complete)
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
- CEO Commission Approval Workflow

### P2
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Commission Audit Log

### P3
- Refactor monolithic `server.py` into domain-driven routes
- Background sheet sync error investigation
