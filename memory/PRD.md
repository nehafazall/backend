# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (February 2026)

### Session Feb 22, 2026 - P0 & P1 Completion

#### 1. Kanban Drag-and-Drop for Customer Service & Mentor CRM (COMPLETED)
- **Customer Service Page** (`/cs`): Added drag-and-drop using @dnd-kit library
  - 7 Kanban columns: New Student, Activated, Satisfactory Call, Pitched Upgrade, In Progress, Interested, Not Interested
  - Drag handles visible, drop zones highlighted on hover
  - Stage updates via `studentApi.update()` when dropped
- **Mentor CRM Page** (`/mentor`): Same drag-and-drop implementation
  - 5 Kanban columns: New Student, Discussion Started, Pitched Redeposit, Interested, Closed (Deposit)
  - Uses `mentor_stage` field for stage tracking
- **Implementation**: Uses DndContext, DragOverlay, SortableContext, useSortable, useDroppable, CSS.Transform

#### 2. HR Module Phase 1 - Employee Master & User Sync (COMPLETED)
- **Employee Master** (`/hr/employees`): Full CRUD with auto-generated Employee ID
- **Add Employee Modal**: All form fields working (Employee ID, Full Name, Company Email, Department, Designation, System Role, Team, Joining Date, Status)
- **User Account Sync**: Toggle to create user account automatically
- **HR Sync Options API** (`/api/hr/employees/sync-options`): Returns departments (8), roles (14), teams (3), managers, locations (5), employment_types (5)

#### 3. HR Module Phase 2 & 3 - Full Implementation (COMPLETED)
- **Leave Management** (`/hr/leave`): Leave requests, multi-level approval workflow, leave balance tracking
- **Attendance** (`/hr/attendance`): Daily attendance tracking, late detection, regularization requests
- **Payroll** (`/hr/payroll`): Payroll batches, run payroll, HR/Finance approval workflow, mark paid
- **Performance Management** (`/hr/performance`): KPIs, KPI scores, performance reviews
- **Asset Management** (`/hr/assets`): Asset CRUD, assignment, return, requests, dashboard
- **HR Analytics** (`/hr/analytics`): Overview, attendance, leave, payroll analytics

### Previous Features (February 2026)

#### HR Module - Phase 1 (COMPLETED - Feb 22, 2026)
- **Complete Employee Schema** with all fields: Basic, Employment, Visa/Legal, Payroll, Bank, Documents
- **Auto-generated Employee ID**: CLT-001, CLT-002, etc.
- **HR Dashboard** with workforce insights, attendance, pending approvals, document expiry alerts
- **Document Expiry Alert System**: 30/60/90 day alerts for Visa, Emirates ID, Passport, Labor Card
- **Basic Leave Management**: Annual, Sick, Emergency, Unpaid, Maternity types with multi-level approval
- **Basic Attendance**: Biometric API endpoint, late/early detection
- **Attendance Regularization**: Request types with CEO final approval
- **HR Audit Logging**: Immutable logs for all HR actions

#### Quick Stats Widget on Home Launcher (COMPLETED)
- Role-appropriate stats for Sales, CS, Mentor, Finance
- Auto-refresh every 5 minutes

#### Commission Engine with Rules Configuration (COMPLETED)
- Commission Rules CRUD: Role, Commission Type (% or Fixed), Value, Course Filter, Sale Range
- Auto-calculation of commissions

#### Bank Statement Import & Reconciliation Engine (COMPLETED)
- Import CSV bank statements
- Auto-reconcile with payments and journal entries
- Manual matching for unmatched items

#### Mentor Leaderboard (COMPLETED)
- Podium display for top 3 mentors
- Full rankings table with period filter

### Sales Team Management (COMPLETED - Feb 22, 2026)
- Team structure with leader and members
- Team-based data access control
- Team assignment in User Management

