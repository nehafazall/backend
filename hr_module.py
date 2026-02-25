"""
CLT Synapse ERP - HR Management Module
Enterprise-grade HR system with Employee Master, Leave Management, Payroll, and Performance KPIs
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid

# ==================== ENUMS ====================

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class MaritalStatus(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"

class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    CONTRACT = "contract"
    CONSULTANT = "consultant"
    INTERN = "intern"
    PART_TIME = "part_time"

class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    PROBATION = "probation"
    SUSPENDED = "suspended"
    RESIGNED = "resigned"
    TERMINATED = "terminated"
    ABSCONDING = "absconding"

class EmployeeCategory(str, Enum):
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"

class VisaType(str, Enum):
    COMPANY = "company"
    OWN = "own"
    FREELANCE = "freelance"
    DEPENDENT = "dependent"
    VISIT = "visit"

class CommissionPlanType(str, Enum):
    SLAB = "slab"
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    HYBRID = "hybrid"

class LeaveType(str, Enum):
    ANNUAL = "annual"
    SICK = "sick"
    EMERGENCY = "emergency"
    UNPAID = "unpaid"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    COMPASSIONATE = "compassionate"
    HAJJ = "hajj"

class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED_TL = "approved_tl"
    APPROVED_SM = "approved_sm"
    APPROVED_HR = "approved_hr"
    APPROVED_CEO = "approved_ceo"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class RegularizationType(str, Enum):
    LATE_PUNCH = "late_punch"
    MISSED_PUNCH = "missed_punch"
    WFH = "work_from_home"
    MANUAL_ADJUSTMENT = "manual_adjustment"
    OVERTIME = "overtime"

class PayrollStatus(str, Enum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    HR_APPROVED = "hr_approved"
    FINANCE_APPROVED = "finance_approved"
    PAID = "paid"
    ON_HOLD = "on_hold"

# ==================== PYDANTIC MODELS ====================

# === Employee Master Models ===

class EmergencyContact(BaseModel):
    name: str
    relationship: Optional[str] = None
    phone: str
    alternate_phone: Optional[str] = None

class VisaDetails(BaseModel):
    visa_type: Optional[VisaType] = None
    visa_expiry: Optional[str] = None  # YYYY-MM-DD
    emirates_id: Optional[str] = None
    emirates_id_expiry: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    labor_card_number: Optional[str] = None
    labor_card_expiry: Optional[str] = None
    company_sponsor: bool = False

class BankDetails(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift_code: Optional[str] = None
    wps_id: Optional[str] = None

class SalaryStructure(BaseModel):
    basic_salary: float = 0
    housing_allowance: float = 0
    transport_allowance: float = 0
    food_allowance: float = 0
    phone_allowance: float = 0
    other_allowances: float = 0
    fixed_incentive: float = 0
    commission_eligible: bool = False
    commission_plan_type: Optional[CommissionPlanType] = None
    commission_plan_id: Optional[str] = None
    payroll_group: Optional[str] = None

class EmployeeDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: str  # offer_letter, contract, nda, visa, emirates_id, passport, etc.
    file_name: str
    file_url: str
    file_size: Optional[int] = None
    version: int = 1
    uploaded_by: str
    uploaded_at: str
    notes: Optional[str] = None

class EmployeeCreate(BaseModel):
    # Basic Information
    employee_id: str  # Manual-generated like CLT-001
    full_name: str
    gender: Optional[Gender] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    company_email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    marital_status: Optional[MaritalStatus] = None
    
    # Employment Information
    department: str
    designation: str
    reporting_manager_id: Optional[str] = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    work_location: str = "UAE"
    joining_date: str  # YYYY-MM-DD
    probation_days: int = 90
    confirmation_date: Optional[str] = None
    notice_period_days: int = 30
    employment_status: EmploymentStatus = EmploymentStatus.PROBATION
    employee_category: Optional[EmployeeCategory] = None
    grade: Optional[str] = None
    
    # Visa & Legal
    visa_details: Optional[VisaDetails] = None
    
    # Payroll
    salary_structure: Optional[SalaryStructure] = None
    bank_details: Optional[BankDetails] = None
    
    # Leave Balances (annual allocation)
    annual_leave_balance: float = 30
    sick_leave_balance: float = 15
    
    # Link to existing user account (if any)
    user_id: Optional[str] = None

class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    gender: Optional[Gender] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    personal_email: Optional[EmailStr] = None
    company_email: Optional[EmailStr] = None
    mobile_number: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    marital_status: Optional[MaritalStatus] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    work_location: Optional[str] = None
    probation_days: Optional[int] = None
    confirmation_date: Optional[str] = None
    notice_period_days: Optional[int] = None
    employment_status: Optional[EmploymentStatus] = None
    employee_category: Optional[EmployeeCategory] = None
    grade: Optional[str] = None
    visa_details: Optional[VisaDetails] = None
    salary_structure: Optional[SalaryStructure] = None
    bank_details: Optional[BankDetails] = None
    annual_leave_balance: Optional[float] = None
    sick_leave_balance: Optional[float] = None

# === Leave Management Models ===

class LeaveRequest(BaseModel):
    employee_id: str
    leave_type: LeaveType
    start_date: str  # YYYY-MM-DD
    end_date: str
    half_day: bool = False
    reason: str
    contact_during_leave: Optional[str] = None
    handover_to: Optional[str] = None

class LeaveApproval(BaseModel):
    action: str  # approve, reject
    comments: Optional[str] = None

# === Attendance Models ===

class AttendanceRecord(BaseModel):
    employee_id: str
    date: str  # YYYY-MM-DD
    biometric_in: Optional[str] = None  # HH:MM:SS
    biometric_out: Optional[str] = None
    crm_login: Optional[str] = None
    crm_logout: Optional[str] = None
    total_work_hours: float = 0
    break_hours: float = 0
    late_minutes: int = 0
    early_exit_minutes: int = 0
    status: str = "present"  # present, absent, half_day, holiday, leave, wfh
    shift_id: Optional[str] = None

class RegularizationRequest(BaseModel):
    employee_id: str
    date: str
    type: RegularizationType
    original_in: Optional[str] = None
    original_out: Optional[str] = None
    corrected_in: Optional[str] = None
    corrected_out: Optional[str] = None
    reason: str
    supporting_document_url: Optional[str] = None

# === Payroll Models ===

class PayrollDeduction(BaseModel):
    type: str  # late, absence, advance, penalty, tax
    description: str
    amount: float

class PayrollAddition(BaseModel):
    type: str  # bonus, commission, overtime, incentive, allowance
    description: str
    amount: float

class PayrollCreate(BaseModel):
    employee_id: str
    month: int  # 1-12
    year: int
    attendance_deduction_enabled: bool = True

# === KPI Models ===

class KPIDefinition(BaseModel):
    name: str
    description: Optional[str] = None
    target_value: float
    unit: str  # percentage, number, currency
    weight: float = 1.0  # Weight for scoring
    department: Optional[str] = None  # None means company-wide

class KPIScore(BaseModel):
    kpi_id: str
    actual_value: float
    score: float  # Calculated as (actual/target) * 100

# === HR Dashboard Models ===

class DashboardFilters(BaseModel):
    department: Optional[str] = None
    location: Optional[str] = None
    employment_status: Optional[str] = None

# ==================== UTILITY FUNCTIONS ====================

def calculate_days_until_expiry(expiry_date_str: str) -> int:
    """Calculate days until a document expires"""
    if not expiry_date_str:
        return 999  # No expiry set
    try:
        expiry = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        return (expiry - today).days
    except:
        return 999

def generate_employee_id(prefix: str = "CLT", sequence: int = 1) -> str:
    """Generate employee ID like CLT-001"""
    return f"{prefix}-{str(sequence).zfill(3)}"

def calculate_gross_salary(salary: SalaryStructure) -> float:
    """Calculate total gross salary from structure"""
    return (
        salary.basic_salary +
        salary.housing_allowance +
        salary.transport_allowance +
        salary.food_allowance +
        salary.phone_allowance +
        salary.other_allowances +
        salary.fixed_incentive
    )

def calculate_leave_days(start_date: str, end_date: str, half_day: bool = False) -> float:
    """Calculate number of leave days"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days = (end - start).days + 1
    
    if half_day and days == 1:
        return 0.5
    return float(days)

