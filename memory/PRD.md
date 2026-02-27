# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (February 2026)

### Session Feb 27, 2026 - ESS Portal & Granular Access Control

#### P0: Granular Access Control System (COMPLETED)
**Problem:** The existing access control only allowed module-level permissions (e.g., view/edit entire "Sales CRM"). Users needed granular control at the sub-page and feature level.

**Solution:**
- Created new backend endpoints: `GET/PUT /api/roles/{role_id}/permissions` and `GET /api/user/permissions`
- Designed hierarchical permission structure: Module → SubPages → Permission Level (none/view/edit/full)
- Added `role_permissions` MongoDB collection to store granular permissions per role
- Updated `AccessControlPage.jsx` with collapsible module cards showing sub-page controls
- Integrated `PermissionProvider` context for app-wide permission enforcement
- Updated `Layout.jsx` to respect granular permissions for navigation visibility

**Key Features:**
- 7 main modules: Dashboard, Sales, Customer Service, Mentor, HR, Finance, Settings
- Each module has multiple sub-pages with individual permission toggles
- Finance module expanded to 15 sub-pages (CLT, Miles, Treasury, Budgeting)
- Visual indicators for permission levels (None=Gray, View=Blue, Edit=Amber, Full=Green)
- Save Changes and Reset to Default buttons
- "Expand All" / "Collapse All" controls

#### P0: Employee Self-Service (ESS) Portal (COMPLETED)
**Problem:** Employees had no way to apply for leave or request attendance regularization. HR handled everything manually.

**Solution:**
Built comprehensive ESS module with multi-level approval workflow (Manager → HR → CEO):

**Leave Application System:**
- 6 leave types configured:
  - Sick Leave: 12 days/year (full-time only, requires document)
  - Annual Leave: 26 days/year (full-time only)
  - Maternity Leave: 45 days/year (requires document)
  - Umrah Leave: 8 days/year
  - Half Day: Unlimited
  - Unpaid Leave: Unlimited
- Document upload support for sick certificates
- Automatic leave day calculation (excludes weekends)
- Leave balance tracking per employee

**Attendance Regularization System:**
- Employees can click on any attendance date to request correction
- Original vs. requested times displayed
- Mandatory reason field
- Multi-level approval workflow

**ESS Dashboard on Main Dashboard:**
- Two tabs: "Work Dashboard" and "My Self-Service"
- Quick stats: Days Present, Hours Worked, Annual Leave Left, Pending Requests
- Tabs within ESS: Overview, Attendance, Leaves, Requests
- Widgets: Leave Balance, Weekly Attendance, Pending Requests, Assets, Request History
- Proper handling for users without HR employee records

**Backend Endpoints Created:**
- `GET /api/ess/dashboard` - Complete ESS dashboard data
- `GET /api/ess/leave-types` - Leave type configurations
- `GET /api/ess/leave-balance` - User's leave balance
- `POST /api/ess/leave-requests` - Create leave request
- `GET /api/ess/leave-requests` - User's leave requests
- `POST /api/ess/leave-requests/{id}/action` - Approve/reject leave
- `GET /api/ess/my-attendance` - User's attendance records
- `POST /api/ess/attendance-regularization` - Create regularization request
- `GET /api/ess/attendance-regularization` - User's regularization requests
- `POST /api/ess/attendance-regularization/{id}/action` - Approve/reject regularization
- `GET /api/ess/my-assets` - User's allocated assets
- `GET /api/ess/pending-approvals` - Pending approvals for managers/HR/CEO
- `GET /api/ess/my-profile` - User's ESS profile

**Frontend Components Created:**
- `/app/frontend/src/components/ess/ESSSection.jsx` - Main ESS dashboard
- `/app/frontend/src/components/ess/LeaveApplicationModal.jsx` - Leave form
- `/app/frontend/src/components/ess/AttendanceRegularizationModal.jsx` - Regularization form  
- `/app/frontend/src/components/ess/ESSWidgets.jsx` - Dashboard widgets

**Test Results:** Backend 100% (13/13 passed), Frontend 100% (All features working)

### Session Feb 26, 2026 - BioCloud Sync & Payroll P0 Fixes

#### P0: BioCloud Attendance Sync Fix (COMPLETED)
**Problem:** The BioCloud attendance sync feature was broken because the target website (ZK BioCloud) had changed its UI structure. The Playwright scraping script was unable to find the menu elements.

**Solution:**
- Completely rewrote the `fetch_biocloud_attendance` function in `server.py`
- Changed navigation path from "Attendance > First & Last" to "Attendance > Daily Attendance"
- Updated scraping logic to handle layui table framework structure:
  - Uses `.layui-table-box` containers to find the daily attendance table
  - Parses columns: Employee ID | Weekday | Employee Name | Department Name | Punch Date | Actual In | Actual Out | Day off
  - Handles pagination by setting page size selector
