# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows. Enhanced with Claret AI assistant for employee wellness, motivation, and knowledge base access.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~31K lines) + `claret_module.py` + `hr_module.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (EMERGENT_LLM_KEY)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### CS Kanban Overhaul (Mar 28, 2026) — NEW
- Removed stages: In Progress, Interested, Not Interested (only 5 active stages remain)
- Per-column server-side pagination (50 per page, each column fetches independently)
- Kanban/Table view toggle
- All columns fit on one screen, no horizontal scrolling
- Real student counts displayed (not capped)

### Claret Chat Widget Repositioned (Mar 28, 2026)
- Moved from bottom-right to bottom-left corner

### HR Shift Fix (Mar 28, 2026)
- Fixed EmployeeResponse Pydantic model to include shift_id and country fields
- Shift dropdown now dynamically fetches shifts from /api/hr/shifts

### Claret AI Assistant (Mar 28-29, 2026)
- **AI Chatbot**: Floating widget (bottom-left) on all pages, powered by Claude Sonnet 4.5
  - Personality: Warm, witty, empathetic. Responds in user's chosen language
  - Features: ERP navigation help, policy Q&A, motivation, mood check-ins
  - **ERP Data Access**: Claret can query real ERP data (leads, students, commissions, attendance, upgrades) based on user's role
  - **Never "brain freeze"**: Always conversational, asks clarifying questions, queries data when needed
  - TTS (browser built-in speech synthesis)
  - All chats stored in `claret_chats` collection
- **Onboarding Modal (Mar 29, 2026)**: First-time setup on Claret open
  - Step 1: Name, Nickname, Language (English / Hinglish / Manglish)
  - Step 2: 7 MCQ personality questions in chosen language
  - Step 3: 3 open-ended personality questions
  - T&C checkbox required before saving
  - Settings gear to re-open onboarding
  - Profile stored in `claret_profiles` collection

### Sales Directory (Mar 29, 2026)
- New page at `/sales/directory` — CEO, COO, Sales Manager access
- Table: Sr No, Name, Email, Phone, Course, Amount, Paid By (payment method), Agent, Enrolled date
- Filters: Month, Year, Agent, Search
- Descending order by enrolled_at (most recent first)
- Summary cards: Total Enrolled, Revenue, Period, Avg Deal Size

### Sales CRM Table View (Mar 29, 2026)
- Kanban/Table toggle added to Sales CRM page
- Table view shows all leads in standard table format

### Security & Privacy (Mar 29, 2026)
- Team chat data restricted to CEO/COO only
- Claret chat data and profiles restricted to CEO/COO only
- Security API endpoints: /api/security/claret-profiles, /api/security/claret-chats, /api/security/team-chat-data, /api/security/team-chat-messages/{id}
- Claret mood analytics restricted to super_admin/admin

### CS Table View Fix (Mar 28, 2026)
- Stage filter dropdown in Table view
- Removed date filter restriction from Table view so all records show
- **Knowledge Base**: Separate module at `/knowledge-base`
  - Upload: PDF, DOCX, XLSX, TXT, video files
  - Categories: SOPs, Policies, Training Materials, Training Videos, General
  - Search, filter, download functionality
  - AI reads uploaded PDFs for context in chat responses
  - Access: All users can read; HR/Admin/CEO/COO can upload/delete
- **Claret Dashboard**: Mood tracking at `/claret`
  - 5 dimensions: Energy, Stress, Motivation, Happiness, Overall (1-10)
  - Mood labels: Excited, Happy, Motivated, Calm, Neutral, Tired, Anxious, Stressed, Sad, Frustrated, Overwhelmed
  - Mood Journey calendar (last 30 days with emojis)
  - 6 customizable theme presets (colors stored per user)
  - CEO/HR: Team Overview tab, Analytics tab (distribution, daily trend)
  - Employee: Self-awareness via own mood scores

### Organization Map (Mar 28, 2026) — UPDATED
- Drag-and-drop: Admin/HR/CEO/COO can drag people between departments
- Backend: PUT /api/organization/move-user endpoint
- Department heads dynamically pulled from database

### SSHR & HR Attendance Overhaul (Mar 28, 2026)
- Monthly stats, calendar view, Sunday-only OFF, late recalculation, missing employees

### CEO Commission Approval Workflow (Mar 28, 2026)
- Approval-dependent commission display, COO access

## Key Database Collections (New)
- `knowledge_base`: Document metadata + extracted text for AI
- `claret_chats`: All chat messages (user + assistant) per session
- `claret_mood_scores`: Daily mood scores per user
- `claret_settings`: Dashboard theme preferences per user

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API: Awaiting broker whitelist

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Workflow Automation Engine
- Scheduled Email Reports

### P3
- Refactor monolithic server.py (~31K lines)
