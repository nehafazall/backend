# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Updates (March 2026)

### Session Mar 11, 2026 - P0 Bug Fix & Automatic User Deactivation

#### P0 Bug Fix: "Failed to Fetch Employees" (FIXED & VERIFIED)
**Problem:** After bulk importing employees via CSV, the HR Employee Master page showed "Failed to fetch employees" error. The entire employee list was broken.

**Root Cause:** The `EmployeeResponse` Pydantic model had `notice_period_days: int`, `annual_leave_balance: float`, and `sick_leave_balance: float` as required fields. Imported employee records didn't include these fields, causing Pydantic validation to fail for the entire response.

**Fix:**
- Made `notice_period_days` default to `30`
- Made `annual_leave_balance` default to `0`
- Made `sick_leave_balance` default to `0`
- Made `work_location` Optional (imports may not set it)
- Made `employment_type` default to `"full_time"` and `probation_days` default to `90`
- Updated both import endpoints (`/import/employees` and `/hr/employees/import`) to set these fields

**Test Results:** Backend 100% (14/14), Frontend 100%

#### P1 Feature: Automatic User Deactivation (COMPLETED & VERIFIED)
**Problem:** When employees are terminated/resigned, their system access needs to be automatically disabled after a 30-day grace period.

**Solution:**
- Background scheduler (`user_deactivation_loop`) runs every 6 hours
- Checks for employees with `access_disable_date` that has passed
- Deactivates their user accounts and marks them as `access_disabled: true`
- Two admin endpoints for manual management:
  - `POST /api/admin/run-deactivation-check` - Manual trigger
  - `GET /api/admin/pending-deactivations` - View pending/overdue/deactivated lists

**Flow:**
1. Employee terminated via `PUT /api/hr/employees/{id}/terminate`
2. `access_disable_date` set to 30 days from termination (or immediate if specified)
3. Background job checks every 6 hours and deactivates users whose date has passed
4. Admin can view pending deactivations and manually trigger checks

**Test Results:** Backend 100% (14/14), Frontend 100%

#### Bug Fix: Teams Management - Leader/Member Assignment & Departments (FIXED & VERIFIED)
**Problems:**
1. Could not assign team leaders — modal filtered to `['team_leader', 'sales_manager', 'sales_executive']` roles but all users had `sales_agent` role
2. "Academics" department missing from team creation dropdown
3. Could not add members from Employee Master — same restrictive role filter

**Fixes:**
- Removed restrictive role filters from `availableUsers` and `potentialLeaders` — now shows ALL active users
- Updated departments list to all 8: Sales, Finance, Customer Service, **Mentors/Academics**, Operations, Marketing, HR, Quality Control
- Added search bars to both Leader and Member selection modals (filter by name/email)
- Fixed N+1 queries in GET /api/teams (batch leader names + member counts) and GET /api/leads (batch assigned user + course names)

**Test Results:** Backend 92% (12/13), Frontend 100%

#### Auto User Account Creation on Employee Creation (IMPLEMENTED & VERIFIED)
**Problem:** Every time employees were created manually in Employee Master, they didn't appear in User Management. Required manual sync each time.

**Fix:** Modified `POST /api/hr/employees` endpoint to automatically:
1. Check if a user account exists with the employee's company email
2. If exists → link the user to the employee
3. If not → create a new user account with default password (`FirstName@123`) and link both records

**Result:** Any employee created with a company email now instantly appears in User Management. No manual sync needed.

**Test Results:** Verified — created test employee, user auto-created immediately.

#### Bug Fix: User Management - Team Names Not Showing & Missing Users (FIXED & VERIFIED)
**Problems:**
1. Team names for CHALLENGER and GLADIATOR not showing in User Management table
2. Manually created employees (Falja, Della, Karthika) not appearing in User Management — they had no linked user accounts
3. Edit User modal missing Team dropdown entirely

**Root Causes:**
- `fetchTeams` used default `active_only=true`, potentially filtering teams
- `handleEditUser` didn't include `team_id` in form state — team was lost when editing
- Edit User modal had no Team Selection dropdown (only Create modal had it)
- 3 employees created manually via HR module never had user accounts generated
- User update endpoint didn't sync `team_id` bidirectionally to linked employee record

**Fixes:**
- Changed `fetchTeams` to use `active_only=false` to include all teams
- Added `team_id: user.team_id || ''` to `handleEditUser` form state
- Added Team Selection dropdown to Edit User modal (shows all 10 teams)
- Ran `POST /api/hr/employees/sync-to-users` to create user accounts for 3 employees
- Added `team_id` to bidirectional sync in `PUT /api/users/{id}` endpoint