- Now successfully fetches attendance data from https://56.biocloud.me:8085

**Test Results:**
- Fetched 50 records, synced 1 to CLT Synapse (49 unmapped employees skipped)
- BioCloud Status shows: 106 BioCloud Employees, 5 Mapped, 101 Unmapped

#### P1: Payroll Run Duplicate Key Fix (COMPLETED)
**Problem:** Running payroll for a month that already had a processed batch resulted in a MongoDB duplicate key error instead of a proper error message.

**Solution:**
- Changed the duplicate check from `hr_payroll` collection to `hr_payroll_batches` collection
- Now properly returns: "Payroll for 2026-02 already processed (status: paid)"

#### Bug Fix: EmployeeDetailsPage Syntax Error (COMPLETED)
**Problem:** EmployeeDetailsPage.jsx had orphaned duplicate code causing "Expected corresponding JSX closing tag" error.

**Solution:**
- Removed orphaned code block (lines 716-734) that had duplicate CardContent, Card, and TabsContent elements
- Also referenced a non-existent `calculateNet()` function

### Session Feb 24, 2026 - Admin Settings, Data Reset, Feature Flags

#### Finance User Granular Permissions (COMPLETED)
**Problem:** Finance users needed granular control over specific modules to avoid discrepancies.

**Solution:** Added Module Permissions system with View/Edit/Delete toggles per finance module.
- 11 finance modules with individual permission controls
- Entity Access: CLT Academy and MILES toggles
- Quick actions: "View Only (All)", "Edit (No Delete)", "Clear All"
- Available in both Create and Edit User modals for finance roles

**Modules Covered:**
- CLT: Payables, Receivables
- Miles: Deposits, Withdrawals, Expenses, Operating Profit
- Treasury: Balances, Settlements
- Budgeting, Overall PNL, Data Management

#### One-Click Data Reset (COMPLETED)
**Feature:** Reset all test data with one click while preserving Super Admin accounts.
- Location: Admin Settings (accessible via Security > Admin Settings)
- Requires password confirmation + typing "RESET ALL DATA"
- Clears: leads, students, payments, employees, attendance, call logs, finance data, etc.
- Preserves: Super Admin user accounts

#### Feature Flags System (COMPLETED)
**Feature:** Enable/disable features per environment (Development, Testing, Production).
- Toggle features on/off for each environment
- Default flags: Finance Suite, BioCloud Sync, 3CX Integration, Commission Engine, Mentor CRM
- Add custom feature flags via dialog
- Each flag has name, display name, description, and environment toggles

#### Environment Separation (COMPLETED)
**Feature:** Separate databases for Development, Testing, and Production.
- Development: `clt_synapse_dev`
- Testing: `clt_synapse_test`
- Production: `clt_synapse_prod`
- Environment displayed in Admin Settings page

### Session Feb 24, 2026 - P0 Fix, Dashboard Enhancement

#### P0: Finance Suite Navigation Bug Fix (COMPLETED)
**Problem:** Clicking on "Miles Capitals," "Budgeting," "Overall PNL," "Treasury," and "Data Management" modules led to blank pages.

**Solution:**
- Removed conflicting PNL route block from App.js
- Fixed treasury settlements route path to 'settlements'

#### Dashboard Quick Stats Widget Expansion (COMPLETED)
**Enhanced Dashboard** (`/dashboard`) now shows comprehensive role-based statistics:

**Primary Stats Grid (12 cards for super_admin):**
- Sales: Total Leads, Hot Leads, Enrolled Today, SLA Breaches
- Customer Service: Total Students, New Students, Activated, Upgrade Eligible
- Finance: Total Revenue, Pending Payments, Verified, Discrepancies

**Extended Stats Grid (8 cards for super_admin):**
- Sales Extended: Conversion Rate, Avg Deal Size, Total Enrolled, Commission (Month)
- CS Extended: Onboarding Rate, Upgrade Pitched, Upgrades Closed, Avg Satisfaction

### Session Feb 23, 2026 - Finance Suite Integration

#### Finance Suite Interface (COMPLETED)
Integrated user's existing Finance Suite code into CLT Synapse with the following modules:

**1. CLT Academy Module (Red Theme)**
- Dashboard with Receivables/Payables/Net Balance
- Payables: Record outgoing payments with cost centers, sub-cost centers, source, currency conversion
- Receivables: Record incoming payments with payment methods, payment for categories

