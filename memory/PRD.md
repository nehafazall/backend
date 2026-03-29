# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
A comprehensive ERP system for CLT Academy handling Sales CRM, Customer Service, HR, Finance, Commissions, Attendance, and AI-powered features (Claret AI assistant).

## Core Users
- **CEO/Super Admin**: Full access, executive dashboards, approval workflows, competitor intelligence
- **Sales Executives & Team Leaders**: Lead management, CRM, commissions, battle cards, Claret work companion
- **CS Agents & CS Head**: Student lifecycle management (Kanban/Table)
- **Mentors & Academic Masters**: Student mentoring, class tracking
- **HR & Finance**: Employee management, payroll, documents

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind + Recharts + Puter.js (web search)
- **Backend**: FastAPI (server.py ~31K lines + claret_module.py + competitor_intel.py)
- **Database**: MongoDB Atlas
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Integrations**: Meta Ads API, SMTP/Gmail, 3CX, Google Sheets, MT5 (blocked), Puter.js

---

## What's Been Implemented

### Claret AI — Work Companion (Complete)
- Chat with Claude Sonnet 4.5 (Hinglish/English/Manglish based on preference)
- **Natural Language Reminders**: "remind me at 3pm to call Faizeen" → auto-parsed, stored, fires as notification + auto-opens widget
- **Pipeline Advisor**: Analyzes user's hot leads, suggests who to call first with approach
- **Target Calculator**: "3 days, 50K target" → "You need 16,667/day. Here's your breakdown..."
- **Day Planner**: Pulls schedule, reminders, follow-ups, builds structured plan
- **Work Memory**: Remembers important work conversations across sessions
- **Real-time Web Search**: Puter.js integration for live market data, forex news, geopolitical updates
- **Sales Coaching**: SPIN selling, objection handling, conversion rate analysis with real ERP data
- **Competitor Context**: Auto-injects scraped competitor data into conversations
- **Daily Briefing**: Personalized morning briefing (pipeline, follow-ups, motivation, competitive edge)
- **Auto-open Widget**: Opens automatically when reminder fires
- Onboarding Modal (Name, Nickname, Language, 10 MCQs, T&C)
- Knowledge Base CRUD with PDF extraction
- ERP data querying (leads, students, commissions, attendance, upgrades)
- Mood scoring and tracking

### Competitor Intelligence Hub (Complete)
- Full Competitor Profiles: Website, Instagram, Facebook, LinkedIn, YouTube, Twitter, Google Reviews/GMB, FB Ad Library, TikTok
- Web Scraping Engine with content extraction (pricing, courses, raw content)
- **AI Battle Cards**: Strengths, weaknesses, objection counters, talking points per competitor
- **Auto-daily Scraping**: Background scheduler at 04:00 UTC
- Scrape All batch action
- 6 real competitors: Delta Trading Academy (deltainstitutions.com), FundFloat (fundfloat.ae), Mithuns Money Market (mithunsmoneymarket.com), Stellar FX (stellarfxacademy.com), James Trading (jeafx.com), Moneytize (moneytize.ae)

### Commission Engine (Complete)
- Course + Addon decomposition, TL commissions (no 18K benchmark)
- CEO Commission Approval Workflow (approve/reject per department per month)
- Net Pay scatter chart (salary + commissions verified correct)

### UI/UX & Access Control (Complete)
- Role-based sidebar filtering, testing badge hidden for non-admins
- **Closed leads color-coding**: Enrolled = green, Rejected = red (Kanban + Table)
- CS Student Detail Modal: Tabbed (Info / Transactions / Calls / Update)

### Executive Dashboard (Complete)
- Revenue KPIs, department breakdown, attendance, top performers
- **Team Mood Pulse**: Average Claret AI mood scores per team

### Background Services
- Competitor auto-scrape scheduler (daily 04:00 UTC)
- Claret reminder check loop (every 30 seconds)
- MT5 auto-sync loop
- Daily finance report scheduler

---

## Pending Issues
| Issue | Priority | Status |
|-------|----------|--------|
| MT5 Web API 403 | P2 | BLOCKED (broker whitelist) |

## Upcoming Tasks
1. **Competitor Intelligence Phase 3**: FB Ad Library parsing, Instagram/Facebook comment scraping, Google Reviews sentiment, comparative scoring matrix, marketing content generator
2. **Claret AI Phase 3**: Proactive notifications (cold leads, pipeline alerts), Slack-style thread context, daily auto-briefing broadcast
3. **Auto Battle Card Refresh**: Regenerate battle cards weekly after scrape cycle

## Future / Backlog
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