**Test Results:** Backend 100% (9/9), Frontend 100%
**Problems:**
1. System role changes not saving when editing employees
2. Team assignment not saving
3. Date format inconsistent (DD/MM/YYYY from CSV imports vs YYYY-MM-DD from UI)

**Root Causes:**
- `EmployeeUpdate` Pydantic model in `hr_module.py` was missing `role` and `team_id` fields — Pydantic silently stripped them
- `EmployeeResponse` model missing `team_id` — couldn't return it to frontend
- `UserBase` model missing `team_id` — couldn't return in user API responses
- No date normalization for imported records

**Fixes:**
- Added `role: Optional[str]` and `team_id: Optional[str]` to `EmployeeUpdate` model
- Added `team_id` to `EmployeeResponse` and `UserBase` models
- Added `team_id` sync in the update handler (syncs to linked user account)
- Created `_normalize_date()` helper that converts DD/MM/YYYY → YYYY-MM-DD on read

**Test Results:** Backend 100% (12/12), Frontend 100%

#### Feature: Manual Attendance Import via XLSX (COMPLETED & VERIFIED)
**Problem:** When BioCloud sync fails, HR needs a fallback to manually import monthly attendance data for payroll processing.

**Solution:**
**Step 1 - Download Template:** `GET /api/hr/attendance/template/download?month=YYYY-MM`
- Generates XLSX with all active employees pre-filled
- Pre-filled columns: Employee ID, Name, Department, Designation, Basic Salary, Housing/Transport/Food/Phone/Other Allowances, Fixed Incentive
- Yellow editable columns: Full Days, Half Days, Approved Leaves
- Professional styling with frozen panes and validation notes

**Step 2 - Upload Filled Sheet:** `POST /api/hr/attendance/import` (multipart: file + month)
- Reads filled XLSX and creates daily `hr_attendance` records
- Full Days → `status: "present"`, Half Days → `status: "present" + half_day: true`, Approved Leaves → `status: "leave"`
- Tagged with `source: "manual_import"` to distinguish from biometric data
- Re-import replaces only manual records (preserves biometric data)

**Payroll Integration:** The existing payroll engine (`POST /api/hr/payroll/run`) automatically picks up imported attendance data — no changes needed.

**Frontend:** New "Manual Import" tab on HR > Attendance page with month selector, download template button, and upload area.

**Test Results:** Backend 100% (14/14), Frontend 100%

### Session Mar 10, 2026 - Comprehensive Historical Import & LTV Tracking

#### Feature: Comprehensive Historical Import System (COMPLETED)
**Problem:** Need to import 950 historical students with proper assignments to Sales agents, CS agents, and Mentors.

**Solution:** Created a multi-import system with LTV tracking:

**1. Comprehensive Students Import** (`/api/import/comprehensive-students`)
Fields: student_name*, phone*, additional_numbers, email*, country, city, enrolled_course*, enrollment_amount, enrollment_date, sales_agent_employee_id*, team_name*, cs_agent_employee_id*, mentor_employee_id

Creates:
- Lead as "Enrolled" (assigned to Sales Agent)
- Student as "Activated" in CS (assigned to CS Agent)
- Mentor assignment (if provided)
- Initial LTV transaction record

**2. CS Upgrades Import** (`/api/import/cs-upgrades`)
Fields: month*, date*, cs_employee_id*, student_email*, upgrade_amount*, upgrade_to_course
- Tracks all upgrade transactions per CS agent
- Updates student upgrade_count and upgrade_history
- Adds to student LTV

**3. Mentor Redeposits Import** (`/api/import/mentor-redeposits`)
Fields: month*, date*, mentor_employee_id*, student_email*, redeposit_amount*
- Tracks redeposit transactions per mentor
- Student moves back to "discussion_started" for re-pitching
- Monthly totals reset at beginning of each month
- Adds to student LTV

**4. Mentor Withdrawals Import** (`/api/import/mentor-withdrawals`)
Fields: date*, mentor_employee_id*, student_email*, withdrawal_amount*, notes
- For Admin/Financier to add daily/backdated withdrawal entries
- Reduces active revenue for mentor
- Net = Redeposits - Withdrawals
- Used for commission calculations
- Subtracts from student LTV

**5. LTV Tracking System**
- New collection: `student_transactions` - tracks ALL financial events
- Each student has: first_enrollment_amount, total_upgrades, total_redeposits, total_withdrawals, ltv
- API: `GET /api/student/{student_id}/ltv` - returns complete LTV breakdown

**6. Mentor Revenue Summary** (`/api/mentor/revenue-summary`)
- Shows: Monthly Redeposits | Withdrawals | Net Active | Students Pitched
- Holistic view for commission calculation

**Frontend Changes:**
- Sales: "Import Historical Students" button (comprehensive import)
- CS: "Import Upgrades" button added
- Mentor: "Import Redeposits" + "Import Withdrawals" buttons
- Mentor: Revenue summary card shows Redeposits, Withdrawals, Net Active