**2. Miles Capitals Module (Blue Theme)**
- Dashboard with Deposits/Withdrawals/Expenses/Operating Profit
- Deposits: Track capital deposits
- Withdrawals: Track capital withdrawals
- Expenses: Track operational expenses with cost centers
- Operating Profit: Daily profit recording (LP booked/floating, Miles booked/floating)

**3. Treasury Module (Green Theme)**
- Dashboard with consolidated cash flow
- Opening Balances: Track account balances (Mashreq, ADIB, Emirates Islamic, Cash, USDT, INR)
- Pending Settlements: Track and mark settlements as settled

**4. Budgeting Module (Purple Theme)**
- Budget Sheet: Annual budget planning by cost center (monthly allocations)
- Budget Dashboard: Budget vs. Actual comparison

**5. Overall PNL Module (Amber Theme)**
- Consolidated P&L Dashboard
- Entity breakdown (CLT Academy, Miles Capitals)
- Period filtering (MTD, YTD, Q1-Q4)

**6. Data Management Module (Slate Theme)**
- CSV Import templates for all data types
- CSV Export functionality
- Template reference guide

#### Backend API Endpoints Added:
- `/api/finance/clt/payables` - CRUD
- `/api/finance/clt/receivables` - CRUD
- `/api/finance/miles/deposits` - CRUD
- `/api/finance/miles/withdrawals` - CRUD
- `/api/finance/miles/expenses` - CRUD
- `/api/finance/miles/operating-profit` - CRUD
- `/api/finance/treasury/balances` - CRUD
- `/api/finance/treasury/pending-settlements` - GET, settle
- `/api/finance/budgeting/sheet` - GET, POST
- `/api/finance/budgeting/actuals` - GET

### Session Feb 22, 2026 - P0 Z-Index Fix & Complete Implementation Verification

#### P0: Global Z-Index Bug Fix (COMPLETED)
**Problem:** Dropdowns, popovers, and select menus were appearing BEHIND modal dialogs, making forms unusable.

**Solution Applied:** Systematically updated z-index values across all base UI components in `/app/frontend/src/components/ui/`:
- `dialog.jsx`: DialogOverlay z-50, DialogContent z-[60]
- `select.jsx`: SelectContent z-[9999]
- `popover.jsx`: PopoverContent z-[9999]
- `dropdown-menu.jsx`: DropdownMenuContent/SubContent z-[9999]
- `tooltip.jsx`: TooltipContent z-[9999]
- `context-menu.jsx`: ContextMenuContent/SubContent z-[9999]
- `hover-card.jsx`: HoverCardContent z-[9999]
- `menubar.jsx`: MenubarContent/SubContent z-[9999]
- `sheet.jsx`: SheetOverlay z-[60], SheetContent z-[70]
- `alert-dialog.jsx`: AlertDialogOverlay z-[60], AlertDialogContent z-[70]
- `drawer.jsx`: DrawerOverlay z-[60], DrawerContent z-[70]
- `sonner.jsx`: style={{ zIndex: 99999 }}

**Testing:** All tests passed (6/6) - verified dropdowns appear above dialogs in User Management.

#### P1: BioCloud Integration Phase 2 (VERIFIED COMPLETE)
- Playwright browser automation installed for web scraping
- Auto-sync by name functionality working
- Manual mapping UI functional
- Attendance fetch endpoint implemented via web scraping

#### HR Phase 2 & 3: Payroll Engine, Leave Management, Performance (VERIFIED COMPLETE)
All backend APIs and frontend pages fully implemented and accessible:
- `/hr/payroll` - Payroll calculation with attendance deductions, commissions
- `/hr/leave` - Multi-level approval workflow (Team Lead → Sales Manager → HR → CEO)
- `/hr/performance` - KPI definitions, scoring, performance reviews
- `/hr/assets` - Asset tracking with assignments
- `/hr/analytics` - HR analytics dashboard

#### Commission Engine (VERIFIED COMPLETE)
- Commission rules CRUD with percentage/fixed types
- Automatic commission calculation on payments
- Commission settlements/payouts
- Integration with payroll

### Session Feb 22, 2026 - Finance Roles with Entity Access

#### NEW: Finance-Specific Roles with CLT/MILES Access Control (COMPLETED)

**New Finance Roles:**
| Role | Display Name | Entity Access |
|------|--------------|---------------|
| finance_manager | Finance Manager | CLT + MILES |
| finance_admin | Finance Admin | MILES only |
| finance_treasurer | Finance Treasurer | MILES only |
| finance_verifier | Finance Verifier | MILES only |
| financier | Financier | MILES only |
| accounts | Accounts | CLT only |
| finance | Finance (Legacy) | CLT + MILES |

**User Model Update:**
- Added `entity_access` field to User schema: `["clt", "miles"]`
- Default entity access auto-set based on role
- Entity Access checkboxes shown when creating finance users

