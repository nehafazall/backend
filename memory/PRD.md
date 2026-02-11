# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse (formerly CLT Academy) that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Features (February 2026)

### Finance Module Restructure (COMPLETED - Feb 11)
- **Entity Selection**: Two entities - CLT Academy (Active) and MILES (Under Development)
- **Left Sidebar Navigation**: Organized into Overview, Accounting, and Commissions sections
- **Add/Edit Accounts**: Full CRUD functionality for Chart of Accounts
- **Commission Engine**: Sales commission tracking with auto-calculation
- **Commission Settlements**: Pay out agent commissions with history

### Finance & Accounting Module - Phase 1 (COMPLETED)
A comprehensive CFO-grade double-entry accounting system with the following features:

#### CFO Dashboard (`/finance`)
- **KPI Cards**: Total Cash Position, Pending Receivables, Today's Revenue, MTD Revenue, MTD Provider Fees, 7-Day Forecast
- **"Where Money Lies"**: Live account balances for all bank accounts, wallets, cash
- **Provider Receivables**: Tabby, Tamara, Network (card) receivables panel
- **Alerts Panel**: Shows overdue settlements, low balance warnings

#### Chart of Accounts
- 22 pre-seeded accounts following standard accounting structure:
  - **Assets (1xxx)**: Banks (ADCB, ADIB, Mashreq, Indian Bank), USDT Wallet, Cash, Receivables (Tabby, Tamara, Network)
  - **Equity (3xxx)**: Owner Equity
  - **Income (4xxx)**: Course Revenue, Renewal Revenue  
  - **Expenses (5xxx)**: Salaries, Marketing, Bank Fees, etc.

#### Double-Entry Journal System
- Create manual journal entries with balanced debit/credit validation
- Journal workflow: **Draft → Submitted → Approved → LOCKED**
- Source tracking: Manual, Sales, Settlement, Expense, Transfer
- Finance audit logging for all operations

#### Sales Integration (AUTOMATIC)
- When a lead is enrolled, the system automatically creates a journal entry:
  - For BNPL (Tabby/Tamara): DR Receivable, CR Revenue
  - For Bank/Card/Cash: DR Bank, CR Revenue
- No manual entry needed for sales

#### Expense Module
- Record expenses with vendor, category, amount
- Automatic journal posting (DR Expense, CR Bank/Cash)
- Status tracking: Draft → Approved

#### Transfer Module
- Inter-account transfers (Bank to Bank, Bank to Cash, etc.)
- Automatic journal posting (DR Target, CR Source)
- Status tracking: Draft → Approved

#### Settlement Module (Ready for Phase 2)
- Settlement batches for Tabby, Tamara, Network
- Provider-specific fee rules configured
- Expected settlement date calculation

#### API Endpoints (`/api/accounting/`)
- `GET/POST /accounts` - Chart of Accounts CRUD
- `POST /accounts/seed` - Seed default accounts
- `GET/POST /journal-entries` - Journal entry CRUD
- `POST /journal-entries/{id}/submit` - Submit for approval
- `POST /journal-entries/{id}/approve` - Approve and lock
- `GET/POST /expenses` - Expense recording
- `GET/POST /transfers` - Account transfers
- `GET /settlements` - Settlement batches
- `GET /dashboard` - CFO dashboard data
- `GET /config` - Finance configuration
- `GET /audit-logs` - Finance audit trail

#### Technical Details
- Backend: `/app/backend/accounting_engine.py` + `server.py`
- Frontend: `/app/frontend/src/pages/FinanceDashboardPage.jsx`
- Components: `/app/frontend/src/components/finance/` (Cards, Tabs, Modals, DashboardContent)
- Database collections: `accounts`, `journal_entries`, `journal_lines`, `expenses`, `transfers`, `settlements`, `finance_audit_log`, `finance_config`

---

## Previous Features (December 2025)

### Lead Form Enhancements (COMPLETED)
- **Phone Country Auto-Detection**: Automatically detects country from phone number prefix (60+ countries supported)
  - +971 → UAE, +91 → India, +966 → Saudi Arabia, etc.
  - Utility: `/app/frontend/src/lib/phoneCountry.js`
- **Country Dropdown**: Pre-filled based on phone detection, 60+ countries available
- **Lead Source Dropdown**: Facebook, Instagram, Google Ads, Website, Referral, Walk-in, Cold Call, Other
- **Course of Interest**: Removed from form (marked as not important)

