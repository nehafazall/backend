# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (February 2026)

### Session Feb 22, 2026 - Bidirectional User <-> Employee Sync

#### NEW: Full Bidirectional Sync Between User Management & Employee Master (COMPLETED)

**User → Employee Sync:**
- Creating a user with `create_employee_record=true` auto-generates an employee record in HR module
- Deactivating a user (`is_active=false`) marks linked employee as "terminated" with termination date
- Deleting a user marks linked employee as "terminated"
- Field sync: department, role, full_name changes propagate to employee record

**Employee → User Sync:**
- Creating an employee with `create_user_account=true` auto-generates a user account
- Employee termination can optionally deactivate linked user

**UI Changes:**
- User Management "Create User" modal now has a "Create Employee Record" toggle (enabled by default)
- Additional fields: Designation, Joining Date visible when toggle is enabled

**API Changes:**
- `POST /api/users` - Extended with `create_employee_record`, `designation`, `joining_date` fields
- `PUT /api/users/{user_id}` - Now syncs status and field changes to linked employee
- `DELETE /api/users/{user_id}` - Terminates linked employee record

### Session Feb 22, 2026 - P0 & P1 Completion

#### 1. Kanban Drag-and-Drop for Customer Service & Mentor CRM (COMPLETED)
- **Customer Service Page** (`/cs`): Added drag-and-drop using @dnd-kit library
- **Mentor CRM Page** (`/mentor`): Same drag-and-drop implementation
- Uses DndContext, DragOverlay, SortableContext, useSortable, useDroppable, CSS.Transform

#### 2. HR Module Phase 1 - Employee Master & User Sync (COMPLETED)
- **Employee Master** (`/hr/employees`): Full CRUD with auto-generated Employee ID
- **Add Employee Modal**: All form fields working
- **User Account Sync**: Toggle to create user account automatically

#### 3. HR Module Phase 2 & 3 - Full Implementation (COMPLETED)
- **Leave Management** (`/hr/leave`)
- **Attendance** (`/hr/attendance`)
- **Payroll** (`/hr/payroll`)
- **Performance Management** (`/hr/performance`)
- **Asset Management** (`/hr/assets`)
- **HR Analytics** (`/hr/analytics`)

## Completed Work Summary

### All P0 & P1 Features (COMPLETED)
- [x] Employee Modal crash fix
- [x] HR/User bidirectional sync
- [x] Kanban Drag-and-Drop for Customer Service
- [x] Kanban Drag-and-Drop for Mentor CRM
- [x] HR Leave, Attendance, Payroll, Performance, Assets, Analytics
- [x] Commission Engine backend logic
- [x] Bank Statement Reconciliation

## Architecture Overview

### Bidirectional Sync Flow
```
User Management                    Employee Master
     │                                   │
     ├──► POST /api/users ──────────────►│ (creates employee)
     │    (create_employee_record=true)  │
     │                                   │
     │◄── POST /api/hr/employees ◄───────┤ (creates user)
     │    /with-user                     │
     │                                   │
     ├──► PUT /api/users/{id} ──────────►│ (syncs status/fields)
     │    (is_active, dept, role, name)  │
     │                                   │
     ├──► DELETE /api/users/{id} ───────►│ (terminates employee)
     │                                   │
```

### Key API Endpoints
- `POST /api/users` - Create user (optionally with employee record)
- `PUT /api/users/{user_id}` - Update user (syncs to employee)
- `DELETE /api/users/{user_id}` - Delete user (terminates employee)
- `POST /api/hr/employees/with-user` - Create employee with user account
- `GET /api/hr/employees/sync-options` - Get sync dropdown data

## Test Credentials
- **Super Admin**: aqib@clt-academy.com / @Aqib1234

## Test Reports
- `/app/test_reports/iteration_15.json` - P0/P1 features (100% pass)
- `/app/test_reports/iteration_16.json` - Bidirectional sync (100% pass)

## Future/Backlog Tasks
- Biometric API integration for attendance
- Meta Ads and Google Ads webhook integration
- WhatsApp/SMS notifications
- Self-hosting package (Docker, PostgreSQL migration)
- Mobile app
- AI-powered lead scoring