### Finance Module (COMPLETED)
- Entity Selection: CLT Academy and MILES
- CFO Dashboard with KPI cards
- Chart of Accounts (22 pre-seeded accounts)
- Double-Entry Journal System
- Sales Integration (automatic journal entries)
- Expense Module, Transfer Module, Settlement Module

## Completed Work Summary

### P0 Features (ALL COMPLETED)
- [x] Employee Modal crash fix - Modal opens without crash
- [x] HR/User Sync - Employee creation auto-creates user account
- [x] HR sync-options API - Returns all required dropdown data

### P1 Features (ALL COMPLETED)
- [x] Kanban Drag-and-Drop for Customer Service
- [x] Kanban Drag-and-Drop for Mentor CRM
- [x] HR Leave Management with backend APIs
- [x] HR Attendance with backend APIs
- [x] HR Payroll Engine with backend APIs
- [x] HR Performance Management with backend APIs
- [x] HR Asset Management with backend APIs
- [x] HR Analytics with backend APIs
- [x] Commission Engine backend logic (already implemented)
- [x] Bank Statement Reconciliation (already implemented)

## Architecture Overview

### Frontend Structure
```
/app/frontend/src/
├── pages/
│   ├── hr/
│   │   ├── EmployeeMasterPage.jsx
│   │   ├── EmployeeModal.jsx
│   │   ├── LeavePage.jsx
│   │   ├── AttendancePage.jsx
│   │   ├── PayrollPage.jsx
│   │   ├── PerformancePage.jsx
│   │   ├── AssetsPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── HRDashboard.jsx
│   ├── CustomerServicePage.jsx (with @dnd-kit)
│   ├── MentorCRMPage.jsx (with @dnd-kit)
│   └── SalesCRMPage.jsx (with @dnd-kit)
```

### Backend Structure
```
/app/backend/
├── server.py
│   ├── HR Endpoints (lines 7331-10100+)
│   │   ├── /api/hr/employees (CRUD)
│   │   ├── /api/hr/employees/sync-options
│   │   ├── /api/hr/leave-requests
│   │   ├── /api/hr/attendance
│   │   ├── /api/hr/payroll
│   │   ├── /api/hr/kpis, /api/hr/kpi-scores
│   │   ├── /api/hr/performance-reviews
│   │   ├── /api/hr/assets
│   │   └── /api/hr/analytics/*
│   └── Finance Endpoints
│       ├── /api/accounting/*
│       └── /api/commission-*
```

### Key Dependencies
- **@dnd-kit**: Drag-and-drop for Kanban boards
- **FastAPI**: Backend framework
- **MongoDB**: Database
- **React + Shadcn/UI**: Frontend

## API Endpoints Reference

### HR Module
- `GET/POST /api/hr/employees` - Employee CRUD
- `GET /api/hr/employees/sync-options` - Sync dropdown data
- `GET/POST /api/hr/leave-requests` - Leave management
- `GET /api/hr/attendance` - Attendance records
- `POST /api/hr/payroll/run` - Run payroll
- `GET/POST /api/hr/kpis` - KPI management
- `GET/POST /api/hr/assets` - Asset management
- `GET /api/hr/analytics/*` - Analytics endpoints

### CRM Module
- `GET/PUT /api/students` - Student CRUD with stage/mentor_stage

## Test Credentials
- **Super Admin**: aqib@clt-academy.com / @Aqib1234

## Future/Backlog Tasks
- Biometric API integration for attendance
- Meta Ads and Google Ads webhook integration
- WhatsApp/SMS notifications
- Self-hosting package (Docker, PostgreSQL migration)
- Mobile app
- AI-powered lead scoring

## Files Reference
- Frontend CRM Pages: `/app/frontend/src/pages/CustomerServicePage.jsx`, `MentorCRMPage.jsx`
- HR Pages: `/app/frontend/src/pages/hr/`
- Backend: `/app/backend/server.py`
- Test Reports: `/app/test_reports/iteration_15.json`
