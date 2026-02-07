# CLT Academy ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Academy that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest User Requirements (SLA & Customer Management)

### SLA Rules Implemented
1. **New Lead Contact SLA (60 minutes)**
   - New leads assigned via round-robin must be contacted within 60 minutes
   - If not contacted → SLA Breach → Notify Sales Executive + Manager

2. **Inactive Lead Escalation (7 days → 72h → 72h → Reassign)**
   - No activity for 7 days → First Warning to Sales Executive
   - No activity after 72 hours → Second Warning + Notify Manager
   - No activity after another 72 hours → Lead returns to Agentic Pool → Auto-reassign

3. **CS Activation SLA (15 minutes)**
   - When lead is enrolled → Assigned to CS Agent
   - No activation call recorded → Warning
   - After 15 minutes → SLA Breach → Notify CS Leader

### New Features
- **Leads Pool (Agentic Pool)** - Unassigned/returned leads waiting for distribution
- **Customer Master** - Complete transaction history per customer
- **3CX Integration Placeholder** - Call recording URL field ready for future integration

## Architecture Overview
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React with Shadcn UI components
- **Authentication**: JWT-based with role-based access control
- **Database**: MongoDB with proper indexing

## What's Been Implemented

### Phase 1 MVP ✅
- JWT Authentication with role-based access
- User Management (CRUD, roles, activation)
- Lead Management with Kanban (8 stages)
- Student Management with Kanban (CS & Mentor stages)
- Payment Management with verification workflow
- Dashboard with role-specific statistics
- Notifications System
- Activity Logs
- Dark/Light mode theme

### Phase 2 Features ✅
- Department Management with approval workflow
- Course Management with CRUD
- Commission Engine with flexible rules
- Sales Dashboard with analytics
- CS Dashboard with metrics
- Access Control permission matrix

### Phase 3 Features (Current) ✅
- **SLA Management System**
  - Configurable SLA rules
  - Automatic breach detection
  - Escalation notifications
  - Auto-reassignment to pool
- **Leads Pool (Agentic Pool)**
  - View unassigned leads
  - Manual or round-robin assignment
  - SLA status display
- **Customer Master**
  - All customers with transaction history
  - Search functionality
  - Detailed view with payment history
- **3CX Integration Placeholder**
  - `call_recording_url` field on leads and students

### Frontend Pages (15 total)
1. Login Page
2. Dashboard (role-specific)
3. Sales CRM (Kanban)
4. My Sales Dashboard (analytics)
5. **Leads Pool (NEW)**
6. **Customer Master (NEW)**
7. Customer Service (Kanban)
8. CS Dashboard (analytics)
9. Mentor CRM (Kanban)
10. Finance (Kanban)
11. User Management
12. Departments
13. Courses
14. Commission Engine
15. Access Control
16. Settings

### Backend API Endpoints
**SLA Endpoints:**
- `GET /api/sla/config` - Get SLA configuration
- `GET /api/sla/breaches` - Get current breaches
- `POST /api/sla/check` - Trigger SLA check

**Leads Pool Endpoints:**
- `GET /api/leads/pool` - Get unassigned leads
- `POST /api/leads/pool/{id}/assign` - Assign lead (manual or round-robin)
- `POST /api/leads/{id}/return-to-pool` - Return lead to pool

**Customer Master Endpoints:**
- `GET /api/customers` - List all customers
- `GET /api/customers/{id}` - Get customer details
- `GET /api/customers/by-phone/{phone}` - Get by phone

**Existing Endpoints:**
- Auth, Users, Departments, Courses, Commission Rules
- Leads, Students, Payments, Notifications
- Dashboard stats, funnels, leaderboards

## SLA Configuration
```json
{
  "new_lead_contact_mins": 60,
  "inactive_lead_days": 7,
  "inactive_warning_hours": 72,
  "inactive_reassign_hours": 72,
  "cs_activation_mins": 15
}
```

## Prioritized Backlog

### P1 - High Priority
- [ ] Google Sheets Integration for lead import
- [ ] Email notifications (SendGrid)
- [ ] 3CX Integration for call recordings
- [ ] Advanced reporting and exports

### P2 - Medium Priority
- [ ] Meta Ads webhook integration
- [ ] Google Ads webhook integration
- [ ] HR & Payroll Module
- [ ] Asset Management Module
- [ ] WhatsApp/SMS notifications

### P3 - Nice to Have
- [ ] Mobile app
- [ ] AI-powered lead scoring
- [ ] Predictive analytics
- [ ] Training & Development Module
- [ ] Task & Project Management

## Technical Notes
- **Super Admin:** aqib@clt-academy.com / A@qib1234
- **All API routes prefixed with /api**
- **MongoDB indexes on:** email, phone, stage, assigned_to
- **Test reports:** /app/test_reports/iteration_3.json (15/15 tests passed)

## Files Reference
- Backend: `/app/backend/server.py`
- Frontend Routes: `/app/frontend/src/App.js`
- Navigation: `/app/frontend/src/components/Layout.jsx`
- New Pages: `LeadsPoolPage.jsx`, `CustomerMasterPage.jsx`
- Test Files: `/app/backend/tests/test_sla_features.py`
