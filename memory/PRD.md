# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
A comprehensive ERP system for CLT Academy handling Sales CRM, Customer Service, HR, Finance, Commissions, Attendance, and AI-powered features (Claret AI assistant).

## Core Users
- **CEO/Super Admin**: Full access, executive dashboards, approval workflows, competitor intelligence
- **Sales Executives & Team Leaders**: Lead management, CRM, commissions, battle cards
- **CS Agents & CS Head**: Student lifecycle management (Kanban/Table)
- **Mentors & Academic Masters**: Student mentoring, class tracking
- **HR & Finance**: Employee management, payroll, documents

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind + Recharts + Puter.js (web search)
- **Backend**: FastAPI (monolith server.py ~31K lines + claret_module.py + competitor_intel.py)
- **Database**: MongoDB Atlas
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Integrations**: Meta Ads API, SMTP/Gmail, 3CX, Google Sheets, MT5 (blocked), Puter.js (web search)

---

## What's Been Implemented

### Commission Engine (Complete)
- Course + Addon decomposition logic
- Team Leader commissions (no 18K benchmark)
- CS agent commission summary on dashboard
- Course Commission management in Commission Engine page
- CEO Commission Approval Workflow (approve/reject per department per month)
- AsyncIO parallelization for CEO view (~32s → ~7.5s)
- Net Pay scatter chart (salary + commissions verified correct)

### UI/UX & Access Control (Complete)
- Role-based sidebar filtering (strict)
- Testing badge hidden for non-admins
- Master of Academics = Team Leader permissions
- Color tags for students (Handle With Care, VIP, Priority, etc.)
- **Closed leads color-coding**: Enrolled leads = green border/bg, Rejected = red border/bg (Kanban + Table)

### CS Kanban & Table View (Complete)
- Independent per-column pagination
- Table View toggle with Stage Filter dropdown
- Decoupled date filter from Table View
- **Tabbed Student Detail Modal** (Info / Transactions / Calls / Update) — fixes transaction history visibility

### Sales Features (Complete)
- Table View toggle for Sales CRM
- Sales Directory page (CEO/COO/Manager only)
- Historical Import page
- Color-coded closed leads in both views

### Claret AI (Complete — Phase 1 + Phase 2)
- Chat with Claude Sonnet 4.5
- Onboarding Modal (Name, Nickname, Language: English/Hinglish/Manglish, 10 MCQs, T&C)
- Knowledge Base CRUD with PDF extraction
- ERP data querying (leads, students, commissions, attendance, upgrades)
- Mood scoring and tracking
- Positioned bottom-left
- **Sales Intelligence prompt** (SPIN selling, objection handling, competition awareness)
- **Real-time Web Search** via Puter.js (live market data, forex news, geopolitical updates)
- **Enhanced Sales Coaching** with actual conversion rates, deal sizes, pipeline health
- **Daily Briefing Engine** — personalized morning briefings with pipeline, follow-ups, motivation, competitive edge
- **Competitor Context Injection** — Claret pulls scraped competitor data into conversations

### Competitor Intelligence Hub (Complete — Phase 1 + Phase 2)
- Competitor CRUD (Add/Edit/Delete)
- Web scraping engine (website, social links, Google reviews)
- Intel storage with tabs (Overview, Battle Card, Pricing, Courses, Raw Content)
- **AI-Generated Battle Cards** — one-page competitive cheat sheets with strengths, weaknesses, objection counters, talking points
- Scrape All batch action
- **Auto-scheduled daily scraping** at 04:00 UTC
- 6 competitors seeded: Delta Trading Academy, FundFloat, Mithuns Money Market, Stellar FX, James Trading Institute, Moneytize

### People Intelligence / Security (Complete)
- Claret chat monitoring dashboard
- Team chat monitoring
- Personality profiles from Claret onboarding

### Executive Dashboard (Complete)
- Revenue KPIs, department breakdown, attendance
- Top performers, lead sources, document expiry
- **Team Mood Pulse** — Average Claret AI mood scores per team (XLNC, CHALLENGER, GLADIATORS, etc.)

---

## Pending Issues
| Issue | Priority | Status |
|-------|----------|--------|
| MT5 Web API 403 | P2 | BLOCKED (broker whitelist) |

## Upcoming Tasks
1. **Competitor Intelligence Phase 3**: Social media deep parsing (Instagram/Facebook), Google Reviews sentiment comparison, marketing content generator
2. **Claret AI Phase 3**: Auto call reminders, Slack-style thread replies, proactive notifications based on pipeline changes
3. **Daily Briefing Auto-send**: Trigger briefings via cron at 8 AM UAE time as notifications

## Future / Backlog (P2-P3)
- Invoice Generation (PDF)
- WhatsApp Business API Integration
- Workflow Automation Engine
- Scheduled Email Reports
- Refactor server.py (31K+ lines → modular routes)

## Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123