#### CS Kanban - "Upgraded" Stage (COMPLETED)
- Added "Upgraded" stage after "Interested" in CS kanban
- Stages: New Student → Activated → Satisfactory Call → Pitched Upgrade → In Progress → Interested → Upgraded → Not Interested

### Session Mar 10, 2026 - Customer Service Upgrade Workflow + HR Enhancements

#### Feature 1: Visual Upgrade Path Indicator (COMPLETED)
**Problem:** CS agents and mentors needed a visual way to see a student's journey through course levels.

**Solution:** Added `UpgradePathIndicator` component showing student's progress:

**UI Features:**
- 5-level progress bar: Starter → Basic → Intermediate → Advanced → Mastery
- Current level highlighted with ring effect and icon
- Upgrade count badge showing total upgrades (e.g., "8 Upgrades")
- Upgrade History section with from/to course badges and dates
- Next Level hint showing what's next in their journey
- Mastery achievement message when student reaches top level
- Supports compact mode for smaller displays

**Location:** Student Detail Modal in Customer Service page

#### Feature 2: Welcome Email for New Employees (COMPLETED)
**Problem:** New employees needed a professional onboarding email with their credentials and employment details.

**Solution:** Implemented automatic welcome email on employee creation:

**Email Template Includes:**
- CLT Synapse header with logo
- User ID (company email) and password
- Employee ID, Date of Joining, Tenure
- Department, Designation, System Role
- HR Manager signature (name, email, phone from employee master)
- Login button to CLT Synapse portal
- Security warning to change password

**API:** `POST /api/hr/employees/with-user` 
- Now returns `welcome_email_sent: true/false`
- Message includes email status confirmation

**Technical Implementation:**
- `get_employee_welcome_template()` in email_service.py
- `send_employee_welcome_email()` helper function
- `calculate_tenure_text()` for human-readable tenure

**Test Results:** Backend 100% (9/9 tests), Frontend 100%

#### P0: Customer Service Upgrade Workflow (COMPLETED)
**Problem:** Needed a workflow for existing students to upgrade their course, with proper tracking and mentor visibility.

**Solution:** Implemented complete upgrade workflow:

**1. Backend Implementation:**
- `POST /api/students/{id}/initiate-upgrade` - Creates upgrade record, moves student back to new_student stage
- `POST /api/students/{id}/complete-upgrade-activation` - Completes the upgrade activation process
- `GET /api/students/{id}/upgrade-history` - Returns complete upgrade history
- Student tracks: `is_upgraded_student`, `upgrade_count`, `upgrade_history`, `mt5_account_history`
- Mentor gets notified but student NOT counted as new (preserves metrics)

**2. Frontend Implementation:**
- `UpgradeModal.jsx` - Full upgrade form with course selection, MT5 tracking, wallet confirmation
- Course color-coding: `getCourseColor()` function maps courses to colors (mastery=emerald, advanced=green, etc.)
- Upgrade badge shows "↑ xN" on student cards for upgraded students
- "Initiate Upgrade" menu option only appears for students in "activated" stage

**3. Key Features:**
- Mandatory course selection for upgrade
- MT5 account change tracking (history preserved)
- Wallet transfer confirmation checkbox
- Color-coded student cards based on course level
- Previous questionnaire data preserved and pre-filled
- Student stays with same mentor after upgrade

**Bugs Fixed During Testing:**
1. localStorage key: Changed from 'token' to 'clt_token'
2. Course price display: Now uses `(course.price || course.base_price)`
3. Dark mode visibility: Wallet checkbox styling fixed

**Test Results:** Backend 100% (12/12 tests), Frontend 100%

#### P1: Unified Transactions Page (VERIFIED WORKING)
**Status:** Already implemented and functional at `/finance/:entity/transactions`

**Features:**
- Summary cards: Total Inflows, Total Outflows, Net Cash Flow
- Comprehensive filters: Search, Type (Money In/Out), Bank Account, Date Range
- Transaction History table showing all money movements
- Export to CSV functionality
- Sources: Sales, Payables, Expenses, Commissions, Enrollments

**Backend Endpoint:** `GET /api/finance/unified-transactions` aggregates from:
- clt_receivables (Money In)
- clt_payables (Money Out)
- expenses (Money Out)
- commission_settlements (Money Out)
- finance_verifications (Money In from enrollments)

### Session Mar 6, 2026 - P0 Finance & BioCloud Fixes

#### P0: ObjectId Serialization Fix (COMPLETED)
**Problem:** Finance Settings CRUD endpoints were crashing due to MongoDB `ObjectId` not being JSON serializable when creating new entries.