### Kanban Drag & Drop (COMPLETED)
- **Sales CRM**: Drag leads between stage columns (New Lead, No Answer, Call Back, Warm Lead, Hot Lead, In Progress, Rejected, Enrolled)
- Uses @dnd-kit library for smooth drag-and-drop
- Visual feedback with drag handles and drop zone indicators
- Stage updates via API when dropped in different column

### User Management Dialog Fix (COMPLETED)
- Fixed z-index issue where dropdowns appeared below dialog
- Role, Department, Region dropdowns now properly layered above dialog

### Advanced Role Management (COMPLETED)
- **Role Management Page**: `/roles` - Accessible to super_admin only
- **Module Permissions**: Set access level (None/View/Edit/Full) per module
- **Data Visibility**: Own Data Only / Team Data / All Data
- **Custom Roles**: Create, edit, delete custom roles
- **System Roles**: 10 default roles (cannot be deleted, but can be customized)
- **Backend API**: `/api/roles` - GET, POST, PUT, DELETE

### 3CX Phone System Integration (COMPLETED)
Full click-to-call and call logging integration with 3CX phone system.

#### Backend API Endpoints
- `GET /api/3cx/template` - Returns CRM integration XML template for 3CX server configuration
- `GET /api/3cx/contact-lookup?phone_number={phone}` - Lookup contact by phone number
- `GET /api/3cx/contact-search?search_text={text}` - Search contacts by name/phone/email
- `POST /api/3cx/contact-create` - Create lead from unknown inbound caller
- `POST /api/3cx/call-journal` - Log call details when calls complete
- `GET /api/3cx/call-history/{contact_id}` - Get call history for a contact
- `GET /api/3cx/recent-calls` - Get recent calls across all contacts
- `POST /api/3cx/click-to-call` - Log click-to-call events from CRM

#### Frontend Components
- **ClickToCall Component** (`/app/frontend/src/components/ClickToCall.jsx`)
  - Click-to-call button with phone icon
  - Tooltip showing phone number
  - Copy phone number functionality
  - Triggers `tel:` protocol for dialing
  
- **CallHistory Component** (`/app/frontend/src/components/ClickToCall.jsx`)
  - Shows recent call history for a contact
  - Displays call direction (inbound/outbound)
  - Shows call duration and timestamp
  - Link to call recordings when available

#### CRM Pages Integration
- **Sales CRM Page** - Click-to-call on lead cards and detail modal with 3CX Call Center section
- **Customer Service Page** - Click-to-call on student cards and detail modal with 3CX Call Center section
- **Mentor CRM Page** - Click-to-call on student cards and detail modal with 3CX Call Center section

#### Settings Page - 3CX Configuration
- Available to super_admin and admin users
- **Setup Instructions** for 3CX server configuration
- **Fetch Template** button to generate XML template
- **Download XML** button to save template file
- **Open 3CX Console** link to 3CX management interface
- **API Endpoints** list with copy functionality
- **XML Preview** with full template display

### Post-Login Animation (Completed - Professional Trading Theme)
After successful login, users see a 13-second professional branded animation featuring the official CLT Academy logo with trading chart elements.

## Previous Features (Login & Home Page Redesign)

### Redesigned Login Page
- **Split Layout**: Logo on left, login form on right (desktop)
- **CLT Logo**: Large inline SVG logo with transparent background
  - Dark mode: White text, cyan accents
  - Light mode: Black text, red accents
- **Trading Chart Background**: SVG trading chart graphics at 15-20% opacity
- **System Status**: "System Online" indicator with green pulse
- **Login Form**: Glass-morphism card with email, password, eye toggle
- **Demo Credentials**: Displayed at bottom for easy access
- **Mobile Responsive**: Logo moves to top on mobile devices

### Logo Animation After Login
- **Animated Rings**: Three expanding circular borders
- **Logo Reveal**: Scale and fade-in animation
- **Text Animation**: "CLT Academy" and "Loading your workspace..." with staggered delays
- **Loading Bar**: Progress indicator fills over 800ms
- **Floating Particles**: 15 animated particles in background
- **Duration**: ~2.8 seconds before redirecting to home

### Enhanced Home Page
- **CLT Logo Centered**: Large SVG logo (h-40 to h-56 responsive)
  - Transparent background, adapts to theme
