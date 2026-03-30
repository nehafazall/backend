# CLT Synapse ERP — Technical Handover Document
**For**: Development Team | **Version**: 2.0 | **Date**: March 30, 2026

---

## 1. Architecture Overview

```
CLT Synapse ERP
├── Frontend (React 18 + Tailwind + Shadcn/UI)
│   ├── Port: 3000 (via Supervisor)
│   ├── Build: craco (customized CRA)
│   └── State: React Context (AuthProvider)
│
├── Backend (FastAPI + Python 3.11)
│   ├── Port: 8001 (via Supervisor + Uvicorn)
│   ├── Main: server.py (~31,000 lines — monolith)
│   ├── Modules: claret_module.py, competitor_intel.py, marketing_calendar.py
│   └── Auth: JWT (HS256, 30-day expiry)
│
├── Database (MongoDB Atlas)
│   ├── Connection: MONGO_URL env variable
│   └── DB Name: DB_NAME env variable
│
└── Kubernetes Ingress
    ├── /api/* → Backend (port 8001)
    └── /* → Frontend (port 3000)
```

## 2. Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=<mongodb+srv connection string>
DB_NAME=<database name>
EMERGENT_LLM_KEY=<universal key for Claude>
GEMINI_API_KEY=<google ai studio key>
JWT_SECRET_KEY=<jwt signing secret>
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=<sender email>
SMTP_PASSWORD=<app password>
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=<production URL>
```

**CRITICAL**: Never delete or rename these keys. The app has no fallback defaults — missing keys will crash.

## 3. File Structure

```
/app/
├── backend/
│   ├── server.py              # Main monolith (31K lines, ALL API endpoints)
│   ├── claret_module.py       # AI chat, reminders, proactive alerts, system prompt
│   ├── competitor_intel.py    # Web scraping, battle cards, briefings, sentiment
│   ├── marketing_calendar.py  # Calendar pages, content pipeline, deadline checks
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # All routes, ProtectedRoute component
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Sidebar (SECTIONS config = role-based menu)
│   │   │   ├── ClaretChatWidget.jsx  # AI chat widget (Puter.js, auto-open)
│   │   │   └── ui/            # Shadcn components
│   │   ├── pages/
│   │   │   ├── SalesCRMPage.jsx
│   │   │   ├── SalesDashboard.jsx
│   │   │   ├── CustomerServicePage.jsx
│   │   │   ├── StudentDirectoryPage.jsx
│   │   │   ├── CommissionDashboard.jsx
│   │   │   ├── CompetitorIntelligencePage.jsx
│   │   │   ├── ExecutiveDashboard.jsx
│   │   │   └── marketing/
│   │   │       ├── MarketingCalendarPage.jsx
│   │   │       ├── MarketAnalysisPage.jsx
│   │   │       ├── ContentStudioPage.jsx
│   │   │       ├── MarketingDashboardPage.jsx
│   │   │       ├── MarketingConnectorsPage.jsx
│   │   │       └── MarketingSettingsPage.jsx
│   │   └── lib/
│   │       ├── api.js         # Axios instance (uses REACT_APP_BACKEND_URL)
│   │       └── puterSearch.js # Puter.js web search wrapper
│   ├── package.json
│   └── .env
│
├── docs/                      # This documentation
└── memory/
    └── PRD.md                 # Product requirements
```

## 4. Key Technical Patterns

### 4.1 Router Architecture (CRITICAL)
The backend modules (`claret_module.py`, `competitor_intel.py`, `marketing_calendar.py`) do NOT use FastAPI's `APIRouter`. Instead:
1. Functions are defined in the module
2. The module's `db` variable is set from `server.py` at startup: `marketing_calendar.db = db`
3. Endpoints are explicitly declared in `server.py` using `@api_router.get/post(...)` that call the module functions
4. Auth dependencies (`Depends(get_current_user)`) are applied at the `server.py` level

**Example pattern:**
```python
# In server.py:
import marketing_calendar
marketing_calendar.db = db

@api_router.get("/marketing/calendar/pages")
async def _list_mkt_pages(user=Depends(require_roles(["super_admin", "admin"]))):
    return await marketing_calendar.list_pages()
