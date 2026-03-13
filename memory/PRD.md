# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (March 13, 2026)

### P0 COMPLETED: Historical Student Data Import from XLSX

**Requirement:** Import 1016 rows of historical student data from user-provided XLSX file (`SALES TEMPLATE ERP .xlsx`).

**Results:**
- **901 students imported** successfully
- **55 skipped** (duplicate phone numbers already in system)
- **51 failed** (missing employee IDs: 40003, 40011, 40027, plus 4 rows with names instead of IDs)
- **46 courses** auto-created (with price variants like "Basic Package - 2")
- **899 LTV transactions** created for revenue tracking
- **1 team auto-created** ("TEAM CHALLENGE")
- All imported leads are in **"enrolled" stage** (Sales CRM)
- All imported students are in **"activated" stage** (CS module)
- Students properly assigned to Sales Agents, CS Agents, and Mentors

**Bug Fixes During Import:**
1. **Date parsing bug** - XLSX had mixed date formats (datetime objects + MM/DD/YYYY strings). The `_normalize_date` function incorrectly parsed US-format dates (5/14/2025) as DD/MM/YYYY, creating invalid dates like "2025-14-05". Fixed and repaired 655 existing bad dates in leads, students, and ltv_transactions.
2. **Pydantic response model failures** - `LeadResponse`, `StudentResponse`, and `CourseResponse` models had strict `datetime` and `EmailStr` validators that rejected imported data with non-standard formats. Changed to `Optional[str]` for date fields and `str` for email fields.
3. **Course code collisions** - Truncated course codes caused duplicate key errors. Fixed by appending UUID prefix to codes.
4. **Missing team auto-creation** - "TEAM CHALLENGE" from XLSX didn't match DB's "TEAM CHALLENGER". Added auto-create logic for missing teams.
5. **Employee name-as-ID fallback** - Added name-based employee lookup when employee ID doesn't match.

**Data Seeding:**
- `seed_data.json` exported (2.3 MB) with all 3398 documents
- Export script: `python3 /app/backend/db_seeder.py export`
- Ensures data persists across deployments

**Testing:** 11/11 tests passed (backend pytest + browser automation)

---

## Architecture

### Tech Stack
- **Frontend:** React 18 + Tailwind CSS + Shadcn/UI + Craco
- **Backend:** FastAPI + Motor (async MongoDB) + Pydantic
- **Database:** MongoDB
- **Dependencies:** pandas, openpyxl (XLSX), APScheduler, bcrypt, PyJWT

### Key Files
- `/app/backend/server.py` - Monolithic backend (20K+ lines, needs refactoring)
- `/app/backend/db_seeder.py` - DB seed/export utility
- `/app/backend/seed_data.json` - Deployment data seed file
- `/app/frontend/src/lib/api.js` - API client layer
- `/app/frontend/src/pages/` - All page components

### Key Endpoints
- `POST /api/import/historical-students-xlsx` - Historical XLSX import
- `GET /api/leads` - Leads list (1000 limit)
- `GET /api/students` - Students list
- `GET /api/courses` - Courses list
- `POST /api/auth/login` - Auth (returns `access_token`)

### Data Counts (as of March 13, 2026)
- Leads: 1,223 (901 historical + 322 existing)
- Students: 902
- Courses: 46
- LTV Transactions: 899
- Employees: 72
- Users: 73
- Teams: 11

---

## Backlog

### P1 - Upcoming
- Course and Commission Configuration (awaiting user business logic)
- Google Sheets connector user verification

### P2 - Future
- **Refactor server.py** into domain-specific routes (`routes/hr.py`, `routes/sales.py`, etc.)
- Payslip Generation
- Google Ads API Integration
- Mentor Dashboard leaderboard with live data
- Fix `babel-metadata-plugin.js` RangeError (currently mitigated)

### P3 - Technical Debt
- Clean up invalid dates in pre-existing leads ("N", "2310/2025")
- Standardize date storage format across all collections
- Add pagination to leads API (currently limited to 1000)

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
