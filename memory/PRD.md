# CLT Synapse ERP — Product Requirements Document

## Original Problem Statement
Full-stack ERP system (React + FastAPI + MongoDB) for CLT Academy managing sales CRM, customer service, HR, finance, commissions, and operational workflows.

## Architecture
- **Frontend**: React (CRA + Craco) with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI monolith (`server.py` ~30K lines) + `biocloud_sync.py`
- **Database**: MongoDB Atlas (`clt_academy_erp`)
- **Integrations**: Google Sheets, Meta Ads, SMTP, 3CX, BioCloud, MetaTrader 5

## Implemented Features

### P0 Fixes (Mar 27, 2026)
- **Welcome Page**: Shows full name + designation (fetched from hr_employees)
- **Employee ID Editable**: employee_id field now updatable via EmployeeUpdate model for BioCloud sync alignment
- **COO Full Access**: `coo` role has identical permissions to `super_admin` (backend require_roles + check_permission, frontend ProtectedRoute + Layout sidebar)

### Task Management System (New — Mar 27, 2026)
- **Manager Task Assignment**: Managers create tasks with title, description, category, priority (low/medium/high/urgent), assignees, due date, recurring flag
- **13 Task Categories**: Marketing, Development, Design, Content, Admin, IT, Web Development, Video Editing, Script Writing, Quality Control, Sales, Customer Service, Other
- **Employee Task Logging**: Employees pick assigned tasks or add custom entries, log hours + notes per task
- **Progress Tracking**: Tasks move through Open → In Progress → Completed
- **Task Manager Page** (`/hr/tasks`): Full CRUD with stats, filters, priority badges
- **Enhanced Timesheet**: Integrates with assigned tasks, shows recent submissions

### IT & Asset Management (New — Mar 27, 2026)
- **IT Assets Page** (`/it/assets`): Track hardware, software, equipment
- **Asset Types**: Laptop, Desktop, Monitor, Phone, Printer, Server, Networking, Storage, Software License
- **Full CRUD**: Create, edit, delete assets with assignment tracking
- **Stats Dashboard**: Total, In Use, Available, Maintenance counts
- **Home Page Module**: Visible on welcome grid as "IT & Assets" tile

### Attendance & Regularization Enhancement (Mar 27, 2026)
- **Shift-based Display**: Regularization modal auto-fetches shift schedule (name, start/end times, grace period) when date is picked
- **Auto-populate Times**: Pre-fills punch-in/out from attendance record or shift defaults
- **API**: `GET /hr/my-attendance-for-date?date=YYYY-MM-DD` returns attendance + shift info

### Organization Map (Mar 27, 2026)
- Interactive org chart: CEO → Departments → Teams → Members
- 3 tabs: Org Chart, Approval Matrix (6 workflows), Statistics
- Search/filter across all departments

### Payroll System
- Attendance validation: soft warning when no attendance data
- Only processes active/probation employees
- Deductions only for explicit absent/half-day statuses
- Auto-deletes old batches on re-run

### Commission System
- Course + Addon decomposition
- TL commission from team sales (18K benchmark removed)
- Net Pay chart with correct salary from hr_employees

### Internal Chat System
- DM conversations + group chat with online/away/offline status

## Key Credentials
- CEO: aqib@clt-academy.com / @Aqib1234
- COO: Faizeen@clt-academy.com (role: coo)
- CS Head: falja@clt-academy.com / Falja@123
- Sales Executive: aleesha@clt-academy.com / Aleesha@123

## Prioritized Backlog

### P0 (Blocked)
- MT5 Web API: Awaiting broker whitelist

### P1
- Invoice Generation — Auto-generate PDF invoices
- WhatsApp Integration — Send templated messages

### P2
- Workflow Automation Engine
- Scheduled Email Reports
- Group chat channels (#sales-team, #cs-team)

### P3
- Refactor monolithic server.py (~30K lines)
- Special Periods frontend UI for attendance rules
- Document expiry tracking data entry (HR module)
