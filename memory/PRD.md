# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
A comprehensive ERP system for CLT Academy handling Sales CRM, Customer Service, HR, Finance, Commissions, Attendance, and AI-powered features (Claret AI assistant).

## Core Users
- **CEO/Super Admin**: Full access, executive dashboards, approval workflows
- **Sales Executives & Team Leaders**: Lead management, CRM, commissions
- **CS Agents & CS Head**: Student lifecycle management (Kanban/Table)
- **Mentors & Academic Masters**: Student mentoring, class tracking
- **HR & Finance**: Employee management, payroll, documents

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind + Recharts
- **Backend**: FastAPI (monolith server.py ~31K lines)
- **Database**: MongoDB Atlas
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Integrations**: Meta Ads API, SMTP/Gmail, 3CX, Google Sheets, MT5 (blocked)

---

## What's Been Implemented

### Commission Engine (Complete)
- Course + Addon decomposition logic
- Team Leader commissions (no 18K benchmark)
- CS agent commission summary on dashboard
- Course Commission management in Commission Engine page
- AsyncIO parallelization for CEO view (~32s → ~7.5s)

### UI/UX & Access Control (Complete)
- Role-based sidebar filtering (strict)
- Testing badge hidden for non-admins
- Master of Academics = Team Leader permissions
- Color tags for students (Handle With Care, VIP, Priority, etc.)

### CS Kanban & Table View (Complete)
- Independent per-column pagination
- Table View toggle with Stage Filter dropdown
- Decoupled date filter from Table View

### Sales Features (Complete)
- Table View toggle for Sales CRM
- Sales Directory page (CEO/COO/Manager only)
- Historical Import page

### Claret AI (Complete — Phase 1)
- Chat with Claude Sonnet 4.5
- Onboarding Modal (Name, Nickname, Language: English/Hinglish/Manglish, 10 MCQs, T&C)
- Knowledge Base CRUD with PDF extraction
- ERP data querying (leads, students, commissions, attendance, upgrades)
- Mood scoring and tracking
- Positioned bottom-left
- **Sales Intelligence prompt** (SPIN selling, objection handling, competition awareness)
- **Daily Briefing Engine** — personalized morning briefings with pipeline, follow-ups, motivation, competitive edge
- **Competitor Context Injection** — Claret pulls scraped competitor data into conversations

### Competitor Intelligence Hub (Complete — Phase 1)
- Competitor CRUD (Add/Edit/Delete)
- Web scraping engine (website, social links, Google reviews)
- Intel storage with tabs (Overview, Pricing, Courses, Raw Content)
- Scrape All batch action
- 6 competitors seeded: Delta Trading Academy, FundFloat, Mithuns Money Market, Stellar FX, James Trading Institute, Moneytize

### People Intelligence / Security (Complete)
- Claret chat monitoring dashboard
- Team chat monitoring
- Personality profiles from Claret onboarding

### Executive Dashboard (Complete)
- Revenue KPIs, department breakdown, attendance
- Top performers, lead sources, document expiry
- **Team Mood Pulse** — Average Claret AI mood scores per team (XLNC, CHALLENGER, GLADIATORS, etc.)

### Transaction History Fix (Complete)
- CS Student Detail Modal restructured into tabbed interface (Info/Transactions/Calls/Update)
- TransactionHistory component now accessible via dedicated "Transactions" tab

---

## Pending Issues
| Issue | Priority | Status |
|-------|----------|--------|
| MT5 Web API 403 | P2 | BLOCKED (broker whitelist) |

## Upcoming Tasks (P1-P2)
1. **Competitor Intelligence Phase 2**: Auto-scheduling scrape jobs, social media parsing, Google Reviews sentiment, marketing content generation
2. **Claret AI Phase 2**: Real-time web search integration, call reminders via Claret, sales performance coaching with actual conversion data
3. **CEO Commission Approval Workflow**: Monthly approve/reject flow
4. **Closed Lead Color-Coding**: Visual differentiation in CRM
5. **Net Pay Chart Fix**: Salary data from hr_employees collection

## Future / Backlog (P2-P3)
- Invoice Generation (PDF)
- WhatsApp Business API Integration
- Executive Dashboard (CEO single-page overview)
- Workflow Automation Engine
- Scheduled Email Reports
- Refactor server.py (31K+ lines → modular routes)

## Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123
