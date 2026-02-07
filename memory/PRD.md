# CLT Academy ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Academy that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Features (Environment & Import)

### Environment Toggle System
- **Modes**: Development, Testing, Production
- **Access Control**: Super Admin can grant environment access to specific users via User Management
- **Workflow**: Develop → Test → Go Live
- **Location**: Header bar shows current environment mode

### Bulk Import Functionality
Import available at 4 locations:
1. **Sales CRM** - Import Leads (round-robin assignment)
2. **Customer Master** - Import Existing Customers (NO round-robin, tracks closer)
3. **Customer Service** - Import Students (assign CS agent + mentor)
4. **Mentor CRM** - Import Students (assign mentor)

### CSV Templates (Downloadable)
Each template includes:
- Required fields (marked with *)
- Optional fields
- Example row
- Instructions
- Validation rules

## SLA Rules (Implemented)
1. **New Lead Contact**: 60 minutes → Notify exec + manager
2. **Inactive Lead Escalation**: 7 days → 72h → 72h → Auto-reassign to pool
3. **CS Activation**: 15 minutes → Notify CS leader

## Architecture Overview
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React with Shadcn UI components
- **Authentication**: JWT-based with role-based access control
- **Database**: MongoDB

## Frontend Pages (17 total)
1. Login Page
2. Dashboard
3. Sales CRM (+ Import)
4. My Sales Dashboard
5. Leads Pool
6. Customer Master (+ Import)
7. Customer Service (+ Import)
8. CS Dashboard
9. Mentor CRM (+ Import)
10. Finance
11. User Management
12. Departments
13. Courses
14. Commission Engine
15. Access Control
16. Settings

## Import Template Fields

### Leads Import
**Required**: full_name, phone
**Optional**: email, country, city, lead_source, course_of_interest, campaign_name, notes
**Behavior**: Auto-assigned via round-robin

### Customers Import
**Required**: full_name, phone, package_bought, payment_amount, payment_method, payment_date, closed_by
**Optional**: email, country, cs_agent_email, mentor_email, notes
**Behavior**: NO round-robin, tracks who closed the deal

### Students CS Import
**Required**: full_name, phone, package_bought, cs_agent_email
**Optional**: email, country, mentor_email, batch_plan, preferred_language, trading_level, class_timings, notes
**Behavior**: Assigned to specified CS agent

### Students Mentor Import
**Required**: full_name, phone, package_bought, mentor_email
**Optional**: email, country, cs_agent_email, mentor_stage, learning_goals, notes
**Behavior**: Assigned to specified mentor

## API Endpoints

### Environment
- `GET /api/environment/current` - Get current mode and user access
- `PUT /api/environment/mode` - Change environment mode
- `PUT /api/users/{id}/environment-access` - Update user's environment access

### Import
- `GET /api/import/templates/{type}` - Get template (leads, customers, students_cs, students_mentor)
- `POST /api/import/leads` - Import leads
- `POST /api/import/customers` - Import customers
- `POST /api/import/students/cs` - Import for CS
- `POST /api/import/students/mentor` - Import for mentors

## Prioritized Backlog

### P1 - High Priority
- [ ] 3CX Integration for call recordings
- [ ] Google Sheets Integration for lead import
- [ ] Email notifications (SendGrid)

### P2 - Medium Priority
- [ ] Meta Ads webhook integration
- [ ] Google Ads webhook integration
- [ ] WhatsApp/SMS notifications

### P3 - Nice to Have
- [ ] Mobile app
- [ ] AI-powered lead scoring
- [ ] HR & Payroll Module

## Technical Notes
- **Super Admin:** aqib@clt-academy.com / A@qib1234
- **All API routes prefixed with /api**
- **MongoDB indexes on:** email, phone, stage, assigned_to

## Files Reference
- Backend: `/app/backend/server.py`
- Frontend Routes: `/app/frontend/src/App.js`
- Import Component: `/app/frontend/src/components/ImportButton.jsx`
- Environment Component: `/app/frontend/src/components/EnvironmentSwitcher.jsx`
