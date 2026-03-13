# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: Dual-Role Views for CS Head, Academic Master, CEO
- **CS Page**: "My Students" / "Team Overview" toggle for cs_head, admin, super_admin
  - My Students: filters by cs_agent_id (only their assigned students)
  - Team Overview: shows all 902+ students with agent summary badges
- **Mentor Page**: Same toggle for academic_master, admin, super_admin
  - My Students: filters by mentor_id (their assigned students)
  - Team Overview: shows all 899+ students with mentor summary badges
- **CEO Dashboard**: "Pending Approvals" widget replaces Recent Transactions for super_admin/admin
  - Shows: Leave Requests, Time Regularization, Payroll Processing, Finance Verifications, Expiring Documents
  - Each item clickable → navigates to relevant page

### Previously Completed
- CS Upgrade Pricing & Commission System (3 paths, 9 price tiers, auto commissions)
- Access Control Unification (roles from Role Management populate Access Control dropdown)
- Sales Dashboard Overhaul (date filters, team revenue drill-down, month comparison)
- All modals scrollable globally, improved color contrast
- Salary payout method field, last working day for resigned/terminated

---

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Permission System
- `canAccess(path)` from PermissionProvider is the single authority for sidebar visibility
- Super admin always has full access
- Layout.jsx uses permission system (not hardcoded role arrays)

---

## Backlog
### P1 - Upcoming
- Sales Commission Configuration
- User Verification for Google Sheets connector

### P2 - Future
- Refactor server.py into domain-specific routes
- Payslip Generation
- Google Ads API Integration
- Fix Babel Plugin RangeError

---

## Credentials
- **Super Admin:** aqib@clt-academy.com / @Aqib1234