**Solution:** Fixed the Bank Accounts POST endpoint (`/api/finance/settings/bank-accounts`) that was missing `account.pop("_id", None)` before returning. All Finance Settings POST endpoints now properly remove the `_id` field.

**Verification:** Testing agent confirmed all 7 CRUD endpoints working without ObjectId errors:
- POST /api/finance/settings/chart-of-accounts ✅
- POST /api/finance/settings/cost-centers ✅  
- POST /api/finance/settings/payment-methods ✅
- POST /api/finance/settings/payment-gateways ✅
- POST /api/finance/settings/psp-bank-mapping ✅
- POST /api/finance/settings/bank-accounts ✅
- POST /api/finance/vendors ✅

#### P0: BioCloud Attendance Sync Reliability Improvement (COMPLETED)
**Problem:** BioCloud web scraping was unreliable, failing intermittently without proper error handling.

**Solution:** Enhanced the sync mechanism with:
1. **Retry Logic**: Configurable retry count (default 3 attempts) with 2-second delays
2. **Robust Element Selection**: Multiple fallback selectors for login form, menus, and tables
3. **Better Error Handling**: Detailed logging and informative error messages
4. **Date Filter Support**: Can sync specific dates if BioCloud supports filtering
5. **Sync History Logging**: All syncs logged to `biocloud_sync_log` collection

**New Endpoints Added:**
- `POST /api/hr/biocloud/bulk-sync` - Sync attendance for a date range (max 31 days) in background
- `GET /api/hr/biocloud/sync-job/{job_id}` - Check bulk sync job status
- `GET /api/hr/biocloud/sync-history` - View sync history for audit/troubleshooting

**Enhanced Status Endpoint:** `/api/hr/biocloud/status` now includes last successful sync information.

**Test Results:** Backend 100% (17/17 tests), Frontend 100%

#### P1: Email Notifications for SLA Breaches & Daily Finance Report (COMPLETED)
**Requirement:** Add email alerts for SLA breaches and daily finance report at 12:00 AM UAE time.

**Implementation:**

**1. SLA Breach Email Alerts:**
- Email sent when a lead breaches SLA threshold (48+ hours)
- Recipients: Assigned sales executive + all sales managers
- Professional HTML template with lead details, time elapsed, and urgency

**2. Daily Finance Report (12:00 AM UAE):**
- Automated scheduler runs at midnight UAE time
- Recipients: accounts@clt-academy.com, aqib@clt-academy.com (CEO), faizeen@clt-academy.com (COO)
- Report includes:
  - Sales Today (amount + count)
  - Sales This Month (amount + count)
  - Treasury Balance (total across all banks)
  - Bank Account Balances (per bank)
  - Pending Settlements
  - Expenses (MTD)
  - Top 5 Sales Performers
  - Pending Verifications count
- Beautiful HTML email template with CLT branding

**New API Endpoints:**
- `POST /api/admin/send-daily-finance-report` - Manual trigger for testing
- `GET /api/admin/email-status` - Check email configuration status

#### P0: Finance Dashboard & Cash Flow Transparency (COMPLETED)
**Requirement:** Finance dashboard to show receivables data with bank mapping, pre/post settlement amounts for cash flow transparency, and filters on Receivables & Payables pages.

**Implementation:**

**1. Treasury Dashboard Enhancements:**
- **Pre-Settlement Balance**: Shows actual balance with settled payments only
- **Post-Settlement Balance**: Shows projected balance including pending settlements  
- **Cash Flow by Bank Account** table: Opening balance, settled inflows, pending inflows, outflows, current/projected balance per bank
- **Bank Filter**: Filter all data by specific bank account
- **Quick Links**: Clickable cards to navigate to Receivables/Payables

**2. Receivables Page Filters:**
- Date range (From/To)
- Payment Gateway
- Settlement Status (Settled/Pending)
- Bank Account
- Summary row showing filtered total

**3. Payables Page Filters:**
- Date range (From/To)
- Cost Center
- Bank Account
- Status (Paid/Pending)
- Summary row showing filtered total

#### P0: Finance Verification → Receivables Flow Fix (COMPLETED)
**Problem:** When approving finance verifications, entries were NOT being created in CLT Receivables.

**Solution:** Modified the `POST /api/finance/verifications/{id}/verify` endpoint to:
1. Create a `finance_clt_receivables` entry with all payment details
2. Link the receivable to the verification via `receivable_id`
3. Handle null payment_method gracefully
4. Store verification source for audit trail

**Result:** Approved payments now appear in Finance > CLT > Receivables page.

#### P0: Bird's Eye View Dashboard (COMPLETED)
**Requirement:** Create a comprehensive company overview dashboard with charts, growth comparisons, and clickable widgets that navigate to respective modules.

