# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Latest Updates (March 13, 2026)

### Completed: Access Control Unification
- **Removed Module Access tab** from Role Management — no more contradiction with Access Control
- **Roles now dynamically populate** Access Control dropdown (custom roles from Role Management appear automatically)
- **Access Control is the single source of truth** — sidebar navigation uses `canAccess(path)` from the permission system
- **All pages added to Access Control** — including Company Documents, HR Approval Queue, SSHR paths

### Completed: CS Upgrade Pricing & Commission System
- Upgrade flow: Pricing modal → Confirm + Payment → Finance verification → Re-activation
- Commission auto-calculation per price tier (agent 75-350 AED, CS head 30/60 AED)
- Student Code field on kanban cards and detail modal

### Completed: Sales Dashboard Overhaul + UI/UX
- Date filters, team revenue drill-down, month comparison chart
- All modals scrollable globally, improved color contrast

---

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB

## Permission System Architecture
- `PermissionProvider` in api.js loads role permissions from `/api/roles/{role}/permissions`
- Falls back to `getDefaultPermissions(role)` if no saved permissions
- `canAccess(path)` → checks PATH_TO_SUBPAGE → SUBPAGE_TO_MODULE → module permissions
- Layout.jsx sidebar uses `canAccess()` to show/hide sections and items
- Super admin always has full access

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
