# CLT Synapse ERP - Complete Workflow Guide

## Overview
CLT Synapse is an integrated ERP system managing the complete lifecycle from lead acquisition to student mentorship, with full financial tracking and HR management.

---

## PHASE 1: FOUNDATION SETUP (One-Time)

### Step 1: Create Teams
**Location:** Settings → Teams
```
Teams to create:
- Alpha Team (Sales)
- Beta Team (Sales)
- CS Team
- Mentor Team
- Finance Team
```

### Step 2: Import Employees
**Location:** HR → Employee Master → Import
```
CSV Fields:
employee_id*, full_name*, gender*, company_email*, mobile_number*, 
department*, designation*, role*, employment_type*, joining_date*, 
date_of_birth, nationality, personal_email, work_location, 
probation_days, basic_salary, reporting_manager_email, team_name

What Happens:
✓ Employee record created
✓ User account auto-created (email = company_email)
✓ Password: FirstName@123
✓ Welcome email sent with credentials
```

### Step 3: Create Courses
**Location:** Settings → Courses
```
Example Courses:
- Starter Trading (5,000 AED)
- Basic Trading (10,000 AED)
- Intermediate Trading (15,000 AED)
- Advanced Trading (25,000 AED)
- Mastery Trading (50,000 AED)
```

---

## PHASE 2: LEAD MANAGEMENT (Sales CRM)

### Flow: Lead → Enrollment

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEAD SOURCES                              │
│  Meta Ads → Google Ads → Website → Referral → Walk-in           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     NEW LEAD CREATED                             │
│  • Auto-assigned to Sales Agent (Round Robin)                    │
│  • SLA Timer starts (48 hours for first contact)                 │
│  • Lead appears in Sales CRM Kanban                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SALES KANBAN STAGES                           │
│                                                                  │
│  New → Contacted → Qualified → Proposal → Negotiation → Enrolled │
│                                                    ↓             │
│                                              PAYMENT COLLECTED   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ENROLLMENT TRIGGERS                            │
│  • Finance Verification created                                  │
│  • Student record created in CS                                  │
│  • Commission calculated for Sales Agent                         │
│  • Revenue recorded                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Historical Data Import
**Location:** Sales → Import Historical Students
```
For importing already-enrolled students:
- Creates lead as "Enrolled"
- Creates student as "Activated" in CS
- Assigns to specified Sales Agent, CS Agent, Mentor
- Records initial enrollment amount for LTV
```

---

## PHASE 3: CUSTOMER SERVICE (CS CRM)

### Flow: New Student → Activated → Upgraded

```
┌─────────────────────────────────────────────────────────────────┐
│                   CS KANBAN STAGES                               │
│                                                                  │
│  New Student → Activated → Satisfactory Call → Pitched Upgrade  │
│       ↓              ↓              ↓               ↓           │
│  (15 min SLA)   (Onboarding)   (Quality Check)  (Upsell)        │
│                                                     ↓           │
│                              In Progress → Interested → Upgraded │
│                                                          ↓      │
│                                              (Back to New Student│
│                                               with upgrade flag) │
└─────────────────────────────────────────────────────────────────┘
```

### CS Agent Responsibilities:
1. **Activation Call** (within 15 minutes of enrollment)
2. **Onboarding Questionnaire** - Collect student details
3. **Assign Mentor** - Based on course/availability
4. **Monthly Satisfaction Calls**
5. **Pitch Upgrades** - Track in CS Upgrades import

### Upgrade Flow:
```
Student in "Activated" → CS Agent pitches upgrade → 
Student agrees → Record in CS Upgrades Import →
Student moves to "New Student" (with upgrade flag) →
Re-activation with preserved data →
Only MT5 accounts editable →
Color-coded card shows course level
```

### CS Upgrades Import
**Location:** CS → Import Upgrades
```
Fields: month*, date*, cs_employee_id*, student_email*, upgrade_amount*, upgrade_to_course
- Tracks upgrade revenue per CS agent
- Updates student LTV
- Maintains upgrade history
```

---

## PHASE 4: MENTOR MANAGEMENT (Academics CRM)

### Flow: Student Assignment → Redeposits → Withdrawals

```
┌─────────────────────────────────────────────────────────────────┐
│                  MENTOR KANBAN STAGES                            │
│                                                                  │
│  New Student → Discussion Started → Pitched Redeposit →         │
│       ↓               ↓                    ↓                    │
│  (Assigned)    (Building rapport)    (Recommending deposit)     │
│                                            ↓                    │
│                              Interested → Closed (Deposit)       │
│                                   ↓              ↓              │
│                              (Considering)  (Redeposit made)     │
│                                              ↓                  │
│                                    Back to Discussion Started    │
│                                    (for next redeposit pitch)    │
└─────────────────────────────────────────────────────────────────┘
```