**Implementation:**
- Created `/app/frontend/src/pages/BirdsEyeDashboard.jsx` as the new main dashboard
- **No-scroll design** - everything fits in one viewport
- **Clickable widgets** - all metrics navigate to their respective pages:
  - Attendance → HR Attendance
  - Absent/Employees → HR Employees  
  - Docs Expiring → HR Documents
  - Revenue/Expenses → Finance CLT modules
  - Leads → Sales Leads
- **Interactive Charts:**
  - Revenue Trend (Area chart)
  - Monthly Enrollments (Bar chart)
  - Department Breakdown (Pie chart)
- **Real-time Data:** Fetches from dashboard stats, HR, and finance APIs
- **Previous dashboard available at:** `/dashboard/detailed`

### Session Mar 2, 2026 - Finance Module Cleanup & Settings Enhancement

#### Miles Capitals Removal (COMPLETED)
**Changes Made:**
- Removed Miles Capitals entity from Finance Entity Selector
- Removed Miles routes from App.js (deposits, withdrawals, expenses, profit)
- Removed Miles imports from App.js
- Updated OverallPNLDashboard to show only CLT Academy P&L
- Updated DataManagementPage to remove Miles data import/export options
- Added new Finance Settings entity

#### Finance Settings Module (NEW - COMPLETED)
Created comprehensive Finance Settings page (`/app/frontend/src/pages/finance/FinanceSettingsPage.jsx`) with CRUD functionality for:

1. **Chart of Accounts**
   - Code, Name, Type (Asset/Liability/Equity/Revenue/Expense)
   - Parent account support for hierarchical structure
   - Active/Inactive status

2. **Cost Centers**
   - Code, Name, Department assignment
   - Description and status management

3. **Payment Methods**
   - Code, Name, Type (Card/Bank Transfer/Cash/BNPL/Mobile/Cheque)
   - "Requires Proof" flag for documentation requirements

4. **Payment Gateways**
   - Settlement configuration (T+n days OR specific day of week)
   - Processing fees (percentage + fixed amount)
   - Currency support (AED/USD/EUR)
   - Examples: Tabby (Monday), Tamara (7 days), Network (T+1)

5. **PSP Bank Mapping**
   - Links payment gateways to bank accounts
   - Enables easy reconciliation
   - Bank name, account number, account name

**Backend Endpoints Added:**
- GET/POST/PUT/DELETE `/api/finance/settings/chart-of-accounts`
- GET/POST/PUT/DELETE `/api/finance/settings/cost-centers`
- GET/POST/PUT/DELETE `/api/finance/settings/payment-methods`
- GET/POST/PUT/DELETE `/api/finance/settings/payment-gateways`
- GET/POST/PUT/DELETE `/api/finance/settings/psp-bank-mapping`

#### Meta Ads API Configuration (COMPLETED)
- Added META_APP_ID and META_APP_SECRET to backend .env
- Marketing Settings shows "Meta API: Configured" and "Webhook: Ready"
- User needs to configure production domain for OAuth

### Session Mar 1, 2026 (Part 2) - Finance Verification Flow Fix

#### P0: Finance Verification Data Pipeline Fix (COMPLETED)
**Problem:** When a lead was enrolled, the finance verification record was being created without crucial payment details (payment method, course name, payment screenshot, split payment details, BNPL phone verification). This was blocking the finance team from verifying payments.

**Root Cause:** The `LeadUpdate` Pydantic model in `server.py` was missing the payment-related fields, causing them to be filtered out before reaching the finance verification creation logic.

**Solution:**
Extended the `LeadUpdate` model to include all payment fields:

```python
class LeadUpdate(BaseModel):
    # ... existing fields ...
    # Payment fields for enrollment
    payment_method: Optional[str] = None
    payment_amount: Optional[float] = None
    payment_date: Optional[str] = None
    payment_proof: Optional[str] = None  # Base64 encoded image
    payment_proof_filename: Optional[str] = None
    payment_notes: Optional[str] = None
    transaction_id: Optional[str] = None
    # Split payment support
    is_split_payment: Optional[bool] = False
    payment_splits: Optional[List[dict]] = None
    # BNPL phone verification
    bnpl_phone: Optional[str] = None
    bnpl_same_number: Optional[bool] = True
```

**Key Changes:**
- Backend: `/app/backend/server.py` - Added 12 new fields to LeadUpdate model (lines 310-343)
- Backend: Updated finance verification record creation to properly capture course_name (line 2871)
- The complete data flow now works: `EnrollmentPaymentModal` → `leadApi.update()` → `finance_verifications` collection

**Test Results:** Backend 100% (11/11 passed), Frontend 100%

#### P1: Meta Ads API Configuration (COMPLETED)
**Problem:** Meta Ads API credentials were not configured.

