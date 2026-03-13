# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: CS Upgrade Pricing & Commission System

**Upgrade Flow:**
1. Drag student to "Pitched Upgrade" → Pricing modal shows 3 upgrade paths:
   - Basic/Intermediate: 1,600 | 1,999 | 2,105 AED
   - Intermediate → Advanced: 3,599 | 3,899 | 4,100 AED  
   - Basic → Advanced: 5,600 | 6,000 | 6,500 AED
2. Drag from "Pitched Upgrade" to "Upgraded" → Confirm + Payment modal:
   - Verifies if same/upgraded/downgraded from pitched package
   - Collects payment method + proof screenshot
   - Creates finance verification, LTV transaction, finance receivable
3. After confirmation → student returns to "New Student" for re-activation with questionnaire

**Commission Structure (Auto-Calculated):**
- Agent: 1600→75, 1999→100, 2105→150, 3599→75, 3899→150, 4100→200, 5600→150, 6000→250, 6500→350
- CS Head: 30 AED (basic/intermediate paths), 60 AED (basic→advanced)
- CS Head doing upgrade herself: gets both agent + head commission

**Student Code:** Added external platform Student ID field — displayed on kanban cards, editable in detail modal

### Previously Completed: Sales Dashboard Overhaul + UI/UX
- Sales Dashboard with date filters, team revenue drill-down, month comparison
- All modals scrollable globally (dialog.jsx base component)
- Improved color contrast for light and dark themes
- 68 future-dated records corrected and DB seed exported

---

## Architecture

### Tech Stack
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

### Key Collections
- students, leads, customers, courses, teams, users, employees
- cs_commissions (NEW), finance_verifications, finance_clt_receivables
- ltv_transactions, activity_logs, notifications

---

## Backlog

### P1 - Upcoming
- Sales Commission Configuration (user said "for Sales we will do it later")
- User Verification for Google Sheets connector
- Course and Commission Configuration UI

### P2 - Future
- Refactor server.py into domain-specific routes
- Payslip Generation
- Google Ads API Integration
- Mentor Dashboard leaderboard with live data
- Fix Babel Plugin RangeError

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234

## Key API Endpoints (CS Upgrade)
- `GET /api/cs/upgrade-packages` — Returns pricing config
- `POST /api/cs/pitch-upgrade/{student_id}` — Record pitched upgrade
- `POST /api/cs/confirm-upgrade/{student_id}` — Confirm with payment, create commissions
- `PATCH /api/students/{student_id}/student-code` — Update external student ID
