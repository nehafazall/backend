# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
A comprehensive ERP system for CLT Academy handling Sales CRM, Customer Service, HR, Finance, Commissions, Attendance, and AI-powered features (Claret AI assistant).

## Core Users
- **CEO/Super Admin**: Full access, executive dashboards, approval workflows, competitor intelligence
- **Sales Executives & Team Leaders**: Lead management, CRM, commissions, battle cards, Claret work companion
- **CS Agents & CS Head**: Student lifecycle management (Kanban/Table)
- **Mentors & Academic Masters**: Student mentoring, class tracking
- **HR & Finance**: Employee management, payroll, documents
- **Marketing**: Competitor intelligence, market analysis, content generation

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind + Recharts + Puter.js (web search)
- **Backend**: FastAPI (server.py ~31K lines + claret_module.py + competitor_intel.py)
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

### Claret AI — Work Companion (Complete + Enhanced)
- Chat with Claude Sonnet 4.5 (Hinglish/English/Manglish based on preference)
- **Natural Language Reminders**: auto-parsed, stored, fires as notification + auto-opens widget
- **Pipeline Advisor**: Analyzes user's hot leads with priority alerts for stale leads
- **Target Calculator**, **Day Planner**, **Work Memory**
- **Real-time Web Search**: Puter.js integration
- **Sales Coaching**: SPIN selling, objection handling, conversion rate analysis with real ERP data
- **Forex Market Intelligence**: Currency pairs, central bank policies, risk management, technical analysis
- **Work Culture & Wellness**: Burnout detection, pressure reduction, micro-goal setting, context switching advice
- **Competitor Context**: Auto-injects scraped competitor data
- **Proactive Alerts**: Background loop (every 15 min) checks for cold hot leads (48h+) and missed reminders
- Onboarding Modal, Knowledge Base CRUD, Mood scoring

### Marketing Intelligence (NEW - 2026-03-29)
- **Market Analysis Page** (`/marketing/analysis`):
  - Scoring Matrix tab: CLT vs 6 competitors across 8 dimensions with AI insights
  - Review Sentiment tab: Google Reviews/GMB sentiment analysis per competitor
  - FB Ad Analysis tab: Facebook Ad Library deep parsing
  - Social Intel tab: Instagram/Facebook engagement signals and content themes
- **Content Studio Page** (`/marketing/content-studio`):
  - AI-generated marketing content ideas based on competitor intelligence
  - Focus areas: General, Social Media, Paid Ads, Email, Counter Competitors, Brand Awareness, Lead Gen
  - Campaign themes, messaging differentiation, weekly content calendar
- Competitor Intelligence Hub: CRUD, web scraping, AI Battle Cards, daily briefings
- Auto-daily scraping at 04:00 UTC

### Commission Engine (Complete)
- Course + Addon decomposition, TL commissions (no 18K benchmark)
- CEO Commission Approval Workflow
- Net Pay scatter chart

### UI/UX & Access Control (Complete)
- Role-based sidebar filtering
- Marketing section: Analytics Dashboard, Competitor Intel, Market Analysis, Content Studio, Lead Connectors, Settings
- CS Student Detail Modal: Tabbed

### Executive Dashboard (Complete)
- Revenue KPIs, department breakdown, attendance, top performers
- Team Mood Pulse

### Background Services
- Competitor auto-scrape scheduler (daily 04:00 UTC)
- Claret reminder check loop (every 30 seconds) + proactive alerts (every 15 min)
- MT5 auto-sync loop
- Daily finance report scheduler

---

## Pending Issues
| Issue | Priority | Status |
|-------|----------|--------|
| MT5 Web API 403 | P2 | BLOCKED (broker whitelist) |

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