# ==================== WPS FORMAT ====================

WPS_BANK_CODES = {
    "ADCB": "ADCBAEAA",
    "ADIB": "ADIBAEAA",
    "Emirates NBD": "EABORAEA",
    "Mashreq": "BOMLAEAD",
    "FAB": "NBABORAX",
    "RAK Bank": "NABORAKI",
    "CBD": "CBDUAEAA",
    "DIB": "DUIBAEAD",
}

def generate_wps_record(employee: dict, payroll: dict) -> dict:
    """Generate WPS-compliant payroll record"""
    return {
        "record_type": "EDR",  # Employee Detail Record
        "employer_id": "",  # To be filled with MOL employer ID
        "employee_id": employee.get("employee_id"),
        "employee_name": employee.get("full_name"),
        "emirates_id": employee.get("visa_details", {}).get("emirates_id", ""),
        "bank_code": WPS_BANK_CODES.get(employee.get("bank_details", {}).get("bank_name", ""), ""),
        "iban": employee.get("bank_details", {}).get("iban", ""),
        "salary_frequency": "M",  # Monthly
        "basic_salary": payroll.get("basic_salary", 0),
        "housing_allowance": payroll.get("housing_allowance", 0),
        "transport_allowance": payroll.get("transport_allowance", 0),
        "other_allowances": payroll.get("other_allowances", 0),
        "total_salary": payroll.get("net_salary", 0),
        "days_worked": payroll.get("days_worked", 30),
        "leave_days": payroll.get("leave_days", 0),
        "currency": "AED",
    }