- **Trading Chart Background**: SVG graphics at 20% opacity
- **Welcome Message**: "Welcome, {firstName}!" personalized greeting
- **Module Icons**: 6 colored icons in grid layout

### Theme-Aware CLT Logo Component
New component: `/app/frontend/src/components/CLTLogo.jsx`
- Inline SVG for full control
- `isDark` prop controls color scheme
- Dark mode: White (#ffffff) main, Cyan (#00ffff) accents
- Light mode: Black (#000000) main, Red (#ff0000) accents
- Transparent background always

## Previous Features (Launcher Navigation)

### Launcher-Style Home Screen
After login, users see a centered icon launcher instead of sidebar:
- **6 Section Icons**: Sales (blue), Customer Service (green), Academics (orange), Operations (purple), Security (red), Finance (cyan)
- **Welcome Message**: "Welcome, {name}! Select a module to get started"
- **No Sidebar** on home page - clean, focused interface

### Focused Section Sidebar
When clicking a section icon:
- **Focused Sidebar** appears with only that section's navigation items
- **Home Button** always present at top to return to launcher
- **Section Header** shows icon + title (e.g., "Sales" with phone icon)
- **Settings** link at bottom
- **User Info** shows name + role badge

### Section Navigation Items
- **Sales**: Sales CRM, Sales Dashboard, Today's Follow-ups
- **Customer Service**: CS Dashboard, Customer Service
- **Academics**: Mentor CRM, Mentor Dashboard
- **Operations**: Dashboard, Leads Pool, Customer Master, Departments, Courses
- **Security**: Access Control, User Management
- **Finance**: Finance, Commission Engine

## Previous Features (Navigation & Bulk Import)

### Mentor Dashboard (NEW)
Located at `/mentor/dashboard` with metrics:
- Total Students assigned
- Students Connected vs Pending Connection
- Upgrades Helped
- Total Revenue brought in
- Total Withdrawn / Current Net
- Commission: Total / Received / Balance
- Student Pipeline by stage
- Recent Activities

### Bulk Import for Courses & Users
- **Courses Import**: Bulk upload courses via CSV
  - Required: name*, code*, base_price*, category*
  - Optional: description, is_active
- **Users Import**: Bulk upload users with auto-derived permissions
  - Required: email*, full_name*, role*, password*
  - Optional: department, phone, region, team_leader_email
  - Role-based access auto-derived from role field

## Previous Features (Reminders & Follow-ups)

### Reminder System
- **Set Reminder** option on lead/student cards in all CRM pages
- Works on: Sales CRM, Customer Service, Mentor CRM
- Users can set date, time, and optional note
- Reminders appear as badges on cards
- Quick-select options: Tomorrow, In 3 days, In 1 week

### Today's Follow-ups Page
- **Kanban board** showing follow-ups grouped by time slots:
  - Morning (Before 12 PM)
  - Afternoon (12 PM - 5 PM)
  - Evening (After 5 PM)
  - Unscheduled
- **Stats cards**: Total Today, Leads, Upgrades, Redeposits
- **Quick actions**: Call button, Complete button
- Accessible from sidebar navigation

### Environment Access Control
- **User-level access control** for Dev/Test environments
- Super Admin can grant access via User Management page
- "Env Access" column shows user's environment permissions
- Badges: Dev (blue), Test (amber), "Prod only" (default)

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

## Frontend Pages (19 total)
1. Login Page
2. Dashboard (under OPERATIONS)
3. Sales CRM (+ Import, + Set Reminder)
4. My Sales Dashboard
5. Today's Follow-ups
6. Leads Pool
7. Customer Master (+ Import)
8. Customer Service (+ Import, + Set Reminder)
9. CS Dashboard
10. Mentor CRM (+ Import, + Set Reminder)
11. **Mentor Dashboard** (NEW - metrics page)
12. Finance
13. Commission Engine
14. User Management (+ Import, + Env Access)
15. Departments
16. Courses (+ Import)
17. Access Control
18. Settings

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

### Mentor Dashboard
- `GET /api/mentor/dashboard` - Get mentor metrics (students, revenue, commission, upgrades, activities)

### Bulk Import
- `GET /api/import/templates/courses` - Get CSV template for courses
- `GET /api/import/templates/users` - Get CSV template for users
- `POST /api/import/courses` - Upload CSV to bulk import courses
- `POST /api/import/users` - Upload CSV to bulk import users

### Reminders
- `POST /api/leads/{lead_id}/reminder` - Set lead reminder
- `POST /api/leads/{lead_id}/reminder/complete` - Complete lead reminder
- `DELETE /api/leads/{lead_id}/reminder` - Delete lead reminder
- `POST /api/students/{student_id}/reminder` - Set student reminder (upgrade/redeposit/general)
- `POST /api/students/{student_id}/reminder/complete` - Complete student reminder
- `DELETE /api/students/{student_id}/reminder` - Delete student reminder
- `GET /api/followups/today` - Get today's follow-ups by time slots
- `GET /api/followups/upcoming?days=7` - Get upcoming follow-ups

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

### P0 - Completed
- [x] Navigation restructured into 6 collapsible sections
- [x] Mentor Dashboard with all requested metrics
- [x] Bulk Import for Courses with CSV template
- [x] Bulk Import for Users with auto-derived permissions
- [x] Set Reminder on CRM cards (Sales, CS, Mentor)
- [x] Today's Follow-ups Kanban page
- [x] Environment Access Control on User Management
- [x] SLA Rules implementation
- [x] Import/Export with templates for Leads, Customers, Students
- [x] Leads Pool & Customer Master
- [x] **Post-Login Animation** (5-6 second branded CLT animation)
- [x] **3CX Call Recording Placeholder** (in all CRM detail modals)
- [x] **Notification Enhancements** (December 2025)
  - Different alert sounds for leads vs general notifications
  - Settings toggle to enable/disable notification sounds
  - Test sound buttons in Settings page
  - Clickable notifications redirect to customer/lead pages
- [x] **Database Separation** (December 2025)
  - Same MongoDB server, different database names per environment
  - APP_ENV variable controls: clt_synapse_dev, clt_synapse_test, clt_synapse_prod
  - Backend logs current environment and database on startup
- [x] **Lead Form Enhancements** (December 2025)
  - Phone country auto-detection (60+ countries)
  - Lead source dropdown: Facebook, Instagram, Google Ads, Website, Referral, Walk-in, Cold Call, Other
- [x] **Kanban Drag & Drop** (December 2025)
  - Drag-and-drop in Sales CRM using @dnd-kit
  - Visual feedback with drag handles and drop zones
- [x] **User Management Dialog Z-Index Fix** (December 2025)
  - Dropdowns now properly layered above dialog
- [x] **Advanced Role Management** (December 2025)
  - Create/edit custom roles with module permissions
  - Data visibility settings (own/team/all)
  - 10 system roles + unlimited custom roles

### P1 - High Priority
- [ ] 3CX Integration (actual API integration - placeholder UI complete)
- [ ] Code Portability Package (Docker, PostgreSQL migration)

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
- **Database Configuration:**
  - Development: `clt_synapse_dev`
  - Testing: `clt_synapse_test`
  - Production: `clt_synapse_prod`
  - Set via `APP_ENV` in `/app/backend/.env`

## Files Reference
- Backend: `/app/backend/server.py`
- Frontend Routes: `/app/frontend/src/App.js`
- Layout/Navigation: `/app/frontend/src/components/Layout.jsx`
- Import Component: `/app/frontend/src/components/ImportButton.jsx`
- Environment Component: `/app/frontend/src/components/EnvironmentSwitcher.jsx`
- Reminder Modal: `/app/frontend/src/components/ReminderModal.jsx`
- Today's Follow-ups: `/app/frontend/src/pages/FollowupsPage.jsx`
- Mentor Dashboard: `/app/frontend/src/pages/MentorDashboardPage.jsx`
- User Management: `/app/frontend/src/pages/UsersPage.jsx`
- Courses: `/app/frontend/src/pages/CoursesPage.jsx`
- Settings Page: `/app/frontend/src/pages/SettingsPage.jsx`

## Test Reports
- Latest: `/app/test_reports/iteration_10.json`
- Previous: `/app/test_reports/iteration_9.json`
- CLT Logo Component: `/app/frontend/src/components/CLTLogo.jsx`
- CLT Animation Component: `/app/frontend/src/components/CLTAnimation.jsx`
- Welcome Page: `/app/frontend/src/pages/WelcomePage.jsx`
