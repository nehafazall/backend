# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, Finance, and Business Development departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~25K lines)
- **Frontend:** React + Shadcn UI + Recharts + react-window
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler
- **Performance:** GZip compression, MongoDB indexes, server-side pagination

## What's Been Implemented

### Session - March 23, 2026 (Current)

**Performance Optimization (Iteration 66: 100% pass)**
- Server-side pagination (25/50/100 per page) across Sales, CS, Mentor, BD Kanbans
- Reusable `Pagination.jsx` component with page size selector and navigation
- GZip compression via Starlette middleware (minimum_size=500)
- MongoDB indexes: students.bd_agent_id, bd_stage, mentor_redeposits.student_id/mentor_id/date, student_notes.student_id+created_at, cs_upgrades.student_id, ltv_transactions.student_id
- Payload reduction: ~1MB → ~20KB per request (98% reduction)
- Response time improvement: 2.2s → 0.5s

**CS Agent Transfer Bug Fix (Iteration 66: verified)**
- Root cause: `StudentUpdate` Pydantic model was missing `cs_agent_name` field
- Fix: Added `cs_agent_name: Optional[str] = None` to StudentUpdate
- Also fixed data for Anandhuraj K R (was showing Falja instead of Nasida VN)

**3CX Calling, Notes & Reminders for BD (Iteration 65: 100% pass)**
- 3CX ClickToCall integrated into BD CRM card detail modal
- Call history/recordings visible in BD student cards
- Follow-up notes system: POST/GET `/api/students/{id}/notes` with `student_notes` collection
- Reminder functionality via existing ReminderModal (reminder badge on BD cards)

**Unified Transaction History (Iteration 64: code review pass)**
- GET `/api/students/{id}/transaction-history` — aggregates enrollment, CS upgrades, mentor redeposits, withdrawals, LTV transactions
- Reusable `TransactionHistory.jsx` component with summary bar (deposits/withdrawals/net) + scrollable timeline
- Integrated into CS, Mentor, and BD CRM detail modals
- BD Dashboard hides revenue/redeposit tables from BD agents (Super Admin only)

**Business Development Module (Iteration 63: 100% pass)**
- Backend: `/api/bd/students`, `/api/bd/dashboard`, `/api/bd/agents`, `/api/bd/record-redeposit`, stage updates, reassignment
- Frontend: `BDCRMPage.jsx` (drag-and-drop Kanban, 5 stages), `BDDashboardPage.jsx` (KPIs, charts)
- Sidebar: BD CRM and BD Dashboard under Academics section
- Mentor CRM cards show BD agent name badge

### Previous Sessions
- Universal Period Filter, Mentor Scoping & Reassignment, Monthly Closings
- Dashboard KPIs, Sales Search Fallback, Currency AED fix
- CS Upgrade Dates, Customer Master Net LTV
- Historical Import, SMTP Templates, Student Export

## Prioritized Backlog

### P1
- Build UI for admins to dynamically configure commission structures
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)

### P2
- Refactor `server.py` into domain-driven route files
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
- **BD Agent (Rashida):** rashidha@clt-academy.com / Rashida@123
- **BD Agent (Farsana):** farsana@clt-academy.com / Farsana@123
