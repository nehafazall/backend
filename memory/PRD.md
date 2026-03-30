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

## Completed Features (Latest Session — March 30, 2026)
- **BD & Mentor CRM Modal Unification**: Both now use tabbed design (Info | Transactions | Calls | Update) matching CustomerServicePage
- **3CX Webhook Integration**: Built flexible `/api/3cx/webhook` endpoint that accepts 3CX native payload formats, auto-matches click-to-call logs, parses duration strings
- **3CX Setup Guide**: API endpoint `/api/3cx/webhook-setup-guide` returns configuration instructions
- **Call History UX**: 0-duration calls now show "Dialed — awaiting 3CX sync" badge instead of misleading "0:00"
- **Facebook Ad Library Intelligence**: New "Ad Intelligence" tab in Marketing Analysis with search, AI analysis, counter-ad generation
- **Ad Library API endpoints**: Search, analyze, save token, get saved searches

## Previously Completed
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

## Key API Endpoints
- `POST /api/3cx/webhook` — Flexible 3CX webhook (public, no auth)
- `POST /api/3cx/call-journal` — Structured call journal
- `GET /api/3cx/webhook-setup-guide` — Setup instructions
- `POST /api/intelligence/ad-library/search` — Search FB Ad Library
- `POST /api/intelligence/ad-library/analyze` — AI competitor ad analysis
- `GET /api/intelligence/ad-library/searches` — Saved searches
- `PUT /api/settings/meta-ad-token` — Save Meta API token
- `GET /api/settings/meta-ad-token-status` — Token status

## Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales: aleesha@clt-academy.com / Aleesha@123
- Master of Academics: edwin@clt-academy.com / Edwin@123
