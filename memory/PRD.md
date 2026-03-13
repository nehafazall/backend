# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (March 13, 2026)

### P0 COMPLETED: Historical Data Import + Dashboard Enhancements

**Import Results:**
- **901 students imported** from XLSX with correct US date format (MM/DD/YYYY)
- **46 courses** auto-created with prices (both `price` and `base_price` fields)
- **899 LTV transactions** created for revenue tracking
- **901 customer records** created in Customer Master (sorted date ascending)
- **899 finance receivables** recorded against correct enrollment dates
- **1 team auto-created** ("TEAM CHALLENGE")
- Enrollment dates correctly distributed: Oct 2024 through Jan 2026
- Students assigned to Sales Agents, CS Agents, and Mentors per XLSX

**Dashboard Features Built:**
1. **Sales Dashboard** — Top 10 agents overall (bar chart) + Top 5 agents this month (bar chart with closings & revenue)
2. **CS Dashboard** — Agent bifurcation showing students per CS agent, SLA rates (OK/Warning/Breach), with date filter (Today/Week/Month/Quarter/Year/Overall)
3. **Mentor Dashboard** — Mentor bifurcation showing students per mentor, redeposit tracking, with date filter
4. **Customer Master** — Course column + Enrollment Date column, sorted date ascending, 901 records
5. **Finance Receivables** — 899 records totaling AED 2,174,969, sorted by date
6. **Courses Page** — Fixed to show prices (reads `base_price || price`)

**New Backend Endpoints:**
- `GET /api/dashboard/sales-agent-closings?period=X&limit=N`
- `GET /api/dashboard/cs-agent-bifurcation?period=X`
- `GET /api/dashboard/mentor-bifurcation?period=X`
- `GET /api/dashboard/activity-summary?period=X`

**Date Filters:** today, this_week, this_month, this_quarter, this_year, overall

**Testing:** 11/11 backend tests + all 5 frontend pages verified (100%)

**Data Seeding:** seed_data.json exported (3.3 MB, 5198 documents) including customers and receivables

---

## Architecture

### Tech Stack
- **Frontend:** React 18 + Tailwind CSS + Shadcn/UI + Recharts + Craco
- **Backend:** FastAPI + Motor (async MongoDB) + Pydantic
- **Database:** MongoDB
- **Dependencies:** pandas, openpyxl (XLSX), APScheduler, bcrypt, PyJWT

### Key Files
- `/app/backend/server.py` - Monolithic backend (20K+ lines, needs refactoring)
- `/app/backend/db_seeder.py` - DB seed/export utility
- `/app/backend/seed_data.json` - Deployment data seed file (3.3 MB)
- `/app/frontend/src/pages/SalesDashboard.jsx` - Sales dashboard with agent charts
- `/app/frontend/src/pages/CSDashboard.jsx` - CS dashboard with agent bifurcation
- `/app/frontend/src/pages/MentorDashboardPage.jsx` - Mentor dashboard with bifurcation
- `/app/frontend/src/pages/CustomerMasterPage.jsx` - Customer Master with course info
- `/app/frontend/src/pages/CoursesPage.jsx` - Course management with prices

### Data Counts
- Leads: 1,223 (901 historical + 322 existing)
- Students: 902
- Courses: 46
- LTV Transactions: 899
- Customers: 901
- Finance Receivables: 899
- Employees: 72, Users: 73, Teams: 11

---

## Backlog

### P1 - Upcoming
- Course and Commission Configuration (awaiting user business logic)
- Google Sheets connector user verification
- 51 failed import rows (missing employee IDs: 40003, 40011, 40027)

### P2 - Future
- **Refactor server.py** into domain-specific routes
- Payslip Generation
- Google Ads API Integration
- Mentor Dashboard leaderboard with live data
- Fix `babel-metadata-plugin.js` RangeError (mitigated)

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
