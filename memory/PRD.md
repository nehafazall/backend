# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Build and maintain a comprehensive ERP system for CLT Academy (forex/trading education, UAE) with CRM, HR, Finance, Marketing Intelligence, and AI assistant (Claret) modules.

## Core Architecture
- **Frontend**: React + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (monolith server.py ~31,500 lines)
- **Database**: MongoDB Atlas
- **AI**: 3-tier routing (Local DB → Claude via Emergent Key → Gemini fallback)
- **Integrations**: 3CX VoIP, Google Sheets, Meta Ads, SMTP

## User Personas
- CEO/Super Admin (aqib@clt-academy.com)
- CS Head (falja@clt-academy.com)
- Sales Executives, Mentors, BD Managers, Marketing team

## Completed Features (Session — March 30, 2026)

### Phase 1: UI Modal Unification
- BD CRM & Mentor CRM modals now use identical tabbed design (Info | Transactions | Calls | Update) matching CustomerServicePage
- Compact header with avatar, name, stage badge, phone, click-to-call, reminder button
- Accessibility: hidden DialogTitle for screen readers

### Phase 2: 3CX Automatic Call Data Sync
- Built flexible `POST /api/3cx/webhook` — accepts 3CX native payload formats (multiple field names, duration string parsing "3:45" → 225s)
- Smart matching: updates existing click-to-call "initiated" logs instead of creating duplicates
- Setup guide at `GET /api/3cx/webhook-setup-guide`
- Call history UI shows "Dialed — awaiting 3CX sync" badge for 0-duration calls
- **ACTION NEEDED**: Configure 3CX admin panel to POST to `{domain}/api/3cx/webhook`

### Phase 3: Facebook Ad Library Intelligence
- New "Ad Intelligence" tab in Marketing Analysis
- Search competitor ads by keyword/name with country filter
- AI-powered competitor analysis: messaging patterns, emotional triggers, CTAs
- Auto-generated counter-ads for CLT Academy
- Meta API token management (full API access or web scrape fallback)

### Phase 4: Redeposit/Deposit Cycle System
- **BD CRM**: Students in "Closed (Redeposit)" column get green banner ("Awaiting Redeposit Recording")
- **Mentor CRM**: Students in "Closed (Deposit)" column get green banner ("Awaiting Deposit Recording")
- After redeposit is recorded → student auto-cycles back to "New Student" with `redeposit_count` incremented
- Green "x{count}" badge on cards showing redeposit history
- "Redeposit Students" filter toggle on both BD and Mentor CRM pages
- Same student can re-enter the pipeline for another redeposit in the same month

## Previously Completed (Earlier Sessions)
- Commission decomposition (Course + Addon)
- Sales/CS Dashboard integration
- Role-based sidebar filtering
- Marketing Calendar, Content Studio, Market Analysis
- Student auto-migration on staff deactivation
- Claret 3-tier AI fallback
- Documentation (Production, Technical, Training)
- CS workflow fixes (MT5 optional, default "My Students")

## Pending Issues
| Priority | Issue | Status |
|----------|-------|--------|
| P1 | Meta Ads OAuth — needs production domain whitelisting | BLOCKED on user |
| P3 | RangeError: Max call stack (disabled via craco) | Bypassed |

## Upcoming Tasks (P1-P2)
- WhatsApp Business API Integration
- Workflow Automation Engine
- Scheduled Email Reports
- Invoice PDF Generation

## Future/Backlog (P3)
- Refactor server.py into modular routers
- Executive Dashboard (CEO single-page view)
- Weekly Competitive Digest auto-email

## Key API Endpoints (New)
- `POST /api/3cx/webhook` — Flexible 3CX webhook (public, no auth)
- `POST /api/3cx/call-journal` — Structured call journal
- `GET /api/3cx/webhook-setup-guide` — Setup instructions
- `POST /api/intelligence/ad-library/search` — Search FB Ad Library
- `POST /api/intelligence/ad-library/analyze` — AI competitor ad analysis
- `PUT /api/settings/meta-ad-token` — Save Meta API token
- `POST /api/bd/record-redeposit` — Records redeposit & cycles student back

## Test Reports
- iteration_105.json: 3CX webhook + Ad Intelligence + Modal unification (100% pass)
- iteration_106.json: Redeposit cycle system (100% pass)

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales: aleesha@clt-academy.com / Aleesha@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