```

### 4.2 Role-Based Access
- **Backend**: `require_roles(["role1", "role2"])` — FastAPI dependency
- **Frontend**: `<ProtectedRoute allowedRoles={[...]}>` — React component wrapping routes
- **Sidebar**: `SECTIONS` object in `Layout.jsx` with `roles` arrays per section and per item
- **Data scoping**: Many endpoints check `user["role"]` to filter data (e.g., sales execs see only their own leads)

### 4.3 Commission Decomposition
Sales amounts are composed of a base course + addons. The `_match_course_commission` function in `server.py`:
1. Finds the base course from `course_catalog`
2. Calculates remaining amount as addon
3. Looks up commission rates for each part
4. Sums them for total commission

**Source of truth**: `course_catalog` collection in MongoDB (NOT hardcoded).

### 4.4 Claret AI Smart Routing
1. Detects if question is internal (leads, students, commissions) or external (creative, strategy)
2. For internal: queries DB directly, injects real data into LLM prompt
3. Primary LLM: Claude Sonnet 4.5 (via Emergent Universal Key)
4. Fallback: Gemini 2.5 Flash (via Google AI Studio key — free tier)
5. Last resort: Local DB fallback returns raw stats without LLM

### 4.5 Background Loops
Started in `server.py`'s `@app.on_event("startup")`:
```python
claret_module.start_reminder_loop(create_notification)
marketing_calendar.start_deadline_loop(create_notification)
```
Each module manages its own `asyncio.create_task()` loop.

## 5. Database Schema (Key Collections)

### users
```json
{
  "id": "uuid",
  "email": "user@clt-academy.com",
  "full_name": "Name",
  "role": "sales_executive",
  "team": "Team XLNC",
  "team_leader_id": "uuid",
  "is_active": true,
  "hashed_password": "bcrypt hash"
}
```

### leads
```json
{
  "id": "uuid",
  "full_name": "Lead Name",
  "phone": "+971...",
  "pipeline_stage": "new_lead|call_back|warm_lead|hot_lead|rejected|enrolled",
  "assigned_to": "user_id",
  "team_leader_id": "user_id",
  "sale_amount": 8100,
  "course_id": "course_catalog_id",
  "source": "Google Ads",
  "created_at": "ISO datetime"
}
```

### students
```json
{
  "id": "uuid",
  "lead_id": "leads.id",
  "full_name": "Student Name",
  "phone": "+971...",
  "package_bought": "course_id",
  "current_course_name": "Advance Course - 2",
  "enrollment_amount": 8100,
  "stage": "new_student|activated|satisfactory_call|pitched_upgrade|upgraded",
  "mentor_stage": "new_student|...",
  "onboarding_complete": false,
  "classes_attended": 0
}
```

### course_catalog
```json
{
  "id": "uuid",
  "name": "Advance Course",
  "type": "course|addon",
  "price": 5999,
  "commission_sales_executive": 300,
  "commission_team_leader": 150,
  "commission_sales_manager": 100,
  "status": "active"
}
```

### marketing_pages
```json
{
  "id": "uuid",
  "name": "CLT Academy Main",
  "platform": "instagram",
  "url": "https://instagram.com/clt_academy",
  "handle": "@clt_academy",
  "posting_frequency": "alternate_day",
  "color": "#ef4444",
  "status": "active"
}
```

### marketing_calendar
```json
{
  "id": "uuid",
  "page_id": "marketing_pages.id",
  "page_name": "CLT Academy Main",
  "page_color": "#ef4444",
  "date": "2026-03-30",
  "title": "Post title",
  "status": "planned|video_shot|edited|approved|posted",
  "content_type": "post|reel|carousel|story|video",
  "ai_suggestion": {}
}
```

## 6. API Endpoints (Key Groups)

| Group | Prefix | Auth |
|-------|--------|------|
| Auth | `/api/auth/login`, `/api/auth/me` | Public / JWT |
| Leads | `/api/leads`, `/api/leads/{id}` | JWT + role |
| Students | `/api/students`, `/api/students/{id}` | JWT + role |
| Commissions | `/api/commissions/*` | JWT + role |
| Users | `/api/users/*` | JWT + admin |
| HR | `/api/hr/*` | JWT + HR roles |
| Marketing Calendar | `/api/marketing/calendar/*` | JWT + marketing |
| Competitor Intel | `/api/intelligence/*` | JWT + admin/marketing |
| Claret AI | `/api/claret/chat`, `/api/claret/reminders` | JWT |
| Notifications | `/api/notifications/*` | JWT |

## 7. Deployment

### Supervisor Services
```
# Check status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log
```

### Dependency Management
```bash
# Backend: Install + freeze
pip install <package> && pip freeze > /app/backend/requirements.txt

# Frontend: Always use yarn
cd /app/frontend && yarn add <package>
```

### Hot Reload
- Both frontend and backend have hot reload enabled
- Only restart supervisor when changing `.env` files or installing new dependencies
- Code changes are picked up automatically

## 8. Known Issues & Technical Debt

1. **`server.py` monolith** (31K+ lines) — Highest priority refactoring target. Should be split into domain routers.
2. **Duplicate `create_notification`** — Was defined twice in server.py with different signatures. Fixed but indicates need for deduplication pass.
3. **MT5 Integration** — Returns 403. Needs broker IP whitelist.
4. **66 historical students** — No linked lead data. Would need manual data entry to fix.

## 9. Credentials (Dev/Test)

| Role | Email | Password |
|------|-------|----------|
| CEO/Super Admin | aqib@clt-academy.com | @Aqib1234 |
| CS Head | falja@clt-academy.com | Falja@123 |
| Sales Executive | aleesha@clt-academy.com | Aleesha@123 |
| Master of Academics | edwin@clt-academy.com | Edwin@123 |