**Solution:**
Added Meta API credentials to backend `.env`:
- `META_APP_ID="755078850771503"`
- `META_APP_SECRET="742a5810f5fa474427d2ce843a67283b"`

**Result:**
- Meta Ads Service now initialized on server startup
- Marketing Settings page shows "Meta API: Configured" and "Webhook: Ready"
- Webhook URL: `https://hr-sync-dashboard.preview.emergentagent.com/api/marketing/webhook`
- Users can now connect their Meta Ad accounts via OAuth flow

---

### Session Mar 1, 2026 - Sales Pipeline & Commission Tracking

#### P0: Sales Pipeline Revenue & Commission Tracking (COMPLETED)
**Problem:** User needed to track interested course and estimated value in the sales pipeline, with commission calculations for leads expected to close this month.

**Solution:**
Built comprehensive sales pipeline tracking with commission projections:

**Backend Implementation:**
- Created `GET /api/dashboard/expected-commission` endpoint that calculates:
  - Expected commission from pipeline leads (warm, hot, in_progress)
  - Earned commission this month from enrolled leads
  - Stage-by-stage breakdown with lead counts and values
  - Top expected deals list
  - Actual pending/paid commission from commissions collection
- Enhanced `GET /api/dashboard/pipeline-revenue` with course breakdown per stage

**Key API Endpoints:**
- `GET /api/dashboard/expected-commission` - Commission projections
- `GET /api/dashboard/pipeline-revenue` - Pipeline value by stage

**Frontend Implementation:**
- **PipelineRevenueWidget** (`/app/frontend/src/components/PipelineRevenueWidget.jsx`):
  - Active Pipeline, Won (Enrolled), Lost (Rejected) summary cards
  - Pipeline funnel visualization with stage bars
  - Course breakdown badges per stage
  
- **ExpectedCommissionWidget** (`/app/frontend/src/components/ExpectedCommissionWidget.jsx`):
  - Expected (Pipeline) and Earned This Month cards
  - Total Receivable highlight
  - Stage-by-stage commission breakdown with progress bars
  - Top Expected Deals list

- **SalesCRMPage Enhancements**:
  - Lead cards now display course interest and estimated value
  - "Course Interest Required" section appears when moving leads to warm_lead, hot_lead, or in_progress
  - Course/Package selection dropdown with auto-fill of estimated value
  - Validation prevents stage change without course selection

- **SalesDashboard Integration**:
  - Both widgets added to Sales Dashboard page

**Database Fields:**
- `leads.interested_course_id` - ObjectId reference to course
- `leads.interested_course_name` - Cached course name
- `leads.estimated_value` - Estimated deal value in AED

**Test Results:** Backend 100% (14/14 passed), Frontend 100%

---

## Latest Updates (February 2026)

### Session Feb 28, 2026 (Part 2) - Google Sheets Lead Connector & Lead Flow Refactoring

#### P0: Google Sheets Lead Connector (COMPLETED)
**Problem:** User needed to import leads from Google Sheets automatically with:
- Auto-sync every 5 minutes and manual sync option
- Sheet-to-agent mapping (single agent = all leads, multiple agents = round-robin)
- Specific column mapping: N=Full Name, O=City, P=Primary Phone, Q=Secondary Phone, B=Lead Captured Time
- Duplicate detection (skip leads with same phone/email)

**Solution:**
Created comprehensive Google Sheets Lead Connector system:

**Backend Implementation:**
- Created Google Sheets Service (`/app/backend/services/google_sheets_service.py`) with:
  - Google OAuth2 flow implementation
  - Sheet reading with configurable column mapping
  - Duplicate detection by phone/email
  - Round-robin agent assignment logic
  - Token refresh handling
- Added 10+ new API endpoints in `server.py` for connector management
- Background auto-sync loop (checks every minute, syncs based on configured interval)
- Database collection: `sheet_connectors`, `sheets_oauth_states`

**Key API Endpoints:**
- `GET /api/connectors/config` - Configuration status (google_sheets_configured)
- `GET /api/connectors/google-sheets` - List all sheet connectors
- `POST /api/connectors/google-sheets` - Create new connector
- `PUT /api/connectors/google-sheets/{id}` - Update connector settings
- `DELETE /api/connectors/google-sheets/{id}` - Delete connector
- `GET /api/connectors/google-sheets/{id}/oauth` - Start OAuth flow
- `GET /api/connectors/google-sheets/callback` - OAuth callback handler
- `POST /api/connectors/google-sheets/{id}/sync` - Trigger manual sync
- `GET /api/connectors/google-sheets/{id}/preview` - Preview sheet data
- `GET /api/connectors/agents` - List available agents for assignment

