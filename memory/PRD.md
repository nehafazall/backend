# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
A comprehensive ERP system for CLT Academy handling Sales CRM, Customer Service, HR, Finance, Commissions, Attendance, and AI-powered features (Claret AI assistant).

## Core Users
- **CEO/Super Admin**: Full access, executive dashboards, approval workflows, competitor intelligence
- **Sales Executives & Team Leaders**: Lead management, CRM, commissions, battle cards, Claret work companion
- **CS Agents & CS Head**: Student lifecycle management (Kanban/Table)
- **Mentors & Academic Masters**: Student mentoring, class tracking
- **HR & Finance**: Employee management, payroll, documents
- **Marketing**: Competitor intelligence, market analysis, content calendar, content generation

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind + Recharts + Puter.js (web search)
- **Backend**: FastAPI (server.py ~31K lines + claret_module.py + competitor_intel.py + marketing_calendar.py)
- **Database**: MongoDB Atlas
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Integrations**: Meta Ads API, SMTP/Gmail, 3CX, Google Sheets, MT5 (blocked), Puter.js

---

## What's Been Implemented

### Sales CRM Kanban (Updated 2026-03-29)
- Columns: New Lead → Call Back → Warm Lead → Hot Lead → Rejected → Enrolled
- Removed: "No Answer" and "In Progress" columns per user request
- Drag-and-drop with course selection for pipeline stages
- Color-coded closed leads (green=enrolled, red=rejected)

### CS Section (Updated 2026-03-29)
- Sidebar order: Customer Service (Kanban) → CS Dashboard → My Commissions → Student Directory → Student Portal → Merge Approvals → CS Historical Import

### Marketing Calendar (NEW 2026-03-29)
- **Page Management**: Add social media pages with platform (IG, X, FB, YouTube, TikTok, LinkedIn), URL, handle, posting frequency (daily/alternate_day/twice_a_week/weekly/biweekly), auto-assigned color
- **Calendar Auto-generation**: Based on each page's posting frequency, generates entries for 30 days
- **Content Pipeline**: Planned → Video Shot → Edited → Approved → Posted — clickable status buttons in entry detail
- **Color-coded Pages**: Each page gets unique color, visible in calendar grid and legend
- **AI Content Suggestions**: Per-entry AI ideas based on page theme + competitor activity (uses Claude Sonnet 4.5)
- **Deadline Notifications**: Background loop (every 2 hours) checks for entries due in 48 hours that aren't approved/posted, notifies marketing head via Claret
- **Pipeline Tab**: Board view grouping entries by status with progress bars per page
- Backend: `/app/backend/marketing_calendar.py`
- Frontend: `/app/frontend/src/pages/marketing/MarketingCalendarPage.jsx`
- Route: `/marketing/calendar`

### Marketing Intelligence (2026-03-29)
- **Market Analysis Page** (`/marketing/analysis`): Scoring Matrix, Review Sentiment, FB Ad Analysis, Social Intel
- **Content Studio Page** (`/marketing/content-studio`): AI marketing content generator with focus areas
- **Competitor Intelligence Hub**: CRUD, web scraping, AI Battle Cards, daily briefings

### Claret AI — Work Companion (Complete + Enhanced)
- Chat with Claude Sonnet 4.5 (Hinglish/English/Manglish based on preference)
- Natural Language Reminders, Pipeline Advisor, Target Calculator, Day Planner
- Real-time Web Search (Puter.js), Sales Coaching (SPIN selling, objection handling)
- Forex Market Intelligence, Work Culture & Wellness coaching
- Proactive Alerts: Background loop checks for cold hot leads (48h+) and missed reminders
- Onboarding Modal, Knowledge Base CRUD, Mood scoring

### Commission Engine (Complete)
- Course + Addon decomposition, TL commissions (no 18K benchmark)
- CEO Commission Approval Workflow, Net Pay scatter chart

### Executive Dashboard (Complete)
- Revenue KPIs, department breakdown, attendance, top performers, Team Mood Pulse

---

## Pending Issues
| Issue | Priority | Status |
|-------|----------|--------|
| MT5 Web API 403 | P2 | BLOCKED (broker whitelist) |
| LLM Budget Exceeded | P1 | User needs to add balance in Profile → Universal Key |

## Upcoming Tasks
1. **WhatsApp Business API Integration** (P1)
2. **Workflow Automation Engine** (P2)
3. **Scheduled Email Reports** (P2)
4. **Incremental server.py refactoring** (P3) — 31K+ lines, 587 endpoints, 650 functions

## Future / Backlog
- Invoice Generation (PDF)
- Weekly Competitive Digest auto-email
- Auto Battle Card refresh weekly

## Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123