### Monthly Revenue Dashboard (Top of Kanban):
```
┌─────────────────────────────────────────────────────────────────┐
│  Monthly Redeposits: AED 50,000  │  Withdrawals: AED 10,000     │
│  Net Active: AED 40,000          │  Students Pitched: 25         │
└─────────────────────────────────────────────────────────────────┘
(Resets at beginning of each month)
```

### Mentor Imports:
1. **Redeposits Import:** month, date, mentor_employee_id, student_email, redeposit_amount
2. **Withdrawals Import:** date, mentor_employee_id, student_email, withdrawal_amount, notes

### Withdrawal Tracking (Finance/Admin):
- Financier adds daily withdrawal entries
- Backdated entries allowed
- Net Active = Redeposits - Withdrawals
- Used for commission calculation

---

## PHASE 5: FINANCE MANAGEMENT

### Revenue Flow:
```
┌─────────────────────────────────────────────────────────────────┐
│                      MONEY IN (Credits)                          │
│                                                                  │
│  1. New Enrollments (Sales)                                      │
│     └→ Finance Verification → Approved → CLT Receivables        │
│                                                                  │
│  2. Upgrades (CS)                                                │
│     └→ CS Upgrades Import → Student LTV Updated                 │
│                                                                  │
│  3. Redeposits (Mentors)                                         │
│     └→ Mentor Redeposits Import → Monthly Tracking              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MONEY OUT (Debits)                          │
│                                                                  │
│  1. Payables (Vendors, Suppliers)                                │
│     └→ CLT Payables → Two-step Approval → Settlement            │
│                                                                  │
│  2. Expenses (Operational)                                       │
│     └→ Expense Records → Budget Tracking                        │
│                                                                  │
│  3. Salaries (HR)                                                │
│     └→ Payroll Processing → Bank Transfer                       │
│                                                                  │
│  4. Commissions (Sales/CS/Mentors)                               │
│     └→ Commission Settlements → Paid                            │
│                                                                  │
│  5. Withdrawals (Student)                                        │
│     └→ Mentor Withdrawals Import → Net Active Reduced           │
└─────────────────────────────────────────────────────────────────┘
```

### Finance Verification Flow:
```
Enrollment Payment → Finance Verification Created →
Finance Team Reviews → Approved/Rejected →
If Approved: CLT Receivable Created →
Treasury Updated → Dashboard Reflects
```

### Unified Transactions View:
**Location:** Finance → Transactions
- Shows all money movements
- Filter by type (In/Out), date, bank account
- Export to CSV

### Daily Finance Report (Auto-Email):
- Sent daily at midnight
- Summary of: Sales, Treasury Inflows/Outflows, Expenses
- Recipients: Finance team, Admin

---

## PHASE 6: HR MANAGEMENT

### Employee Lifecycle:
```
┌─────────────────────────────────────────────────────────────────┐
│                    EMPLOYEE LIFECYCLE                            │
│                                                                  │
│  Import/Add Employee → Active → [Performance Reviews] →         │
│         ↓                              ↓                        │
│  User Account Created          Promotion/Transfer               │
│  Welcome Email Sent                    ↓                        │
│         ↓                    Resignation/Termination            │
│  Attendance Tracking                   ↓                        │
│  Leave Management            30-day Access Grace Period         │
│  Payroll Processing                    ↓                        │
│         ↓                    Access Auto-Disabled               │
│  Monthly Payslip             (or Manual Immediate Disable)      │
└─────────────────────────────────────────────────────────────────┘
```

### Key HR Features:
1. **Employee Master** - Central employee database
2. **Attendance** - BioCloud integration for biometric sync
3. **Leave Management** - Request/Approval workflow
4. **Payroll** - Salary processing
5. **Document Tracking** - Visa, Emirates ID, Passport expiry alerts

---

## PHASE 7: LTV (LIFETIME VALUE) TRACKING

### Per-Student LTV Calculation:
```
LTV = First Enrollment + Total Upgrades + Total Redeposits - Total Withdrawals

Example:
- First Enrollment: 15,000 AED
- Upgrade to Advanced: +10,000 AED
- Redeposit 1: +5,000 AED
- Redeposit 2: +3,000 AED
- Withdrawal: -2,000 AED
─────────────────────────────────
Net LTV: 31,000 AED
```

### LTV API:
`GET /api/student/{student_id}/ltv`
Returns complete breakdown with all transactions

---

## PHASE 8: REPORTING & DASHBOARDS

### Bird's Eye View Dashboard (Home):
- Company-wide metrics
- Sales performance
- Finance summary
- HR overview
- Clickable widgets to drill down

