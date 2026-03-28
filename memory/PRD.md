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

### Claret AI Assistant (Mar 28, 2026) — NEW
- **AI Chatbot**: Floating widget (bottom-right) on all pages, powered by Claude Sonnet 4.5
  - Personality: Warm, witty, empathetic. Mixes English/Malayalam (Manglish)/Hindi (Hinglish)
  - Features: ERP navigation help, policy Q&A, motivation, knock-knock jokes, mood check-ins
  - TTS (browser built-in speech synthesis), Malayalam translation button
  - Proactive idle prompts for engagement
  - All chats stored in `claret_chats` collection
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
