# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~29.7K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### Executive Dashboard (Enriched — Mar 27, 2026)
- Merged operational dashboard into CEO executive view
- 12 KPI cards: Total/Sales/CS/Academics revenue, Salary Payout, Total Payout, New Leads, Pipeline, Activations, Employees, Present Today, Pending Approvals
- Revenue Trend (6 months, 3-dept stacked area chart)
- Revenue by Department, Revenue by Course (with proper name tags)
- Attendance Today donut (present/half-day/absent/on-leave/warning)
- Gender Bifurcation (compact pie, normalized Male/Female/Other tagging)
- Course Bifurcation for new accounts this month
- Salary + Commission Payout panel (AED gross + commission = total)
- Top Performers: Sales, CS, Academics leaderboards
- Department Headcount, Lead Sources, Expiring Documents (30-day), Recent Enrollments
- Operations sidebar "Dashboard" link removed, replaced by Executive section

### Internal Chat System (Complete — Mar 27, 2026)
- DM conversations + group chat
- Online/Away/Offline status with green/amber/gray dots
- Heartbeat tracking (POST /api/chat/heartbeat)
- All employees visible (85+ users including inactive)
- 5s polling for real-time updates
- Available to all authenticated users

### Attendance Rules (Updated — Mar 27, 2026)
- Grace period changed from 15 to 30 minutes (after 10:30 = late for morning shift)
- Updated in DEFAULT_SHIFTS code + DB records
- Leave approval now marks attendance as "on_leave" (bulk write for each leave day)

### CEO Commission Approval Workflow (Complete)
- CEO approve/revoke Sales & CS commissions
- Transaction-level approval with edit and bulk approve
- Pending/Approved status banners for agents

### Color-Coded Closed Leads (Complete)
- Enrolled: emerald green bg + ring + "Enrolled" badge with amount
- Rejected: rose/red bg + ring + opacity + "Rejected" badge with reason

### Previous Session Work
- Payroll multi-currency (AED/INR), Employee Birthday, SSHR Announcements
- 3CX Call Minutes, CS Historic Data Migration
- Attendance Rules Engine, Manual Punch-In/Out + Timesheets
- Commission decomposition (Course + Addon), TL commission fix
- Role-based sidebar filtering, environment badge hiding
- Biocloud Upload timeout fix (bulk_write)

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API: Awaiting broker whitelist

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Workflow Automation Engine
- Scheduled Email Reports
- Group chat channels (#sales-team, #cs-team)

### P3
- Refactor monolithic server.py (~29.7K lines)
- Special Periods frontend UI for attendance rules
- Document expiry tracking data entry (HR module)