# Sample Employee Data Template
SAMPLE_EMPLOYEE_DATA = {
    "employee_id": "CLT-001",
    "full_name": "John Doe",
    "gender": "male",
    "date_of_birth": "1990-05-15",
    "nationality": "Indian",
    "personal_email": "john.doe@personal.com",
    "company_email": "john.doe@clt-academy.com",
    "mobile_number": "+971501234567",
    "emergency_contact": {
        "name": "Jane Doe",
        "relationship": "Spouse",
        "phone": "+971507654321"
    },
    "marital_status": "married",
    "department": "Sales",
    "designation": "Sales Executive",
    "reporting_manager_id": None,
    "employment_type": "full_time",
    "work_location": "UAE",
    "joining_date": "2024-01-15",
    "probation_days": 90,
    "confirmation_date": "2024-04-15",
    "notice_period_days": 30,
    "employment_status": "active",
    "employee_category": "A",
    "grade": "L3",
    "visa_details": {
        "visa_type": "company",
        "visa_expiry": "2026-01-14",
        "emirates_id": "784-1990-1234567-1",
        "emirates_id_expiry": "2026-01-14",
        "passport_number": "J1234567",
        "passport_expiry": "2030-05-15",
        "labor_card_number": "LC123456",
        "labor_card_expiry": "2026-01-14",
        "company_sponsor": True
    },
    "salary_structure": {
        "basic_salary": 5000,
        "housing_allowance": 2000,
        "transport_allowance": 500,
        "food_allowance": 0,
        "phone_allowance": 200,
        "other_allowances": 0,
        "fixed_incentive": 0,
        "commission_eligible": True,
        "commission_plan_type": "slab",
        "payroll_group": "sales"
    },
    "bank_details": {
        "bank_name": "Emirates NBD",
        "account_number": "1234567890",
        "iban": "AE070331234567890123456",
        "swift_code": "EABORAEA",
        "wps_id": "WPS123456"
    },
    "annual_leave_balance": 30,
    "sick_leave_balance": 15
}

# HR SLA Configurations
HR_SLA_CONFIG = {
    "leave_approval_hours": 24,
    "regularization_approval_hours": 48,
    "payroll_correction_hours": 4,
    "recruitment_decision_days": 7,
    "document_renewal_alert_days": 30,
}

# Document expiry alert thresholds
EXPIRY_ALERT_DAYS = [30, 60, 90]