**API Changes:**
- `GET /api/roles` - Returns 16 roles with entity_access info
- `POST /api/users` - Now accepts and stores entity_access

**Frontend Changes:**
- Role dropdown now grouped: "General Roles" and "Finance Roles"
- Finance roles show description (e.g., "MILES only", "Both CLT & MILES")
- Entity Access checkboxes appear when finance role selected

### Session Feb 22, 2026 - BioCloud Biometric Integration

#### NEW: ZK BioCloud Attendance System Integration (COMPLETED)

**What's Working:**
- ✅ Connected to BioCloud at https://56.biocloud.me:8085
- ✅ Fetching 106 employees from BioCloud
- ✅ Employee mapping interface (manual + auto-sync by name)
- ✅ Attendance sync endpoint ready

**BioCloud Sync Page (`/hr/biocloud`):**
- Status cards: Connection status, BioCloud employees, mapped/unmapped count
- Employee Mapping tab: View all BioCloud employees, map to CLT Synapse employees
- Attendance Sync tab: Fetch daily attendance (first-in/last-out)

**API Endpoints:**
- `GET /api/hr/biocloud/status` - Check BioCloud connection
- `GET /api/hr/biocloud/employees` - Fetch employees for mapping
- `POST /api/hr/biocloud/auto-sync` - Auto-sync by name matching
- `POST /api/hr/biocloud/mapping` - Save manual mappings
- `POST /api/hr/biocloud/fetch-attendance` - Fetch attendance via web scraping

**Technical Notes:**
- BioCloud uses JWT auth via `/jwt-api-token-auth/`
- Personnel API available at `/personnel/api/employees/`
- Transaction API returns 404 (not enabled on license)
- Attendance data fetched via web scraping from `/Attendance/Transaction` page

**Configuration (backend/.env):**
```
BIOCLOUD_URL="https://56.biocloud.me:8085"
BIOCLOUD_USERNAME="Admin"
BIOCLOUD_PASSWORD="1"
```

### Session Feb 22, 2026 - CS → Mentor CRM Data Flow

#### NEW: Customer Service to Mentor CRM Pipeline (COMPLETED)

**Flow:**
1. New students start in Customer Service CRM under "New Student" stage
2. CS agent works with the student (calls, onboarding, etc.)
3. When CS moves student to "Activated" stage:
   - A mentor is auto-assigned via round-robin
   - Student gets `mentor_stage: new_student` initialized
   - Notification sent to assigned mentor
4. Student now appears in Mentor CRM for the assigned mentor

**Key Rule:** Only activated students appear in Mentor CRM. Unactivated students stay exclusively in Customer Service.

**Technical Changes:**
- Backend: Added `activated_only` filter to `GET /api/students`
- Backend: Auto-sets `mentor_stage: new_student` when CS activates student
- Frontend: MentorCRMPage now fetches with `activated_only=true`

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
- [x] Finance Suite Navigation Bug Fix (Feb 24, 2026)
- [x] Dashboard Quick Stats Widget Expansion (Feb 24, 2026)
- [x] BioCloud Attendance Sync Fix (Feb 26, 2026)
- [x] Payroll Run Duplicate Key Fix (Feb 26, 2026)
- [x] EmployeeDetailsPage Syntax Error Fix (Feb 26, 2026)

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
- `/app/test_reports/iteration_17.json` - Z-Index bug fix verification (100% pass - 6/6 tests)
- `/app/test_reports/iteration_18.json` - Finance Suite navigation fix (100% pass - 12/12 tests)
- `/app/test_reports/iteration_19.json` - Dashboard Quick Stats expansion (100% pass - 18/18 tests)
- `/app/test_reports/iteration_20.json` - Admin Settings, Data Reset, Feature Flags (100% pass - 21/21 tests)
- `/app/test_reports/iteration_21.json` - BioCloud Sync & Payroll P0 fixes (100% pass)
- `/app/test_reports/iteration_22.json` - Comprehensive testing: BioCloud, Payroll, Round Robin, Follow-ups, View As, Reassignment, Approvals (Backend 83%, Frontend 95%)

## New Admin Features
- **Admin Settings Page**: `/admin-settings` (Super Admin only)
  - Data Reset: One-click clear all test data
  - Feature Flags: Toggle features per environment
  - Environment Info: Shows current environment and database
- **Finance Permissions**: Granular View/Edit/Delete per module in User Management

## Future/Backlog Tasks
- Meta Ads and Google Ads webhook integration
- WhatsApp/SMS notifications
- Self-hosting package (Docker, PostgreSQL migration)
- Mobile app
- AI-powered lead scoring
- Direct ZKTeco biometric device API integration (if network access available)

