# CLT Synapse ERP - Product Requirements Document

## Original Problem Statement
Build a custom, modular ERP system for CLT Synapse that unifies Sales CRM, Customer Service CRM, Mentor CRM, Finance & Accounting, HR & Payroll, Asset Management, Marketing Operations, Training & Development, Task & Project Management into one single platform.

## Architecture
- Frontend: React 18 + Tailwind CSS + Shadcn/UI + Recharts
- Backend: FastAPI + Motor (async MongoDB) + Pydantic
- Database: MongoDB Atlas (clt_academy_erp on cluster0.rnswuch.mongodb.net)

## Latest Updates (March 16, 2026)

### Atlas DB Migration Complete
- Connected to user's MongoDB Atlas cluster
- Migrated 10,680 documents across 59 collections
- Cleared test data: mentor deposits/withdrawals, sales leads, CS data, students
- Kept: Users (86), Teams, Departments, HR Employees, Bank Accounts, Payment Gateways, SLA Rules, Courses

### Mentor Dashboard — Rebuilt with Dual View for Edwin
- **My Performance section**: Student overview, Revenue Overview (Deposits/Withdrawals/Net), Commission Breakdown, Bonus Progress, Student Pipeline
- **Team Overview section (Edwin only)**: Team Deposits/Withdrawals/Net, Mentor-wise Revenue chart, Leaderboard
- Edwin sees BOTH individual AND team data simultaneously on one page
- Regular mentors see only individual section + leaderboard
- Fixed Academics nav visibility for mentors (cleared stored permissions to use defaults)
- Added `master_of_academics` role to all permission checks

### Finance Withdrawals Page
- Dedicated page at `/finance/mentor-withdrawals` for financier role
- Student Deposits tab + Withdrawal History tab
- Record Withdrawal modal with amount, date, notes

### Commission & Bonus System
- 1% flat commission on deposits (AED)
- 1% net commission monthly (deposits - withdrawals)
- Edwin: 1.5% net (1% + 0.5% team override)
- Negative net carries forward — payout withheld
- Bonus slabs: $10K=10%, $20K=15%, $30K=17.5%, $40K=20%, $50K=25% of salary

## Test Credentials
- Super Admin: aqib@clt-academy.com / @Aqib1234
- Edwin (Master of Academics): edwin@clt-academy.com / Edwin@123
- Regular Mentor: ashwin@clt-academy.com / @Aqib1234
- Financier: finance@clt-academy.com / @Aqib1234
- CS Agent: della@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / @Aqib1234
- Sales Agent: aleesha@clt-academy.com / @Aqib1234
- Team Leader: mohammed@clt-academy.com / @Aqib1234

## Backlog
### P1
- User Verification for Google Sheets connector (17 agent sheets)
- Sales Commission Configuration

### P2
- Refactor server.py into domain-specific route files
- Course and Commission Configuration UI
- Payslip Generation
- Google Ads API Integration
- Resolve Babel Plugin RangeError
