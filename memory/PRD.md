# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: Sales Dashboard Overhaul + UI/UX Improvements

**Sales Dashboard (Fully Rebuilt):**
- Date filters: Today, Yesterday, This Week, This Month, This Quarter, This Year, Overall, Custom Range
- Key metrics cards: Revenue (AED 2,174,969), Total Leads (1,223), Conversion (73.8%), Avg Deal (AED 2,411), Today's Transactions
- Top 10 Agents horizontal bar chart (filterable by period)
- Team-wise Revenue chart with click-to-drill-down (shows individual agent breakdown in modal)
- Monthly Revenue Trend (dual-axis area chart: revenue + deals)
- This Month vs Last Month comparison (cumulative line chart)
- Sales by Course donut chart with drill-down modal
- Monthly Leaderboard (top 5 agents with "View All" modal)
- Lead Pipeline (clickable, navigates to Sales CRM)
- All widgets support date period filtering

**Global UI/UX Improvements:**
- All modals/popups now scrollable (max-h-[85vh] overflow-y-auto in base DialogContent)
- Improved color contrast for both light and dark themes:
  - Light: muted-foreground 36% (was 45%), borders 85% (was 90%)
  - Dark: muted-foreground 78% (was 69%), borders 28% (was 25%), card 14% (was 15%)

**Data Integrity Fixes:**
- 68 future-dated records corrected (day/month swapped)
- DB seed exported with corrected data (5,197 documents)
- No future-dated revenue remaining (verified: trend ends at March 2026)

### Previous Work
- 901 students imported with correct US date format (MM/DD/YYYY)
- 46 courses auto-created with prices
- 899 LTV transactions, 901 customers, 899 finance receivables
- CS Dashboard: Agent bifurcation with SLA rates + date filters
- Mentor Dashboard: Student counts per mentor + redeposit tracking
- Finance Dashboard: Total receivables AED 2,174,969
- Import buttons removed from Sales CRM
- Payment Gateway form crash fixed

---

## Architecture

### Tech Stack
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

### Data Counts
- Leads: 1,223 | Students: 902 | Courses: 46
- LTV Transactions: 899 | Customers: 901 | Finance Receivables: 899
- Employees: 72 | Users: 72 | Teams: 11

---

## Backlog

### P1 - Upcoming
- User Verification for Google Sheets connector
- Course and Commission Configuration (awaiting user business logic)

### P2 - Future
- Refactor server.py into domain-specific routes
- Payslip Generation
- Google Ads API Integration
- Mentor Dashboard leaderboard with live data
- Fix Babel Plugin RangeError (currently mitigated with workaround)
- 51 failed import rows (missing employee IDs: 40003, 40011, 40027)

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
