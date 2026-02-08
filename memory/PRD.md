# CLT Academy ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Academy that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform with role-based access, end-to-end automation, auditability, and real-time dashboards.

## Latest Features (Login Animation & 3CX Placeholder - December 2025)

### Post-Login Animation (Completed)
After successful login, users see a 5-6 second branded animation:
- **Route**: `/welcome` - dedicated page for animation
- **Phase 1 (0-1.5s)**: Clock animation (C) - clock face with rotating hands
- **Phase 2 (1.5-2.7s)**: Graduate animation (L) - graduate figure with cap and diploma
- **Phase 3 (2.7-3.9s)**: Trading candles animation (T) - candlestick chart
- **Phase 4 (3.9-4.8s)**: Letters combine into CLT logo
- **Phase 5 (4.8-5.5s)**: "ACADEMY" text appears below
- **Phase 6 (5.5-6.2s)**: Fade out and redirect to `/home`
- **Loading Bar**: Progress indicator with status text (Initializing... → Loading workspace... → Welcome!)
- **Background**: Grid pattern with floating particles

### 3CX Call Recording Placeholder (Completed)
Added to all CRM detail modals for future integration:
- **Location**: Sales CRM lead detail, CS student detail, Mentor CRM student detail
- **UI Elements**:
  - Phone icon with "3CX Call Recording" label
  - "Coming Soon" badge
  - Disabled input field with placeholder text
  - Explanatory text about future integration
- **Field**: `call_recording_url` (will be populated when 3CX integration is complete)
- **Test ID**: `data-testid="call-recording-url"`

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

## Test Reports
- Latest: `/app/test_reports/iteration_7.json`
- CLT Logo Component: `/app/frontend/src/components/CLTLogo.jsx`
