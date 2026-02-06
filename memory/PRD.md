# CLT Academy ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Academy that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

### Detailed Requirements (User Provided)
1. **Departments:** 8 departments - Sales, Finance, Customer Service (CS), Mentors/Academics, Operations, Marketing, HR, Quality Control
2. **Access Control:** Granular permission matrix (View/Edit/Full) per role per module
3. **Commission Engine:** Flexible commission rules for courses with percentage/fixed rates
4. **Sales Dashboard:** Analytics with revenue, commission, conversion rate, leaderboard
5. **CS Dashboard:** Student metrics, onboarding rates, upgrade revenue, satisfaction scores
6. **Color Theme:** White (#FFFFFF), Black (#31261D), Red (#EF3340), Grey (#B0B0B0)

## Architecture Overview
- **Backend**: FastAPI (Python) with MongoDB
- **Frontend**: React with Shadcn UI components
- **Authentication**: JWT-based with role-based access control
- **Database**: MongoDB with proper indexing

## User Personas
1. **Super Admin** - Full system access, user management, all modules
2. **Admin** - System configuration, user management
3. **Sales Manager/Team Leader** - Manage sales team, view reports
4. **Sales Executive** - Handle leads, make calls, update status
5. **CS Head/Agent** - Manage enrolled students, onboarding
6. **Mentor** - Student mentorship, redeposit tracking
7. **Finance** - Payment verification, reconciliation

## What's Been Implemented

### Phase 1 MVP (Feb 2026) ✅
- JWT Authentication with role-based access
- User Management (CRUD, roles, activation)
- Lead Management with Kanban (8 stages)
- Student Management with Kanban (CS & Mentor stages)
- Payment Management with verification workflow
- Dashboard with role-specific statistics
- Notifications System
- Activity Logs
- Dark/Light mode theme

### Phase 2 Features (Feb 2026) ✅
- **Department Management** - View/Create/Edit 8 departments with approval workflow
- **Course Management** - Full CRUD for courses with pricing
- **Commission Engine** - Rule creation with percentage/fixed rates per role/course
- **Sales Dashboard** - Revenue, commission, conversion rate, lead funnel charts, leaderboard
- **CS Dashboard** - Student pipeline, onboarding rate, upgrade revenue, team leaderboard
- **Access Control** - Permission matrix UI for granular role-based access

### Frontend Pages (13 total)
1. Login Page
2. Dashboard (role-specific)
3. Sales CRM (Kanban)
4. My Sales Dashboard (analytics)
5. Customer Service (Kanban)
6. CS Dashboard (analytics)
7. Mentor CRM (Kanban)
8. Finance (Kanban)
9. User Management
10. Departments
11. Courses
12. Commission Engine
13. Access Control
14. Settings

### Backend API Endpoints (26+ tested)
- `/api/auth/login`, `/api/auth/me`
- `/api/users/` (CRUD)
- `/api/departments/` (CRUD + approval workflow)
- `/api/courses/` (CRUD)
- `/api/commission-rules/` (CRUD)
- `/api/commissions/`, `/api/commissions/summary`
- `/api/leads/` (CRUD)
- `/api/students/` (CRUD)
- `/api/payments/` (CRUD)
- `/api/notifications/`
- `/api/dashboard/stats`, `/api/dashboard/lead-funnel`, `/api/dashboard/leaderboard`
- `/api/dashboard/student-funnel`, `/api/dashboard/upgrades-by-month`, `/api/dashboard/cs-leaderboard`

### Automation Features ✅
- Round-robin lead assignment
- Auto-handoff from Sales to CS on enrollment
- Mentor assignment on student activation
- SLA breach detection (24-hour rule)
- Duplicate lead detection by phone
- Commission calculation on enrollment/upgrade

## Prioritized Backlog

### P0 - Critical (Completed)
- [x] Fix frontend blocker (Maximum call stack size exceeded)
- [x] Department Management UI
- [x] Granular Access Control UI
- [x] CS Dashboard

### P1 - High Priority
- [ ] Google Sheets Integration for lead import (MVP lead intake)
- [ ] Email notifications (SendGrid)
- [ ] Advanced reporting and exports
- [ ] Bulk lead import functionality

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
- **JWT Secret:** stored in backend/.env
- **All API routes prefixed with /api**
- **MongoDB indexes on:** email, phone, stage, assigned_to
- **Test reports:** /app/test_reports/iteration_2.json (26/26 backend tests passed)

## Files Reference
- Backend: `/app/backend/server.py` (main API)
- Frontend Routes: `/app/frontend/src/App.js`
- Navigation: `/app/frontend/src/components/Layout.jsx`
- New Pages: AccessControlPage.jsx, CSDashboard.jsx