**Frontend Implementation:**
- Created Lead Connectors page (`/marketing/connectors`) with:
  - Configuration status warning when OAuth not set up
  - Connector cards showing status, assigned agents, sync info
  - Add Connector dialog with all fields and agent selection checkboxes
  - Edit Connector dialog for updating settings
  - Preview dialog to view sheet data
  - Delete confirmation dialog
  - Manual sync button
  - OAuth connection flow

**Environment Variables Required:**
```
GOOGLE_SHEETS_CLIENT_ID=""
GOOGLE_SHEETS_CLIENT_SECRET=""
```

**Default Column Mapping:**
- N = Full Name
- O = City  
- P = Primary Phone
- Q = Secondary Phone
- B = Lead Captured Time

**Test Results:** Backend 89% (16/18 passed, 2 skipped - OAuth not configured), Frontend 100%

#### P0: Lead Flow Refactoring (COMPLETED)
**Problem:** Meta Ads leads were going to a separate collection instead of the central Leads Pool. User wanted all leads (from Meta, Google Sheets, and future sources) to go to one central pool for SLA automation and round-robin distribution.

**Solution:**
1. **Deleted Meta Ads Leads page** (`/marketing/leads`) - removed from routes and navigation
2. **Updated Meta webhook** to save leads directly to main `leads` collection:
   - Duplicate detection by phone/email
   - Automatic round-robin agent assignment
   - Notification to assigned agent
   - Lead source marked as `meta_ads`
3. **Updated Marketing sidebar** - replaced "Meta Ads Leads" with "Lead Connectors"
4. **All incoming leads now go to Leads Pool** at `/leads/pool` for central management

**Files Modified:**
- `/app/frontend/src/App.js` - Updated routes
- `/app/frontend/src/components/Layout.jsx` - Updated sidebar navigation
- `/app/backend/server.py` - Modified `process_meta_webhook()` function
- Deleted `/app/frontend/src/pages/marketing/MarketingLeadsPage.jsx`

### Session Feb 28, 2026 - Marketing Module with Meta Ads Integration

#### P0: Marketing Module (COMPLETED)
**Problem:** User needed to integrate multiple Meta (Facebook) Ads accounts to track campaign performance and receive leads directly in the CRM.

**Solution:**
Built a comprehensive Marketing module with Meta Ads API integration:

**Backend Implementation:**
- Created Meta Ads Service (`/app/backend/meta_ads_service.py`) with full API client for:
  - OAuth2 flow for account connection
  - Campaign retrieval with insights
  - Lead forms and leads fetching
  - Webhook signature verification
- Added 15+ new API endpoints in `server.py` for marketing operations
- Database collections: `meta_ad_accounts`, `meta_campaigns`, `meta_leads`, `meta_oauth_states`

**Key API Endpoints:**
- `GET /api/marketing/config` - Configuration status (meta_configured, webhook_configured, webhook_url)
- `GET /api/marketing/accounts` - List connected Meta ad accounts
- `POST /api/marketing/oauth/start` - Initiate Meta OAuth flow
- `GET /api/marketing/oauth/callback` - Handle OAuth callback, exchange tokens
- `DELETE /api/marketing/accounts/{id}` - Disconnect account
- `POST /api/marketing/accounts/{id}/sync` - Sync campaigns and insights
- `GET /api/marketing/campaigns` - List campaigns with insights
- `GET /api/marketing/campaigns/{id}/insights` - Get campaign metrics
- `GET /api/marketing/dashboard` - Aggregated marketing metrics
- `GET /api/marketing/leads` - List Meta leads (paginated)
- `POST /api/marketing/leads/{id}/import` - Import lead to CRM
- `POST /api/marketing/leads/import-all` - Bulk import all leads
- `GET /api/marketing/webhook` - Webhook verification (hub_mode, hub_challenge, hub_verify_token)
- `POST /api/marketing/webhook` - Receive real-time lead data

**Frontend Implementation:**
- Created Marketing section in homepage (pink megaphone icon)
- Three new pages:
  1. **Analytics Dashboard** (`/marketing/dashboard`):
     - Summary metrics: Total Spend, Total Leads, CPL, Impressions, Clicks, CTR
     - Additional row: CPM, CPC, Reach, Frequency
     - Campaign Performance table with per-campaign metrics
     - Account and date preset filters
  2. **Settings** (`/marketing/settings`):
     - Configuration status (Meta API, Webhook)
     - Connected Ad Accounts table with sync/disconnect actions
     - Setup instructions when Meta not configured
     - Webhook URL display with copy button
  3. **Meta Ads Leads** (`/marketing/leads`):
     - Paginated leads table
     - Account and sync status filters
     - Individual and bulk import to CRM
     - Lead details modal

**Environment Variables Added:**
```
META_APP_ID=""
META_APP_SECRET=""
META_WEBHOOK_VERIFY_TOKEN="clt_synapse_meta_webhook_2024"
```

