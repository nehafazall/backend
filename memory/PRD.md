# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, and Finance departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~24K lines)
- **Frontend:** React + Shadcn UI + Recharts
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler

## What's Been Implemented (Latest Session - March 2026)

### Completed
1. **Team-wise Revenue Chart Fix** - Fixed root cause: `team_name` on leads was empty because code read from nonexistent user field. Added `resolve_agent_team_name()` helper to resolve via `team_id → teams.name`. Patched 446 leads.
2. **CS Historical Import Fix** - Fixed `NameError: name 'io' is not defined` in preview endpoint (missing `import io`).
3. **CS Revenue & Upgrade Data Fix** - Historical import was storing `course_amount` instead of `amount`, `upgraded_at` instead of `date`. Fixed field mapping so dashboards correctly show revenue. Created 61 missing student records. Updated import endpoint to auto-create students and set "upgraded" stage.
4. **Overall Dashboard Top CS Fix** - Fixed `agent_id` → `cs_agent_id` in aggregation query so top CS performers display correctly.
5. **Overall Dashboard** - Comprehensive view with revenue, treasury, HR stats, top performers.
6. **Sales Recording Bug Fix** - `enrolled_at` timestamp, Pydantic model, dashboard widgets corrected.
7. **Super Admin Lead Assignment** - Direct assignment feature for super admins.
8. **Customer Master Sorting** - Added sortable columns.

### Key DB Schema Changes
- `cs_upgrades`: Added `amount`, `date`, `month`, `upgrade_to_course` fields for dashboard compatibility
- `students`: Added `is_upgraded_student`, `stage: "upgraded"`, `last_upgrade_at`, `last_upgrade_amount`, `current_course_name`
- `leads`: `team_name` now resolved from `teams` collection via agent's `team_id`

## Prioritized Backlog
### P1
- Per-Course Commission Calculation (wire commission fields into Sales Dashboard)
- Post-Deployment Checks (Google Cloud redirect_uri, CORS tightening)

### P2
- Refactor `server.py` into domain-driven route files
- Admin UI for dynamic commission configuration
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded` in frontend build
- Visually confirm Duplicate Lead Merge Dialog

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **Sales Executive:** kiran@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