### Department-Specific Dashboards:
1. **Sales Dashboard** - Pipeline, conversions, team performance
2. **CS Dashboard** - Activation rates, satisfaction scores
3. **Mentor Dashboard** - Redeposits, Net Active, Leaderboard
4. **Finance Dashboard** - Cash flow, P&L, Treasury
5. **HR Dashboard** - Headcount, attendance, leave balance

---

## NOTIFICATIONS & ALERTS

### Automatic Notifications:
1. **SLA Breach** - Email + In-app when lead not contacted in 48hrs
2. **Document Expiry** - 90 days before visa/passport expiry
3. **Leave Requests** - Manager notified for approval
4. **Finance Approvals** - Two-step approval notifications

### Daily Reports:
- Finance Summary (midnight)
- SLA Status Report

---

## SUGGESTED ADDITIONAL FEATURES

### High Priority (P0):
1. **Commission Calculator**
   - Auto-calculate based on sales, upgrades, redeposits
   - Multi-tier commission structure
   - Monthly settlement workflow

2. **Payslip Generation**
   - Generate PDF payslips
   - Include salary breakdown, deductions, allowances
   - Email to employees

3. **WhatsApp Integration**
   - Send notifications via WhatsApp
   - Lead follow-up reminders
   - Payment confirmations

### Medium Priority (P1):
4. **Mobile App / PWA**
   - Sales agents can update leads on-the-go
   - Mentors can track students
   - Push notifications

5. **Advanced Reporting**
   - Custom report builder
   - Scheduled report emails
   - Export to Excel/PDF

6. **Goal Setting & Tracking**
   - Monthly/Quarterly targets per role
   - Progress tracking
   - Gamification (badges, leaderboards)

7. **Customer Portal**
   - Students can view their profile
   - Track learning progress
   - Request support

### Lower Priority (P2):
8. **AI-Powered Insights**
   - Predict churn risk
   - Suggest best time to pitch upgrades
   - Lead scoring

9. **Calendar Integration**
   - Google Calendar sync
   - Meeting scheduling
   - Reminder notifications

10. **Document Management**
    - Upload contracts, agreements
    - E-signature integration
    - Version control

11. **Audit Trail**
    - Complete history of all changes
    - Who changed what, when
    - Compliance reporting

12. **Multi-Entity Support**
    - Separate books for CLT Academy, Miles, etc.
    - Consolidated reporting
    - Inter-company transactions

---

## IMPORT ORDER CHECKLIST

For setting up historical data:

```
□ Step 1: Create Teams (manually)
□ Step 2: Import Employees (HR → Employee Master → Import)
         → Users auto-created with roles
         
□ Step 3: Create Courses (Settings → Courses)

□ Step 4: Import Comprehensive Students (Sales → Import Historical Students)
         → Leads created as Enrolled
         → Students created as Activated
         → Sales Agent, CS Agent, Mentor assigned
         → Initial enrollment amount recorded

□ Step 5: Import CS Upgrades (CS → Import Upgrades)
         → Upgrade transactions recorded
         → Student LTV updated

□ Step 6: Import Mentor Redeposits (Mentor → Import Redeposits)
         → Redeposit transactions recorded
         → Monthly totals calculated

□ Step 7: Import Mentor Withdrawals (Mentor → Import Withdrawals)
         → Withdrawal transactions recorded
         → Net Active calculated
```

---

## ROLE-BASED ACCESS SUMMARY

| Role | Access |
|------|--------|
| Super Admin | Everything |
| Admin | Everything except some system settings |
| HR | HR module, Employee data |
| Finance | Finance module, Verifications, Treasury |
| Sales Manager | Sales CRM, Team performance |
| Team Leader | Sales CRM, Own team |
| Sales Agent | Sales CRM, Own leads |
| CS Head | CS CRM, All students |
| CS Agent | CS CRM, Assigned students |
| Academic Master | Mentor CRM, All students |
| Mentor | Mentor CRM, Assigned students |
| Operations | Operations module |
| Marketing | Marketing module, Lead sources |

---

## QUICK REFERENCE - API ENDPOINTS

### Imports:
- `POST /api/import/employees` - Employee bulk import
- `POST /api/import/comprehensive-students` - Historical students
- `POST /api/import/cs-upgrades` - CS upgrade transactions
- `POST /api/import/mentor-redeposits` - Mentor redeposits
- `POST /api/import/mentor-withdrawals` - Mentor withdrawals

### Templates:
- `GET /api/import/templates/{type}/download` - Download CSV template

### Key APIs:
- `GET /api/student/{id}/ltv` - Student lifetime value
- `GET /api/mentor/revenue-summary` - Monthly mentor revenue
- `PUT /api/hr/employees/{id}/terminate` - Terminate employee
- `PUT /api/hr/employees/{id}/toggle-access` - Enable/disable access

---

*Document Version: 1.0*
*Last Updated: March 2026*