**Webhook URL:** `https://hr-sync-dashboard.preview.emergentagent.com/api/marketing/webhook`

**Test Results:** Backend 100% (12/12 passed), Frontend 100% (All features working)

**Note:** Meta API credentials (META_APP_ID, META_APP_SECRET) are NOT configured - OAuth flow requires user to create Meta Developer App and add credentials. Once added, the full integration will work automatically.

### Session Feb 27, 2026 (Continued) - SSHR Module & HR Enhancements

#### P0: SSHR (Self-Service HR) as Separate Module (COMPLETED)
**Problem:** ESS was embedded in the Operations Dashboard. User wanted it as a separate, dedicated module accessible from the homepage.

**Solution:**
- Created new "My Self-Service" module with teal color icon on homepage
- Added dedicated SSHR page at `/sshr` with full ESS functionality
- Created My Payslips page at `/sshr/payslips` for employees to view salary history
- Removed ESS tabs from Operations Dashboard (now standalone)

**Key Features:**
- SSHR Dashboard with:
  - Quick stats (Days Present, Hours Worked, Annual Leave Left, Pending Requests)
  - Tabs: Overview, Attendance, Leaves, Requests
  - Widgets: Leave Balance, Weekly Attendance, Pending Requests, My Assets, Recent Requests
  - Apply Leave and Regularization buttons
- My Payslips page with:
  - Year selector
  - Summary cards (Total Earned, Payslips Available, Latest Payslip)
  - Detailed payslip table with view/download actions
  - Payslip detail modal showing earnings, deductions, net salary breakdown

#### P0: Company Documents Management (COMPLETED)
**Problem:** No central repository for tracking company licenses, certificates with expiry dates and reminders.

**Solution:**
- Created Company Documents page at `/hr/documents` in HR module
- Full CRUD operations for document management
- Expiry tracking with visual status indicators

**Key Features:**
- Document types: Trade License, Establishment Card, Immigration Card, Chamber Certificate, Tax Registration, Insurance, Lease Agreement, MOA/AOA, Power of Attorney, Bank Guarantee, Contracts, Other
- Status indicators: Valid (green), Expiring Soon (amber), Expired (red), No Expiry (gray)
- Stats dashboard: Total Documents, Expired, Expiring Soon, Valid counts
- Search and filter by type/status
- Configurable reminder days before expiry
- Days remaining/overdue display

**Backend Endpoints:**
- `GET /api/hr/company-documents` - List all documents
- `POST /api/hr/company-documents` - Create document
- `PUT /api/hr/company-documents/{id}` - Update document
- `DELETE /api/hr/company-documents/{id}` - Delete document
- `GET /api/hr/company-documents/expiring` - Get expiring/expired documents

#### P0: HR Approval Queue (COMPLETED)
**Problem:** HR/Managers needed a dedicated queue to review and approve leave and regularization requests.

**Solution:**
- Created HR Approval Queue page at `/hr/approvals`
- Separate tabs for Leave Requests and Regularization
- Detailed request cards with employee info, dates, reason, approval chain

**Key Features:**
- Stats: Pending Leave Requests, Pending Regularization, Your Role
- Leave request cards showing: Employee name, Leave type, Date range, Days, Reason, Document attachment status
- Regularization cards showing: Original vs Requested times, Date, Reason
- Approval chain visualization (Manager → HR → CEO with status indicators)
- Approve/Reject buttons with optional comments
- Real-time refresh

**Email Notifications:** SKIPPED (User will implement SMTP later)

**Test Results:** Backend 100% (11/11 passed), Frontend 100% (All features working)

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
- `/app/test_reports/iteration_26.json` - Marketing Module with Meta Ads Integration (Backend 100%, Frontend 100%)
- `/app/test_reports/iteration_30.json` - P0 Finance ObjectId Fix & BioCloud Sync Improvements (Backend 100% - 17/17, Frontend 100%)

## New Admin Features
- **Admin Settings Page**: `/admin-settings` (Super Admin only)
  - Data Reset: One-click clear all test data
  - Feature Flags: Toggle features per environment
  - Environment Info: Shows current environment and database
- **Finance Permissions**: Granular View/Edit/Delete per module in User Management

## Future/Backlog Tasks
- Course and Commission Configuration (awaiting user's course details and commission rates)
- Refactor `server.py` into modular route files (urgent tech debt)
- Google Ads API integration (extend Marketing module)
- Payslip generation logic (placeholder exists at `/sshr/payslips`)
- Connect Mentor Dashboard leaderboard to live data
- Clean up unused `downloadHelper.js` utility
- WhatsApp/SMS notifications
- Self-hosting package (Docker, PostgreSQL migration)
- Mobile app
- AI-powered lead scoring
- Direct ZKTeco biometric device API integration (if network access available)

