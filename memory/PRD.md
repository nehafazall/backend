# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a comprehensive CRM/ERP system for CLT Academy covering Sales, Customer Service, Mentors, HR, Finance, Business Development, Reporting, and Analytics.

## Architecture
- **Backend:** FastAPI + MongoDB Atlas (server.py ~26K lines)
- **Frontend:** React + Shadcn UI + Recharts + react-window + reportlab (PDF)
- **Auth:** JWT-based with role-based access control
- **Integrations:** Google Sheets, Meta Ads, SMTP, ZK BioCloud, APScheduler, 3CX
- **Performance:** GZip compression, MongoDB indexes, server-side pagination

## What's Been Implemented

### Session - March 23, 2026

**Batch 7 - Five New Features (Iteration 67: 100% pass)**
- **Notification Center**: Bell icon in header with popover panel, unread badge, mark read/all, 30s polling, notification types (info/success/warning/error/transfer/finance/certificate)
- **Certificate Generation**: PDF via reportlab — CLT Academy branding (red/black corner accents, dual signatures COO+CEO, award emblem), types (Course Completion, Star Performer, Excellence, Best Trader, Achievement), download + history
- **Report Builder**: 6 data sources (leads, students, cs_upgrades, mentor_redeposits, users, certificates), checkbox field selection, text/date filters, sort, limit, CSV export
- **Revenue Forecasting**: 6-month historical (enrollments + upgrades + redeposits), 3-month projections, pipeline analysis, KPIs (avg monthly, growth rate, conversion rate), trend + stacked bar charts
- **Student Portal Embed**: iframe of main.clt-academy.com/admin/students in CS section with "Open in New Tab" option

**Batch 6 - Performance + CS Bug (Iteration 66: 100% pass)**
- Pagination (25/50/100) across all 4 Kanbans — 98% payload reduction
- GZip compression, MongoDB indexes
- CS transfer bug fix (StudentUpdate missing cs_agent_name)

**Batch 5 - BD Call Center (Iteration 65: 100% pass)**
- 3CX ClickToCall in BD CRM, follow-up notes system, reminders, call recordings

**Batch 4 - Transaction History (Iteration 64: pass)**
- Unified transaction history across CS/Mentor/BD modals
- BD Dashboard visibility controls (revenue hidden from BD agents)

**Batch 3 - BD Module (Iteration 63: 100% pass)**
- Full BD CRM Kanban + Dashboard, round-robin assignment, redeposits

### Previous Sessions
- Universal Period Filter, Mentor Scoping & Reassignment
- Dashboard KPIs, Monthly Closings, Customer Master Net LTV
- Sales Search Fallback, Currency AED fix, CS Upgrade Dates

## Prioritized Backlog

### P1
- Build UI for admins to dynamically configure commission structures
- Post-Deployment Checks (Google Cloud redirect_uri, CORS)

### P2
- Refactor `server.py` into domain-driven route files
- Payslip generation feature
- Google Ads API integration
- WhatsApp Business API integration
- Email campaign system
- Workflow automation engine

### P3
- Student self-service portal
- Auto lead scoring
- Scheduled report emails
- Document management
- Fix recurring `RangeError: Maximum call stack size exceeded` (babel plugin)

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
- **CS Head:** falja@clt-academy.com / Falja@123
- **BD Agent (Rashida):** rashidha@clt-academy.com / Rashida@123
- **BD Agent (Farsana):** farsana@clt-academy.com / Farsana@123
