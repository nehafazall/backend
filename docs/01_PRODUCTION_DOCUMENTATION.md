# CLT Synapse ERP — Production Documentation
**Version**: 2.0 | **Last Updated**: March 30, 2026 | **Status**: Production

---

## 1. System Overview

CLT Synapse is a custom-built Enterprise Resource Planning (ERP) system designed for CLT Academy — a forex/trading education company operating in the UAE. It unifies Sales, Customer Service, HR, Finance, Operations, Marketing, and AI-powered intelligence into a single platform.

### Key Capabilities
| Module | What It Does |
|--------|-------------|
| **Sales CRM** | Kanban/Table lead management, pipeline tracking, SLA monitoring, click-to-call |
| **Sales Dashboard** | Revenue KPIs, agent performance, team-wise breakdowns, conversion analytics |
| **Customer Service** | Student lifecycle Kanban (New → Activated → Upgraded), transaction history, mentor assignment |
| **Commissions** | Auto-calculated commissions with Course + Addon decomposition, CEO approval workflow |
| **Human Resources** | Employee master, payroll, leave management, attendance (biometric sync), documents |
| **Marketing** | Competitor intelligence, content calendar, market analysis, AI content studio |
| **Claret AI** | AI work companion — reminders, pipeline advice, sales coaching, proactive alerts |
| **Executive Dashboard** | High-level KPIs, team mood scores, department summaries |

### Users & Roles
| Role | Access Level |
|------|-------------|
| **Super Admin / CEO** | Full access to all modules. Can approve commissions, manage users, view all data. |
| **Admin / COO** | Full access except some super_admin-only settings. |
| **Sales Head / Sales Manager** | Sales CRM, Sales Dashboard (team view), Commissions. |
| **Team Leader** | Sales CRM (team view), commissions (team earnings). |
| **Sales Executive** | Sales CRM (own leads only), commissions (own only). |
| **CS Head** | Customer Service (all students), student directory, merge approvals. |
| **CS Agent** | Customer Service (assigned students only), commissions. |
| **Mentor / Master of Academics** | Academics module, student mentoring, class tracking. |
| **Marketing** | Marketing calendar, competitor intel, market analysis, content studio. |
| **HR** | HR module, employee management, payroll, attendance. |
| **Finance** | Finance module, payroll, expense tracking. |

---

## 2. Module Details

### 2.1 Sales CRM
**Path**: `/sales`

- **Kanban View**: Drag-and-drop cards across 6 stages: **New Lead → Call Back → Warm Lead → Hot Lead → Rejected → Enrolled**
- **Table View**: Sortable, searchable table with all lead details
- **Lead Card**: Shows name, phone, assigned agent, SLA badge, source, creation date
- **Filters**: By agent, date range, search text
- **Actions**: Add lead, import leads, update stage, assign agent, add notes, click-to-call (3CX)
- **Color Coding**: Enrolled = green highlight, Rejected = red highlight
- **SLA Tracking**: Automatic SLA badges when leads aren't contacted within threshold

### 2.2 Sales Dashboard
**Path**: `/sales/dashboard`

- Monthly KPIs: Revenue, Total Leads, Conversion Rate, Average Deal Size, Today's Revenue
- Top 10 Agents by Revenue (bar chart — clickable)
- Team-wise Revenue (bar chart — clickable)
- Monthly Revenue Trend (line chart)
- Net Pay Scatter Chart (Salary + Commission)
- Deal-wise Breakdown Table

### 2.3 Customer Service
**Path**: `/cs`

- **Student Kanban**: New Student → Activated → Satisfactory Call → Pitched Upgrade → Upgraded
- **Student Card**: Name, phone, course, mentor, classes attended, onboarding status
- **Student Detail Modal**: Tabbed view with Profile, Activity, Transaction History
- **Agent Tabs**: Quick filter by CS agent (Falja, Angel Mary, etc.)
- **Metrics Bar**: New/Activated/Satisfactory/Pitched/Upgraded counts + Period Revenue

### 2.4 Student Directory
**Path**: `/cs/directory`

- Searchable table of all 1,048+ students
- Columns: Name, Phone, Email, Stage, CS Agent, Course, Amount, Enrolled Date
- Filters: By stage, by CS agent
- Course names and amounts pulled from enrollment data

### 2.5 Commission Dashboard
**Path**: `/commission-dashboard`

- **Tabs**: Sales Commissions, CS Commissions, Approve Transactions, CEO Pools
- **Sales Commissions**: Shows Earned, Pending, TL Earned, SM/CEO Pool amounts
- **CEO Approval**: Monthly approval workflow — CEO must approve before commissions become "Earned"
- **Commission Logic**: Course + Addon decomposition. TL gets commissions from team without 18K benchmark.

### 2.6 Human Resources
**Path**: `/hr/employees`

- Employee Master: 86 employees with ID, name, gender, department, designation, joining date, status
- **Sub-modules**: Company Documents, Leave Management, Attendance, Attendance Settings, Approval Queue, BioCloud Sync, Payroll, Performance, HR Analytics

