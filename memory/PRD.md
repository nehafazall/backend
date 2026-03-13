# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: Sales Dashboard Enhancements + Bug Fixes

**Fixes Applied:**
1. Removed "Import Comprehensive Students" and "Import Students XLSX" buttons from Sales CRM
2. Fixed "Sales by Course" chart — revenue was showing 0 (backend used `sale_amount` instead of `enrollment_amount`)
3. Fixed "Monthly Revenue Trend" — was using `updated_at` (import timestamp) instead of `enrolled_at` (actual enrollment date). Now shows 12 months of data
4. Made Sales Leaderboard monthly
5. Added "Today's Transactions" section on dashboard
6. Made dashboard elements clickable with drill-down popup modals (Top Agents, Leaderboard, Sales by Course, Pipeline → redirects to Sales CRM)
7. Fixed Payment Gateway creation error (`Select.Item` with empty string value)
8. Fixed Finance CLT Dashboard showing AED 0 (added `amount_in_aed` field to receivables)

**Dashboard Features:**
- Total Revenue: AED 2,174,969 (902 deals)
- Top 10 Agents Overall + Top 5 This Month (bar charts)
- Sales by Course (donut chart with top 8 + "Others")
- Monthly Revenue Trend (dual-axis: revenue area + deals line)
- Monthly Leaderboard (top agents with revenue)
- Today's Transactions (real-time feed)
- Drill-down modals on all major widgets

### Previous: Historical Data Import + Dashboard Bifurcation

**Import Results:**
- 901 students imported with correct US date format (MM/DD/YYYY)
- 46 courses auto-created with prices
- 899 LTV transactions, 901 customers, 899 finance receivables
- All dates distributed correctly: Oct 2024 through Jan 2026

**CS Dashboard:** Agent bifurcation with SLA rates + date filters
**Mentor Dashboard:** Student counts per mentor + redeposit tracking + date filters
**Customer Master:** Course column, enrollment date, sorted ascending
**Finance Receivables:** 899 records, AED 2,174,969, sorted by date

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
- Course and Commission Configuration (awaiting user business logic)
- 51 failed import rows (missing employee IDs: 40003, 40011, 40027)

### P2 - Future
- Refactor server.py into domain-specific routes
- Payslip Generation
- Google Ads API Integration
- Mentor Dashboard leaderboard with live data

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
