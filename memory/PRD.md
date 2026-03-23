# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, and Finance departments with dashboards, lead management, student management, and reporting.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~25K lines)
- **Frontend:** React + Shadcn UI + Recharts
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler

## What's Been Implemented

### Session - March 23, 2026 (Current)

**Batch 1 - P0 Fixes (Iteration 59: 100% pass)**
1. Dashboard Operational KPI Row - 6 clickable cards: Active Pipeline→/sales, New Leads Today→dialog, Pending Activations→/cs, Mentor Students→/mentor, Enrolled YTD (994), Enrolled MTD
2. New Leads Today Dialog with table
3. Mentor Revenue AED Fix (Dashboard + MentorCRM) - Changed from USD `amount` to AED `amount_aed`
4. Period filtering fix for mentors - Uses `date` field instead of `created_at`
5. Enrolled Leads Descending Sort
6. Advanced Sales Search Fallback

**Batch 2 - Mentor Closings, CS Dates, Customer LTV (Iteration 60: ~96% pass)**
1. Mentor CRM Monthly Closings Dialog - Click "Net Active" in banner → dialog with Sr, Name, Email, Mobile, Deposit, Withdrawal, Net per student
2. CS Kanban Upgrade Date - Shows last upgrade date badge on student cards  
3. Customer Master Net LTV - Includes mentor deposits/withdrawals in customer lifetime value
4. Customer Detail shows full LTV breakdown: Enrollment + Deposits - Withdrawals = Net LTV

### Previous Sessions
- Dashboard Custom Date Range, Top 10 Sales Chart, Course Commissions
- Mentor Historical Import, Double-Count Bug Fix, CS Runtime Error Fix
- SMTP Templates, Student Export, Mentor Bonus Fix

## Revenue Verification (March 23, 2026)
| Period | Sales | CS | Academics | Total |
|--------|-------|-----|-----------|-------|
| This Month | AED 299,065 | AED 65,903 | AED 113,828 | AED 478,796 |

## Prioritized Backlog

### P1
- Per-Course Commission Calculation (wire commission fields into Sales Dashboard "My Earnings")
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)

### P2
- Refactor `server.py` into domain-driven route files  
- Admin UI for dynamic commission configuration
- Payslip generation feature
- Google Ads API integration
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