### 2.7 Marketing Module

#### Content Calendar (`/marketing/calendar`)
- **Pages Tab**: Add social media pages (Instagram, X, Facebook, YouTube, TikTok, LinkedIn) with posting frequency
- **Calendar Tab**: Monthly grid showing color-coded entries per page
- **Pipeline Tab**: Content readiness tracker — Planned → Video Shot → Edited → Approved → Posted
- **AI Suggestions**: Per-entry AI content ideas based on page theme + competitor data
- **Deadline Alerts**: Automatic notifications when posts are due but content isn't ready

#### Competitor Intelligence (`/competitor-intelligence`)
- Track 6 competitors: Delta Trading Academy, FundFloat, James Trading Institute, Mithuns Money Market, Moneytize, Stellar FX
- Auto-scraping (daily at 04:00 UTC)
- AI Battle Cards per competitor
- Daily briefings via notifications

#### Market Analysis (`/marketing/analysis`)
- **Scoring Matrix**: CLT vs competitors across 8 dimensions (Course Quality, Pricing, Social Presence, etc.)
- **Review Sentiment**: Google Reviews/GMB analysis per competitor
- **FB Ad Analysis**: Facebook Ad Library parsing
- **Social Intel**: Instagram/Facebook engagement signals

#### Content Studio (`/marketing/content-studio`)
- AI-generated marketing ideas with focus areas (Social Media, Paid Ads, Email, Counter Competitors, etc.)
- Campaign themes, messaging differentiation, weekly content calendar suggestions

### 2.8 Claret AI
**Trigger**: Purple chat icon (bottom-left corner on every page)

- **Chat**: Natural language conversation in English/Hinglish/Manglish
- **NLP Reminders**: "Remind me at 5pm to call the new lead" → auto-parsed, saved, fires as notification
- **Pipeline Advisor**: Analyzes your leads, warns about stale hot leads, suggests closing strategies
- **Target Calculator**: "What's my target this month?" → pulls real data
- **Sales Coaching**: SPIN selling, objection handling, forex market context
- **Proactive Alerts**: Background loop every 15 min checks for cold hot leads (48h+) and missed reminders
- **Web Search**: Real-time web search via Puter.js for latest market data
- **LLM Fallback**: Claude Sonnet 4.5 (primary) → Gemini 2.5 Flash (free fallback when budget exhausted)

---

## 3. Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| MongoDB Atlas | Primary database | Active |
| Claude Sonnet 4.5 (Emergent Key) | Claret AI primary LLM | Active |
| Gemini 2.5 Flash (Google AI Studio) | Claret AI fallback LLM | Active |
| SMTP / Gmail | Email notifications | Active |
| Google Sheets API | Lead syncing from external sheets | Active |
| 3CX Web Client | Click-to-call from lead cards | Active |
| Meta Ads API | Marketing ad data (requires user token) | Configured |
| Puter.js | Free web search (frontend) | Active |
| MT5 Web API | Automated withdrawal tracking | Blocked (broker 403) |

---

## 4. Background Services

| Service | Frequency | Purpose |
|---------|-----------|---------|
| Claret Reminder Loop | Every 30 seconds | Fire pending reminders as notifications |
| Proactive Alert Loop | Every 15 minutes | Check for cold hot leads and missed reminders |
| Competitor Auto-Scrape | Daily at 04:00 UTC | Refresh competitor website data |
| Marketing Deadline Check | Every 2 hours | Notify marketing head about upcoming content deadlines |
| MT5 Auto-Sync | Every 30 minutes | Attempt MT5 data sync (currently blocked) |
| Daily Finance Report | Daily at midnight GST | Generate daily revenue summaries |
| Google Sheet Sync | Periodic | Sync leads from external Google Sheets |

---

## 5. Data Collections (MongoDB)

| Collection | Records | Purpose |
|------------|---------|---------|
| `users` | ~86 | System users with roles, credentials |
| `leads` | ~3,400+ | Sales leads with pipeline stages |
| `students` | ~1,048 | Enrolled students with lifecycle data |
| `course_catalog` | ~15 | Course/addon definitions with commission rates |
| `hr_employees` | ~86 | HR employee records with salary data |
| `notifications` | Dynamic | User notifications |
| `claret_reminders` | Dynamic | AI-set reminders |
| `claret_profiles` | ~86 | Per-user Claret preferences and mood history |
| `competitors` | 6 | Tracked competitor profiles |
| `marketing_pages` | Dynamic | Social media page definitions |
| `marketing_calendar` | Dynamic | Content calendar entries |
| `commission_approvals` | Dynamic | CEO monthly commission approvals |

---

## 6. Known Limitations

1. **MT5 Integration**: Blocked by broker's IP whitelist (403 error)
2. **LLM Budget**: Universal Key has a credit limit. Gemini fallback is free but may have rate limits on heavy usage
3. **Server Monolith**: `server.py` is 31,000+ lines — functional but needs modular refactoring for long-term maintainability
4. **Historical Students**: 66 students imported before ERP have no linked lead data (amount shows AED 0)
