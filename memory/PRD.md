# CLT Academy ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Academy that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

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

## Core Requirements (Static)
- Role-based access control (RBAC)
- Lead management with Kanban boards
- Student management (CS & Mentor)
- Payment tracking and verification
- Real-time dashboards
- Audit trails and activity logs
- Dark/Light mode theme support
- Responsive design

## What's Been Implemented - Phase 1 MVP (Feb 2026)
### Backend APIs ✅
- [x] Authentication (login, JWT tokens)
- [x] User Management (CRUD, roles, activation)
- [x] Lead Management (CRUD, stage updates, assignment)
- [x] Student Management (CRUD, CS & Mentor stages)
- [x] Payment Management (CRUD, verification workflow)
- [x] Dashboard Statistics
- [x] Notifications System
- [x] Activity Logs

### Frontend Pages ✅
- [x] Login Page (CLT branding, dark theme)
- [x] Dashboard (role-specific stats and charts)
- [x] Sales CRM (Kanban board - 8 stages)
- [x] Customer Service (Kanban board - 7 stages)
- [x] Mentor CRM (Kanban board - 5 stages)
- [x] Finance (Kanban board - 6 stages, summary cards)
- [x] User Management (table with CRUD operations)
- [x] Settings (profile, permissions, theme toggle)

### Automation ✅
- [x] Round-robin lead assignment
- [x] Auto-handoff from Sales to CS when enrolled
- [x] Mentor assignment on student activation
- [x] SLA breach detection (24-hour rule)
- [x] Duplicate lead detection by phone

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Email notifications integration (SendGrid)
- [ ] Meta Ads webhook integration
- [ ] Google Ads webhook integration

### P1 - High Priority
- [ ] HR & Payroll Module
- [ ] Asset Management Module
- [ ] Training & Development Module
- [ ] Marketing Operations Module
- [ ] Task & Project Management
- [ ] Advanced reporting and exports

### P2 - Medium Priority
- [ ] TEST/PROD environment separation
- [ ] Biometric attendance integration
- [ ] WhatsApp/SMS notifications
- [ ] Commission calculation engine
- [ ] FX tracking for payments

### P3 - Nice to Have
- [ ] Mobile app
- [ ] AI-powered lead scoring
- [ ] Predictive analytics

## Next Tasks (Immediate)
1. Integrate SendGrid for email notifications
2. Set up Meta Ads webhook endpoint
3. Set up Google Ads webhook endpoint
4. Add bulk lead import functionality
5. Implement advanced filters on Kanban boards

## Technical Notes
- Super Admin: aqib@clt-academy.com / A@qib1234
- JWT Secret stored in backend/.env
- All API routes prefixed with /api
- MongoDB indexes on: email, phone, stage, assigned_to
