from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

# Import BioCloud sync module
from biocloud_sync import (
    BioCloudClient,
    sync_biocloud_employees,
    get_biocloud_employees_for_mapping,
    save_employee_mapping
)

# Import Email Service
from email_service import (
    send_email_async,
    get_leave_request_template,
    get_leave_status_template,
    get_regularization_request_template,
    get_regularization_status_template,
    get_sla_breach_alert_template,
    get_daily_finance_report_template,
    is_email_configured
)

# Import Meta Ads Service
from meta_ads_service import MetaAdsService

# Import Google Sheets Service
from services.google_sheets_service import GoogleSheetsService, extract_sheet_id, extract_gid, DEFAULT_COLUMN_MAPPING

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== DATABASE CONFIGURATION ====================
# Environment-based database selection
# APP_ENV can be: development, testing, production

def extract_db_name_from_url(mongo_url: str) -> str:
    """Extract database name from MongoDB connection string"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(mongo_url)
        # Get the path which contains the database name
        # MongoDB URI format: mongodb+srv://user:pass@host/database?options
        if parsed.path and len(parsed.path) > 1:
            # Remove leading slash and any query parameters
            db_name = parsed.path.lstrip('/')
            if '?' in db_name:
                db_name = db_name.split('?')[0]
            if db_name:
                return db_name
    except Exception:
        pass
    return None

def get_database_name():
    """
    Get database name with the following priority:
    1. Extract from MONGO_URL connection string (for production Atlas - HIGHEST PRIORITY)
    2. Use DB_NAME environment variable (for explicit configuration)
    3. Default to 'clt_academy_erp' as last resort
    
    NOTE: In Emergent production deployments, the database name should ALWAYS
    be extracted from MONGO_URL. The Atlas MongoDB user only has access to
    the database specified in the connection string.
    """
    mongo_url = os.environ.get('MONGO_URL', '')
    
    # PRIORITY 1: Extract from MONGO_URL (production Atlas uses this)
    db_from_url = extract_db_name_from_url(mongo_url)
    if db_from_url:
        return db_from_url
    
    # PRIORITY 2: Use explicit DB_NAME if set
    db_name = os.environ.get('DB_NAME')
    if db_name:
        return db_name
    
    # PRIORITY 3: Default fallback
    return 'clt_academy_erp'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
CURRENT_DB_NAME = get_database_name()
db = client[CURRENT_DB_NAME]
CURRENT_APP_ENV = os.environ.get('APP_ENV', 'production').lower()

# Log database source for debugging
_db_from_url = extract_db_name_from_url(mongo_url)
_db_source = "MONGO_URL connection string" if _db_from_url else "DB_NAME environment variable"
print(f"✅ Database '{CURRENT_DB_NAME}' loaded from {_db_source}")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="CLT Synapse ERP", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.info(f"🔧 Environment: {CURRENT_APP_ENV} | Database: {CURRENT_DB_NAME}")

# ==================== ENUMS & CONSTANTS ====================

ROLES = [
    "super_admin", "admin", "sales_manager", "team_leader", 
    "sales_executive", "cs_head", "cs_agent", "mentor", 
    "academic_master", "finance", "hr", "marketing", "operations", "quality_control",
    # Finance-specific roles
    "finance_manager", "finance_admin", "finance_treasurer", 
    "finance_verifier", "financier", "accounts"
]

# Finance role entity access mapping
FINANCE_ROLE_ACCESS = {
    "finance_manager": ["clt", "miles"],  # Access to both
    "finance_admin": ["miles"],            # MILES only
    "finance_treasurer": ["miles"],        # MILES only
    "finance_verifier": ["miles"],         # MILES only
    "financier": ["miles"],                # MILES only
    "accounts": ["clt"],                   # CLT only
    "finance": ["clt", "miles"],           # Legacy - full access
    "super_admin": ["clt", "miles"],       # Full access
    "admin": ["clt", "miles"],             # Full access
}

DEPARTMENTS = [
    "Sales", "Finance", "Customer Service", "Mentors/Academics",
    "Operations", "Marketing", "HR", "Quality Control"
]

LEAD_STAGES = [
    "new_lead", "no_answer", "call_back", "warm_lead", 
    "hot_lead", "in_progress", "rejected", "enrolled"
]

LEAD_REJECTION_REASONS = [
    "price", "timing", "no_money", "wrong_number", "duplicate", "not_interested"
]

STUDENT_STAGES = [
    "new_student", "activated", "satisfactory_call", 
    "pitched_for_upgrade", "in_progress", "interested", "not_interested"
]

MENTOR_STAGES = [
    "new_student", "discussion_started", "pitched_for_redeposit", 
    "interested", "closed"
]

PAYMENT_STAGES = [
    "new_payment", "pending_verification", "verified", 
    "reconciled", "discrepancy", "completed"
]

PAYMENT_METHODS = [
    "unipay", "stripe", "tabby", "tamara", "network", 
    "bank_transfer", "usdt", "cash"
]

APPROVAL_STATUS = ["pending", "approved", "rejected"]

PERMISSION_LEVELS = ["none", "view", "edit", "full"]

MODULES = [
    "dashboard", "sales_crm", "customer_service", "mentor_crm",
    "finance", "user_management", "department_management",
    "course_management", "commission_engine", "reports", "settings"
]

# Environment Modes
ENVIRONMENT_MODES = ["development", "testing", "production"]

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    region: Optional[str] = None
    team_leader_id: Optional[str] = None
    permissions: Optional[Dict[str, str]] = None  # {module: permission_level}
    monthly_target: float = 0
    commission_rate_override: Optional[float] = None
    environment_access: Optional[List[str]] = None  # ["development", "testing", "production"]
    entity_access: Optional[List[str]] = None  # ["clt", "miles"] - for finance roles
    threecx_extension: Optional[str] = None  # 3CX PBX extension number for call mapping
    finance_permissions: Optional[Dict[str, Dict[str, bool]]] = None  # {module: {view: bool, edit: bool, delete: bool}}

class UserCreate(UserBase):
    password: str
    # Employee sync options
    create_employee_record: bool = False
    designation: Optional[str] = None
    joining_date: Optional[str] = None
    employment_type: Optional[str] = "full_time"
    work_location: Optional[str] = "Office"

class UserResponse(UserBase):
    id: str
    employee_id: Optional[str] = None  # Link to HR employee record
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    head_id: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: str
    head_name: Optional[str] = None
    member_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class CourseBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    base_price: float
    category: str  # basic, advanced, mentorship, etc.
    is_active: bool = True
    addons: Optional[List[Dict]] = None  # [{name, price}]

class CourseCreate(CourseBase):
    pass

class CourseResponse(CourseBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class CommissionRuleBase(BaseModel):
    name: str
    course_id: Optional[str] = None  # None means applies to all
    course_category: Optional[str] = None
    role: str  # Which role this applies to
    commission_type: str  # percentage, fixed, tiered
    commission_value: float  # Percentage or fixed amount
    min_sale_amount: float = 0
    max_sale_amount: Optional[float] = None
    addon_bonus: Optional[Dict] = None  # {addon_name: bonus_amount}
    is_active: bool = True

class CommissionRuleCreate(CommissionRuleBase):
    pass

class CommissionRuleResponse(CommissionRuleBase):
    id: str
    course_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class CommissionRecord(BaseModel):
    user_id: str
    payment_id: str
    lead_id: Optional[str] = None
    student_id: Optional[str] = None
    course_id: str
    sale_amount: float
    commission_amount: float
    commission_type: str  # fresh_sale, upgrade, redeposit
    status: str = "pending"  # pending, approved, paid
    month: str  # YYYY-MM format
    
class ApprovalRequest(BaseModel):
    request_type: str  # user_change, department_change, commission_adjustment
    entity_type: str
    entity_id: str
    requested_by: str
    changes: Dict
    reason: Optional[str] = None
    status: str = "pending"
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

class LeadReassignmentRequest(BaseModel):
    lead_id: str
    current_agent_id: str
    new_agent_id: str
    reason: str

class LeadBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    country: Optional[str] = None
    city: Optional[str] = None
    lead_source: Optional[str] = None
    course_of_interest: Optional[str] = None
    campaign_name: Optional[str] = None
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    call_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejection_reason_label: Optional[str] = None  # Human-readable rejection reason
    rejection_notes: Optional[str] = None  # Additional rejection notes
    follow_up_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None  # Course name for enrolled students
    interested_course_id: Optional[str] = None  # Course client is interested in (for pipeline tracking)
    interested_course_name: Optional[str] = None  # Course name for interested course
    estimated_value: Optional[float] = None  # Estimated deal value
    sale_amount: Optional[float] = None
    addons_selected: Optional[List[str]] = None
    call_recording_url: Optional[str] = None  # 3CX integration placeholder
    # Reminder fields
    reminder_date: Optional[datetime] = None
    reminder_time: Optional[str] = None  # HH:MM format
    reminder_note: Optional[str] = None
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
    payment_splits: Optional[List[dict]] = None  # Array of {method, amount, transaction_id, phone_number, is_same_number, proof}
    # BNPL phone verification
    bnpl_phone: Optional[str] = None
    bnpl_same_number: Optional[bool] = True

class LeadResponse(LeadBase):
    id: str
    stage: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    call_notes: Optional[str] = None
    course_id: Optional[str] = None
    course_name: Optional[str] = None
    interested_course_id: Optional[str] = None
    interested_course_name: Optional[str] = None
    estimated_value: Optional[float] = None
    sale_amount: Optional[float] = None
    addons_selected: Optional[List[str]] = None
    call_recording_url: Optional[str] = None  # 3CX integration placeholder
    created_at: datetime
    updated_at: datetime
    last_activity: Optional[datetime] = None
    assigned_at: Optional[datetime] = None  # When lead was assigned
    first_contact_at: Optional[datetime] = None  # When first contacted
    sla_status: str = "ok"  # ok, warning, breach
    sla_warning_at: Optional[datetime] = None  # When warning was issued
    sla_warning_level: int = 0  # 0=none, 1=first warning, 2=second warning
    sla_breach: bool = False
    in_pool: bool = False  # True if in agentic pool
    # Reminder fields
    reminder_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    reminder_note: Optional[str] = None
    reminder_completed: bool = False
    
    model_config = ConfigDict(extra="ignore")

class StudentBase(BaseModel):
    lead_id: Optional[str] = None
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    country: Optional[str] = None
    package_bought: Optional[str] = None
    batch_plan: Optional[str] = None
    payment_details: Optional[Dict] = None
    preferred_language: Optional[str] = None
    trading_level: Optional[str] = None
    class_timings: Optional[str] = None
    learning_goals: Optional[str] = None
    satisfaction_score: Optional[int] = None  # 1-5

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    cs_agent_id: Optional[str] = None
    mentor_id: Optional[str] = None
    mentor_stage: Optional[str] = None
    onboarding_complete: bool = False
    classes_attended: int = 0
    upgrade_eligible: bool = False
    upgrade_pitched: bool = False
    upgrade_closed: bool = False
    upgrade_amount: Optional[float] = None
    satisfaction_score: Optional[int] = None
    activation_call_at: Optional[datetime] = None
    call_recording_url: Optional[str] = None  # 3CX integration placeholder
    # Reminder fields
    reminder_date: Optional[datetime] = None
    reminder_time: Optional[str] = None  # HH:MM format
    reminder_note: Optional[str] = None
    reminder_type: Optional[str] = None  # upgrade, redeposit, general

class StudentResponse(StudentBase):
    id: str
    stage: str
    mentor_stage: Optional[str] = None
    cs_agent_id: Optional[str] = None
    cs_agent_name: Optional[str] = None
    mentor_id: Optional[str] = None
    mentor_name: Optional[str] = None
    onboarding_complete: bool = False
    classes_attended: int = 0
    upgrade_eligible: bool = False
    upgrade_pitched: bool = False
    upgrade_closed: bool = False
    upgrade_amount: Optional[float] = None
    activation_call_at: Optional[datetime] = None
    call_recording_url: Optional[str] = None  # 3CX integration placeholder
    sla_status: str = "ok"  # ok, warning, breach
    sla_warning_at: Optional[datetime] = None
    # Reminder fields
    reminder_date: Optional[datetime] = None
    reminder_time: Optional[str] = None
    reminder_note: Optional[str] = None
    reminder_type: Optional[str] = None
    reminder_completed: bool = False
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

# Customer Master Model
class CustomerBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    country: Optional[str] = None
    lead_id: Optional[str] = None
    student_id: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    total_spent: float = 0
    transaction_count: int = 0
    first_transaction_at: Optional[datetime] = None
    last_transaction_at: Optional[datetime] = None
    transactions: Optional[List[Dict]] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

# SLA Configuration
SLA_CONFIG = {
    "new_lead_contact_mins": 60,  # Must contact new lead within 60 mins
    "inactive_lead_days": 7,  # Warning after 7 days inactive
    "inactive_warning_hours": 72,  # Second warning after 72 hours
    "inactive_reassign_hours": 72,  # Reassign after another 72 hours
    "cs_activation_mins": 15,  # CS must make activation call within 15 mins
}

class PaymentBase(BaseModel):
    student_id: Optional[str] = None
    lead_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float
    currency: str = "AED"
    payment_method: str
    transaction_id: Optional[str] = None
    course_id: Optional[str] = None
    product_course: Optional[str] = None
    team_id: Optional[str] = None
    agent_id: Optional[str] = None
    payment_type: str = "fresh"  # fresh or upgrade

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None
    reconciled_at: Optional[datetime] = None
    discrepancy_reason: Optional[str] = None

class PaymentResponse(PaymentBase):
    id: str
    stage: str
    verified_by: Optional[str] = None
    verified_by_name: Optional[str] = None
    reconciled_at: Optional[datetime] = None
    discrepancy_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class GoogleSheetConfig(BaseModel):
    sheet_id: str
    sheet_name: str = "Sheet1"
    header_row: int = 1
    column_mapping: Dict[str, str]  # {lead_field: sheet_column}

# ==================== AUDIT LOG MODELS ====================

class AuditLogCreate(BaseModel):
    action: str  # login, logout, create, update, delete, access_change, view, export
    entity_type: str  # user, lead, student, payment, access_control, course, department, etc.
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None  # Additional context
    changes: Optional[Dict[str, Any]] = None  # Old and new values for updates
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    user_id: str
    user_name: str
    user_email: str
    user_role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    model_config = ConfigDict(extra="ignore")

# Audit log helper function
async def log_audit(
    user: Dict,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    details: Optional[Dict] = None,
    changes: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Log an audit entry for tracking user actions
    
    Actions: login, logout, create, update, delete, access_change, view, export, bulk_import
    Entity Types: user, lead, student, payment, access_control, course, department, settings, etc.
    """
    try:
        audit_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user.get("id", "system"),
            "user_name": user.get("full_name", "System"),
            "user_email": user.get("email", "system@clt-academy.com"),
            "user_role": user.get("role", "system"),
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity_name,
            "details": details,
            "changes": changes,
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        await db.audit_logs.insert_one(audit_entry)
        logger.info(f"Audit: {user.get('full_name', 'System')} {action} {entity_type} {entity_id or ''}")
    except Exception as e:
        logger.error(f"Failed to log audit entry: {e}")

# ==================== TEAMS MODELS ====================

class TeamCreate(BaseModel):
    name: str
    department: str = "sales"  # sales, customer_service, etc.
    description: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    leader_id: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    department: str
    leader_id: Optional[str] = None
    leader_name: Optional[str] = None
    description: Optional[str] = None
    member_count: int = 0
    active: bool = True
    created_at: str
    updated_at: str

# ==================== 3CX INTEGRATION MODELS ====================

class ThreeCXContactResponse(BaseModel):
    found: bool = False
    contact_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_mobile: Optional[str] = None
    phone_business: Optional[str] = None
    company_name: Optional[str] = None
    contact_url: Optional[str] = None
    contact_type: Optional[str] = None  # "lead" or "student"

class ThreeCXCallJournalRequest(BaseModel):
    call_type: str  # "Inbound", "Outbound", "Missed", "Notanswered"
    phone_number: str
    call_direction: str  # "Inbound" or "Outbound"
    name: Optional[str] = None
    contact_id: Optional[str] = None
    call_duration: int = 0
    timestamp: Optional[str] = None
    recording_file: Optional[str] = None
    agent_extension: Optional[str] = None
    notes: Optional[str] = None

class ThreeCXContactCreateRequest(BaseModel):
    phone_number: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None

class CallLogResponse(BaseModel):
    call_id: str
    contact_id: Optional[str] = None
    contact_type: Optional[str] = None
    contact_name: Optional[str] = None
    phone_number: str
    call_type: str
    call_direction: str
    call_duration: int
    call_date: str
    recording_url: Optional[str] = None
    agent_extension: Optional[str] = None
    notes: Optional[str] = None

# ==================== ESS (Employee Self-Service) MODELS ====================

# Leave Types Configuration
LEAVE_TYPES = {
    "sick_leave": {"name": "Sick Leave", "days_per_year": 12, "full_time_only": True, "requires_document": True},
    "annual_leave": {"name": "Annual Leave", "days_per_year": 26, "full_time_only": True, "requires_document": False},
    "maternity_leave": {"name": "Maternity Leave", "days_per_year": 45, "full_time_only": False, "requires_document": True},
    "umrah_leave": {"name": "Umrah Leave", "days_per_year": 8, "full_time_only": False, "requires_document": False},
    "half_day": {"name": "Half Day", "days_per_year": -1, "full_time_only": False, "requires_document": False},  # -1 = unlimited
    "unpaid_leave": {"name": "Unpaid Leave", "days_per_year": -1, "full_time_only": False, "requires_document": False},
}

ESS_APPROVAL_STATUS = ["pending_manager", "pending_hr", "pending_ceo", "approved", "rejected"]

class LeaveRequestCreate(BaseModel):
    leave_type: str  # sick_leave, annual_leave, maternity_leave, umrah_leave, half_day, unpaid_leave
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    reason: str
    half_day_type: Optional[str] = None  # "first_half" or "second_half" if leave_type is half_day
    document_url: Optional[str] = None  # For sick certificate, etc.

class LeaveRequestResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    leave_type: str
    leave_type_name: str
    start_date: str
    end_date: str
    total_days: float
    reason: str
    half_day_type: Optional[str] = None
    document_url: Optional[str] = None
    status: str  # pending_manager, pending_hr, pending_ceo, approved, rejected
    approval_chain: List[Dict]  # [{role, user_id, user_name, status, action_date, comments}]
    created_at: str
    updated_at: str

class AttendanceRegularizationCreate(BaseModel):
    date: str  # YYYY-MM-DD
    requested_check_in: str  # HH:MM
    requested_check_out: str  # HH:MM
    reason: str

class AttendanceRegularizationResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    date: str
    original_check_in: Optional[str] = None
    original_check_out: Optional[str] = None
    requested_check_in: str
    requested_check_out: str
    reason: str
    status: str  # pending_manager, pending_hr, pending_ceo, approved, rejected
    approval_chain: List[Dict]
    created_at: str
    updated_at: str

class LeaveBalanceResponse(BaseModel):
    leave_type: str
    leave_type_name: str
    total_days: float
    used_days: float
    pending_days: float
    remaining_days: float
    full_time_only: bool

class ESSApprovalAction(BaseModel):
    action: str  # approve, reject
    comments: Optional[str] = None

# ==================== MARKETING MODULE MODELS ====================

class MetaAdAccountCreate(BaseModel):
    name: str
    meta_account_id: str  # act_xxxxx format
    access_token: str
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None

class MetaAdAccountResponse(BaseModel):
    id: str
    name: str
    meta_account_id: str
    is_active: bool
    status: str  # connected, expired, error
    last_synced: Optional[str] = None
    created_at: str
    currency: Optional[str] = None
    timezone: Optional[str] = None

class MetaCampaignResponse(BaseModel):
    id: str
    account_id: str
    meta_campaign_id: str
    name: str
    objective: Optional[str] = None
    status: str
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    created_time: Optional[str] = None
    start_time: Optional[str] = None
    stop_time: Optional[str] = None

class MetaLeadResponse(BaseModel):
    id: str
    account_id: str
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    form_id: str
    form_name: Optional[str] = None
    lead_data: Dict[str, Any]  # Parsed field data
    created_time: str
    received_at: str
    synced_to_crm: bool = False
    crm_lead_id: Optional[str] = None

class MarketingMetricsResponse(BaseModel):
    account_id: str
    account_name: str
    period: str  # last_7d, last_30d, etc.
    total_spend: float
    total_leads: int
    total_impressions: int
    total_clicks: int
    cpl: float  # Cost per lead
    cpm: float  # Cost per mille
    cpc: float  # Cost per click
    ctr: float  # Click-through rate
    reach: int
    frequency: float
    # Calculated ROAS would need conversion data
    campaigns: List[Dict[str, Any]] = []

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(allowed_roles: List[str]):
    async def role_checker(user = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def check_permission(user: Dict, module: str, required_level: str) -> bool:
    """Check if user has required permission level for a module"""
    if user.get("role") == "super_admin":
        return True
    
    permissions = user.get("permissions", {})
    user_level = permissions.get(module, "none")
    
    level_hierarchy = {"none": 0, "view": 1, "edit": 2, "full": 3}
    return level_hierarchy.get(user_level, 0) >= level_hierarchy.get(required_level, 0)

def calculate_settlement_date(payment_method: str, payment_date: datetime) -> Dict:
    """
    Calculate expected settlement date based on payment method.
    
    Settlement Rules:
    - Tabby: Every Monday (weekly settlement)
    - Tamara: 7 days from payment date
    - Network: T+1 (next business day, skip weekends)
    - Bank Transfer: Immediate
    - Credit Card: Immediate
    - Cash: Immediate
    - UPI: Immediate
    - Cheque: Manual settlement
    """
    payment_method = payment_method.lower() if payment_method else ""
    
    # UAE holidays (add more as needed)
    uae_holidays = [
        datetime(2026, 1, 1),   # New Year
        datetime(2026, 12, 2),  # UAE National Day
        datetime(2026, 12, 3),  # UAE National Day
    ]
    
    def is_business_day(dt):
        # Friday and Saturday are weekends in UAE
        if dt.weekday() in [4, 5]:  # Friday=4, Saturday=5
            return False
        # Check holidays
        if dt.date() in [h.date() for h in uae_holidays]:
            return False
        return True
    
    def next_business_day(dt):
        next_day = dt + timedelta(days=1)
        while not is_business_day(next_day):
            next_day += timedelta(days=1)
        return next_day
    
    def next_monday(dt):
        days_ahead = 0 - dt.weekday()  # Monday = 0
        if days_ahead <= 0:
            days_ahead += 7
        return dt + timedelta(days=days_ahead)
    
    if payment_method == "tabby":
        # Settlement every Monday
        settlement_date = next_monday(payment_date)
        return {
            "status": "pending_settlement",
            "type": "weekly_monday",
            "settlement_date": settlement_date.strftime("%Y-%m-%d"),
            "description": "Tabby - Settlement every Monday"
        }
    
    elif payment_method == "tamara":
        # 7 days from payment
        settlement_date = payment_date + timedelta(days=7)
        return {
            "status": "pending_settlement",
            "type": "7_days",
            "settlement_date": settlement_date.strftime("%Y-%m-%d"),
            "description": "Tamara - 7 days settlement"
        }
    
    elif payment_method == "network":
        # T+1 (next business day)
        settlement_date = next_business_day(payment_date)
        return {
            "status": "pending_settlement",
            "type": "t_plus_1",
            "settlement_date": settlement_date.strftime("%Y-%m-%d"),
            "description": "Network - T+1 settlement"
        }
    
    elif payment_method == "cheque":
        # Manual settlement - date TBD
        return {
            "status": "pending_settlement",
            "type": "manual",
            "settlement_date": None,
            "description": "Cheque - Manual settlement"
        }
    
    else:
        # Immediate settlement (bank_transfer, credit_card, cash, upi)
        return {
            "status": "settled",
            "type": "immediate",
            "settlement_date": payment_date.strftime("%Y-%m-%d"),
            "description": "Immediate settlement"
        }

async def log_activity(entity_type: str, entity_id: str, action: str, user: Dict, details: Dict = None):
    activity = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "user_id": user.get("id"),
        "user_name": user.get("full_name"),
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity)

async def create_notification(
    user_id: str, 
    title: str, 
    message: str, 
    notif_type: str = "info", 
    link: str = None,
    entity_type: str = None,
    entity_id: str = None,
    related_type: str = None,
    related_id: str = None
):
    """
    Create a notification for a user
    
    Args:
        user_id: Target user's ID
        title: Notification title
        message: Notification message
        notif_type: Type of notification (info, warning, error, success)
        link: Optional direct link URL
        entity_type: Type of entity (lead, student, followup, reminder)
        entity_id: ID of the entity for click-through navigation
        related_type: Secondary related entity type (for reminders)
        related_id: Secondary related entity ID (for reminders)
    """
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "related_type": related_type,
        "related_id": related_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

async def get_round_robin_agent(role: str, region: str = None, department: str = None) -> Optional[Dict]:
    """Get next available agent using round-robin with fallback to any agent if regional match not found"""
    query = {"role": role, "is_active": True}
    
    # First try with region filter if provided
    if region:
        query["region"] = region
        agents = await db.users.find(query).to_list(100)
        
        # If no regional agents found, fallback to any agent with this role
        if not agents:
            del query["region"]
            agents = await db.users.find(query).to_list(100)
    else:
        agents = await db.users.find(query).to_list(100)
    
    if department:
        # Filter by department if specified
        dept_agents = [a for a in agents if a.get("department") == department]
        if dept_agents:
            agents = dept_agents
    
    if not agents:
        return None
    
    # Get assignment counts
    assignment_counts = {}
    for agent in agents:
        if role in ["sales_executive", "sales_manager", "team_leader"]:
            count = await db.leads.count_documents({"assigned_to": agent["id"]})
        elif role in ["cs_agent", "cs_head"]:
            count = await db.students.count_documents({"cs_agent_id": agent["id"]})
        elif role in ["mentor", "academic_master"]:
            count = await db.students.count_documents({"mentor_id": agent["id"]})
        else:
            count = 0
        assignment_counts[agent["id"]] = count
    
    # Return agent with lowest count
    min_agent = min(agents, key=lambda a: assignment_counts.get(a["id"], 0))
    return min_agent

async def calculate_commission(user_id: str, payment_id: str, sale_amount: float, 
                               course_id: str, payment_type: str, user_role: str) -> float:
    """Calculate commission based on rules"""
    # Get course
    course = await db.courses.find_one({"id": course_id}) if course_id else None
    course_category = course.get("category") if course else None
    
    # Find applicable commission rules
    rules = await db.commission_rules.find({
        "is_active": True,
        "role": user_role,
        "$or": [
            {"course_id": course_id},
            {"course_id": None, "course_category": course_category},
            {"course_id": None, "course_category": None}
        ]
    }).to_list(100)
    
    if not rules:
        return 0
    
    # Use most specific rule
    rule = rules[0]
    for r in rules:
        if r.get("course_id") == course_id:
            rule = r
            break
        elif r.get("course_category") == course_category and not rule.get("course_id"):
            rule = r
    
    # Check sale amount bounds
    if sale_amount < rule.get("min_sale_amount", 0):
        return 0
    max_amount = rule.get("max_sale_amount")
    if max_amount and sale_amount > max_amount:
        return 0
    
    # Calculate commission
    if rule.get("commission_type") == "percentage":
        commission = sale_amount * (rule.get("commission_value", 0) / 100)
    else:
        commission = rule.get("commission_value", 0)
    
    # Record commission
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    commission_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "payment_id": payment_id,
        "course_id": course_id,
        "sale_amount": sale_amount,
        "commission_amount": commission,
        "commission_type": payment_type,
        "status": "pending",
        "month": month,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.commissions.insert_one(commission_record)
    
    return commission

# ==================== SLA MANAGEMENT ====================

async def check_lead_sla(lead: Dict) -> Dict:
    """Check SLA status for a lead and return updated SLA fields"""
    now = datetime.now(timezone.utc)
    sla_update = {}
    
    # Parse timestamps
    def parse_datetime(dt_str):
        if not dt_str:
            return None
        if isinstance(dt_str, datetime):
            return dt_str
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except:
            return None
    
    assigned_at = parse_datetime(lead.get("assigned_at"))
    first_contact_at = parse_datetime(lead.get("first_contact_at"))
    last_activity = parse_datetime(lead.get("last_activity") or lead.get("created_at"))
    sla_warning_at = parse_datetime(lead.get("sla_warning_at"))
    current_stage = lead.get("stage", "new_lead")
    sla_warning_level = lead.get("sla_warning_level", 0)
    
    # Skip if lead is in pool, enrolled, or rejected
    if lead.get("in_pool") or current_stage in ["enrolled", "rejected"]:
        return sla_update
    
    # Rule 1: New Lead - 60 min first contact
    if current_stage == "new_lead" and assigned_at and not first_contact_at:
        mins_since_assign = (now - assigned_at).total_seconds() / 60
        if mins_since_assign > SLA_CONFIG["new_lead_contact_mins"]:
            sla_update["sla_status"] = "breach"
            sla_update["sla_breach"] = True
            if not lead.get("sla_breach"):  # First time breach
                sla_update["sla_warning_at"] = now.isoformat()
    
    # Rule 2: Inactive Lead - 7 days escalation
    elif current_stage not in ["new_lead", "enrolled", "rejected"] and last_activity:
        days_inactive = (now - last_activity).days
        hours_since_warning = 0
        if sla_warning_at:
            hours_since_warning = (now - sla_warning_at).total_seconds() / 3600
        
        # Level 0 -> Level 1: 7 days inactive
        if days_inactive >= SLA_CONFIG["inactive_lead_days"] and sla_warning_level == 0:
            sla_update["sla_status"] = "warning"
            sla_update["sla_warning_level"] = 1
            sla_update["sla_warning_at"] = now.isoformat()
        
        # Level 1 -> Level 2: 72 hours after first warning
        elif sla_warning_level == 1 and hours_since_warning >= SLA_CONFIG["inactive_warning_hours"]:
            sla_update["sla_status"] = "warning"
            sla_update["sla_warning_level"] = 2
            sla_update["sla_warning_at"] = now.isoformat()
        
        # Level 2 -> Reassign: 72 hours after second warning
        elif sla_warning_level == 2 and hours_since_warning >= SLA_CONFIG["inactive_reassign_hours"]:
            sla_update["sla_status"] = "breach"
            sla_update["sla_breach"] = True
            sla_update["in_pool"] = True
            sla_update["assigned_to"] = None
            sla_update["assigned_to_name"] = None
            sla_update["sla_warning_level"] = 0  # Reset for next assignment
    
    return sla_update

async def check_student_sla(student: Dict) -> Dict:
    """Check SLA status for CS activation"""
    now = datetime.now(timezone.utc)
    sla_update = {}
    
    def parse_datetime(dt_str):
        if not dt_str:
            return None
        if isinstance(dt_str, datetime):
            return dt_str
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except:
            return None
    
    created_at = parse_datetime(student.get("created_at"))
    activation_call_at = parse_datetime(student.get("activation_call_at"))
    current_stage = student.get("stage", "new_student")
    
    # Rule 3: CS Activation - 15 min
    if current_stage == "new_student" and created_at and not activation_call_at:
        mins_since_create = (now - created_at).total_seconds() / 60
        if mins_since_create > SLA_CONFIG["cs_activation_mins"]:
            sla_update["sla_status"] = "breach"
            if not student.get("sla_warning_at"):
                sla_update["sla_warning_at"] = now.isoformat()
    
    return sla_update

async def process_sla_checks():
    """Background task to check all SLA statuses and send notifications"""
    now = datetime.now(timezone.utc)
    
    # Check all active leads
    leads = await db.leads.find({
        "stage": {"$nin": ["enrolled", "rejected"]},
        "in_pool": {"$ne": True}
    }).to_list(10000)
    
    for lead in leads:
        sla_update = await check_lead_sla(lead)
        if sla_update:
            old_status = lead.get("sla_status", "ok")
            new_status = sla_update.get("sla_status", old_status)
            
            await db.leads.update_one({"id": lead["id"]}, {"$set": sla_update})
            
            # Send notifications on status change
            if new_status != old_status or sla_update.get("sla_warning_level", 0) > lead.get("sla_warning_level", 0):
                # Notify sales executive
                if lead.get("assigned_to"):
                    await create_notification(
                        lead["assigned_to"],
                        f"SLA {new_status.upper()}: {lead['full_name']}",
                        f"Lead requires immediate attention. Status: {new_status}",
                        "warning" if new_status == "warning" else "error",
                        f"/sales",
                        entity_type="lead",
                        entity_id=lead["id"]
                    )
                
                # Notify manager on breach or level 2 warning
                if new_status == "breach" or sla_update.get("sla_warning_level", 0) >= 2:
                    managers = await db.users.find({
                        "role": {"$in": ["sales_manager", "team_leader", "admin", "super_admin"]},
                        "is_active": True
                    }).to_list(100)
                    for manager in managers:
                        await create_notification(
                            manager["id"],
                            f"SLA BREACH: Lead {lead['full_name']}",
                            f"Lead has breached SLA. Assigned to: {lead.get('assigned_to_name', 'Unassigned')}",
                            "error",
                            f"/sales",
                            entity_type="lead",
                            entity_id=lead["id"]
                        )
                    
                    # Send SLA breach email alerts to managers
                    if is_email_configured():
                        time_since_created = now - datetime.fromisoformat(lead.get("created_at", now.isoformat()).replace("Z", "+00:00"))
                        hours_elapsed = time_since_created.total_seconds() / 3600
                        time_elapsed_str = f"{int(hours_elapsed)} hours" if hours_elapsed < 48 else f"{int(hours_elapsed/24)} days"
                        
                        sla_email_html = get_sla_breach_alert_template(
                            lead_name=lead.get("full_name", "Unknown"),
                            lead_phone=lead.get("phone", "N/A"),
                            lead_email=lead.get("email", ""),
                            lead_source=lead.get("source", "Unknown"),
                            assigned_to=lead.get("assigned_to_name", "Unassigned"),
                            sla_status=new_status,
                            time_elapsed=time_elapsed_str,
                            sla_threshold="48 hours for first contact"
                        )
                        
                        # Send to assigned sales executive
                        if lead.get("assigned_to"):
                            assigned_user = await db.users.find_one({"id": lead["assigned_to"]})
                            if assigned_user and assigned_user.get("email"):
                                await send_email_async(
                                    assigned_user["email"],
                                    f"⚠️ SLA BREACH: Lead {lead['full_name']} requires immediate attention",
                                    sla_email_html
                                )
                        
                        # Send to sales managers
                        for manager in managers:
                            if manager.get("email"):
                                await send_email_async(
                                    manager["email"],
                                    f"⚠️ SLA BREACH ALERT: {lead['full_name']} - {lead.get('assigned_to_name', 'Unassigned')}",
                                    sla_email_html
                                )
                
                # If reassigned to pool, log activity
                if sla_update.get("in_pool"):
                    await db.activity_logs.insert_one({
                        "id": str(uuid.uuid4()),
                        "entity_type": "lead",
                        "entity_id": lead["id"],
                        "action": "sla_reassign_to_pool",
                        "user_id": "system",
                        "user_name": "System (SLA)",
                        "details": {"reason": "Inactive for 10+ days, returned to lead pool"},
                        "created_at": now.isoformat()
                    })
    
    # Check all new students for CS activation SLA
    students = await db.students.find({
        "stage": "new_student",
        "activation_call_at": None
    }).to_list(10000)
    
    for student in students:
        sla_update = await check_student_sla(student)
        if sla_update:
            old_status = student.get("sla_status", "ok")
            new_status = sla_update.get("sla_status", old_status)
            
            await db.students.update_one({"id": student["id"]}, {"$set": sla_update})
            
            if new_status == "breach" and old_status != "breach":
                # Notify CS agent
                if student.get("cs_agent_id"):
                    await create_notification(
                        student["cs_agent_id"],
                        f"SLA BREACH: Activation call needed",
                        f"Student {student['full_name']} needs activation call immediately!",
                        "error",
                        f"/cs",
                        entity_type="student",
                        entity_id=student["id"]
                    )
                
                # Notify CS head
                cs_heads = await db.users.find({
                    "role": {"$in": ["cs_head", "admin", "super_admin"]},
                    "is_active": True
                }).to_list(100)
                for head in cs_heads:
                    await create_notification(
                        head["id"],
                        f"CS SLA BREACH: {student['full_name']}",
                        f"Activation call not made within 15 mins. Agent: {student.get('cs_agent_name', 'Unknown')}",
                        "error",
                        f"/cs",
                        entity_type="student",
                        entity_id=student["id"]
                    )
    
    return {"leads_checked": len(leads), "students_checked": len(students)}

async def create_or_update_customer(lead: Dict, student: Dict, payment: Dict = None):
    """Create or update customer master record"""
    phone = lead.get("phone") or student.get("phone")
    
    # Find existing customer
    customer = await db.customers.find_one({"phone": phone})
    
    if not customer:
        customer = {
            "id": str(uuid.uuid4()),
            "full_name": lead.get("full_name") or student.get("full_name"),
            "phone": phone,
            "email": lead.get("email") or student.get("email"),
            "country": lead.get("country") or student.get("country"),
            "lead_id": lead.get("id"),
            "student_id": student.get("id") if student else None,
            "total_spent": 0,
            "transaction_count": 0,
            "transactions": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.customers.insert_one(customer)
    else:
        # Update student_id if not set
        if student and not customer.get("student_id"):
            await db.customers.update_one(
                {"id": customer["id"]},
                {"$set": {"student_id": student.get("id"), "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    # Add transaction if payment provided
    if payment:
        transaction = {
            "payment_id": payment.get("id"),
            "amount": payment.get("amount", 0),
            "currency": payment.get("currency", "AED"),
            "payment_method": payment.get("payment_method"),
            "payment_type": payment.get("payment_type", "fresh"),
            "course_id": payment.get("course_id"),
            "transaction_id": payment.get("transaction_id"),
            "date": datetime.now(timezone.utc).isoformat()
        }
        
        await db.customers.update_one(
            {"id": customer["id"]},
            {
                "$push": {"transactions": transaction},
                "$inc": {"total_spent": payment.get("amount", 0), "transaction_count": 1},
                "$set": {
                    "last_transaction_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$min": {"first_transaction_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    return customer

# ==================== BOOTSTRAP ====================

async def bootstrap_super_admin():
    """Create super admin on first initialization"""
    existing = await db.users.find_one({"email": "aqib@clt-academy.com"})
    if not existing:
        # Default permissions for super admin (full access to everything)
        default_permissions = {module: "full" for module in MODULES}
        
        super_admin = {
            "id": str(uuid.uuid4()),
            "email": "aqib@clt-academy.com",
            "password": hash_password("A@qib1234"),
            "full_name": "Aqib (Super Admin)",
            "role": "super_admin",
            "department": "Management",
            "is_active": True,
            "region": "UAE",
            "permissions": default_permissions,
            "monthly_target": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin)
        logger.info("Super admin created: aqib@clt-academy.com")

async def bootstrap_departments():
    """Create default departments"""
    for dept_name in DEPARTMENTS:
        existing = await db.departments.find_one({"name": dept_name})
        if not existing:
            dept = {
                "id": str(uuid.uuid4()),
                "name": dept_name,
                "description": f"{dept_name} Department",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.departments.insert_one(dept)
    logger.info("Default departments created")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user.get("password", "")):
        # Log failed login attempt
        await log_audit(
            {"id": "unknown", "full_name": "Unknown", "email": data.email, "role": "unknown"},
            "login_failed",
            "auth",
            details={"email": data.email, "reason": "Invalid credentials"}
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        await log_audit(
            {"id": user["id"], "full_name": user.get("full_name"), "email": user["email"], "role": user.get("role")},
            "login_failed",
            "auth",
            details={"reason": "Account disabled"}
        )
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    # Log successful login
    await log_audit(
        {"id": user["id"], "full_name": user.get("full_name"), "email": user["email"], "role": user.get("role")},
        "login",
        "auth",
        details={"method": "email_password"}
    )
    
    user_data = {k: v for k, v in user.items() if k != "password" and k != "_id"}
    
    return TokenResponse(access_token=token, user=user_data)

@api_router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    user_data = {k: v for k, v in user.items() if k != "password" and k != "_id"}
    return user_data

# ==================== FORGOT PASSWORD ====================

class ForgotPasswordRequest(BaseModel):
    email: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """
    Submit a password reset request. 
    The request is stored and visible to super admins.
    """
    # Check if user exists
    user = await db.users.find_one({"email": data.email})
    if not user:
        # Don't reveal if email exists or not for security
        raise HTTPException(status_code=404, detail="If this email exists in our system, a reset request has been submitted.")
    
    # Create password reset request
    reset_request = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": data.email,
        "user_name": user.get("full_name", "Unknown"),
        "user_role": user.get("role", "Unknown"),
        "status": "pending",  # pending, approved, rejected
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None,
        "processed_by": None,
        "new_password": None,  # Will be set by admin when approving
        "notes": None
    }
    
    await db.password_reset_requests.insert_one(reset_request)
    
    # Log the audit
    await log_audit(
        {"id": user["id"], "full_name": user.get("full_name"), "email": data.email, "role": user.get("role")},
        "password_reset_request",
        "auth",
        entity_id=reset_request["id"],
        details={"email": data.email}
    )
    
    logger.info(f"Password reset requested for {data.email}")
    
    return {"message": "Password reset request submitted. Please contact your administrator."}

@api_router.get("/auth/password-reset-requests")
async def get_password_reset_requests(
    status: Optional[str] = None,
    user = Depends(require_roles(["super_admin"]))
):
    """Get all password reset requests (Super Admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.password_reset_requests.find(query, {"_id": 0}).sort("requested_at", -1).to_list(100)
    return {"requests": requests, "total": len(requests)}

class ProcessResetRequest(BaseModel):
    action: str  # approve, reject
    new_password: Optional[str] = None
    notes: Optional[str] = None

@api_router.put("/auth/password-reset-requests/{request_id}")
async def process_password_reset(request_id: str, data: ProcessResetRequest, user = Depends(require_roles(["super_admin"]))):
    """Process a password reset request (Super Admin only)"""
    reset_request = await db.password_reset_requests.find_one({"id": request_id})
    if not reset_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if reset_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if data.action == "approve":
        if not data.new_password:
            raise HTTPException(status_code=400, detail="New password is required for approval")
        
        # Update user's password
        target_user = await db.users.find_one({"id": reset_request["user_id"]})
        if target_user:
            hashed = hash_password(data.new_password)
            await db.users.update_one(
                {"id": reset_request["user_id"]},
                {"$set": {"password": hashed, "updated_at": now}}
            )
        
        # Update request
        await db.password_reset_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "processed_at": now,
                "processed_by": user["id"],
                "processed_by_name": user.get("full_name"),
                "new_password": data.new_password,  # Store for admin reference
                "notes": data.notes
            }}
        )
        
        # Audit log
        await log_audit(
            user,
            "password_reset_approved",
            "auth",
            entity_id=request_id,
            entity_name=reset_request["user_email"],
            details={"user_id": reset_request["user_id"], "approved_by": user.get("full_name")}
        )
        
        return {"message": f"Password reset approved for {reset_request['user_email']}"}
    
    elif data.action == "reject":
        await db.password_reset_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "processed_at": now,
                "processed_by": user["id"],
                "processed_by_name": user.get("full_name"),
                "notes": data.notes
            }}
        )
        
        # Audit log
        await log_audit(
            user,
            "password_reset_rejected",
            "auth",
            entity_id=request_id,
            entity_name=reset_request["user_email"],
            details={"user_id": reset_request["user_id"], "rejected_by": user.get("full_name")}
        )
        
        return {"message": f"Password reset rejected for {reset_request['user_email']}"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

# ==================== DEPARTMENT MANAGEMENT ====================

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(user = Depends(get_current_user)):
    departments = await db.departments.find({}, {"_id": 0}).to_list(100)
    
    # Add head name and member count
    for dept in departments:
        if dept.get("head_id"):
            head = await db.users.find_one({"id": dept["head_id"]})
            dept["head_name"] = head.get("full_name") if head else None
        dept["member_count"] = await db.users.count_documents({"department": dept["name"]})
    
    return departments

@api_router.post("/departments", response_model=DepartmentResponse)
async def create_department(data: DepartmentCreate, user = Depends(require_roles(["super_admin"]))):
    existing = await db.departments.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    
    new_dept = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.departments.insert_one(new_dept)
    await log_activity("department", new_dept["id"], "created", user, {"name": data.name})
    
    return {k: v for k, v in new_dept.items() if k != "_id"}

@api_router.put("/departments/{dept_id}")
async def update_department(dept_id: str, data: Dict, user = Depends(get_current_user)):
    existing = await db.departments.find_one({"id": dept_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # If not super_admin, create approval request
    if user.get("role") != "super_admin":
        approval = {
            "id": str(uuid.uuid4()),
            "request_type": "department_change",
            "entity_type": "department",
            "entity_id": dept_id,
            "requested_by": user["id"],
            "requested_by_name": user["full_name"],
            "changes": data,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.approval_requests.insert_one(approval)
        
        # Notify super admins
        super_admins = await db.users.find({"role": "super_admin"}).to_list(100)
        for admin in super_admins:
            await create_notification(
                admin["id"],
                "Approval Required",
                f"{user['full_name']} requested changes to {existing['name']} department",
                "warning",
                f"/admin/approvals/{approval['id']}"
            )
        
        return {"message": "Change request submitted for approval", "approval_id": approval["id"]}
    
    # Super admin can update directly
    update_data = {k: v for k, v in data.items() if k not in ["id", "created_at", "_id"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.departments.update_one({"id": dept_id}, {"$set": update_data})
    await log_activity("department", dept_id, "updated", user, update_data)
    
    updated = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    return updated

# ==================== COURSE MANAGEMENT ====================

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(category: Optional[str] = None, user = Depends(get_current_user)):
    query = {}
    if category:
        query["category"] = category
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(100)
    return courses

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(data: CourseCreate, user = Depends(require_roles(["super_admin", "admin"]))):
    existing = await db.courses.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Course code already exists")
    
    new_course = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.courses.insert_one(new_course)
    await log_activity("course", new_course["id"], "created", user, {"name": data.name})
    
    return {k: v for k, v in new_course.items() if k != "_id"}

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: Dict, user = Depends(require_roles(["super_admin", "admin"]))):
    existing = await db.courses.find_one({"id": course_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = {k: v for k, v in data.items() if k not in ["id", "created_at", "_id"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    await log_activity("course", course_id, "updated", user, update_data)
    
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return updated

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user = Depends(require_roles(["super_admin"]))):
    result = await db.courses.delete_one({"id": course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await log_activity("course", course_id, "deleted", user)
    return {"message": "Course deleted"}

# ==================== COMMISSION RULES ====================

@api_router.get("/commission-rules", response_model=List[CommissionRuleResponse])
async def get_commission_rules(role: Optional[str] = None, user = Depends(get_current_user)):
    query = {}
    if role:
        query["role"] = role
    
    rules = await db.commission_rules.find(query, {"_id": 0}).to_list(100)
    
    # Add course names
    for rule in rules:
        if rule.get("course_id"):
            course = await db.courses.find_one({"id": rule["course_id"]})
            rule["course_name"] = course.get("name") if course else None
    
    return rules

@api_router.post("/commission-rules", response_model=CommissionRuleResponse)
async def create_commission_rule(data: CommissionRuleCreate, user = Depends(require_roles(["super_admin", "admin"]))):
    new_rule = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.commission_rules.insert_one(new_rule)
    await log_activity("commission_rule", new_rule["id"], "created", user, {"name": data.name})
    
    return {k: v for k, v in new_rule.items() if k != "_id"}

@api_router.put("/commission-rules/{rule_id}")
async def update_commission_rule(rule_id: str, data: Dict, user = Depends(require_roles(["super_admin", "admin"]))):
    existing = await db.commission_rules.find_one({"id": rule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commission rule not found")
    
    update_data = {k: v for k, v in data.items() if k not in ["id", "created_at", "_id"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.commission_rules.update_one({"id": rule_id}, {"$set": update_data})
    await log_activity("commission_rule", rule_id, "updated", user, update_data)
    
    updated = await db.commission_rules.find_one({"id": rule_id}, {"_id": 0})
    return updated

@api_router.delete("/commission-rules/{rule_id}")
async def delete_commission_rule(rule_id: str, user = Depends(require_roles(["super_admin"]))):
    result = await db.commission_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commission rule not found")
    
    await log_activity("commission_rule", rule_id, "deleted", user)
    return {"message": "Commission rule deleted"}

# ==================== COMMISSIONS ====================

@api_router.get("/commissions")
async def get_commissions(
    user_id: Optional[str] = None,
    month: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    query = {}
    
    # If not admin/super_admin, only show own commissions
    if user.get("role") not in ["super_admin", "admin", "finance"]:
        query["user_id"] = user["id"]
    elif user_id:
        query["user_id"] = user_id
    
    if month:
        query["month"] = month
    if status:
        query["status"] = status
    
    commissions = await db.commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Add user and course names, and normalize field names
    for comm in commissions:
        comm_user = await db.users.find_one({"id": comm.get("user_id")})
        comm["user_name"] = comm_user.get("full_name") if comm_user else None
        
        course = await db.courses.find_one({"id": comm.get("course_id")})
        comm["course_name"] = course.get("name") if course else None
        
        # Normalize amount field (some records have commission_amount, ensure amount exists)
        if "amount" not in comm and "commission_amount" in comm:
            comm["amount"] = comm["commission_amount"]
        
        # Normalize sale_type
        if "sale_type" not in comm and "commission_type" in comm:
            comm["sale_type"] = comm["commission_type"]
    
    return commissions

@api_router.get("/commissions/summary")
async def get_commission_summary(user_id: Optional[str] = None, user = Depends(get_current_user)):
    # Determine which user's commissions to show
    target_user_id = user_id if user.get("role") in ["super_admin", "admin", "finance"] else user["id"]
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Current month commissions
    current_month_pipeline = [
        {"$match": {"user_id": target_user_id, "month": current_month}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}, "count": {"$sum": 1}}}
    ]
    current_result = await db.commissions.aggregate(current_month_pipeline).to_list(1)
    
    # All time commissions
    all_time_pipeline = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}, "count": {"$sum": 1}}}
    ]
    all_time_result = await db.commissions.aggregate(all_time_pipeline).to_list(1)
    
    # By commission type
    by_type_pipeline = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$commission_type", "total": {"$sum": "$commission_amount"}, "count": {"$sum": 1}}}
    ]
    by_type_result = await db.commissions.aggregate(by_type_pipeline).to_list(100)
    
    # By month (last 6 months)
    by_month_pipeline = [
        {"$match": {"user_id": target_user_id}},
        {"$group": {"_id": "$month", "total": {"$sum": "$commission_amount"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 6}
    ]
    by_month_result = await db.commissions.aggregate(by_month_pipeline).to_list(6)
    
    return {
        "current_month": {
            "total": current_result[0]["total"] if current_result else 0,
            "count": current_result[0]["count"] if current_result else 0
        },
        "all_time": {
            "total": all_time_result[0]["total"] if all_time_result else 0,
            "count": all_time_result[0]["count"] if all_time_result else 0
        },
        "by_type": {r["_id"]: {"total": r["total"], "count": r["count"]} for r in by_type_result},
        "by_month": [{"month": r["_id"], "total": r["total"], "count": r["count"]} for r in by_month_result]
    }

# ==================== COMMISSION SETTLEMENTS ====================

@api_router.get("/commission-settlements")
async def get_commission_settlements(user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Get all commission settlements"""
    settlements = await db.commission_settlements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return settlements

@api_router.post("/commission-settlements")
async def create_commission_settlement(
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Create a commission settlement batch to mark commissions as paid"""
    commission_ids = data.get("commission_ids", [])
    payment_reference = data.get("payment_reference", "")
    
    if not commission_ids:
        raise HTTPException(status_code=400, detail="No commissions selected")
    
    # Get selected commissions
    commissions = await db.commissions.find(
        {"id": {"$in": commission_ids}, "status": "pending"},
        {"_id": 0}
    ).to_list(len(commission_ids))
    
    if not commissions:
        raise HTTPException(status_code=400, detail="No pending commissions found")
    
    total_amount = sum(c.get("commission_amount", 0) for c in commissions)
    now = datetime.now(timezone.utc)
    
    # Create settlement record
    settlement = {
        "id": str(uuid.uuid4()),
        "commission_ids": [c["id"] for c in commissions],
        "commission_count": len(commissions),
        "total_amount": total_amount,
        "payment_reference": payment_reference,
        "status": "paid",
        "created_by": user["id"],
        "created_by_name": user["full_name"],
        "created_at": now.isoformat()
    }
    
    await db.commission_settlements.insert_one(settlement)
    
    # Update commission statuses to paid
    await db.commissions.update_many(
        {"id": {"$in": commission_ids}},
        {"$set": {"status": "paid", "paid_at": now.isoformat(), "settlement_id": settlement["id"]}}
    )
    
    await log_activity("commission_settlement", settlement["id"], "created", user, {
        "commission_count": len(commissions),
        "total_amount": total_amount
    })
    
    return settlement

# ==================== APPROVAL REQUESTS ====================

@api_router.get("/approval-requests")
async def get_approval_requests(status: Optional[str] = None, user = Depends(require_roles(["super_admin", "admin"]))):
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.approval_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.put("/approval-requests/{request_id}/approve")
async def approve_request(request_id: str, user = Depends(require_roles(["super_admin"]))):
    request = await db.approval_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Apply the changes
    entity_type = request["entity_type"]
    entity_id = request["entity_id"]
    changes = request["changes"]
    
    collection_map = {
        "department": db.departments,
        "user": db.users,
        "course": db.courses,
        "commission_rule": db.commission_rules
    }
    
    collection = collection_map.get(entity_type)
    if collection:
        changes["updated_at"] = datetime.now(timezone.utc).isoformat()
        await collection.update_one({"id": entity_id}, {"$set": changes})
    
    # Update request status
    await db.approval_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "approved_by": user["id"],
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify requester
    await create_notification(
        request["requested_by"],
        "Request Approved",
        f"Your {request['request_type']} request has been approved",
        "success"
    )
    
    return {"message": "Request approved"}

@api_router.put("/approval-requests/{request_id}/reject")
async def reject_request(request_id: str, reason: str = "", user = Depends(require_roles(["super_admin"]))):
    request = await db.approval_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.approval_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "approved_by": user["id"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason
        }}
    )
    
    # Notify requester
    await create_notification(
        request["requested_by"],
        "Request Rejected",
        f"Your {request['request_type']} request has been rejected. Reason: {reason}",
        "error"
    )
    
    return {"message": "Request rejected"}

# ==================== USER MANAGEMENT ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    user = Depends(require_roles(["super_admin", "admin", "sales_manager", "cs_head"]))
):
    query = {}
    if role:
        query["role"] = role
    if department:
        query["department"] = department
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(500)
    return users

@api_router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, user = Depends(require_roles(["super_admin", "admin"]))):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Set default permissions based on role
    default_permissions = get_default_permissions(data.role)
    default_entity_access = get_default_entity_access(data.role)
    
    user_uuid = str(uuid.uuid4())
    employee_uuid = None
    
    new_user = {
        "id": user_uuid,
        **data.model_dump(exclude={"create_employee_record", "designation", "joining_date", "employment_type", "work_location"}),
        "password": hash_password(data.password),
        "permissions": data.permissions or default_permissions,
        "entity_access": data.entity_access or default_entity_access,
        "created_at": now,
        "updated_at": now
    }
    
    # Create employee record if requested
    if data.create_employee_record:
        # Check if email already exists in employees
        existing_employee = await db.hr_employees.find_one({"company_email": data.email})
        if existing_employee:
            raise HTTPException(status_code=400, detail="Email already exists in employee records")
        
        # Generate employee ID
        last_emp = await db.hr_employees.find_one(sort=[("employee_id", -1)])
        if last_emp and last_emp.get("employee_id"):
            try:
                last_num = int(last_emp["employee_id"].replace("CLT-", ""))
                new_num = last_num + 1
            except:
                new_num = 1
        else:
            new_num = 1
        employee_id = f"CLT-{str(new_num).zfill(3)}"
        
        employee_uuid = str(uuid.uuid4())
        
        employee_record = {
            "id": employee_uuid,
            "employee_id": employee_id,
            "full_name": data.full_name,
            "company_email": data.email,
            "department": data.department,
            "designation": data.designation or data.role.replace("_", " ").title(),
            "role": data.role,
            "employment_type": data.employment_type or "full_time",
            "work_location": data.work_location or "Office",
            "joining_date": data.joining_date or now[:10],
            "employment_status": "active",
            "mobile_number": data.phone,
            "user_id": user_uuid,
            "probation_days": 90,
            "notice_period_days": 30,
            "annual_leave_balance": 30.0,
            "sick_leave_balance": 15.0,
            "documents": [],
            "created_at": now,
            "updated_at": now,
            "created_by": user["id"],
            "created_by_name": user["full_name"],
            "created_via": "user_management"
        }
        
        await db.hr_employees.insert_one(employee_record)
        
        # Link user to employee
        new_user["employee_id"] = employee_uuid
        
        # Audit log for employee creation
        await db.hr_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "entity_type": "employee",
            "entity_id": employee_uuid,
            "action": "create_from_user",
            "user_id": user["id"],
            "user_name": user["full_name"],
            "timestamp": now,
            "changes": {
                "employee_created": True,
                "source": "user_management",
                "user_id": user_uuid
            }
        })
    
    await db.users.insert_one(new_user)
    await log_activity("user", new_user["id"], "created", user, {"email": data.email})
    
    # Audit log for user creation
    await log_audit(
        user,
        "create",
        "user",
        entity_id=new_user["id"],
        entity_name=data.full_name,
        details={
            "email": data.email, 
            "role": data.role, 
            "department": data.department,
            "employee_record_created": data.create_employee_record
        }
    )
    
    return {k: v for k, v in new_user.items() if k != "password" and k != "_id"}

def get_default_permissions(role: str) -> Dict[str, str]:
    """Get default permissions for a role"""
    permissions = {module: "none" for module in MODULES}
    
    if role == "super_admin":
        permissions = {module: "full" for module in MODULES}
    elif role == "admin":
        permissions = {module: "full" for module in MODULES}
        permissions["settings"] = "edit"
    elif role in ["sales_manager", "team_leader"]:
        permissions["dashboard"] = "view"
        permissions["sales_crm"] = "full"
        permissions["reports"] = "view"
        permissions["settings"] = "view"
    elif role == "sales_executive":
        permissions["dashboard"] = "view"
        permissions["sales_crm"] = "edit"
        permissions["settings"] = "view"
    elif role == "cs_head":
        permissions["dashboard"] = "view"
        permissions["customer_service"] = "full"
        permissions["reports"] = "view"
        permissions["settings"] = "view"
    elif role == "cs_agent":
        permissions["dashboard"] = "view"
        permissions["customer_service"] = "edit"
        permissions["settings"] = "view"
    elif role in ["mentor", "academic_master"]:
        permissions["dashboard"] = "view"
        permissions["mentor_crm"] = "edit"
        permissions["settings"] = "view"
    elif role == "finance":
        permissions["dashboard"] = "view"
        permissions["finance"] = "full"
        permissions["reports"] = "view"
        permissions["commission_engine"] = "view"
        permissions["settings"] = "view"
    # New Finance-specific roles
    elif role == "finance_manager":
        permissions["dashboard"] = "view"
        permissions["finance"] = "full"
        permissions["reports"] = "full"
        permissions["commission_engine"] = "full"
        permissions["settings"] = "view"
    elif role == "finance_admin":
        permissions["dashboard"] = "view"
        permissions["finance"] = "full"
        permissions["reports"] = "edit"
        permissions["commission_engine"] = "edit"
        permissions["settings"] = "view"
    elif role == "finance_treasurer":
        permissions["dashboard"] = "view"
        permissions["finance"] = "edit"
        permissions["reports"] = "view"
        permissions["settings"] = "view"
    elif role == "finance_verifier":
        permissions["dashboard"] = "view"
        permissions["finance"] = "edit"
        permissions["reports"] = "view"
        permissions["settings"] = "view"
    elif role == "financier":
        permissions["dashboard"] = "view"
        permissions["finance"] = "edit"
        permissions["reports"] = "view"
        permissions["settings"] = "view"
    elif role == "accounts":
        permissions["dashboard"] = "view"
        permissions["finance"] = "full"
        permissions["reports"] = "view"
        permissions["commission_engine"] = "view"
        permissions["settings"] = "view"
    elif role == "hr":
        permissions["dashboard"] = "view"
        permissions["user_management"] = "edit"
        permissions["department_management"] = "view"
        permissions["settings"] = "view"
    
    return permissions

def get_default_entity_access(role: str) -> List[str]:
    """Get default entity access (CLT/MILES) based on role"""
    return FINANCE_ROLE_ACCESS.get(role, ["clt", "miles"])

# ==================== USER PREFERENCES ====================
# Note: These routes MUST be placed BEFORE /users/{user_id} to avoid route collision

class UserPreferencesUpdate(BaseModel):
    notification_sound_enabled: Optional[bool] = None

@api_router.get("/users/preferences")
async def get_user_preferences(user = Depends(get_current_user)):
    """Get current user's preferences"""
    return {
        "notification_sound_enabled": user.get("notification_sound_enabled", True)
    }

@api_router.put("/users/preferences")
async def update_user_preferences(data: UserPreferencesUpdate, user = Depends(get_current_user)):
    """Update current user's preferences"""
    update_data = {}
    
    if data.notification_sound_enabled is not None:
        update_data["notification_sound_enabled"] = data.notification_sound_enabled
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: Dict, user = Depends(get_current_user)):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Capture old values for audit
    old_values = {k: v for k, v in existing.items() if k in data and k not in ["_id", "password"]}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Permission-based field access
    user_role = user.get("role")
    
    # Super admin and admin can update all fields
    if user_role in ["super_admin", "admin"]:
        # All fields allowed
        pass
    elif user_role in ["sales_manager", "team_leader"]:
        # Can update team-related fields for their team members
        allowed_fields = ["phone", "region", "team_leader_id", "threecx_extension"]
        data = {k: v for k, v in data.items() if k in allowed_fields}
    elif user_role == "hr":
        # HR can update HR-related fields
        allowed_fields = ["phone", "region", "department", "designation", "is_active"]
        data = {k: v for k, v in data.items() if k in allowed_fields}
    else:
        # Regular users can only update their own basic fields
        allowed_fields = ["phone", "region"]
        data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not data:
            # Create approval request for other changes
            approval = {
                "id": str(uuid.uuid4()),
                "request_type": "user_change",
                "entity_type": "user",
                "entity_id": user_id,
                "requested_by": user["id"],
                "requested_by_name": user["full_name"],
                "changes": data,
                "status": "pending",
                "created_at": now
            }
            await db.approval_requests.insert_one(approval)
            return {"message": "Change request submitted for approval"}
    
    update_data = {k: v for k, v in data.items() if k not in ["id", "created_at", "_id"]}
    if "password" in update_data:
        update_data["password"] = hash_password(update_data["password"])
    update_data["updated_at"] = now
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    await log_activity("user", user_id, "updated", user, update_data)
    
    # BIDIRECTIONAL SYNC: Sync changes with linked employee record
    employee_id = existing.get("employee_id")
    if employee_id:
        employee_update = {}
        
        # Sync is_active status -> employment_status
        if "is_active" in data:
            if not data["is_active"]:
                employee_update["employment_status"] = "terminated"
                employee_update["termination_date"] = now[:10]
            else:
                employee_update["employment_status"] = "active"
                employee_update["termination_date"] = None
        
        # Sync department
        if "department" in data:
            employee_update["department"] = data["department"]
        
        # Sync role
        if "role" in data:
            employee_update["role"] = data["role"]
        
        # Sync full_name
        if "full_name" in data:
            employee_update["full_name"] = data["full_name"]
        
        # Sync phone
        if "phone" in data:
            employee_update["mobile_number"] = data["phone"]
        
        if employee_update:
            employee_update["updated_at"] = now
            await db.hr_employees.update_one(
                {"id": employee_id},
                {"$set": employee_update}
            )
            
            # Audit log for employee sync
            await db.hr_audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "entity_type": "employee",
                "entity_id": employee_id,
                "action": "sync_from_user",
                "user_id": user["id"],
                "user_name": user["full_name"],
                "timestamp": now,
                "changes": employee_update
            })
    
    # Audit log for user update
    await log_audit(
        user,
        "update",
        "user",
        entity_id=user_id,
        entity_name=existing.get("full_name"),
        changes={"old": old_values, "new": {k: v for k, v in data.items() if k not in ["password", "_id"]}}
    )
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user = Depends(require_roles(["super_admin"]))):
    existing = await db.users.find_one({"id": user_id})
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # BIDIRECTIONAL SYNC: Mark linked employee as terminated when user is deleted
    employee_id = existing.get("employee_id") if existing else None
    if employee_id:
        await db.hr_employees.update_one(
            {"id": employee_id},
            {"$set": {
                "employment_status": "terminated",
                "termination_date": now[:10],
                "updated_at": now
            }}
        )
        
        # Audit log for employee termination
        await db.hr_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "entity_type": "employee",
            "entity_id": employee_id,
            "action": "terminated_from_user_deletion",
            "user_id": user["id"],
            "user_name": user["full_name"],
            "timestamp": now,
            "changes": {"employment_status": "terminated", "reason": "user_account_deleted"}
        })
    
    await log_activity("user", user_id, "deleted", user)
    
    # Audit log for user deletion
    await log_audit(
        user,
        "delete",
        "user",
        entity_id=user_id,
        entity_name=existing.get("full_name") if existing else None,
        details={"email": existing.get("email") if existing else None, "role": existing.get("role") if existing else None}
    )
    
    return {"message": "User deleted"}

# ==================== TEAMS MANAGEMENT ====================

@api_router.get("/teams")
async def get_teams(
    department: Optional[str] = None,
    active_only: bool = True,
    user = Depends(require_roles(["super_admin", "admin", "sales_manager", "team_leader", "cs_head"]))
):
    """Get all teams, optionally filtered by department"""
    query = {}
    if department:
        query["department"] = department
    if active_only:
        query["active"] = {"$ne": False}
    
    teams = await db.teams.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Enrich with leader name and member count
    for team in teams:
        if team.get("leader_id"):
            leader = await db.users.find_one({"id": team["leader_id"]})
            team["leader_name"] = leader.get("full_name") if leader else None
        
        # Count members
        member_count = await db.users.count_documents({"team_id": team["id"], "active": {"$ne": False}})
        team["member_count"] = member_count
    
    return teams

@api_router.post("/teams")
async def create_team(
    team: TeamCreate,
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Create a new team"""
    # Check if team name already exists in department
    existing = await db.teams.find_one({"name": team.name, "department": team.department})
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists in this department")
    
    now = datetime.now(timezone.utc)
    team_data = {
        "id": str(uuid.uuid4()),
        "name": team.name,
        "department": team.department,
        "description": team.description,
        "leader_id": None,
        "active": True,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.teams.insert_one(team_data)
    
    await log_activity("team", team_data["id"], "created", user, {"name": team.name})
    
    # Return without _id
    team_data.pop("_id", None)
    return team_data

@api_router.get("/teams/{team_id}")
async def get_team(team_id: str, user = Depends(get_current_user)):
    """Get a specific team with members"""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get leader info
    if team.get("leader_id"):
        leader = await db.users.find_one({"id": team["leader_id"]})
        team["leader_name"] = leader.get("full_name") if leader else None
        team["leader_email"] = leader.get("email") if leader else None
    
    # Get team members
    members = await db.users.find(
        {"team_id": team_id, "active": {"$ne": False}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    team["members"] = members
    team["member_count"] = len(members)
    
    return team

@api_router.put("/teams/{team_id}")
async def update_team(
    team_id: str,
    team_update: TeamUpdate,
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Update a team"""
    existing = await db.teams.find_one({"id": team_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = {k: v for k, v in team_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If setting a new leader, verify they exist and update their role
    if "leader_id" in update_data and update_data["leader_id"]:
        new_leader = await db.users.find_one({"id": update_data["leader_id"]})
        if not new_leader:
            raise HTTPException(status_code=400, detail="Leader user not found")
        
        # Update the leader's team_id and role if needed
        await db.users.update_one(
            {"id": update_data["leader_id"]},
            {"$set": {"team_id": team_id, "role": "team_leader", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    await log_activity("team", team_id, "updated", user, update_data)
    
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated

@api_router.delete("/teams/{team_id}")
async def delete_team(
    team_id: str,
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Delete (deactivate) a team"""
    existing = await db.teams.find_one({"id": team_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if team has members
    member_count = await db.users.count_documents({"team_id": team_id})
    if member_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete team with {member_count} members. Reassign members first.")
    
    await db.teams.update_one(
        {"id": team_id},
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_activity("team", team_id, "deleted", user)
    
    return {"message": "Team deactivated"}

@api_router.post("/teams/{team_id}/members")
async def add_team_member(
    team_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "sales_manager"]))
):
    """Add a user to a team"""
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    member = await db.users.find_one({"id": user_id})
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user's team
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "team_id": team_id,
            "team_leader_id": team.get("leader_id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_activity("team", team_id, "member_added", user, {"member_id": user_id, "member_name": member.get("full_name")})
    
    return {"message": f"User {member.get('full_name')} added to team {team.get('name')}"}

@api_router.delete("/teams/{team_id}/members/{member_id}")
async def remove_team_member(
    team_id: str,
    member_id: str,
    user = Depends(require_roles(["super_admin", "admin", "sales_manager"]))
):
    """Remove a user from a team"""
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    member = await db.users.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove user from team
    await db.users.update_one(
        {"id": member_id},
        {"$set": {
            "team_id": None,
            "team_leader_id": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_activity("team", team_id, "member_removed", user, {"member_id": member_id, "member_name": member.get("full_name")})
    
    return {"message": f"User {member.get('full_name')} removed from team {team.get('name')}"}

# ==================== LEADS (SALES CRM) ====================

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    team_id: Optional[str] = None,
    search: Optional[str] = None,
    user = Depends(get_current_user)
):
    query = {}
    
    # Role-based filtering
    role = user["role"]
    
    if role == "sales_executive":
        # Sales executives only see their own leads
        query["assigned_to"] = user["id"]
    elif role == "team_leader":
        # Team leaders see their team's leads + their own
        # Get members of their team
        team_members = await db.users.find({
            "$or": [
                {"team_leader_id": user["id"]},
                {"team_id": user.get("team_id")}
            ]
        }).to_list(100)
        team_ids = [t["id"] for t in team_members] + [user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    elif role == "sales_manager":
        # Sales managers can filter by team or see all
        if team_id:
            team_members = await db.users.find({"team_id": team_id}).to_list(100)
            team_ids = [t["id"] for t in team_members]
            if team_ids:
                query["assigned_to"] = {"$in": team_ids}
    # super_admin and admin see all leads
    
    if stage:
        query["stage"] = stage
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for lead in leads:
        if lead.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": lead["assigned_to"]})
            lead["assigned_to_name"] = assigned_user.get("full_name") if assigned_user else None
        
        if lead.get("course_id"):
            course = await db.courses.find_one({"id": lead["course_id"]})
            lead["course_name"] = course.get("name") if course else None
        
        # Real-time SLA check using new logic
        sla_update = await check_lead_sla(lead)
        if sla_update:
            lead.update(sla_update)
    
    return leads

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(data: LeadCreate, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    existing = await db.leads.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(status_code=400, detail=f"Lead with this phone already exists. Assigned to: {existing.get('assigned_to_name', 'Unknown')}")
    
    region = "international"
    if data.phone.startswith("+971") or data.phone.startswith("971"):
        region = "UAE"
    elif data.phone.startswith("+91") or data.phone.startswith("91"):
        region = "India"
    
    assigned_agent = await get_round_robin_agent("sales_executive", region)
    now = datetime.now(timezone.utc).isoformat()
    
    new_lead = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "stage": "new_lead",
        "assigned_to": assigned_agent["id"] if assigned_agent else None,
        "assigned_to_name": assigned_agent["full_name"] if assigned_agent else None,
        "assigned_at": now if assigned_agent else None,  # Track when assigned for SLA
        "first_contact_at": None,  # Will be set when first contacted
        "sla_status": "ok",
        "sla_warning_level": 0,
        "sla_warning_at": None,
        "sla_breach": False,
        "in_pool": not bool(assigned_agent),  # True if no agent available
        "call_recording_url": None,  # 3CX placeholder
        "created_at": now,
        "updated_at": now,
        "last_activity": now
    }
    
    await db.leads.insert_one(new_lead)
    await log_activity("lead", new_lead["id"], "created", user, {"phone": data.phone})
    
    if assigned_agent:
        await create_notification(
            assigned_agent["id"],
            "New Lead Assigned",
            f"You have been assigned a new lead: {data.full_name}. Contact within 60 mins!",
            "info",
            f"/sales/leads/{new_lead['id']}",
            entity_type="lead",
            entity_id=new_lead["id"]
        )
    
    return {k: v for k, v in new_lead.items() if k != "_id"}

@api_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, data: LeadUpdate, user = Depends(get_current_user)):
    existing = await db.leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    now = datetime.now(timezone.utc)
    
    # Track first contact - when stage changes from new_lead
    if "stage" in update_data and existing.get("stage") == "new_lead" and update_data["stage"] != "new_lead":
        if not existing.get("first_contact_at"):
            update_data["first_contact_at"] = now.isoformat()
        # Reset SLA on first contact
        update_data["sla_status"] = "ok"
        update_data["sla_breach"] = False
        update_data["sla_warning_level"] = 0
        update_data["sla_warning_at"] = None
    
    # Any activity resets inactive SLA warning
    if existing.get("sla_warning_level", 0) > 0 and existing.get("stage") != "new_lead":
        update_data["sla_status"] = "ok"
        update_data["sla_warning_level"] = 0
        update_data["sla_warning_at"] = None
    
    if "stage" in update_data:
        if update_data["stage"] not in LEAD_STAGES:
            raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {LEAD_STAGES}")
        
        if update_data["stage"] == "rejected" and not update_data.get("rejection_reason"):
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        # Require course interest for pipeline stages (warm_lead onwards)
        pipeline_stages_requiring_course = ["warm_lead", "hot_lead", "in_progress"]
        if update_data["stage"] in pipeline_stages_requiring_course:
            interested_course = update_data.get("interested_course_id") or existing.get("interested_course_id")
            if not interested_course:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Please select the course/package the client is interested in when moving to {update_data['stage'].replace('_', ' ').title()}"
                )
            
            # Auto-set estimated value from course price if not provided
            if not update_data.get("estimated_value") and not existing.get("estimated_value"):
                course = await db.courses.find_one({"id": interested_course}, {"_id": 0, "base_price": 1, "name": 1})
                if course:
                    update_data["estimated_value"] = course.get("base_price", 0)
                    update_data["interested_course_name"] = course.get("name")
        
        if update_data["stage"] == "enrolled":
            # Calculate commission for sales executive
            sale_amount = update_data.get("sale_amount") or existing.get("sale_amount", 0)
            course_id = update_data.get("course_id") or existing.get("course_id")
            
            if existing.get("assigned_to") and sale_amount > 0:
                assigned_user = await db.users.find_one({"id": existing["assigned_to"]})
                if assigned_user:
                    await calculate_commission(
                        assigned_user["id"],
                        str(uuid.uuid4()),
                        sale_amount,
                        course_id,
                        "fresh_sale",
                        assigned_user["role"]
                    )
                    
                    # Also calculate for team leader if exists
                    if assigned_user.get("team_leader_id"):
                        team_leader = await db.users.find_one({"id": assigned_user["team_leader_id"]})
                        if team_leader:
                            await calculate_commission(
                                team_leader["id"],
                                str(uuid.uuid4()),
                                sale_amount,
                                course_id,
                                "fresh_sale",
                                team_leader["role"]
                            )
            
            # Create student record with SLA tracking
            student_data = {
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "full_name": existing["full_name"],
                "phone": existing["phone"],
                "email": existing.get("email"),
                "country": existing.get("country"),
                "package_bought": course_id,
                "stage": "new_student",
                "mentor_stage": "new_student",
                "onboarding_complete": False,
                "classes_attended": 0,
                "upgrade_eligible": False,
                "activation_call_at": None,  # CS SLA tracking
                "sla_status": "ok",
                "sla_warning_at": None,
                "call_recording_url": None,  # 3CX placeholder
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            cs_agent = await get_round_robin_agent("cs_agent")
            if cs_agent:
                student_data["cs_agent_id"] = cs_agent["id"]
                student_data["cs_agent_name"] = cs_agent["full_name"]
                await create_notification(
                    cs_agent["id"],
                    "New Student Assigned - URGENT",
                    f"New student enrolled: {existing['full_name']}. Make activation call within 15 mins!",
                    "warning",
                    f"/cs/students/{student_data['id']}"
                )
            
            await db.students.insert_one(student_data)
            
            # Create/update customer master record
            await create_or_update_customer(existing, student_data)
            
            # Create Finance Verification record for payment confirmation
            verification_record = {
                "id": str(uuid.uuid4()),
                "type": "enrollment_payment",
                "lead_id": lead_id,
                "student_id": student_data["id"],
                "customer_name": existing["full_name"],
                "phone": existing.get("phone"),
                "email": existing.get("email"),
                "course_id": course_id,
                "course_name": update_data.get("course_name") or update_data.get("interested_course_name") or existing.get("interested_course_name"),
                "sale_amount": sale_amount,
                "payment_method": update_data.get("payment_method"),
                "payment_date": update_data.get("payment_date"),
                "payment_proof": update_data.get("payment_proof"),  # Base64 encoded image
                "payment_proof_filename": update_data.get("payment_proof_filename"),
                "payment_notes": update_data.get("payment_notes"),
                # Split payment support
                "is_split_payment": update_data.get("is_split_payment", False),
                "payment_splits": update_data.get("payment_splits"),  # Array of {method, amount, transaction_id, phone_number, is_same_number, proof}
                # BNPL phone verification
                "bnpl_phone": update_data.get("bnpl_phone"),
                "bnpl_same_number": update_data.get("bnpl_same_number", True),
                "sales_executive_id": existing.get("assigned_to"),
                "sales_executive_name": existing.get("assigned_to_name"),
                "status": "pending_verification",  # pending_verification, verified, rejected
                "submitted_at": now.isoformat(),
                "verified_at": None,
                "verified_by": None,
                "verified_by_name": None,
                "rejection_reason": None,
                "transaction_id": update_data.get("transaction_id"),
                "notes": update_data.get("notes") or ""
            }
            await db.finance_verifications.insert_one(verification_record)
            
            # Notify finance team
            payment_method_label = {
                "bank_transfer": "Bank Transfer",
                "credit_card": "Credit Card",
                "cash": "Cash",
                "tabby": "Tabby (BNPL)",
                "tamara": "Tamara (BNPL)",
                "network": "Network International",
                "upi": "UPI/Mobile",
                "cheque": "Cheque"
            }.get(update_data.get("payment_method", "").lower(), update_data.get("payment_method", "N/A"))
            
            finance_users = await db.users.find(
                {"role": {"$in": ["finance", "admin", "super_admin"]}, "is_active": True},
                {"id": 1}
            ).to_list(100)
            for finance_user in finance_users:
                await create_notification(
                    finance_user["id"],
                    "New Enrollment - Payment Verification Required",
                    f"Student: {existing['full_name']} | Course: {update_data.get('interested_course_name') or 'N/A'} | Amount: AED {sale_amount:.2f} | Payment: {payment_method_label}. Verify payment in Finance queue.",
                    "warning",
                    f"/finance/verifications"
                )
            
            # Create automatic journal entry for the sale (accounting integration)
            payment_method = update_data.get("payment_method") or existing.get("payment_method", "bank_transfer")
            try:
                await create_sales_journal_entry(
                    sale_amount=sale_amount,
                    payment_method=payment_method,
                    customer_name=existing["full_name"],
                    lead_id=lead_id,
                    user_id=user["id"],
                    user_name=user["full_name"]
                )
            except Exception as e:
                print(f"Warning: Failed to create sales journal entry: {e}")
    
    update_data["updated_at"] = now.isoformat()
    update_data["last_activity"] = now.isoformat()
    
    # Capture changes for audit
    changes_for_audit = {}
    for key in update_data:
        if key not in ["updated_at", "last_activity"] and existing.get(key) != update_data.get(key):
            changes_for_audit[key] = {"old": existing.get(key), "new": update_data.get(key)}
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    await log_activity("lead", lead_id, "updated", user, update_data)
    
    # Audit log for lead update (only if meaningful changes)
    if changes_for_audit:
        await log_audit(
            user,
            "update",
            "lead",
            entity_id=lead_id,
            entity_name=existing.get("full_name"),
            changes=changes_for_audit,
            details={"phone": existing.get("phone"), "stage": update_data.get("stage", existing.get("stage"))}
        )
    
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user = Depends(require_roles(["super_admin", "admin", "sales_manager"]))):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await log_activity("lead", lead_id, "deleted", user)
    return {"message": "Lead deleted"}

# ==================== LEADS POOL (AGENTIC POOL) ====================

@api_router.get("/leads/pool")
async def get_leads_pool(user = Depends(get_current_user)):
    """Get all leads in the agentic pool (unassigned or returned)"""
    query = {
        "$or": [
            {"in_pool": True},
            {"assigned_to": None},
            {"assigned_to": ""}
        ],
        "stage": {"$nin": ["enrolled", "rejected"]}
    }
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads

@api_router.post("/leads/pool/{lead_id}/assign")
async def assign_lead_from_pool(lead_id: str, user_id: Optional[str] = None, user = Depends(get_current_user)):
    """Assign a lead from the pool to an agent (manual or round-robin)"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if not lead.get("in_pool") and lead.get("assigned_to"):
        raise HTTPException(status_code=400, detail="Lead is already assigned")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if user_id:
        # Manual assignment
        agent = await db.users.find_one({"id": user_id})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
    else:
        # Round-robin assignment
        region = "international"
        phone = lead.get("phone", "")
        if phone.startswith("+971") or phone.startswith("971"):
            region = "UAE"
        elif phone.startswith("+91") or phone.startswith("91"):
            region = "India"
        agent = await get_round_robin_agent("sales_executive", region)
        if not agent:
            raise HTTPException(status_code=400, detail="No available agents")
    
    update_data = {
        "assigned_to": agent["id"],
        "assigned_to_name": agent["full_name"],
        "assigned_at": now,
        "in_pool": False,
        "sla_status": "ok",
        "sla_warning_level": 0,
        "sla_warning_at": None,
        "sla_breach": False,
        "first_contact_at": None,  # Reset for new assignment
        "updated_at": now,
        "last_activity": now
    }
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    await log_activity("lead", lead_id, "assigned_from_pool", user, {"new_agent": agent["full_name"]})
    
    # Notify the agent
    await create_notification(
        agent["id"],
        "Lead Assigned from Pool",
        f"You have been assigned lead: {lead['full_name']}. Contact within 60 mins!",
        "info",
        f"/sales"
    )
    
    return {"message": f"Lead assigned to {agent['full_name']}", "assigned_to": agent["id"]}

@api_router.post("/leads/{lead_id}/return-to-pool")
async def return_lead_to_pool(lead_id: str, reason: str = "", user = Depends(get_current_user)):
    """Manually return a lead to the pool"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead.get("stage") in ["enrolled", "rejected"]:
        raise HTTPException(status_code=400, detail="Cannot return enrolled/rejected leads to pool")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "assigned_to": None,
        "assigned_to_name": None,
        "in_pool": True,
        "sla_status": "ok",
        "sla_warning_level": 0,
        "sla_warning_at": None,
        "updated_at": now
    }
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    await log_activity("lead", lead_id, "returned_to_pool", user, {"reason": reason})
    
    return {"message": "Lead returned to pool"}

# ==================== REMINDERS & FOLLOW-UPS ====================

@api_router.post("/leads/{lead_id}/reminder")
async def set_lead_reminder(lead_id: str, reminder_date: str, reminder_time: str, reminder_note: str = "", user = Depends(get_current_user)):
    """Set a reminder for a lead"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "reminder_date": reminder_date,
        "reminder_time": reminder_time,
        "reminder_note": reminder_note,
        "reminder_completed": False,
        "reminder_set_by": user["id"],
        "reminder_set_at": now,
        "updated_at": now
    }
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    await log_activity("lead", lead_id, "reminder_set", user, {"date": reminder_date, "time": reminder_time})
    
    return {"message": "Reminder set", "reminder_date": reminder_date, "reminder_time": reminder_time}

@api_router.post("/leads/{lead_id}/reminder/complete")
async def complete_lead_reminder(lead_id: str, user = Depends(get_current_user)):
    """Mark a lead reminder as completed"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"reminder_completed": True, "last_activity": now, "updated_at": now}}
    )
    
    return {"message": "Reminder completed"}

@api_router.delete("/leads/{lead_id}/reminder")
async def delete_lead_reminder(lead_id: str, user = Depends(get_current_user)):
    """Delete a lead reminder"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "reminder_date": None,
            "reminder_time": None,
            "reminder_note": None,
            "reminder_completed": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Reminder deleted"}

# =====================
# LEAD REASSIGNMENT WITH APPROVAL WORKFLOW
# =====================

@api_router.post("/leads/{lead_id}/reassignment-request")
async def request_lead_reassignment(
    lead_id: str, 
    data: LeadReassignmentRequest,
    user = Depends(require_roles(["team_leader", "sales_manager", "admin", "super_admin"]))
):
    """
    Request to reassign a lead to a different agent.
    Team Leaders must get approval from Sales Manager -> CEO
    Sales Managers must get approval from CEO
    Admin/Super Admin can reassign directly
    """
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get the new agent details
    new_agent = await db.users.find_one({"id": data.new_agent_id})
    if not new_agent:
        raise HTTPException(status_code=404, detail="New agent not found")
    
    # Get current agent details
    current_agent = None
    if data.current_agent_id:
        current_agent = await db.users.find_one({"id": data.current_agent_id})
    
    now = datetime.now(timezone.utc).isoformat()
    user_role = user.get("role")
    
    # Admin and Super Admin can reassign directly without approval
    if user_role in ["super_admin", "admin"]:
        # Direct reassignment
        await db.leads.update_one(
            {"id": lead_id},
            {"$set": {
                "assigned_to": data.new_agent_id,
                "assigned_to_name": new_agent["full_name"],
                "in_pool": False,
                "assigned_at": now,
                "updated_at": now
            }}
        )
        await log_activity("lead", lead_id, "reassigned", user, {
            "from": current_agent["full_name"] if current_agent else "Pool",
            "to": new_agent["full_name"],
            "reason": data.reason,
            "approved_by": "direct_admin"
        })
        return {
            "message": f"Lead reassigned to {new_agent['full_name']}",
            "status": "completed",
            "requires_approval": False
        }
    
    # Determine approval workflow
    # Team Leader -> Sales Manager -> CEO
    # Sales Manager -> CEO
    approval_chain = []
    
    if user_role == "team_leader":
        # Check if there's an active Sales Manager
        sales_manager = await db.users.find_one({"role": "sales_manager", "is_active": True})
        if sales_manager:
            approval_chain.append({
                "role": "sales_manager",
                "user_id": sales_manager["id"],
                "user_name": sales_manager["full_name"],
                "status": "pending"
            })
        # CEO is always in the chain
        ceo = await db.users.find_one({"role": "super_admin", "is_active": True})
        if ceo:
            approval_chain.append({
                "role": "ceo",
                "user_id": ceo["id"],
                "user_name": ceo["full_name"],
                "status": "pending"
            })
    elif user_role == "sales_manager":
        # Sales Manager only needs CEO approval
        ceo = await db.users.find_one({"role": "super_admin", "is_active": True})
        if ceo:
            approval_chain.append({
                "role": "ceo",
                "user_id": ceo["id"],
                "user_name": ceo["full_name"],
                "status": "pending"
            })
    
    if not approval_chain:
        raise HTTPException(status_code=400, detail="No approvers found in the system")
    
    # Create reassignment request
    request_id = str(uuid.uuid4())
    reassignment_request = {
        "id": request_id,
        "request_type": "lead_reassignment",
        "lead_id": lead_id,
        "lead_name": lead["full_name"],
        "lead_phone": lead["phone"],
        "current_agent_id": data.current_agent_id,
        "current_agent_name": current_agent["full_name"] if current_agent else "Pool",
        "new_agent_id": data.new_agent_id,
        "new_agent_name": new_agent["full_name"],
        "reason": data.reason,
        "requested_by": user["id"],
        "requested_by_name": user["full_name"],
        "requested_by_role": user_role,
        "approval_chain": approval_chain,
        "current_approval_step": 0,
        "status": "pending_approval",
        "created_at": now,
        "updated_at": now
    }
    
    await db.lead_reassignment_requests.insert_one(reassignment_request)
    await log_activity("lead", lead_id, "reassignment_requested", user, {
        "new_agent": new_agent["full_name"],
        "reason": data.reason
    })
    
    # Get first approver info
    first_approver = approval_chain[0]
    
    return {
        "message": f"Reassignment request submitted. Awaiting approval from {first_approver['user_name']} ({first_approver['role'].replace('_', ' ').title()})",
        "request_id": request_id,
        "status": "pending_approval",
        "requires_approval": True,
        "next_approver": first_approver
    }


@api_router.get("/leads/reassignment-requests")
async def get_reassignment_requests(
    status: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get lead reassignment requests based on user role"""
    user_role = user.get("role")
    user_id = user["id"]
    
    query = {}
    
    if user_role in ["super_admin", "admin"]:
        # Can see all requests
        pass
    elif user_role == "sales_manager":
        # Can see requests where they are in the approval chain
        query["$or"] = [
            {"approval_chain.user_id": user_id},
            {"requested_by": user_id}
        ]
    elif user_role == "team_leader":
        # Can only see their own requests
        query["requested_by"] = user_id
    else:
        return []
    
    if status:
        query["status"] = status
    
    requests = await db.lead_reassignment_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests


@api_router.get("/leads/reassignment-requests/pending")
async def get_pending_reassignment_approvals(user = Depends(get_current_user)):
    """Get reassignment requests pending the current user's approval"""
    user_role = user.get("role")
    user_id = user["id"]
    
    # Find requests where this user is the current approver
    pipeline = [
        {"$match": {"status": "pending_approval"}},
        {"$addFields": {
            "current_approver": {"$arrayElemAt": ["$approval_chain", "$current_approval_step"]}
        }},
        {"$match": {
            "$or": [
                {"current_approver.user_id": user_id},
                # Super admin (CEO) can approve if role is ceo
                {"$and": [
                    {"current_approver.role": "ceo"},
                    {"$expr": {"$eq": [user_role, "super_admin"]}}
                ]}
            ]
        }},
        {"$project": {"_id": 0}}
    ]
    
    requests = await db.lead_reassignment_requests.aggregate(pipeline).to_list(100)
    return requests


@api_router.post("/leads/reassignment-requests/{request_id}/approve")
async def approve_reassignment_request(
    request_id: str,
    user = Depends(get_current_user)
):
    """Approve a lead reassignment request"""
    request = await db.lead_reassignment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Request is already {request['status']}")
    
    user_role = user.get("role")
    user_id = user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Get current approval step
    current_step = request["current_approval_step"]
    approval_chain = request["approval_chain"]
    
    if current_step >= len(approval_chain):
        raise HTTPException(status_code=400, detail="Invalid approval step")
    
    current_approver = approval_chain[current_step]
    
    # Verify this user can approve
    can_approve = False
    if current_approver["user_id"] == user_id:
        can_approve = True
    elif current_approver["role"] == "ceo" and user_role == "super_admin":
        can_approve = True
    
    if not can_approve:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this request")
    
    # Update the approval chain
    approval_chain[current_step]["status"] = "approved"
    approval_chain[current_step]["approved_by"] = user_id
    approval_chain[current_step]["approved_by_name"] = user["full_name"]
    approval_chain[current_step]["approved_at"] = now
    
    # Check if this was the last approval
    next_step = current_step + 1
    
    if next_step >= len(approval_chain):
        # All approvals complete - execute the reassignment
        lead = await db.leads.find_one({"id": request["lead_id"]})
        if lead:
            await db.leads.update_one(
                {"id": request["lead_id"]},
                {"$set": {
                    "assigned_to": request["new_agent_id"],
                    "assigned_to_name": request["new_agent_name"],
                    "in_pool": False,
                    "assigned_at": now,
                    "updated_at": now
                }}
            )
            await log_activity("lead", request["lead_id"], "reassigned", user, {
                "from": request["current_agent_name"],
                "to": request["new_agent_name"],
                "reason": request["reason"],
                "approved_via": "approval_workflow"
            })
        
        await db.lead_reassignment_requests.update_one(
            {"id": request_id},
            {"$set": {
                "approval_chain": approval_chain,
                "status": "approved",
                "completed_at": now,
                "updated_at": now
            }}
        )
        
        return {
            "message": f"Reassignment approved and executed. Lead assigned to {request['new_agent_name']}",
            "status": "approved",
            "lead_reassigned": True
        }
    else:
        # Move to next approval step
        next_approver = approval_chain[next_step]
        
        await db.lead_reassignment_requests.update_one(
            {"id": request_id},
            {"$set": {
                "approval_chain": approval_chain,
                "current_approval_step": next_step,
                "updated_at": now
            }}
        )
        
        return {
            "message": f"Approved. Now pending approval from {next_approver['user_name']} ({next_approver['role'].replace('_', ' ').title()})",
            "status": "pending_approval",
            "next_approver": next_approver,
            "lead_reassigned": False
        }


@api_router.post("/leads/reassignment-requests/{request_id}/reject")
async def reject_reassignment_request(
    request_id: str,
    rejection_reason: str = "",
    user = Depends(get_current_user)
):
    """Reject a lead reassignment request"""
    request = await db.lead_reassignment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Request is already {request['status']}")
    
    user_role = user.get("role")
    user_id = user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Get current approval step
    current_step = request["current_approval_step"]
    approval_chain = request["approval_chain"]
    current_approver = approval_chain[current_step]
    
    # Verify this user can reject
    can_reject = False
    if current_approver["user_id"] == user_id:
        can_reject = True
    elif current_approver["role"] == "ceo" and user_role == "super_admin":
        can_reject = True
    
    if not can_reject:
        raise HTTPException(status_code=403, detail="You are not authorized to reject this request")
    
    # Update the approval chain
    approval_chain[current_step]["status"] = "rejected"
    approval_chain[current_step]["rejected_by"] = user_id
    approval_chain[current_step]["rejected_by_name"] = user["full_name"]
    approval_chain[current_step]["rejected_at"] = now
    approval_chain[current_step]["rejection_reason"] = rejection_reason
    
    await db.lead_reassignment_requests.update_one(
        {"id": request_id},
        {"$set": {
            "approval_chain": approval_chain,
            "status": "rejected",
            "rejection_reason": rejection_reason,
            "rejected_by": user_id,
            "rejected_by_name": user["full_name"],
            "rejected_at": now,
            "updated_at": now
        }}
    )
    
    await log_activity("lead", request["lead_id"], "reassignment_rejected", user, {
        "reason": rejection_reason
    })
    
    return {
        "message": "Reassignment request rejected",
        "status": "rejected"
    }


@api_router.get("/leads/reassignment/available-agents")
async def get_available_agents_for_reassignment(
    user = Depends(require_roles(["team_leader", "sales_manager", "admin", "super_admin"]))
):
    """Get list of agents available for lead reassignment"""
    user_role = user.get("role")
    user_id = user["id"]
    
    query = {"is_active": True, "role": {"$in": ["sales_executive", "team_leader"]}}
    
    # Team leaders can only reassign to their own team members
    if user_role == "team_leader":
        query["$or"] = [
            {"team_leader_id": user_id},
            {"id": user_id}  # Can also assign to themselves
        ]
    
    agents = await db.users.find(
        query,
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
    ).to_list(100)
    
    # Add lead count for each agent
    for agent in agents:
        lead_count = await db.leads.count_documents({"assigned_to": agent["id"]})
        agent["current_lead_count"] = lead_count
    
    return agents


@api_router.post("/students/{student_id}/reminder")
async def set_student_reminder(student_id: str, reminder_date: str, reminder_time: str, reminder_type: str = "general", reminder_note: str = "", user = Depends(get_current_user)):
    """Set a reminder for a student (upgrade/redeposit)"""
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if reminder_type not in ["upgrade", "redeposit", "general"]:
        raise HTTPException(status_code=400, detail="Invalid reminder type")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "reminder_date": reminder_date,
        "reminder_time": reminder_time,
        "reminder_note": reminder_note,
        "reminder_type": reminder_type,
        "reminder_completed": False,
        "reminder_set_by": user["id"],
        "reminder_set_at": now,
        "updated_at": now
    }
    
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    await log_activity("student", student_id, "reminder_set", user, {"type": reminder_type, "date": reminder_date})
    
    return {"message": "Reminder set", "reminder_type": reminder_type}

@api_router.post("/students/{student_id}/reminder/complete")
async def complete_student_reminder(student_id: str, user = Depends(get_current_user)):
    """Mark a student reminder as completed"""
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.students.update_one(
        {"id": student_id},
        {"$set": {"reminder_completed": True, "updated_at": now}}
    )
    
    return {"message": "Reminder completed"}

@api_router.get("/followups/today")
async def get_todays_followups(user = Depends(get_current_user)):
    """Get all follow-ups due today for the current user"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today.replace(hour=23, minute=59, second=59)
    today_str = today.strftime("%Y-%m-%d")
    
    # Query for leads with either reminder_date OR follow_up_date today
    # reminder_date is stored as string "YYYY-MM-DD", follow_up_date is datetime
    query_base = {
        "$or": [
            {"reminder_date": today_str, "reminder_completed": {"$ne": True}},
            {"follow_up_date": {"$gte": today, "$lte": today_end}}
        ]
    }
    
    # Filter by user role
    if user["role"] == "sales_executive":
        lead_query = {**query_base, "assigned_to": user["id"]}
    elif user["role"] in ["cs_agent", "cs_head"]:
        lead_query = {**query_base}  # CS doesn't have leads
    elif user["role"] in ["mentor", "academic_master"]:
        lead_query = {**query_base}  # Mentors don't have leads
    else:
        lead_query = query_base
    
    # Get leads with reminders
    leads = []
    if user["role"] not in ["cs_agent", "cs_head", "mentor", "academic_master"]:
        if user["role"] == "sales_executive":
            leads = await db.leads.find({**query_base, "assigned_to": user["id"]}, {"_id": 0}).to_list(1000)
        else:
            leads = await db.leads.find(query_base, {"_id": 0}).to_list(1000)
    
    # Get students with reminders (CS for upgrades, Mentors for redeposits)
    student_query_base = {
        "$or": [
            {"reminder_date": today_str, "reminder_completed": {"$ne": True}},
            {"follow_up_date": {"$gte": today, "$lte": today_end}}
        ]
    }
    students = []
    if user["role"] in ["cs_agent", "cs_head"]:
        if user["role"] == "cs_agent":
            students = await db.students.find({**student_query_base, "cs_agent_id": user["id"]}, {"_id": 0}).to_list(1000)
        else:
            students = await db.students.find(student_query_base, {"_id": 0}).to_list(1000)
    elif user["role"] in ["mentor", "academic_master"]:
        if user["role"] == "mentor":
            students = await db.students.find({**student_query_base, "mentor_id": user["id"]}, {"_id": 0}).to_list(1000)
        else:
            students = await db.students.find(student_query_base, {"_id": 0}).to_list(1000)
    elif user["role"] in ["super_admin", "admin"]:
        students = await db.students.find(student_query_base, {"_id": 0}).to_list(1000)
    
    # Categorize by time
    def get_time_slot(time_val):
        if not time_val:
            return "unscheduled"
        try:
            # Handle datetime objects
            if hasattr(time_val, 'hour'):
                hour = time_val.hour
            # Handle string formats
            elif isinstance(time_val, str):
                if "T" in time_val:
                    time_val = time_val.split("T")[1][:5]
                elif " " in time_val:
                    time_val = time_val.split(" ")[1][:5]
                hour = int(time_val.split(":")[0])
            else:
                return "unscheduled"
            
            if hour < 12:
                return "morning"
            elif hour < 17:
                return "afternoon"
            else:
                return "evening"
        except:
            return "unscheduled"
    
    # Group follow-ups
    followups = {
        "morning": [],
        "afternoon": [],
        "evening": [],
        "unscheduled": []
    }
    
    for lead in leads:
        lead["entity_type"] = "lead"
        lead["reminder_type"] = "sales"
        # Use follow_up_date if reminder_time not set
        time_val = lead.get("reminder_time") or lead.get("follow_up_date")
        slot = get_time_slot(time_val)
        followups[slot].append(lead)
    
    for student in students:
        student["entity_type"] = "student"
        time_val = student.get("reminder_time") or student.get("follow_up_date")
        slot = get_time_slot(time_val)
        followups[slot].append(student)
    
    # Sort each slot by time
    def get_sort_key(x):
        rt = x.get("reminder_time")
        fud = x.get("follow_up_date")
        if rt:
            return rt
        if fud:
            if hasattr(fud, 'strftime'):
                return fud.strftime("%H:%M")
            return str(fud)
        return "99:99"
    
    for slot in followups:
        followups[slot].sort(key=get_sort_key)
    
    total = len(leads) + len(students)
    
    return {
        "date": today_str,
        "total_followups": total,
        "followups": followups,
        "leads_count": len(leads),
        "students_count": len(students)
    }

@api_router.get("/followups/upcoming")
async def get_upcoming_followups(days: int = 7, user = Depends(get_current_user)):
    """Get follow-ups for the next N days"""
    today = datetime.now(timezone.utc)
    end_date = (today + timedelta(days=days)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    
    query_base = {
        "reminder_date": {"$gte": today_str, "$lte": end_date},
        "reminder_completed": {"$ne": True}
    }
    
    # Get leads
    leads = []
    if user["role"] == "sales_executive":
        leads = await db.leads.find({**query_base, "assigned_to": user["id"]}, {"_id": 0}).to_list(1000)
    elif user["role"] not in ["cs_agent", "cs_head", "mentor", "academic_master"]:
        leads = await db.leads.find(query_base, {"_id": 0}).to_list(1000)
    
    # Get students
    students = []
    if user["role"] == "cs_agent":
        students = await db.students.find({**query_base, "cs_agent_id": user["id"]}, {"_id": 0}).to_list(1000)
    elif user["role"] == "mentor":
        students = await db.students.find({**query_base, "mentor_id": user["id"]}, {"_id": 0}).to_list(1000)
    elif user["role"] in ["super_admin", "admin", "cs_head", "academic_master"]:
        students = await db.students.find(query_base, {"_id": 0}).to_list(1000)
    
    # Group by date
    by_date = {}
    
    for lead in leads:
        lead["entity_type"] = "lead"
        lead["reminder_type"] = "sales"
        date = lead.get("reminder_date", today_str)
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(lead)
    
    for student in students:
        student["entity_type"] = "student"
        date = student.get("reminder_date", today_str)
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(student)
    
    return {
        "days": days,
        "total": len(leads) + len(students),
        "by_date": by_date
    }

# ==================== CUSTOMER MASTER ====================

@api_router.get("/customers")
async def get_customers(
    search: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    """Get all customers with transaction history"""
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).sort("last_transaction_at", -1).to_list(limit)
    return customers

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user = Depends(get_current_user)):
    """Get a single customer with full transaction history"""
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Enrich transaction data with course names
    if customer.get("transactions"):
        for txn in customer["transactions"]:
            if txn.get("course_id"):
                course = await db.courses.find_one({"id": txn["course_id"]})
                txn["course_name"] = course.get("name") if course else None
    
    # Get associated lead and student info
    if customer.get("lead_id"):
        lead = await db.leads.find_one({"id": customer["lead_id"]}, {"_id": 0})
        customer["lead_info"] = lead
    
    if customer.get("student_id"):
        student = await db.students.find_one({"id": customer["student_id"]}, {"_id": 0})
        customer["student_info"] = student
    
    return customer

@api_router.get("/customers/by-phone/{phone}")
async def get_customer_by_phone(phone: str, user = Depends(get_current_user)):
    """Get customer by phone number"""
    customer = await db.customers.find_one({"phone": phone}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

# ==================== SLA MANAGEMENT ENDPOINTS ====================

@api_router.post("/sla/check")
async def trigger_sla_check(user = Depends(require_roles(["super_admin", "admin"]))):
    """Manually trigger SLA check (also runs automatically)"""
    result = await process_sla_checks()
    return {"message": "SLA check completed", **result}

@api_router.get("/sla/config")
async def get_sla_config(user = Depends(get_current_user)):
    """Get current SLA configuration"""
    return SLA_CONFIG

@api_router.get("/sla/breaches")
async def get_sla_breaches(user = Depends(get_current_user)):
    """Get all current SLA breaches"""
    lead_breaches = await db.leads.find({
        "$or": [
            {"sla_status": "breach"},
            {"sla_status": "warning"}
        ],
        "stage": {"$nin": ["enrolled", "rejected"]}
    }, {"_id": 0}).to_list(1000)
    
    student_breaches = await db.students.find({
        "sla_status": {"$in": ["breach", "warning"]}
    }, {"_id": 0}).to_list(1000)
    
    return {
        "lead_breaches": lead_breaches,
        "student_breaches": student_breaches,
        "total_lead_breaches": len([l for l in lead_breaches if l.get("sla_status") == "breach"]),
        "total_lead_warnings": len([l for l in lead_breaches if l.get("sla_status") == "warning"]),
        "total_student_breaches": len([s for s in student_breaches if s.get("sla_status") == "breach"])
    }

@api_router.put("/students/{student_id}/activation-call")
async def record_activation_call(student_id: str, call_recording_url: Optional[str] = None, user = Depends(get_current_user)):
    """Record that activation call was made for a student"""
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "activation_call_at": now,
        "sla_status": "ok",
        "sla_warning_at": None,
        "updated_at": now
    }
    
    if call_recording_url:
        update_data["call_recording_url"] = call_recording_url
    
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    await log_activity("student", student_id, "activation_call_recorded", user)
    
    return {"message": "Activation call recorded"}

# ==================== STUDENTS (CS & MENTOR CRM) ====================

@api_router.get("/students", response_model=List[StudentResponse])
async def get_students(
    stage: Optional[str] = None,
    mentor_stage: Optional[str] = None,
    cs_agent_id: Optional[str] = None,
    mentor_id: Optional[str] = None,
    search: Optional[str] = None,
    activated_only: Optional[bool] = None,
    user = Depends(get_current_user)
):
    query = {}
    
    if user["role"] == "cs_agent":
        query["cs_agent_id"] = user["id"]
    elif user["role"] in ["mentor", "academic_master"]:
        query["mentor_id"] = user["id"]
    
    if stage:
        query["stage"] = stage
    if mentor_stage:
        query["mentor_stage"] = mentor_stage
    if cs_agent_id:
        query["cs_agent_id"] = cs_agent_id
    if mentor_id:
        query["mentor_id"] = mentor_id
    
    # Filter for activated students only (for Mentor CRM)
    # Students must have passed through CS activation to appear in Mentor pipeline
    if activated_only:
        query["stage"] = {"$ne": "new_student"}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    students = await db.students.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return students

@api_router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, data: StudentUpdate, user = Depends(get_current_user)):
    existing = await db.students.find_one({"id": student_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "stage" in update_data and update_data["stage"] not in STUDENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {STUDENT_STAGES}")
    
    if "mentor_stage" in update_data and update_data["mentor_stage"] not in MENTOR_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid mentor stage. Must be one of: {MENTOR_STAGES}")
    
    if update_data.get("classes_attended", 0) >= 6:
        update_data["upgrade_eligible"] = True
    
    # Handle upgrade commission
    if update_data.get("upgrade_closed") and not existing.get("upgrade_closed"):
        upgrade_amount = update_data.get("upgrade_amount", 0)
        if upgrade_amount > 0 and existing.get("cs_agent_id"):
            cs_agent = await db.users.find_one({"id": existing["cs_agent_id"]})
            if cs_agent:
                await calculate_commission(
                    cs_agent["id"],
                    str(uuid.uuid4()),
                    upgrade_amount,
                    existing.get("package_bought"),
                    "upgrade",
                    cs_agent["role"]
                )
    
    if update_data.get("stage") == "activated" and not existing.get("mentor_id"):
        mentor = await get_round_robin_agent("mentor")
        if mentor:
            update_data["mentor_id"] = mentor["id"]
            update_data["mentor_name"] = mentor["full_name"]
            # Initialize mentor stage when student is activated by CS
            if not existing.get("mentor_stage"):
                update_data["mentor_stage"] = "new_student"
            await create_notification(
                mentor["id"],
                "New Student Assigned",
                f"New student for mentorship: {existing['full_name']}",
                "info",
                f"/mentor/students/{student_id}"
            )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.students.update_one({"id": student_id}, {"$set": update_data})
    await log_activity("student", student_id, "updated", user, update_data)
    
    updated = await db.students.find_one({"id": student_id}, {"_id": 0})
    return updated

# ==================== PAYMENTS (FINANCE) ====================

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    stage: Optional[str] = None,
    payment_method: Optional[str] = None,
    user = Depends(get_current_user)
):
    query = {}
    
    if stage:
        query["stage"] = stage
    if payment_method:
        query["payment_method"] = payment_method
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for payment in payments:
        if payment.get("verified_by"):
            verifier = await db.users.find_one({"id": payment["verified_by"]})
            payment["verified_by_name"] = verifier.get("full_name") if verifier else None
    
    return payments

@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate, user = Depends(get_current_user)):
    if data.payment_method not in PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail=f"Invalid payment method. Must be one of: {PAYMENT_METHODS}")
    
    new_payment = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "stage": "new_payment",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(new_payment)
    await log_activity("payment", new_payment["id"], "created", user, {"amount": data.amount})
    
    finance_users = await db.users.find({"role": "finance", "is_active": True}).to_list(100)
    for fin_user in finance_users:
        await create_notification(
            fin_user["id"],
            "New Payment Received",
            f"New payment of {data.currency} {data.amount} requires verification",
            "info",
            f"/finance/payments/{new_payment['id']}"
        )
    
    return {k: v for k, v in new_payment.items() if k != "_id"}

@api_router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(payment_id: str, data: PaymentUpdate, user = Depends(get_current_user)):
    existing = await db.payments.find_one({"id": payment_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "stage" in update_data:
        if update_data["stage"] not in PAYMENT_STAGES:
            raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {PAYMENT_STAGES}")
        
        if update_data["stage"] == "verified":
            update_data["verified_by"] = user["id"]
        
        if update_data["stage"] == "reconciled":
            update_data["reconciled_at"] = datetime.now(timezone.utc).isoformat()
        
        if update_data["stage"] == "discrepancy" and not update_data.get("discrepancy_reason"):
            raise HTTPException(status_code=400, detail="Discrepancy reason is required")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    await log_activity("payment", payment_id, "updated", user, update_data)
    
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False, user = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== ACTIVITY LOGS ====================

@api_router.get("/activity-logs")
async def get_activity_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/viewable-users")
async def get_viewable_users(user = Depends(get_current_user)):
    """Get list of users whose dashboard the current user can view"""
    user_role = user["role"]
    user_id = user["id"]
    
    viewable_users = []
    
    if user_role == "super_admin":
        # Super admin can view everyone
        all_users = await db.users.find(
            {"is_active": True},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(500)
        viewable_users = all_users
    elif user_role == "admin":
        # Admin can view everyone except super_admin
        all_users = await db.users.find(
            {"is_active": True, "role": {"$ne": "super_admin"}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(500)
        viewable_users = all_users
    elif user_role == "sales_manager":
        # Sales manager can view team leaders and sales executives
        team_users = await db.users.find(
            {"is_active": True, "role": {"$in": ["team_leader", "sales_executive"]}},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(200)
        viewable_users = team_users
    elif user_role == "team_leader":
        # Team leader can view their team members
        team_members = await db.users.find(
            {"is_active": True, "team_leader_id": user_id},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(100)
        viewable_users = team_members
    elif user_role == "cs_head":
        # CS head can view CS agents
        cs_agents = await db.users.find(
            {"is_active": True, "role": "cs_agent"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(100)
        viewable_users = cs_agents
    elif user_role == "academic_master":
        # Academic master can view mentors
        mentors = await db.users.find(
            {"is_active": True, "role": "mentor"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1}
        ).to_list(100)
        viewable_users = mentors
    
    # Group by role for easier frontend display
    grouped = {}
    for u in viewable_users:
        role = u.get("role", "unknown")
        if role not in grouped:
            grouped[role] = []
        grouped[role].append(u)
    
    return {
        "can_view_others": len(viewable_users) > 0,
        "users": viewable_users,
        "grouped": grouped,
        "total": len(viewable_users)
    }


@api_router.get("/dashboard/stats")
async def get_dashboard_stats(view_as: Optional[str] = None, user = Depends(get_current_user)):
    """Get dashboard stats. Use view_as parameter to view another user's dashboard (if authorized)"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Determine target user for dashboard
    target_user = user
    viewing_as = None
    
    if view_as and view_as != user["id"]:
        # Check if current user can view this user's dashboard
        can_view = False
        current_role = user["role"]
        
        if current_role == "super_admin":
            can_view = True
        elif current_role == "admin":
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            can_view = target and target.get("role") != "super_admin"
        elif current_role == "sales_manager":
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            can_view = target and target.get("role") in ["team_leader", "sales_executive"]
        elif current_role == "team_leader":
            target = await db.users.find_one({"id": view_as, "team_leader_id": user["id"]}, {"_id": 0})
            can_view = target is not None
        elif current_role == "cs_head":
            target = await db.users.find_one({"id": view_as, "role": "cs_agent"}, {"_id": 0})
            can_view = target is not None
        elif current_role == "academic_master":
            target = await db.users.find_one({"id": view_as, "role": "mentor"}, {"_id": 0})
            can_view = target is not None
        
        if can_view:
            target_user = await db.users.find_one({"id": view_as}, {"_id": 0})
            if target_user:
                viewing_as = {
                    "id": target_user["id"],
                    "full_name": target_user.get("full_name"),
                    "role": target_user.get("role"),
                    "email": target_user.get("email")
                }
        else:
            raise HTTPException(status_code=403, detail="Not authorized to view this user's dashboard")
    
    stats = {}
    user_id = target_user["id"]
    user_role = target_user["role"]
    
    # Lead stats for sales roles
    if user_role in ["super_admin", "admin", "sales_manager", "team_leader", "sales_executive"]:
        lead_query = {}
        if user_role == "sales_executive":
            lead_query["assigned_to"] = user_id
        elif user_role == "team_leader":
            team = await db.users.find({"team_leader_id": user_id}).to_list(100)
            team_ids = [t["id"] for t in team] + [user_id]
            lead_query["assigned_to"] = {"$in": team_ids}
        
        stats["total_leads"] = await db.leads.count_documents(lead_query)
        stats["leads_today"] = await db.leads.count_documents({
            **lead_query,
            "created_at": {"$gte": today_start.isoformat()}
        })
        stats["hot_leads"] = await db.leads.count_documents({**lead_query, "stage": "hot_lead"})
        stats["enrolled_today"] = await db.leads.count_documents({
            **lead_query,
            "stage": "enrolled",
            "updated_at": {"$gte": today_start.isoformat()}
        })
        stats["enrolled_total"] = await db.leads.count_documents({**lead_query, "stage": "enrolled"})
        
        # Revenue for this user's leads
        revenue_pipeline = [
            {"$match": {"stage": "enrolled", **lead_query}},
            {"$group": {"_id": None, "total": {"$sum": "$sale_amount"}}}
        ]
        revenue_result = await db.leads.aggregate(revenue_pipeline).to_list(1)
        stats["total_revenue"] = revenue_result[0]["total"] if revenue_result else 0
        
        # SLA breaches
        all_leads = await db.leads.find(lead_query, {"last_activity": 1, "created_at": 1}).to_list(10000)
        sla_breaches = 0
        for lead in all_leads:
            last_activity = lead.get("last_activity") or lead.get("created_at")
            if isinstance(last_activity, str):
                try:
                    last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) - last_activity > timedelta(hours=24):
                        sla_breaches += 1
                except:
                    pass
        stats["sla_breaches"] = sla_breaches
        
        # Conversion rate
        total = stats["total_leads"]
        enrolled = stats["enrolled_total"]
        stats["conversion_rate"] = round((enrolled / total * 100) if total > 0 else 0, 1)
        
        # Average deal size
        if enrolled > 0:
            stats["avg_deal_size"] = round(stats["total_revenue"] / enrolled, 2)
        else:
            stats["avg_deal_size"] = 0
        
        # Target vs Achievement
        stats["monthly_target"] = user.get("monthly_target", 0)
        
        # Commission for this month
        comm_query = {"user_id": user_id, "month": current_month}
        comm_pipeline = [
            {"$match": comm_query},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        comm_result = await db.commissions.aggregate(comm_pipeline).to_list(1)
        stats["commission_current_month"] = comm_result[0]["total"] if comm_result else 0
        
        # All time commission
        all_comm_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
        ]
        all_comm_result = await db.commissions.aggregate(all_comm_pipeline).to_list(1)
        stats["commission_all_time"] = all_comm_result[0]["total"] if all_comm_result else 0
    
    # Student stats for CS roles
    if user_role in ["super_admin", "admin", "cs_head", "cs_agent"]:
        student_query = {}
        if user_role == "cs_agent":
            student_query["cs_agent_id"] = user_id
        
        stats["total_students"] = await db.students.count_documents(student_query)
        stats["new_students"] = await db.students.count_documents({**student_query, "stage": "new_student"})
        stats["activated_students"] = await db.students.count_documents({**student_query, "stage": "activated"})
        stats["upgrade_eligible"] = await db.students.count_documents({**student_query, "upgrade_eligible": True})
        stats["upgrade_pitched"] = await db.students.count_documents({**student_query, "upgrade_pitched": True})
        stats["upgrade_closed"] = await db.students.count_documents({**student_query, "upgrade_closed": True})
        
        # Onboarding completion rate
        onboarded = await db.students.count_documents({**student_query, "onboarding_complete": True})
        stats["onboarding_rate"] = round((onboarded / stats["total_students"] * 100) if stats["total_students"] > 0 else 0, 1)
        
        # Upgrade revenue
        upgrade_pipeline = [
            {"$match": {**student_query, "upgrade_closed": True}},
            {"$group": {"_id": None, "total": {"$sum": "$upgrade_amount"}}}
        ]
        upgrade_result = await db.students.aggregate(upgrade_pipeline).to_list(1)
        stats["upgrade_revenue"] = upgrade_result[0]["total"] if upgrade_result else 0
        
        # CS Commission
        if user_role == "cs_agent":
            cs_comm_pipeline = [
                {"$match": {"user_id": user_id, "commission_type": "upgrade", "month": current_month}},
                {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}}
            ]
            cs_comm_result = await db.commissions.aggregate(cs_comm_pipeline).to_list(1)
            stats["upgrade_commission_current_month"] = cs_comm_result[0]["total"] if cs_comm_result else 0
        
        # Satisfaction score average
        sat_pipeline = [
            {"$match": {**student_query, "satisfaction_score": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$satisfaction_score"}}}
        ]
        sat_result = await db.students.aggregate(sat_pipeline).to_list(1)
        stats["avg_satisfaction_score"] = round(sat_result[0]["avg"], 1) if sat_result else 0
    
    # Mentor stats
    if user_role in ["super_admin", "admin", "mentor", "academic_master"]:
        mentor_query = {}
        if user_role in ["mentor", "academic_master"]:
            mentor_query["mentor_id"] = user_id
        
        stats["mentor_students"] = await db.students.count_documents(mentor_query)
        stats["discussion_started"] = await db.students.count_documents({**mentor_query, "mentor_stage": "discussion_started"})
        stats["redeposit_pitched"] = await db.students.count_documents({**mentor_query, "mentor_stage": "pitched_for_redeposit"})
        stats["redeposit_closed"] = await db.students.count_documents({**mentor_query, "mentor_stage": "closed"})
    
    # Payment stats for finance
    if user_role in ["super_admin", "admin", "finance"]:
        stats["pending_payments"] = await db.payments.count_documents({"stage": {"$in": ["new_payment", "pending_verification"]}})
        stats["verified_payments"] = await db.payments.count_documents({"stage": "verified"})
        stats["discrepancies"] = await db.payments.count_documents({"stage": "discrepancy"})
        
        pipeline = [
            {"$match": {"stage": {"$in": ["verified", "reconciled", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.payments.aggregate(pipeline).to_list(1)
        stats["total_verified_revenue"] = result[0]["total"] if result else 0
    
    # Add viewing_as info if viewing another user's dashboard
    if viewing_as:
        stats["viewing_as"] = viewing_as
    
    return stats

@api_router.get("/dashboard/lead-funnel")
async def get_lead_funnel(view_as: Optional[str] = None, user = Depends(get_current_user)):
    # Handle view_as
    target_user = user
    if view_as and view_as != user["id"]:
        if user["role"] in ["super_admin", "admin", "sales_manager", "team_leader"]:
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            if target:
                target_user = target
    
    query = {}
    if target_user["role"] == "sales_executive":
        query["assigned_to"] = target_user["id"]
    elif target_user["role"] == "team_leader":
        team = await db.users.find({"team_leader_id": target_user["id"]}).to_list(100)
        team_ids = [t["id"] for t in team] + [target_user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(100)
    
    stage_order = {stage: i for i, stage in enumerate(LEAD_STAGES)}
    result.sort(key=lambda x: stage_order.get(x["_id"], 999))
    
    return result

@api_router.get("/dashboard/pipeline-revenue")
async def get_pipeline_revenue(view_as: Optional[str] = None, user = Depends(get_current_user)):
    """
    Get pipeline revenue by stage with course breakdown.
    Shows estimated value at each stage: warm_lead, hot_lead, in_progress, rejected, enrolled
    """
    # Handle view_as
    target_user = user
    if view_as and view_as != user["id"]:
        if user["role"] in ["super_admin", "admin", "sales_manager", "team_leader"]:
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            if target:
                target_user = target
    
    query = {}
    if target_user["role"] == "sales_executive":
        query["assigned_to"] = target_user["id"]
    elif target_user["role"] == "team_leader":
        team = await db.users.find({"team_leader_id": target_user["id"]}).to_list(100)
        team_ids = [t["id"] for t in team] + [target_user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    
    # Stages we want to track for pipeline
    pipeline_stages = ["warm_lead", "hot_lead", "in_progress", "enrolled", "rejected"]
    
    # Get leads with their estimated values
    pipeline = [
        {"$match": {**query, "stage": {"$in": pipeline_stages}}},
        {"$group": {
            "_id": "$stage",
            "count": {"$sum": 1},
            "total_value": {"$sum": {"$ifNull": ["$estimated_value", 0]}},
            "leads": {"$push": {
                "id": "$id",
                "full_name": "$full_name",
                "interested_course_id": "$interested_course_id",
                "estimated_value": {"$ifNull": ["$estimated_value", 0]},
                "sale_amount": {"$ifNull": ["$sale_amount", 0]}
            }}
        }}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(100)
    
    # Get all courses for lookup
    courses = await db.courses.find({}, {"_id": 0, "id": 1, "name": 1, "base_price": 1}).to_list(100)
    course_map = {c["id"]: c for c in courses}
    
    # Format response with stage order
    stage_order = {s: i for i, s in enumerate(pipeline_stages)}
    formatted = []
    
    for stage in pipeline_stages:
        stage_data = next((r for r in result if r["_id"] == stage), None)
        if stage_data:
            # Calculate actual value for enrolled (use sale_amount)
            if stage == "enrolled":
                total_value = sum(l.get("sale_amount", 0) for l in stage_data.get("leads", []))
            else:
                total_value = stage_data.get("total_value", 0)
            
            # Group by course
            course_breakdown = {}
            for lead in stage_data.get("leads", []):
                course_id = lead.get("interested_course_id")
                if course_id:
                    if course_id not in course_breakdown:
                        course_info = course_map.get(course_id, {})
                        course_breakdown[course_id] = {
                            "course_id": course_id,
                            "course_name": course_info.get("name", "Unknown"),
                            "count": 0,
                            "value": 0
                        }
                    course_breakdown[course_id]["count"] += 1
                    if stage == "enrolled":
                        course_breakdown[course_id]["value"] += lead.get("sale_amount", 0)
                    else:
                        course_breakdown[course_id]["value"] += lead.get("estimated_value", 0)
            
            formatted.append({
                "stage": stage,
                "stage_label": stage.replace("_", " ").title(),
                "count": stage_data.get("count", 0),
                "total_value": total_value,
                "course_breakdown": list(course_breakdown.values())
            })
        else:
            formatted.append({
                "stage": stage,
                "stage_label": stage.replace("_", " ").title(),
                "count": 0,
                "total_value": 0,
                "course_breakdown": []
            })
    
    # Calculate total pipeline value (excluding rejected and enrolled)
    active_pipeline_value = sum(
        s["total_value"] for s in formatted 
        if s["stage"] not in ["rejected", "enrolled"]
    )
    
    # Get enrolled (won) value
    enrolled_value = next((s["total_value"] for s in formatted if s["stage"] == "enrolled"), 0)
    
    # Get rejected (lost) value
    rejected_value = next((s["total_value"] for s in formatted if s["stage"] == "rejected"), 0)
    
    return {
        "stages": formatted,
        "summary": {
            "active_pipeline_value": active_pipeline_value,
            "enrolled_value": enrolled_value,
            "rejected_value": rejected_value,
            "total_potential": active_pipeline_value + enrolled_value
        }
    }

@api_router.get("/dashboard/expected-commission")
async def get_expected_commission(view_as: Optional[str] = None, user = Depends(get_current_user)):
    """
    Calculate expected commission for leads expected to close this month.
    Shows:
    - Expected commission from pipeline (warm, hot, in_progress leads)
    - Earned commission this month (from enrolled leads)
    - Total receivable commission
    """
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Handle view_as
    target_user = user
    if view_as and view_as != user["id"]:
        if user["role"] in ["super_admin", "admin", "sales_manager", "team_leader"]:
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            if target:
                target_user = target
    
    # Build query based on role
    query = {}
    if target_user["role"] == "sales_executive":
        query["assigned_to"] = target_user["id"]
    elif target_user["role"] == "team_leader":
        team = await db.users.find({"team_leader_id": target_user["id"]}).to_list(100)
        team_ids = [t["id"] for t in team] + [target_user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    
    # Get active commission rules
    rules = await db.commission_rules.find({"is_active": True}).to_list(100)
    default_commission_rate = 5  # Default 5% if no rules
    
    # Helper to calculate commission for a lead
    def calc_commission(lead_value, course_id=None, role="sales_executive"):
        if not lead_value or lead_value <= 0:
            return 0
        # Find applicable rule
        for rule in rules:
            if rule.get("role") == role:
                if rule.get("course_id") == course_id or (not rule.get("course_id") and not course_id):
                    if rule.get("commission_type") == "percentage":
                        return lead_value * (rule.get("commission_value", default_commission_rate) / 100)
                    else:
                        return rule.get("commission_value", 0)
        # Default percentage
        return lead_value * (default_commission_rate / 100)
    
    # Get pipeline leads (warm, hot, in_progress) - expected to close this month
    pipeline_stages = ["warm_lead", "hot_lead", "in_progress"]
    pipeline_leads = await db.leads.find(
        {**query, "stage": {"$in": pipeline_stages}},
        {"_id": 0, "id": 1, "full_name": 1, "stage": 1, "estimated_value": 1, 
         "interested_course_id": 1, "interested_course_name": 1, "assigned_to": 1,
         "follow_up_date": 1}
    ).to_list(1000)
    
    # Get enrolled leads this month
    enrolled_leads = await db.leads.find(
        {**query, "stage": "enrolled", "updated_at": {"$gte": month_start.isoformat()}},
        {"_id": 0, "id": 1, "full_name": 1, "sale_amount": 1, "course_id": 1, 
         "course_name": 1, "assigned_to": 1, "updated_at": 1}
    ).to_list(1000)
    
    # Get courses for lookup
    courses = await db.courses.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    course_map = {c["id"]: c.get("name", "Unknown") for c in courses}
    
    # Calculate expected commission from pipeline
    expected_by_stage = {}
    pipeline_details = []
    for lead in pipeline_leads:
        stage = lead.get("stage")
        value = lead.get("estimated_value", 0) or 0
        course_id = lead.get("interested_course_id")
        commission = calc_commission(value, course_id)
        
        if stage not in expected_by_stage:
            expected_by_stage[stage] = {"count": 0, "value": 0, "commission": 0}
        expected_by_stage[stage]["count"] += 1
        expected_by_stage[stage]["value"] += value
        expected_by_stage[stage]["commission"] += commission
        
        pipeline_details.append({
            "id": lead.get("id"),
            "name": lead.get("full_name"),
            "stage": stage,
            "course": lead.get("interested_course_name") or course_map.get(course_id, "Not specified"),
            "value": value,
            "expected_commission": round(commission, 2),
            "follow_up": lead.get("follow_up_date")
        })
    
    # Calculate earned commission this month from enrolled leads
    earned_details = []
    total_earned = 0
    for lead in enrolled_leads:
        value = lead.get("sale_amount", 0) or 0
        course_id = lead.get("course_id")
        commission = calc_commission(value, course_id)
        total_earned += commission
        
        earned_details.append({
            "id": lead.get("id"),
            "name": lead.get("full_name"),
            "course": lead.get("course_name") or course_map.get(course_id, "Unknown"),
            "sale_value": value,
            "commission": round(commission, 2),
            "closed_at": lead.get("updated_at")
        })
    
    # Get actual paid/pending commissions from commissions collection
    comm_pipeline = [
        {"$match": {"user_id": target_user["id"], "month": current_month}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$commission_amount"},
            "count": {"$sum": 1}
        }}
    ]
    comm_result = await db.commissions.aggregate(comm_pipeline).to_list(10)
    
    actual_pending = 0
    actual_paid = 0
    for r in comm_result:
        if r["_id"] == "pending":
            actual_pending = r["total"]
        elif r["_id"] == "paid":
            actual_paid = r["total"]
    
    # Calculate totals
    total_expected = sum(s["commission"] for s in expected_by_stage.values())
    total_pipeline_value = sum(s["value"] for s in expected_by_stage.values())
    
    # Format stage breakdown
    stage_labels = {
        "warm_lead": "Warm Leads",
        "hot_lead": "Hot Leads",
        "in_progress": "In Progress"
    }
    
    stage_breakdown = []
    for stage in ["warm_lead", "hot_lead", "in_progress"]:
        data = expected_by_stage.get(stage, {"count": 0, "value": 0, "commission": 0})
        stage_breakdown.append({
            "stage": stage,
            "label": stage_labels.get(stage, stage),
            "count": data["count"],
            "pipeline_value": round(data["value"], 2),
            "expected_commission": round(data["commission"], 2)
        })
    
    return {
        "summary": {
            "total_pipeline_value": round(total_pipeline_value, 2),
            "expected_commission": round(total_expected, 2),
            "earned_this_month": round(total_earned, 2),
            "actual_pending": round(actual_pending, 2),
            "actual_paid": round(actual_paid, 2),
            "total_receivable": round(total_expected + actual_pending, 2)
        },
        "stage_breakdown": stage_breakdown,
        "pipeline_leads": sorted(pipeline_details, key=lambda x: x.get("value", 0), reverse=True)[:20],
        "earned_leads": sorted(earned_details, key=lambda x: x.get("sale_value", 0), reverse=True)[:10],
        "month": current_month
    }

@api_router.get("/dashboard/sales-by-course")
async def get_sales_by_course(view_as: Optional[str] = None, user = Depends(get_current_user)):
    # Handle view_as
    target_user = user
    if view_as and view_as != user["id"]:
        if user["role"] in ["super_admin", "admin", "sales_manager", "team_leader"]:
            target = await db.users.find_one({"id": view_as}, {"_id": 0})
            if target:
                target_user = target
    
    query = {"stage": "enrolled"}
    if target_user["role"] == "sales_executive":
        query["assigned_to"] = target_user["id"]
    elif target_user["role"] == "team_leader":
        team = await db.users.find({"team_leader_id": target_user["id"]}).to_list(100)
        team_ids = [t["id"] for t in team] + [target_user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$course_id",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$sale_amount"}
        }}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(100)
    
    # Add course names
    for item in result:
        if item["_id"]:
            course = await db.courses.find_one({"id": item["_id"]})
            item["course_name"] = course.get("name") if course else "Unknown"
        else:
            item["course_name"] = "Not Specified"
    
    return result

@api_router.get("/dashboard/leaderboard")
async def get_leaderboard(period: str = "month", user = Depends(get_current_user)):
    # Get current period
    if period == "month":
        start_date = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
    else:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    
    pipeline = [
        {"$match": {
            "stage": "enrolled",
            "updated_at": {"$gte": start_date.isoformat()}
        }},
        {"$group": {
            "_id": "$assigned_to",
            "deals": {"$sum": 1},
            "revenue": {"$sum": "$sale_amount"}
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 10}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(10)
    
    # Add user details
    leaderboard = []
    for i, item in enumerate(result):
        if item["_id"]:
            user_data = await db.users.find_one({"id": item["_id"]})
            if user_data:
                leaderboard.append({
                    "rank": i + 1,
                    "user_id": item["_id"],
                    "name": user_data.get("full_name"),
                    "role": user_data.get("role"),
                    "deals": item["deals"],
                    "revenue": item["revenue"]
                })
    
    return leaderboard

@api_router.get("/dashboard/payment-summary")
async def get_payment_summary(user = Depends(get_current_user)):
    pipeline = [
        {"$group": {
            "_id": "$payment_method",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"total": -1}}
    ]
    
    result = await db.payments.aggregate(pipeline).to_list(100)
    return result

@api_router.get("/dashboard/monthly-trend")
async def get_monthly_trend(months: int = 6, user = Depends(get_current_user)):
    query = {}
    if user["role"] == "sales_executive":
        query["assigned_to"] = user["id"]
    
    pipeline = [
        {"$match": {"stage": "enrolled", **query}},
        {"$addFields": {
            "month": {"$substr": ["$updated_at", 0, 7]}
        }},
        {"$group": {
            "_id": "$month",
            "deals": {"$sum": 1},
            "revenue": {"$sum": "$sale_amount"}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": months}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(months)
    return result[::-1]  # Reverse to show oldest first

# ==================== CS DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/student-funnel")
async def get_student_funnel(user = Depends(get_current_user)):
    query = {}
    if user["role"] == "cs_agent":
        query["cs_agent_id"] = user["id"]
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.students.aggregate(pipeline).to_list(100)
    
    stage_order = {stage: i for i, stage in enumerate(STUDENT_STAGES)}
    result.sort(key=lambda x: stage_order.get(x["_id"], 999))
    
    return result

@api_router.get("/dashboard/upgrades-by-month")
async def get_upgrades_by_month(months: int = 6, user = Depends(get_current_user)):
    query = {"upgrade_closed": True}
    if user["role"] == "cs_agent":
        query["cs_agent_id"] = user["id"]
    
    pipeline = [
        {"$match": query},
        {"$addFields": {
            "month": {"$substr": ["$updated_at", 0, 7]}
        }},
        {"$group": {
            "_id": "$month",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$upgrade_amount"}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": months}
    ]
    
    result = await db.students.aggregate(pipeline).to_list(months)
    return result[::-1]

@api_router.get("/dashboard/cs-leaderboard")
async def get_cs_leaderboard(user = Depends(get_current_user)):
    # Get all CS agents with their stats
    cs_agents = await db.users.find({"role": {"$in": ["cs_agent", "cs_head"]}, "is_active": True}, {"_id": 0}).to_list(100)
    
    leaderboard = []
    for agent in cs_agents:
        agent_id = agent["id"]
        
        # Count students
        students = await db.students.count_documents({"cs_agent_id": agent_id})
        
        # Count completed onboarding
        onboarded = await db.students.count_documents({"cs_agent_id": agent_id, "onboarding_complete": True})
        
        # Count upgrades
        upgrades = await db.students.count_documents({"cs_agent_id": agent_id, "upgrade_closed": True})
        
        # Sum upgrade revenue
        revenue_pipeline = [
            {"$match": {"cs_agent_id": agent_id, "upgrade_closed": True}},
            {"$group": {"_id": None, "total": {"$sum": "$upgrade_amount"}}}
        ]
        revenue_result = await db.students.aggregate(revenue_pipeline).to_list(1)
        revenue = revenue_result[0]["total"] if revenue_result else 0
        
        onboarding_rate = round((onboarded / students * 100) if students > 0 else 0, 1)
        
        leaderboard.append({
            "user_id": agent_id,
            "name": agent.get("full_name"),
            "role": agent.get("role"),
            "students": students,
            "upgrades": upgrades,
            "revenue": revenue,
            "onboarding_rate": onboarding_rate
        })
    
    # Sort by revenue
    leaderboard.sort(key=lambda x: x["revenue"], reverse=True)
    
    return leaderboard

# ==================== GOOGLE SHEETS INTEGRATION ====================

@api_router.post("/integrations/google-sheets/config")
async def save_google_sheets_config(config: GoogleSheetConfig, user = Depends(require_roles(["super_admin", "admin"]))):
    config_doc = {
        "id": str(uuid.uuid4()),
        "type": "google_sheets",
        **config.model_dump(),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert config
    await db.integrations.update_one(
        {"type": "google_sheets"},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "Google Sheets configuration saved", "config_id": config_doc["id"]}

@api_router.get("/integrations/google-sheets/config")
async def get_google_sheets_config(user = Depends(require_roles(["super_admin", "admin"]))):
    config = await db.integrations.find_one({"type": "google_sheets"}, {"_id": 0})
    return config

# ==================== MENTOR DASHBOARD ====================

@api_router.get("/mentor/dashboard")
async def get_mentor_dashboard(user = Depends(get_current_user)):
    """Get mentor's comprehensive dashboard data"""
    # Determine which mentor's data to show
    if user.get("role") in ["mentor", "academic_master"]:
        mentor_id = user["id"]
    elif user.get("role") in ["super_admin", "admin"]:
        # Admins can see aggregate or specify mentor_id via query param
        mentor_id = None  # Show aggregate for all mentors
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build query
    query = {"mentor_id": mentor_id} if mentor_id else {"mentor_id": {"$exists": True, "$ne": None}}
    
    # Get all students assigned to this mentor
    students = await db.students.find(query, {"_id": 0}).to_list(10000)
    total_students = len(students)
    
    # Count by mentor_stage
    student_stages = {}
    for student in students:
        stage = student.get("mentor_stage", "new_student")
        student_stages[stage] = student_stages.get(stage, 0) + 1
    
    # Students connected (had at least one interaction - stage changed from new_student)
    students_connected = sum(1 for s in students if s.get("mentor_stage") != "new_student")
    students_balance = total_students - students_connected
    
    # Upgrades helped (closed stage)
    upgrades_helped = student_stages.get("closed", 0)
    
    # Get commissions for this mentor
    commission_query = {"user_id": mentor_id} if mentor_id else {}
    commissions = await db.commissions.find(commission_query, {"_id": 0}).to_list(10000)
    
    total_commission = sum(c.get("commission_amount", 0) for c in commissions)
    commission_received = sum(c.get("commission_amount", 0) for c in commissions if c.get("status") == "paid")
    commission_balance = total_commission - commission_received
    
    # Get payments/revenue brought in (from upgrades and redeposits)
    student_ids = [s["id"] for s in students]
    payment_query = {"student_id": {"$in": student_ids}, "payment_type": {"$in": ["upgrade", "redeposit"]}}
    payments = await db.payments.find(payment_query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(p.get("amount", 0) for p in payments)
    
    # Calculate withdrawn (this would come from a withdrawals collection or commission status)
    total_withdrawn = commission_received  # For now, withdrawn equals received commissions
    current_net = total_revenue - total_withdrawn
    
    # Get recent activities (last 10 stage changes or actions)
    recent_activities = []
    activity_logs = await db.activity_logs.find({
        "entity_type": "student",
        "entity_id": {"$in": student_ids}
    }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    for log in activity_logs:
        student = next((s for s in students if s["id"] == log.get("entity_id")), None)
        if student:
            recent_activities.append({
                "student_name": student.get("full_name", "Unknown"),
                "action": log.get("action", "").replace("_", " ").title(),
                "time": log.get("created_at", ""),
                "amount": log.get("details", {}).get("amount") if log.get("details") else None
            })
    
    return {
        "total_students": total_students,
        "total_revenue": total_revenue,
        "total_withdrawn": total_withdrawn,
        "current_net": current_net,
        "total_commission": total_commission,
        "commission_received": commission_received,
        "commission_balance": commission_balance,
        "upgrades_helped": upgrades_helped,
        "students_connected": students_connected,
        "students_balance": students_balance,
        "student_stages": student_stages,
        "recent_activities": recent_activities
    }

# ==================== BULK IMPORT: COURSES & USERS ====================

@api_router.get("/import/templates/courses")
async def get_courses_template(user = Depends(require_roles(["super_admin", "admin"]))):
    """Get CSV template for bulk course import"""
    template = """name*,code*,base_price*,category*,description,is_active
"Basic Trading Course","BTC001",1500,"basic","Introduction to trading fundamentals",true
"Advanced Trading Masterclass","ATC002",3500,"advanced","Advanced strategies and techniques",true
"Mentorship Program","MNT003",5000,"mentorship","One-on-one mentorship with expert traders",true"""
    
    instructions = """
COURSES IMPORT TEMPLATE INSTRUCTIONS
=====================================

Required Fields (marked with *):
- name*: Course name
- code*: Unique course code (alphanumeric)
- base_price*: Price in AED (number)
- category*: One of: basic, advanced, mentorship, market_code, profit_matrix

Optional Fields:
- description: Course description
- is_active: true/false (default: true)

Notes:
- Course codes must be unique
- Duplicate codes will update existing courses
- Price should be numeric without currency symbol
"""
    
    return {
        "template": template,
        "instructions": instructions,
        "fields": {
            "required": ["name", "code", "base_price", "category"],
            "optional": ["description", "is_active"]
        }
    }

@api_router.get("/import/templates/users")
async def get_users_template(user = Depends(require_roles(["super_admin", "admin"]))):
    """Get CSV template for bulk user import"""
    template = """email*,full_name*,role*,password*,department,phone,region,team_leader_email
"john.sales@clt-academy.com","John Smith","sales_executive","TempPass123!","Sales","+971501234567","UAE","manager@clt-academy.com"
"sarah.cs@clt-academy.com","Sarah Johnson","cs_agent","TempPass123!","Customer Service","+971509876543","UAE",""
"ahmed.mentor@clt-academy.com","Ahmed Ali","mentor","TempPass123!","Mentorship","+971505555555","International",""
"mike.finance@clt-academy.com","Mike Wilson","finance","TempPass123!","Finance","+971508888888","UAE",""
"hr.admin@clt-academy.com","HR Manager","hr","TempPass123!","HR","+971507777777","UAE",""
"""
    
    instructions = """
USERS IMPORT TEMPLATE INSTRUCTIONS
===================================

Required Fields (marked with *):
- email*: Valid email address (must be unique)
- full_name*: User's full name
- role*: One of: admin, sales_manager, team_leader, sales_executive, cs_head, cs_agent, mentor, academic_master, finance, hr, marketing, operations, quality_control
- password*: Temporary password (users should change on first login)

Optional Fields:
- department: One of: Sales, Customer Service, Mentorship, Finance, HR, Marketing, Operations, Management
- phone: Phone number with country code
- region: One of: UAE, India, International
- team_leader_email: Email of the team leader (for sales_executive role)

ROLE-BASED ACCESS (Auto-derived):
- sales_executive → Sales CRM access
- sales_manager/team_leader → Sales CRM + Team management
- cs_agent → Customer Service access
- cs_head → Customer Service + Team management
- mentor → Mentor CRM access
- academic_master → Mentor CRM + Management
- finance → Finance module access
- hr → User/Department management
- admin → Full access except super_admin features

Notes:
- Duplicate emails will be skipped (not updated)
- Password requirements: Min 8 characters
- Users will be set as active by default
"""
    
    return {
        "template": template,
        "instructions": instructions,
        "fields": {
            "required": ["email", "full_name", "role", "password"],
            "optional": ["department", "phone", "region", "team_leader_email"]
        },
        "valid_roles": ["admin", "sales_manager", "team_leader", "sales_executive", "cs_head", "cs_agent", "mentor", "academic_master", "finance", "hr", "marketing", "operations", "quality_control"],
        "valid_departments": ["Sales", "Customer Service", "Mentorship", "Finance", "HR", "Marketing", "Operations", "Management"],
        "valid_regions": ["UAE", "India", "International"]
    }

@api_router.post("/import/courses")
async def import_courses(file: UploadFile, user = Depends(require_roles(["super_admin", "admin"]))):
    """Bulk import courses from CSV"""
    import csv
    import io
    
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
    except:
        decoded = content.decode('latin-1')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    results = {"created": 0, "updated": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    for row_num, row in enumerate(reader, start=2):
        try:
            name = row.get("name", "").strip()
            code = row.get("code", "").strip()
            base_price = row.get("base_price", "").strip()
            category = row.get("category", "").strip().lower()
            
            if not name or not code or not base_price or not category:
                results["errors"].append(f"Row {row_num}: Missing required fields")
                continue
            
            try:
                base_price = float(base_price.replace(",", ""))
            except:
                results["errors"].append(f"Row {row_num}: Invalid price '{base_price}'")
                continue
            
            valid_categories = ["basic", "advanced", "mentorship", "market_code", "profit_matrix"]
            if category not in valid_categories:
                results["errors"].append(f"Row {row_num}: Invalid category '{category}'")
                continue
            
            # Check if course exists
            existing = await db.courses.find_one({"code": code})
            
            is_active = row.get("is_active", "true").strip().lower() in ["true", "1", "yes"]
            
            course_data = {
                "name": name,
                "code": code,
                "base_price": base_price,
                "category": category,
                "description": row.get("description", "").strip(),
                "is_active": is_active,
                "updated_at": now
            }
            
            if existing:
                await db.courses.update_one({"code": code}, {"$set": course_data})
                results["updated"] += 1
            else:
                course_data["id"] = str(uuid.uuid4())
                course_data["created_at"] = now
                await db.courses.insert_one(course_data)
                results["created"] += 1
                
        except Exception as e:
            results["errors"].append(f"Row {row_num}: {str(e)}")
    
    await log_activity("courses", "bulk_import", "imported", user, {
        "created": results["created"],
        "updated": results["updated"],
        "errors": len(results["errors"])
    })
    
    return {
        "message": f"Import complete: {results['created']} created, {results['updated']} updated",
        "results": results
    }

@api_router.post("/import/users")
async def import_users(file: UploadFile, user = Depends(require_roles(["super_admin", "admin"]))):
    """Bulk import users from CSV with auto-derived permissions"""
    import csv
    import io
    
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
    except:
        decoded = content.decode('latin-1')
    
    reader = csv.DictReader(io.StringIO(decoded))
    
    results = {"created": 0, "skipped": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    valid_roles = ["admin", "sales_manager", "team_leader", "sales_executive", "cs_head", "cs_agent", "mentor", "academic_master", "finance", "hr", "marketing", "operations", "quality_control"]
    
    for row_num, row in enumerate(reader, start=2):
        try:
            email = row.get("email", "").strip().lower()
            full_name = row.get("full_name", "").strip()
            role = row.get("role", "").strip().lower()
            password = row.get("password", "").strip()
            
            if not email or not full_name or not role or not password:
                results["errors"].append(f"Row {row_num}: Missing required fields")
                continue
            
            if role not in valid_roles:
                results["errors"].append(f"Row {row_num}: Invalid role '{role}'")
                continue
            
            if len(password) < 8:
                results["errors"].append(f"Row {row_num}: Password must be at least 8 characters")
                continue
            
            # Check if user exists
            existing = await db.users.find_one({"email": email})
            if existing:
                results["skipped"] += 1
                results["errors"].append(f"Row {row_num}: Email '{email}' already exists - skipped")
                continue
            
            # Get team leader ID if specified
            team_leader_id = None
            team_leader_email = row.get("team_leader_email", "").strip().lower()
            if team_leader_email:
                team_leader = await db.users.find_one({"email": team_leader_email})
                if team_leader:
                    team_leader_id = team_leader["id"]
            
            # Get default permissions based on role
            permissions = get_default_permissions(role)
            
            user_data = {
                "id": str(uuid.uuid4()),
                "email": email,
                "password": hash_password(password),
                "full_name": full_name,
                "role": role,
                "department": row.get("department", "").strip() or None,
                "phone": row.get("phone", "").strip() or None,
                "region": row.get("region", "").strip() or None,
                "team_leader_id": team_leader_id,
                "permissions": permissions,
                "is_active": True,
                "monthly_target": 0,
                "environment_access": ["production"],
                "created_at": now,
                "updated_at": now
            }
            
            await db.users.insert_one(user_data)
            results["created"] += 1
                
        except Exception as e:
            results["errors"].append(f"Row {row_num}: {str(e)}")
    
    await log_activity("users", "bulk_import", "imported", user, {
        "created": results["created"],
        "skipped": results["skipped"],
        "errors": len(results["errors"])
    })
    
    return {
        "message": f"Import complete: {results['created']} created, {results['skipped']} skipped",
        "results": results
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CLT Synapse ERP API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ==================== ROLE MANAGEMENT ====================

class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color: Optional[str] = "bg-blue-500"
    module_permissions: Optional[Dict] = {}
    action_permissions: Optional[Dict] = {}
    data_visibility: Optional[str] = "own"  # own, team, all
    is_system_role: Optional[bool] = False

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    module_permissions: Optional[Dict] = None
    action_permissions: Optional[Dict] = None
    data_visibility: Optional[str] = None

# Default system roles
DEFAULT_SYSTEM_ROLES = [
    {"id": "super_admin", "name": "super_admin", "display_name": "Super Admin", "is_system_role": True, "color": "bg-purple-500", "data_visibility": "all", "entity_access": ["clt", "miles"]},
    {"id": "admin", "name": "admin", "display_name": "Admin", "is_system_role": True, "color": "bg-blue-500", "data_visibility": "all", "entity_access": ["clt", "miles"]},
    {"id": "sales_manager", "name": "sales_manager", "display_name": "Sales Manager", "is_system_role": True, "color": "bg-green-500", "data_visibility": "team"},
    {"id": "team_leader", "name": "team_leader", "display_name": "Team Leader", "is_system_role": True, "color": "bg-cyan-500", "data_visibility": "team"},
    {"id": "sales_executive", "name": "sales_executive", "display_name": "Sales Executive", "is_system_role": True, "color": "bg-yellow-500", "data_visibility": "own"},
    {"id": "cs_head", "name": "cs_head", "display_name": "CS Head", "is_system_role": True, "color": "bg-pink-500", "data_visibility": "all"},
    {"id": "cs_agent", "name": "cs_agent", "display_name": "CS Agent", "is_system_role": True, "color": "bg-indigo-500", "data_visibility": "own"},
    {"id": "mentor", "name": "mentor", "display_name": "Mentor", "is_system_role": True, "color": "bg-orange-500", "data_visibility": "own"},
    {"id": "finance", "name": "finance", "display_name": "Finance (Legacy)", "is_system_role": True, "color": "bg-emerald-500", "data_visibility": "all", "entity_access": ["clt", "miles"]},
    {"id": "hr", "name": "hr", "display_name": "HR", "is_system_role": True, "color": "bg-rose-500", "data_visibility": "all"},
    # New Finance-specific roles
    {"id": "finance_manager", "name": "finance_manager", "display_name": "Finance Manager", "is_system_role": True, "color": "bg-emerald-600", "data_visibility": "all", "entity_access": ["clt", "miles"], "description": "Full access to both CLT and MILES"},
    {"id": "finance_admin", "name": "finance_admin", "display_name": "Finance Admin", "is_system_role": True, "color": "bg-teal-500", "data_visibility": "all", "entity_access": ["miles"], "description": "MILES entity access only"},
    {"id": "finance_treasurer", "name": "finance_treasurer", "display_name": "Finance Treasurer", "is_system_role": True, "color": "bg-cyan-600", "data_visibility": "all", "entity_access": ["miles"], "description": "MILES entity access only"},
    {"id": "finance_verifier", "name": "finance_verifier", "display_name": "Finance Verifier", "is_system_role": True, "color": "bg-sky-500", "data_visibility": "all", "entity_access": ["miles"], "description": "MILES entity access only"},
    {"id": "financier", "name": "financier", "display_name": "Financier", "is_system_role": True, "color": "bg-blue-600", "data_visibility": "own", "entity_access": ["miles"], "description": "MILES entity access only"},
    {"id": "accounts", "name": "accounts", "display_name": "Accounts", "is_system_role": True, "color": "bg-green-600", "data_visibility": "all", "entity_access": ["clt"], "description": "CLT entity access only"},
]

@api_router.get("/roles")
async def get_roles(user = Depends(get_current_user)):
    """Get all roles - merges system roles with custom roles from DB"""
    custom_roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    
    # Start with system roles
    result = []
    custom_role_ids = {r["id"] for r in custom_roles}
    
    # Add system roles (use DB version if exists, else default)
    for sys_role in DEFAULT_SYSTEM_ROLES:
        db_version = next((r for r in custom_roles if r["id"] == sys_role["id"]), None)
        if db_version:
            result.append(db_version)
        else:
            result.append(sys_role)
    
    # Add custom (non-system) roles
    for role in custom_roles:
        if role["id"] not in {r["id"] for r in DEFAULT_SYSTEM_ROLES}:
            result.append(role)
    
    return result

@api_router.post("/roles")
async def create_role(data: RoleCreate, user = Depends(require_roles(["super_admin"]))):
    """Create a new custom role"""
    # Check if role already exists
    existing = await db.roles.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    
    # Check if trying to use system role name
    system_names = [r["name"] for r in DEFAULT_SYSTEM_ROLES]
    if data.name in system_names:
        raise HTTPException(status_code=400, detail="Cannot use system role names")
    
    new_role = {
        "id": data.name,
        "name": data.name,
        "display_name": data.display_name,
        "description": data.description,
        "color": data.color,
        "module_permissions": data.module_permissions,
        "action_permissions": data.action_permissions,
        "data_visibility": data.data_visibility,
        "is_system_role": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
    }
    
    await db.roles.insert_one(new_role)
    
    # Also add to ROLES list for validation
    global ROLES
    if data.name not in ROLES:
        ROLES.append(data.name)
    
    await log_audit(user, "create", "role", entity_id=data.name, entity_name=data.display_name)
    
    return {k: v for k, v in new_role.items() if k != "_id"}

@api_router.put("/roles/{role_id}")
async def update_role(role_id: str, data: RoleUpdate, user = Depends(require_roles(["super_admin"]))):
    """Update a role's permissions"""
    # Check if role exists
    existing = await db.roles.find_one({"id": role_id})
    
    # If not in DB, check if it's a system role
    if not existing:
        system_role = next((r for r in DEFAULT_SYSTEM_ROLES if r["id"] == role_id), None)
        if system_role:
            # Create entry for system role with updated permissions
            new_entry = {**system_role}
            if data.display_name:
                new_entry["display_name"] = data.display_name
            if data.description:
                new_entry["description"] = data.description
            if data.color:
                new_entry["color"] = data.color
            if data.module_permissions:
                new_entry["module_permissions"] = data.module_permissions
            if data.action_permissions:
                new_entry["action_permissions"] = data.action_permissions
            if data.data_visibility:
                new_entry["data_visibility"] = data.data_visibility
            
            new_entry["updated_at"] = datetime.now(timezone.utc).isoformat()
            new_entry["updated_by"] = user["id"]
            
            await db.roles.insert_one(new_entry)
            await log_audit(user, "update", "role", entity_id=role_id, entity_name=new_entry.get("display_name"))
            return {k: v for k, v in new_entry.items() if k != "_id"}
        else:
            raise HTTPException(status_code=404, detail="Role not found")
    
    # Update existing role
    update_data = {}
    if data.display_name:
        update_data["display_name"] = data.display_name
    if data.description is not None:
        update_data["description"] = data.description
    if data.color:
        update_data["color"] = data.color
    if data.module_permissions is not None:
        update_data["module_permissions"] = data.module_permissions
    if data.action_permissions is not None:
        update_data["action_permissions"] = data.action_permissions
    if data.data_visibility:
        update_data["data_visibility"] = data.data_visibility
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["id"]
    
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    updated = await db.roles.find_one({"id": role_id}, {"_id": 0})
    await log_audit(user, "update", "role", entity_id=role_id, entity_name=updated.get("display_name"))
    
    return updated

# ==================== GRANULAR PERMISSIONS ====================

@api_router.get("/roles/{role_id}/permissions")
async def get_role_permissions(role_id: str, user = Depends(require_roles(["super_admin"]))):
    """Get granular permissions for a role"""
    # Check in role_permissions collection first
    permissions = await db.role_permissions.find_one({"role_id": role_id}, {"_id": 0})
    if permissions:
        return permissions.get("permissions", {})
    
    # Return empty dict if no custom permissions set (frontend will use defaults)
    return {}

@api_router.put("/roles/{role_id}/permissions")
async def save_role_permissions(role_id: str, permissions: Dict, user = Depends(require_roles(["super_admin"]))):
    """Save granular permissions for a role"""
    # Validate role exists
    system_role_ids = [r["id"] for r in DEFAULT_SYSTEM_ROLES]
    custom_role = await db.roles.find_one({"id": role_id})
    
    if role_id not in system_role_ids and not custom_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Upsert permissions
    await db.role_permissions.update_one(
        {"role_id": role_id},
        {
            "$set": {
                "role_id": role_id,
                "permissions": permissions,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    await log_audit(user, "update", "role_permissions", entity_id=role_id, 
                   entity_name=f"Permissions for {role_id}")
    
    return {"message": "Permissions saved successfully", "role_id": role_id}

@api_router.get("/user/permissions")
async def get_current_user_permissions(user = Depends(get_current_user)):
    """Get permissions for the current logged-in user based on their role"""
    role = user.get("role", "")
    
    # Super admin has full access
    if role == "super_admin":
        return {"is_super_admin": True, "full_access": True}
    
    # Get role permissions from database
    permissions = await db.role_permissions.find_one({"role_id": role}, {"_id": 0})
    if permissions:
        return {
            "is_super_admin": False,
            "role": role,
            "permissions": permissions.get("permissions", {})
        }
    
    # No custom permissions, return empty (frontend will use defaults)
    return {
        "is_super_admin": False,
        "role": role,
        "permissions": {}
    }

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user = Depends(require_roles(["super_admin"]))):
    """Delete a custom role"""
    # Check if it's a system role
    system_names = [r["name"] for r in DEFAULT_SYSTEM_ROLES]
    if role_id in system_names:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if any users have this role
    users_with_role = await db.users.count_documents({"role": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role: {users_with_role} users are assigned to this role")
    
    result = await db.roles.delete_one({"id": role_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    
    await log_audit(user, "delete", "role", entity_id=role_id)
    
    return {"message": "Role deleted successfully"}

# ==================== ENVIRONMENT MANAGEMENT ====================

@api_router.get("/environment/current")
async def get_current_environment(user = Depends(get_current_user)):
    """Get the current environment mode"""
    config = await db.system_config.find_one({"key": "environment_mode"})
    current_mode = config.get("value", "production") if config else "production"
    
    # Check user's environment access
    user_access = user.get("environment_access") or ["production"]
    if user["role"] == "super_admin":
        user_access = ENVIRONMENT_MODES
    
    return {
        "current_mode": current_mode,
        "user_access": user_access,
        "available_modes": ENVIRONMENT_MODES,
        "backend_env": CURRENT_APP_ENV,
        "backend_database": CURRENT_DB_NAME
    }

@api_router.put("/environment/mode")
async def set_environment_mode(mode: str, user = Depends(require_roles(["super_admin", "admin"]))):
    """Set the environment mode (requires admin access)"""
    if mode not in ENVIRONMENT_MODES:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {ENVIRONMENT_MODES}")
    
    # Check if user has access to this mode
    user_access = user.get("environment_access") or ["production"]
    if user["role"] != "super_admin" and mode not in user_access:
        raise HTTPException(status_code=403, detail=f"You don't have access to {mode} mode")
    
    await db.system_config.update_one(
        {"key": "environment_mode"},
        {"$set": {"value": mode, "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    await log_activity("system", "environment", "mode_changed", user, {"new_mode": mode})
    
    return {"message": f"Environment mode set to {mode}", "mode": mode}

@api_router.put("/users/{user_id}/environment-access")
async def update_user_environment_access(user_id: str, access: List[str], user = Depends(require_roles(["super_admin"]))):
    """Update a user's environment access (Super Admin only)"""
    for mode in access:
        if mode not in ENVIRONMENT_MODES:
            raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_access = target_user.get("environment_access", [])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"environment_access": access, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Audit log for access control change
    await log_audit(
        user,
        "access_change",
        "access_control",
        entity_id=user_id,
        entity_name=target_user['full_name'],
        changes={"old_access": old_access, "new_access": access},
        details={"target_email": target_user.get("email"), "change_type": "environment_access"}
    )
    
    return {"message": f"Environment access updated for {target_user['full_name']}", "access": access}

# ==================== IMPORT/EXPORT FUNCTIONALITY ====================

@api_router.get("/import/templates/{template_type}")
async def get_import_template(template_type: str, user = Depends(get_current_user)):
    """Get CSV import template with headers and instructions"""
    templates = {
        "leads": {
            "filename": "leads_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "city", 
                "lead_source", "course_of_interest", "campaign_name", "notes"
            ],
            "fields": {
                "required": ["full_name", "phone"],
                "optional": ["email", "country", "city", "lead_source", "course_of_interest", "campaign_name", "notes"]
            },
            "example_row": {
                "full_name": "John Doe",
                "phone": "+971501234567",
                "email": "john@example.com",
                "country": "UAE",
                "city": "Dubai",
                "lead_source": "Meta Ads",
                "course_of_interest": "Advanced Trading",
                "campaign_name": "Feb2024_UAE",
                "notes": "Interested in weekend batches"
            },
            "instructions": "Fields marked with * are mandatory\nPhone must include country code (e.g., +971501234567)\nDuplicate phone numbers will be skipped\nLead source options: Meta Ads, Google Ads, Website, Referral, Walk-in, Other\nLeads will be auto-assigned via round-robin to sales executives"
        },
        "customers": {
            "filename": "customers_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "payment_amount*", "payment_method*", "payment_date*", "closed_by*",
                "cs_agent_email", "mentor_email", "notes"
            ],
            "fields": {
                "required": ["full_name", "phone", "package_bought", "payment_amount", "payment_method", "payment_date", "closed_by"],
                "optional": ["email", "country", "cs_agent_email", "mentor_email", "notes"]
            },
            "example_row": {
                "full_name": "Jane Smith",
                "phone": "+971502345678",
                "email": "jane@example.com",
                "country": "UAE",
                "package_bought": "Advanced Trading Course",
                "payment_amount": "5000",
                "payment_method": "stripe",
                "payment_date": "2024-01-15",
                "closed_by": "salesperson@clt-academy.com",
                "cs_agent_email": "cs@clt-academy.com",
                "mentor_email": "mentor@clt-academy.com",
                "notes": "VIP customer"
            },
            "instructions": "Fields marked with * are mandatory\nPhone must include country code\nclosed_by should be the email of the sales person who closed this customer\npayment_method options: stripe, unipay, tabby, tamara, bank_transfer, usdt, cash\npayment_date format: YYYY-MM-DD\nCustomers imported here will NOT go through round-robin\nIf cs_agent_email or mentor_email provided, they will be auto-assigned"
        },
        "students_cs": {
            "filename": "students_cs_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "cs_agent_email*", "mentor_email", "batch_plan", "preferred_language",
                "trading_level", "class_timings", "notes"
            ],
            "fields": {
                "required": ["full_name", "phone", "package_bought", "cs_agent_email"],
                "optional": ["email", "country", "mentor_email", "batch_plan", "preferred_language", "trading_level", "class_timings", "notes"]
            },
            "example_row": {
                "full_name": "Ahmed Ali",
                "phone": "+971503456789",
                "email": "ahmed@example.com",
                "country": "UAE",
                "package_bought": "Basic Trading Course",
                "cs_agent_email": "cs@clt-academy.com",
                "mentor_email": "mentor@clt-academy.com",
                "batch_plan": "Weekend Morning",
                "preferred_language": "English",
                "trading_level": "Beginner",
                "class_timings": "10:00 AM - 12:00 PM",
                "notes": "Prefers online classes"
            },
            "instructions": "Fields marked with * are mandatory\ncs_agent_email MUST be a valid CS agent email from the system\nmentor_email is optional but must be valid if provided\nbatch_plan options: Weekday Morning, Weekday Evening, Weekend Morning, Weekend Evening\ntrading_level options: Beginner, Intermediate, Advanced\nStudents imported will be assigned to specified CS agent (NOT round-robin)"
        },
        "students_mentor": {
            "filename": "students_mentor_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "mentor_email*", "cs_agent_email", "mentor_stage", "learning_goals", "notes"
            ],
            "fields": {
                "required": ["full_name", "phone", "package_bought", "mentor_email"],
                "optional": ["email", "country", "cs_agent_email", "mentor_stage", "learning_goals", "notes"]
            },
            "example_row": {
                "full_name": "Sara Khan",
                "phone": "+971504567890",
                "email": "sara@example.com",
                "country": "UAE",
                "package_bought": "Pro Trading Course",
                "mentor_email": "mentor@clt-academy.com",
                "cs_agent_email": "cs@clt-academy.com",
                "mentor_stage": "discussion_started",
                "learning_goals": "Master technical analysis",
                "notes": "Experienced trader"
            },
            "instructions": "Fields marked with * are mandatory\nmentor_email MUST be a valid mentor email from the system\nmentor_stage options: new_student, discussion_started, pitched_for_redeposit, interested, closed\nStudents imported will be assigned to specified mentor (NOT round-robin)"
        }
    }
    
    if template_type not in templates:
        raise HTTPException(status_code=400, detail=f"Invalid template type. Available: {list(templates.keys())}")
    
    tmpl = templates[template_type]
    # Generate CSV template string
    tmpl["template"] = ",".join(tmpl["headers"]) + "\n" + ",".join([str(v) for v in tmpl["example_row"].values()])
    
    return tmpl

@api_router.post("/import/leads")
async def import_leads(data: List[Dict], user = Depends(require_roles(["super_admin", "admin", "sales_manager"]))):
    """Import leads from CSV data - uses round-robin assignment"""
    results = {"success": 0, "failed": 0, "skipped": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(data):
        try:
            if not row.get("full_name") or not row.get("phone"):
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: Missing required fields")
                continue
            
            existing = await db.leads.find_one({"phone": row["phone"]})
            if existing:
                results["skipped"] += 1
                results["errors"].append(f"Row {i+1}: Phone already exists")
                continue
            
            phone = row["phone"]
            region = "international"
            if phone.startswith("+971") or phone.startswith("971"):
                region = "UAE"
            elif phone.startswith("+91") or phone.startswith("91"):
                region = "India"
            
            assigned_agent = await get_round_robin_agent("sales_executive", region)
            
            new_lead = {
                "id": str(uuid.uuid4()),
                "full_name": row["full_name"],
                "phone": row["phone"],
                "email": row.get("email"),
                "country": row.get("country"),
                "city": row.get("city"),
                "lead_source": row.get("lead_source", "Import"),
                "course_of_interest": row.get("course_of_interest"),
                "campaign_name": row.get("campaign_name"),
                "notes": row.get("notes"),
                "stage": "new_lead",
                "assigned_to": assigned_agent["id"] if assigned_agent else None,
                "assigned_to_name": assigned_agent["full_name"] if assigned_agent else None,
                "assigned_at": now if assigned_agent else None,
                "first_contact_at": None,
                "sla_status": "ok",
                "sla_warning_level": 0,
                "sla_breach": False,
                "in_pool": not bool(assigned_agent),
                "imported_by": user["id"],
                "import_source": "csv_import",
                "created_at": now,
                "updated_at": now,
                "last_activity": now
            }
            
            await db.leads.insert_one(new_lead)
            results["success"] += 1
            
            if assigned_agent:
                await create_notification(
                    assigned_agent["id"],
                    "New Lead Assigned (Import)",
                    f"New lead imported: {row['full_name']}",
                    "info",
                    "/sales"
                )
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Row {i+1}: {str(e)}")
    
    await log_activity("import", "leads", "bulk_import", user, {"results": results})
    return results

@api_router.post("/import/customers")
async def import_customers(data: List[Dict], user = Depends(require_roles(["super_admin", "admin"]))):
    """Import customers directly - NO round-robin"""
    results = {"success": 0, "failed": 0, "skipped": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(data):
        try:
            required = ["full_name", "phone", "package_bought", "payment_amount", "payment_method", "payment_date", "closed_by"]
            missing = [f for f in required if not row.get(f)]
            if missing:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: Missing {missing}")
                continue
            
            existing = await db.customers.find_one({"phone": row["phone"]})
            if existing:
                results["skipped"] += 1
                continue
            
            closed_by_user = await db.users.find_one({"email": row["closed_by"]})
            closed_by_id = closed_by_user["id"] if closed_by_user else None
            closed_by_name = closed_by_user["full_name"] if closed_by_user else row["closed_by"]
            
            cs_agent = await db.users.find_one({"email": row.get("cs_agent_email")}) if row.get("cs_agent_email") else None
            mentor = await db.users.find_one({"email": row.get("mentor_email")}) if row.get("mentor_email") else None
            
            lead_id = str(uuid.uuid4())
            student_id = str(uuid.uuid4())
            customer_id = str(uuid.uuid4())
            
            # Create lead (enrolled)
            await db.leads.insert_one({
                "id": lead_id,
                "full_name": row["full_name"],
                "phone": row["phone"],
                "email": row.get("email"),
                "country": row.get("country"),
                "stage": "enrolled",
                "assigned_to": closed_by_id,
                "assigned_to_name": closed_by_name,
                "sale_amount": float(row["payment_amount"]),
                "in_pool": False,
                "imported_by": user["id"],
                "created_at": now,
                "updated_at": now
            })
            
            # Create student
            await db.students.insert_one({
                "id": student_id,
                "lead_id": lead_id,
                "full_name": row["full_name"],
                "phone": row["phone"],
                "email": row.get("email"),
                "country": row.get("country"),
                "package_bought": row["package_bought"],
                "stage": "activated",
                "cs_agent_id": cs_agent["id"] if cs_agent else None,
                "cs_agent_name": cs_agent["full_name"] if cs_agent else None,
                "mentor_id": mentor["id"] if mentor else None,
                "mentor_name": mentor["full_name"] if mentor else None,
                "onboarding_complete": True,
                "activation_call_at": now,
                "sla_status": "ok",
                "created_at": now,
                "updated_at": now
            })
            
            # Create customer
            transaction = {
                "payment_id": str(uuid.uuid4()),
                "amount": float(row["payment_amount"]),
                "currency": "AED",
                "payment_method": row["payment_method"],
                "payment_type": "fresh",
                "date": row["payment_date"]
            }
            
            await db.customers.insert_one({
                "id": customer_id,
                "full_name": row["full_name"],
                "phone": row["phone"],
                "email": row.get("email"),
                "country": row.get("country"),
                "lead_id": lead_id,
                "student_id": student_id,
                "closed_by_id": closed_by_id,
                "closed_by_name": closed_by_name,
                "total_spent": float(row["payment_amount"]),
                "transaction_count": 1,
                "transactions": [transaction],
                "first_transaction_at": row["payment_date"],
                "last_transaction_at": row["payment_date"],
                "created_at": now,
                "updated_at": now
            })
            
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Row {i+1}: {str(e)}")
    
    return results

@api_router.post("/import/students/cs")
async def import_students_cs(data: List[Dict], user = Depends(require_roles(["super_admin", "admin", "cs_head"]))):
    """Import students for Customer Service"""
    results = {"success": 0, "failed": 0, "skipped": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(data):
        try:
            required = ["full_name", "phone", "package_bought", "cs_agent_email"]
            missing = [f for f in required if not row.get(f)]
            if missing:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: Missing {missing}")
                continue
            
            existing = await db.students.find_one({"phone": row["phone"]})
            if existing:
                results["skipped"] += 1
                continue
            
            cs_agent = await db.users.find_one({"email": row["cs_agent_email"]})
            if not cs_agent:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: CS agent not found")
                continue
            
            mentor = await db.users.find_one({"email": row.get("mentor_email")}) if row.get("mentor_email") else None
            
            await db.students.insert_one({
                "id": str(uuid.uuid4()),
                "full_name": row["full_name"],
                "phone": row["phone"],
                "email": row.get("email"),
                "country": row.get("country"),
                "package_bought": row["package_bought"],
                "batch_plan": row.get("batch_plan"),
                "preferred_language": row.get("preferred_language"),
                "trading_level": row.get("trading_level"),
                "class_timings": row.get("class_timings"),
                "stage": "new_student",
                "mentor_stage": "new_student",
                "cs_agent_id": cs_agent["id"],
                "cs_agent_name": cs_agent["full_name"],
                "mentor_id": mentor["id"] if mentor else None,
                "mentor_name": mentor["full_name"] if mentor else None,
                "onboarding_complete": False,
                "sla_status": "ok",
                "created_at": now,
                "updated_at": now
            })
            
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Row {i+1}: {str(e)}")
    
    return results

@api_router.post("/import/students/mentor")
async def import_students_mentor(data: List[Dict], user = Depends(require_roles(["super_admin", "admin", "academic_master"]))):
    """Import students for Mentor CRM"""
    results = {"success": 0, "failed": 0, "skipped": 0, "errors": []}
    now = datetime.now(timezone.utc).isoformat()
    
    for i, row in enumerate(data):
        try:
            required = ["full_name", "phone", "package_bought", "mentor_email"]
            missing = [f for f in required if not row.get(f)]
            if missing:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: Missing {missing}")
                continue
            
            mentor = await db.users.find_one({"email": row["mentor_email"]})
            if not mentor:
                results["failed"] += 1
                results["errors"].append(f"Row {i+1}: Mentor not found")
                continue
            
            existing = await db.students.find_one({"phone": row["phone"]})
            cs_agent = await db.users.find_one({"email": row.get("cs_agent_email")}) if row.get("cs_agent_email") else None
            
            if existing:
                await db.students.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "mentor_id": mentor["id"],
                        "mentor_name": mentor["full_name"],
                        "mentor_stage": row.get("mentor_stage", "new_student"),
                        "learning_goals": row.get("learning_goals"),
                        "updated_at": now
                    }}
                )
            else:
                await db.students.insert_one({
                    "id": str(uuid.uuid4()),
                    "full_name": row["full_name"],
                    "phone": row["phone"],
                    "email": row.get("email"),
                    "country": row.get("country"),
                    "package_bought": row["package_bought"],
                    "learning_goals": row.get("learning_goals"),
                    "stage": "activated",
                    "mentor_stage": row.get("mentor_stage", "new_student"),
                    "cs_agent_id": cs_agent["id"] if cs_agent else None,
                    "cs_agent_name": cs_agent["full_name"] if cs_agent else None,
                    "mentor_id": mentor["id"],
                    "mentor_name": mentor["full_name"],
                    "onboarding_complete": True,
                    "sla_status": "ok",
                    "created_at": now,
                    "updated_at": now
                })
            
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Row {i+1}: {str(e)}")
    
    return results

# ==================== 3CX INTEGRATION ENDPOINTS ====================

def normalize_phone(phone: str) -> str:
    """Normalize phone number by removing non-digits"""
    import re
    return re.sub(r'\D', '', phone)

@api_router.get("/3cx/extensions")
async def get_3cx_extensions(user = Depends(get_current_user)):
    """
    Get all users with their 3CX extension mappings
    Useful for admin view of extension assignments
    """
    # Only allow admin roles to view all extensions
    if user.get("role") not in ["super_admin", "admin", "sales_manager", "cs_head"]:
        raise HTTPException(status_code=403, detail="Not authorized to view extension mappings")
    
    # Get all users with threecx_extension field
    users_with_extensions = await db.users.find(
        {"$and": [
            {"threecx_extension": {"$exists": True}},
            {"threecx_extension": {"$ne": None}},
            {"threecx_extension": {"$ne": ""}}
        ]},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1, "threecx_extension": 1, "is_active": 1}
    ).to_list(length=100)
    
    # Get all users without extensions (for mapping purposes)
    users_without_extensions = await db.users.find(
        {"$or": [
            {"threecx_extension": {"$exists": False}},
            {"threecx_extension": None},
            {"threecx_extension": ""}
        ],
        "role": {"$in": ["sales_executive", "team_leader", "sales_manager", "cs_head", "cs_agent"]}
        },
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1, "department": 1, "is_active": 1}
    ).to_list(length=100)
    
    return {
        "mapped": users_with_extensions,
        "unmapped": users_without_extensions,
        "total_mapped": len(users_with_extensions),
        "total_unmapped": len(users_without_extensions)
    }

@api_router.get("/3cx/contact-lookup")
async def threecx_contact_lookup(phone_number: str):
    """
    3CX Contact Lookup by Phone Number
    Called by 3CX when receiving inbound calls to identify the caller
    """
    normalized = normalize_phone(phone_number)
    
    # Search in leads first
    lead = await db.leads.find_one({
        "$or": [
            {"phone": {"$regex": normalized + "$"}},
            {"phone": {"$regex": normalized[-10:] + "$"}} if len(normalized) > 10 else {"phone": normalized}
        ]
    })
    
    if lead:
        return ThreeCXContactResponse(
            found=True,
            contact_id=lead["id"],
            first_name=lead.get("full_name", "").split()[0] if lead.get("full_name") else "",
            last_name=" ".join(lead.get("full_name", "").split()[1:]) if lead.get("full_name") else "",
            email=lead.get("email"),
            phone_mobile=lead.get("phone"),
            company_name=lead.get("company"),
            contact_url=f"/sales/{lead['id']}",
            contact_type="lead"
        )
    
    # Search in students
    student = await db.students.find_one({
        "$or": [
            {"phone": {"$regex": normalized + "$"}},
            {"phone": {"$regex": normalized[-10:] + "$"}} if len(normalized) > 10 else {"phone": normalized}
        ]
    })
    
    if student:
        return ThreeCXContactResponse(
            found=True,
            contact_id=student["id"],
            first_name=student.get("full_name", "").split()[0] if student.get("full_name") else "",
            last_name=" ".join(student.get("full_name", "").split()[1:]) if student.get("full_name") else "",
            email=student.get("email"),
            phone_mobile=student.get("phone"),
            company_name=student.get("package_bought"),
            contact_url=f"/cs/{student['id']}",
            contact_type="student"
        )
    
    # Search in customers
    customer = await db.customers.find_one({
        "$or": [
            {"phone": {"$regex": normalized + "$"}},
            {"phone": {"$regex": normalized[-10:] + "$"}} if len(normalized) > 10 else {"phone": normalized}
        ]
    })
    
    if customer:
        return ThreeCXContactResponse(
            found=True,
            contact_id=customer["id"],
            first_name=customer.get("full_name", "").split()[0] if customer.get("full_name") else "",
            last_name=" ".join(customer.get("full_name", "").split()[1:]) if customer.get("full_name") else "",
            email=customer.get("email"),
            phone_mobile=customer.get("phone"),
            company_name=customer.get("current_package"),
            contact_url=f"/customers/{customer['id']}",
            contact_type="customer"
        )
    
    return ThreeCXContactResponse(found=False)

@api_router.get("/3cx/contact-search")
async def threecx_contact_search(search_text: str, limit: int = 20):
    """
    3CX Contact Search
    Allows searching contacts from 3CX interface
    """
    pattern = {"$regex": search_text, "$options": "i"}
    results = []
    
    # Search leads
    leads = await db.leads.find({
        "$or": [
            {"full_name": pattern},
            {"email": pattern},
            {"phone": pattern},
            {"company": pattern}
        ]
    }).to_list(length=limit)
    
    for lead in leads:
        results.append(ThreeCXContactResponse(
            found=True,
            contact_id=lead["id"],
            first_name=lead.get("full_name", "").split()[0] if lead.get("full_name") else "",
            last_name=" ".join(lead.get("full_name", "").split()[1:]) if lead.get("full_name") else "",
            email=lead.get("email"),
            phone_mobile=lead.get("phone"),
            company_name=lead.get("company"),
            contact_url=f"/sales/{lead['id']}",
            contact_type="lead"
        ))
    
    # Search students
    students = await db.students.find({
        "$or": [
            {"full_name": pattern},
            {"email": pattern},
            {"phone": pattern}
        ]
    }).to_list(length=limit - len(results))
    
    for student in students:
        results.append(ThreeCXContactResponse(
            found=True,
            contact_id=student["id"],
            first_name=student.get("full_name", "").split()[0] if student.get("full_name") else "",
            last_name=" ".join(student.get("full_name", "").split()[1:]) if student.get("full_name") else "",
            email=student.get("email"),
            phone_mobile=student.get("phone"),
            company_name=student.get("package_bought"),
            contact_url=f"/cs/{student['id']}",
            contact_type="student"
        ))
    
    return {"contacts": results, "total": len(results)}

@api_router.post("/3cx/contact-create")
async def threecx_contact_create(request: ThreeCXContactCreateRequest):
    """
    3CX Contact Creation
    Creates a new lead when receiving call from unknown number
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if contact already exists
    normalized = normalize_phone(request.phone_number)
    existing_lead = await db.leads.find_one({"phone": {"$regex": normalized[-10:] + "$"}})
    if existing_lead:
        return {
            "success": True,
            "contact_id": existing_lead["id"],
            "message": "Contact already exists",
            "contact_url": f"/sales/{existing_lead['id']}"
        }
    
    # Create new lead
    lead_id = str(uuid.uuid4())
    full_name = f"{request.first_name or 'Unknown'} {request.last_name or 'Caller'}".strip()
    
    new_lead = {
        "id": lead_id,
        "full_name": full_name,
        "phone": request.phone_number,
        "email": request.email,
        "company": request.company_name,
        "source": "inbound_call",
        "stage": "new_lead",
        "country": None,
        "notes": "Created from inbound call via 3CX",
        "in_pool": True,
        "assigned_to": None,
        "assigned_to_name": None,
        "created_at": now,
        "updated_at": now,
        "last_activity": now
    }
    
    try:
        await db.leads.insert_one(new_lead)
    except Exception as e:
        # Handle race condition - another request may have created the lead
        logger.warning(f"3CX: Duplicate lead creation attempt for {request.phone_number}: {e}")
        existing_lead = await db.leads.find_one({"phone": {"$regex": normalized[-10:] + "$"}})
        if existing_lead:
            return {
                "success": True,
                "contact_id": existing_lead["id"],
                "message": "Contact already exists",
                "contact_url": f"/sales/{existing_lead['id']}"
            }
        raise HTTPException(status_code=500, detail="Failed to create contact")
    
    logger.info(f"3CX: Created new lead {lead_id} from inbound call {request.phone_number}")
    
    return {
        "success": True,
        "contact_id": lead_id,
        "first_name": request.first_name or "Unknown",
        "last_name": request.last_name or "Caller",
        "contact_url": f"/sales/{lead_id}"
    }

@api_router.post("/3cx/call-journal")
async def threecx_call_journal(request: ThreeCXCallJournalRequest):
    """
    3CX Call Journaling
    Logs call details when call completes
    """
    now = datetime.now(timezone.utc).isoformat()
    call_id = str(uuid.uuid4())
    
    # Determine contact type and get contact info
    contact_type = None
    contact_name = None
    
    if request.contact_id:
        lead = await db.leads.find_one({"id": request.contact_id})
        if lead:
            contact_type = "lead"
            contact_name = lead.get("full_name")
            # Update lead's last activity and call recording
            update_data = {"last_activity": now, "updated_at": now}
            if request.recording_file:
                update_data["call_recording_url"] = request.recording_file
            await db.leads.update_one({"id": request.contact_id}, {"$set": update_data})
        else:
            student = await db.students.find_one({"id": request.contact_id})
            if student:
                contact_type = "student"
                contact_name = student.get("full_name")
                # Update student's call recording
                update_data = {"updated_at": now}
                if request.recording_file:
                    update_data["call_recording_url"] = request.recording_file
                await db.students.update_one({"id": request.contact_id}, {"$set": update_data})
    
    # Create call log entry
    call_log = {
        "id": call_id,
        "contact_id": request.contact_id,
        "contact_type": contact_type,
        "contact_name": contact_name or request.name,
        "phone_number": request.phone_number,
        "call_type": request.call_type,
        "call_direction": request.call_direction,
        "call_duration": request.call_duration,
        "call_date": request.timestamp or now,
        "recording_file": request.recording_file,
        "agent_extension": request.agent_extension,
        "notes": request.notes,
        "logged_at": now,
        "system": "3CX"
    }
    
    await db.call_logs.insert_one(call_log)
    
    logger.info(f"3CX: Call logged - {request.call_direction} {request.call_type} to {request.phone_number}, duration: {request.call_duration}s")
    
    return {
        "success": True,
        "call_id": call_id,
        "message": "Call logged successfully"
    }

@api_router.get("/3cx/call-history/{contact_id}")
async def get_call_history(contact_id: str, user = Depends(get_current_user)):
    """Get call history for a specific contact"""
    calls = await db.call_logs.find({"contact_id": contact_id}).sort("call_date", -1).to_list(length=100)
    
    return {
        "calls": [
            {
                "call_id": call["id"],
                "call_type": call.get("call_type"),
                "call_direction": call.get("call_direction"),
                "call_duration": call.get("call_duration", 0),
                "call_date": call.get("call_date"),
                "recording_url": call.get("recording_file"),
                "agent_extension": call.get("agent_extension"),
                "notes": call.get("notes")
            }
            for call in calls
        ],
        "total": len(calls)
    }

@api_router.get("/3cx/recent-calls")
async def get_recent_calls(limit: int = 50, extension: Optional[str] = None, user = Depends(get_current_user)):
    """Get recent calls across all contacts, optionally filtered by extension"""
    query = {}
    
    # Filter by extension if provided, or by user's assigned extension
    filter_extension = extension or user.get("threecx_extension")
    if filter_extension:
        query["extension"] = filter_extension
    
    calls = await db.call_logs.find(query).sort("call_date", -1).to_list(length=limit)
    
    return {
        "calls": [
            {
                "call_id": call["id"],
                "contact_id": call.get("contact_id"),
                "contact_type": call.get("contact_type"),
                "contact_name": call.get("contact_name"),
                "phone_number": call.get("phone_number"),
                "call_type": call.get("call_type"),
                "call_direction": call.get("call_direction"),
                "call_duration": call.get("call_duration", 0),
                "call_date": call.get("call_date"),
                "recording_url": call.get("recording_file"),
                "extension": call.get("extension")
            }
            for call in calls
        ],
        "total": len(calls),
        "filtered_by_extension": filter_extension
    }

@api_router.post("/3cx/click-to-call")
async def click_to_call(phone_number: str, contact_id: Optional[str] = None, user = Depends(get_current_user)):
    """
    Initiate a click-to-call request
    This endpoint can be called from the frontend to log outbound call attempts
    """
    now = datetime.now(timezone.utc).isoformat()
    call_id = str(uuid.uuid4())
    
    # Get contact info if provided
    contact_type = None
    contact_name = None
    
    if contact_id:
        lead = await db.leads.find_one({"id": contact_id})
        if lead:
            contact_type = "lead"
            contact_name = lead.get("full_name")
        else:
            student = await db.students.find_one({"id": contact_id})
            if student:
                contact_type = "student"
                contact_name = student.get("full_name")
    
    # Log the click-to-call attempt with user's extension
    call_log = {
        "id": call_id,
        "contact_id": contact_id,
        "contact_type": contact_type,
        "contact_name": contact_name,
        "phone_number": phone_number,
        "call_type": "Outbound",
        "call_direction": "Outbound",
        "call_duration": 0,
        "call_date": now,
        "initiated_by": user["id"],
        "initiated_by_name": user.get("full_name"),
        "extension": user.get("threecx_extension"),  # User's 3CX extension
        "status": "initiated",
        "logged_at": now,
        "system": "ERP_Click2Call"
    }
    
    await db.call_logs.insert_one(call_log)
    
    logger.info(f"Click-to-call initiated by {user.get('full_name')} (ext: {user.get('threecx_extension')}) to {phone_number}")
    
    return {
        "success": True,
        "call_id": call_id,
        "phone_number": phone_number,
        "extension": user.get("threecx_extension"),
        "message": "Call initiated - connect via 3CX client"
    }

# ==================== QC / CALL QUALITY ENDPOINTS ====================

class CallQCUpdate(BaseModel):
    recording_url: Optional[str] = None
    qc_rating: Optional[int] = None  # 1-5 rating
    qc_notes: Optional[str] = None
    qc_status: Optional[str] = None  # pending, reviewed, flagged

@api_router.put("/3cx/calls/{call_id}/qc")
async def update_call_qc(call_id: str, update: CallQCUpdate, user = Depends(get_current_user)):
    """
    Update call QC information (recording URL, rating, notes)
    Used by QC team to add recording links and ratings
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the call
    call = await db.call_logs.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Build update data
    update_data = {"updated_at": now}
    
    if update.recording_url is not None:
        update_data["recording_file"] = update.recording_url
    if update.qc_rating is not None:
        update_data["qc_rating"] = update.qc_rating
    if update.qc_notes is not None:
        update_data["qc_notes"] = update.qc_notes
    if update.qc_status is not None:
        update_data["qc_status"] = update.qc_status
    
    update_data["qc_reviewed_by"] = user["id"]
    update_data["qc_reviewed_by_name"] = user.get("full_name")
    update_data["qc_reviewed_at"] = now
    
    await db.call_logs.update_one({"id": call_id}, {"$set": update_data})
    
    # Also update the contact's latest recording URL if provided
    if update.recording_url and call.get("contact_id"):
        contact_id = call["contact_id"]
        if call.get("contact_type") == "lead":
            await db.leads.update_one(
                {"id": contact_id}, 
                {"$set": {"call_recording_url": update.recording_url, "updated_at": now}}
            )
        elif call.get("contact_type") == "student":
            await db.students.update_one(
                {"id": contact_id}, 
                {"$set": {"call_recording_url": update.recording_url, "updated_at": now}}
            )
    
    logger.info(f"QC update for call {call_id} by {user.get('full_name')}")
    
    return {
        "success": True,
        "call_id": call_id,
        "message": "Call QC information updated"
    }

@api_router.get("/3cx/calls/qc-queue")
async def get_qc_queue(
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    """
    Get calls pending QC review
    Returns calls with their QC status for the QC dashboard
    """
    query = {}
    
    # Filter by QC status
    if status:
        if status == "pending":
            query["qc_status"] = {"$in": [None, "pending"]}
        else:
            query["qc_status"] = status
    
    # Filter by date range
    if from_date:
        query["call_date"] = {"$gte": from_date}
    if to_date:
        if "call_date" in query:
            query["call_date"]["$lte"] = to_date
        else:
            query["call_date"] = {"$lte": to_date}
    
    # Only get answered calls (they have recordings)
    query["call_type"] = {"$in": ["Inbound", "Outbound"]}
    
    calls = await db.call_logs.find(query).sort("call_date", -1).to_list(length=limit)
    
    # Get 3CX recordings page URL for quick access
    threecx_recordings_url = "https://clt-academy.3cx.ae:5001/#/office/recordings"
    
    return {
        "calls": [
            {
                "call_id": call["id"],
                "contact_id": call.get("contact_id"),
                "contact_type": call.get("contact_type"),
                "contact_name": call.get("contact_name"),
                "phone_number": call.get("phone_number"),
                "call_type": call.get("call_type"),
                "call_direction": call.get("call_direction"),
                "call_duration": call.get("call_duration", 0),
                "call_date": call.get("call_date"),
                "agent_extension": call.get("agent_extension"),
                "recording_url": call.get("recording_file"),
                "qc_status": call.get("qc_status", "pending"),
                "qc_rating": call.get("qc_rating"),
                "qc_notes": call.get("qc_notes"),
                "qc_reviewed_by": call.get("qc_reviewed_by_name"),
                "qc_reviewed_at": call.get("qc_reviewed_at"),
                "threecx_recordings_link": f"{threecx_recordings_url}?number={call.get('phone_number', '')}"
            }
            for call in calls
        ],
        "total": len(calls),
        "threecx_recordings_url": threecx_recordings_url
    }

@api_router.get("/3cx/calls/{call_id}")
async def get_call_details(call_id: str, user = Depends(get_current_user)):
    """Get detailed information about a specific call"""
    call = await db.call_logs.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Get contact details
    contact_details = None
    if call.get("contact_id"):
        if call.get("contact_type") == "lead":
            lead = await db.leads.find_one({"id": call["contact_id"]}, {"_id": 0})
            contact_details = lead
        elif call.get("contact_type") == "student":
            student = await db.students.find_one({"id": call["contact_id"]}, {"_id": 0})
            contact_details = student
    
    return {
        "call_id": call["id"],
        "contact_id": call.get("contact_id"),
        "contact_type": call.get("contact_type"),
        "contact_name": call.get("contact_name"),
        "contact_details": contact_details,
        "phone_number": call.get("phone_number"),
        "call_type": call.get("call_type"),
        "call_direction": call.get("call_direction"),
        "call_duration": call.get("call_duration", 0),
        "call_date": call.get("call_date"),
        "agent_extension": call.get("agent_extension"),
        "recording_url": call.get("recording_file"),
        "qc_status": call.get("qc_status", "pending"),
        "qc_rating": call.get("qc_rating"),
        "qc_notes": call.get("qc_notes"),
        "qc_reviewed_by": call.get("qc_reviewed_by_name"),
        "qc_reviewed_at": call.get("qc_reviewed_at"),
        "logged_at": call.get("logged_at"),
        "system": call.get("system")
    }

# ==================== AUDIT LOG ENDPOINTS ====================

@api_router.get("/audit-logs")
async def get_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    user = Depends(get_current_user)
):
    """
    Get audit logs with filters
    Only super_admin and admin can view audit logs
    """
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type
    if from_date:
        query["timestamp"] = {"$gte": from_date}
    if to_date:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = to_date
        else:
            query["timestamp"] = {"$lte": to_date}
    if search:
        query["$or"] = [
            {"user_name": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"entity_name": {"$regex": search, "$options": "i"}},
            {"action": {"$regex": search, "$options": "i"}},
            {"entity_type": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.audit_logs.count_documents(query)
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/audit-logs/summary")
async def get_audit_summary(
    days: int = 7,
    user = Depends(get_current_user)
):
    """
    Get audit log summary statistics
    """
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Get counts by action
    pipeline = [
        {"$match": {"timestamp": {"$gte": from_date}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}}}
    ]
    actions_result = await db.audit_logs.aggregate(pipeline).to_list(length=100)
    actions_summary = {item["_id"]: item["count"] for item in actions_result}
    
    # Get counts by entity type
    pipeline = [
        {"$match": {"timestamp": {"$gte": from_date}}},
        {"$group": {"_id": "$entity_type", "count": {"$sum": 1}}}
    ]
    entities_result = await db.audit_logs.aggregate(pipeline).to_list(length=100)
    entities_summary = {item["_id"]: item["count"] for item in entities_result}
    
    # Get most active users
    pipeline = [
        {"$match": {"timestamp": {"$gte": from_date}}},
        {"$group": {"_id": {"user_id": "$user_id", "user_name": "$user_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    users_result = await db.audit_logs.aggregate(pipeline).to_list(length=10)
    active_users = [{"user_id": item["_id"]["user_id"], "user_name": item["_id"]["user_name"], "actions": item["count"]} for item in users_result]
    
    # Get recent access control changes
    access_logs = await db.audit_logs.find(
        {"entity_type": "access_control", "timestamp": {"$gte": from_date}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(length=20)
    
    # Get recent login activity
    login_logs = await db.audit_logs.find(
        {"action": {"$in": ["login", "logout", "login_failed"]}, "timestamp": {"$gte": from_date}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(length=50)
    
    # Get total count
    total_actions = await db.audit_logs.count_documents({"timestamp": {"$gte": from_date}})
    
    return {
        "period_days": days,
        "total_actions": total_actions,
        "actions_by_type": actions_summary,
        "actions_by_entity": entities_summary,
        "most_active_users": active_users,
        "recent_access_changes": access_logs,
        "recent_login_activity": login_logs
    }

@api_router.get("/audit-logs/user/{target_user_id}")
async def get_user_audit_trail(
    target_user_id: str,
    limit: int = 50,
    user = Depends(get_current_user)
):
    """
    Get all audit logs for a specific user
    """
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.audit_logs.find(
        {"user_id": target_user_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    # Get user info
    target_user = await db.users.find_one({"id": target_user_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "user": target_user,
        "logs": logs,
        "total": len(logs)
    }

@api_router.get("/audit-logs/entity/{entity_type}/{entity_id}")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: str,
    user = Depends(get_current_user)
):
    """
    Get all audit logs for a specific entity (lead, student, user, etc.)
    """
    if user.get("role") not in ["super_admin", "admin", "sales_manager", "cs_head"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.audit_logs.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(length=100)
    
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "logs": logs,
        "total": len(logs)
    }

@api_router.get("/3cx/template")
async def get_3cx_crm_template():
    """
    Returns the 3CX CRM Integration Template XML
    Download this and upload to your 3CX server
    """
    # Get the backend URL
    backend_url = os.environ.get('BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://finance-hub-803.preview.emergentagent.com'))
    
    # 3CX compatible XML template - matching exact schema from working 3MBK template
    template = f'''<?xml version="1.0" encoding="utf-8"?>
<Crm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Country="AE" Name="CLT Academy ERP" Version="1" SupportsEmojis="true" SupportsTranscription="true" ListPageSize="0">
  <Number Prefix="AsIs" MaxLength="12" />
  <Connection MaxConcurrentRequests="4" />
  <Parameters>
    <Parameter Name="URL" Type="String" Parent="General Configuration" Editor="String" Title="API URL:" Validation="" Default="{backend_url}/api/3cx/" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="CreateContactEnabled" Type="Boolean" Parent="" Editor="String" Title="Enable Contact Creation" Validation="" Default="True" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="CreateOnCallDirection" Type="List" Parent="CreateContactEnabled" Editor="String" Title="Create Contacts on Call Direction:" Validation="" Default="Inbound" ListValues="Inbound,Inbound/Outbound" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="CreateContactFirstName" Type="String" Parent="CreateContactEnabled" Editor="String" Title="New Contact First Name:" Validation="" Default="New" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="CreateContactLastName" Type="String" Parent="CreateContactEnabled" Editor="String" Title="New Contact Last Name:" Validation="" Default="Lead [Number]" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="ReportCallEnabled" Type="Boolean" Parent="" Editor="String" Title="Enable Call Journaling" Validation="" Default="True" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="Subject" Type="String" Parent="ReportCallEnabled" Editor="String" Title="Call Subject:" Validation="" Default="CLT Academy Call" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="InboundCallText" Type="String" Parent="ReportCallEnabled" Editor="String" Title="Answered Inbound Call:" Validation="" Default="[DateTime]: Answered incoming call from [Number] to [Agent] ([Duration])" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="MissedCallText" Type="String" Parent="ReportCallEnabled" Editor="String" Title="Missed Call:" Validation="" Default="[DateTime]: Missed call from [Number] to [Agent]" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="OutboundCallText" Type="String" Parent="ReportCallEnabled" Editor="String" Title="Answered Outbound Call:" Validation="" Default="[DateTime]: Answered outgoing call from [Agent] to [Number] ([Duration])" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
    <Parameter Name="NotAnsweredOutboundCallText" Type="String" Parent="ReportCallEnabled" Editor="String" Title="Unanswered Outbound Call:" Validation="" Default="[DateTime]: Unanswered outgoing call from [Agent] to [Number]" ListValues="" RequestUrl="" RequestUrlParameters="" ResponseScenario="" />
  </Parameters>
  <Authentication Type="No" />
  <Scenarios>
    <Scenario Id="" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="" Url="[URL]contact-lookup?phone_number=[Number]" MessagePasses="0" Message="" RequestContentType="" RequestEncoding="UrlEncoded" RequestType="Get" ResponseType="Json" />
      <Rules>
        <Rule Type="Any" Ethalon="">contact_id</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" LookupValue="" Path="contact_id"><Filter /></Variable>
        <Variable Name="FirstName" LookupValue="" Path="first_name"><Filter /></Variable>
        <Variable Name="LastName" LookupValue="" Path="last_name"><Filter /></Variable>
        <Variable Name="CompanyName" LookupValue="" Path="company_name"><Filter /></Variable>
        <Variable Name="Email" LookupValue="" Path="email"><Filter /></Variable>
        <Variable Name="PhoneBusiness" LookupValue="" Path="phone_business"><Filter /></Variable>
        <Variable Name="PhoneMobile" LookupValue="" Path="phone_mobile"><Filter /></Variable>
      </Variables>
      <Outputs AllowEmpty="false">
        <Output Type="ContactID" Passes="0" Value="[ContactID]" />
        <Output Type="FirstName" Passes="0" Value="[FirstName]" />
        <Output Type="LastName" Passes="0" Value="[LastName]" />
        <Output Type="CompanyName" Passes="0" Value="[CompanyName]" />
        <Output Type="Email" Passes="0" Value="[Email]" />
        <Output Type="PhoneBusiness" Passes="0" Value="[PhoneBusiness]" />
        <Output Type="PhoneMobile" Passes="0" Value="[PhoneMobile]" />
        <Output Type="ContactUrl" Passes="0" Value="{backend_url}/sales/[ContactID]" />
        <Output Type="EntityId" Passes="0" Value="[ContactID]" />
        <Output Type="EntityType" Passes="0" Value="Leads" />
      </Outputs>
    </Scenario>
    <Scenario Id="LookupByEmail" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="" Url="[URL]contact-search?search_text=[Email]" MessagePasses="0" Message="" RequestContentType="" RequestEncoding="UrlEncoded" RequestType="Get" ResponseType="Json" />
      <Rules>
        <Rule Type="Any" Ethalon="">contacts.contact_id</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" LookupValue="" Path="contacts.contact_id"><Filter /></Variable>
        <Variable Name="FirstName" LookupValue="" Path="contacts.first_name"><Filter /></Variable>
        <Variable Name="LastName" LookupValue="" Path="contacts.last_name"><Filter /></Variable>
        <Variable Name="CompanyName" LookupValue="" Path="contacts.company_name"><Filter /></Variable>
        <Variable Name="Email" LookupValue="" Path="contacts.email"><Filter /></Variable>
        <Variable Name="PhoneBusiness" LookupValue="" Path="contacts.phone_business"><Filter /></Variable>
        <Variable Name="PhoneMobile" LookupValue="" Path="contacts.phone_mobile"><Filter /></Variable>
      </Variables>
      <Outputs AllowEmpty="false">
        <Output Type="ContactID" Passes="0" Value="[ContactID]" />
        <Output Type="FirstName" Passes="0" Value="[FirstName]" />
        <Output Type="LastName" Passes="0" Value="[LastName]" />
        <Output Type="CompanyName" Passes="0" Value="[CompanyName]" />
        <Output Type="Email" Passes="0" Value="[Email]" />
        <Output Type="PhoneBusiness" Passes="0" Value="[PhoneBusiness]" />
        <Output Type="PhoneMobile" Passes="0" Value="[PhoneMobile]" />
        <Output Type="ContactUrl" Passes="0" Value="{backend_url}/sales/[ContactID]" />
        <Output Type="EntityId" Passes="0" Value="[ContactID]" />
        <Output Type="EntityType" Passes="0" Value="Leads" />
      </Outputs>
    </Scenario>
    <Scenario Id="CreateContactRecord" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="[CreateContactEnabled]!=True||[IIf([CreateOnCallDirection]==Inbound,[CallDirection]!=Inbound,False)]==True" Url="[URL]contact-create" MessagePasses="0" Message="" RequestContentType="application/json" RequestEncoding="Json" RequestType="Post" ResponseType="Json">
        <PostValues Key="" If="" SkipIf="">
          <Value Key="first_name" If="" SkipIf="" Passes="1" Type="String">[CreateContactFirstName]</Value>
          <Value Key="last_name" If="" SkipIf="" Passes="1" Type="String">[CreateContactLastName]</Value>
          <Value Key="phone_number" If="" SkipIf="" Passes="1" Type="String">[Number]</Value>
        </PostValues>
      </Request>
      <Rules>
        <Rule Type="Any" Ethalon="">contact_id</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" LookupValue="" Path="contact_id"><Filter /></Variable>
        <Variable Name="FirstName" LookupValue="" Path="first_name"><Filter /></Variable>
        <Variable Name="LastName" LookupValue="" Path="last_name"><Filter /></Variable>
      </Variables>
      <Outputs AllowEmpty="false">
        <Output Type="ContactID" Passes="0" Value="[ContactID]" />
        <Output Type="FirstName" Passes="0" Value="[FirstName]" />
        <Output Type="LastName" Passes="0" Value="[LastName]" />
        <Output Type="ContactUrl" Passes="0" Value="{backend_url}/sales/[ContactID]" />
        <Output Type="EntityId" Passes="0" Value="[ContactID]" />
        <Output Type="EntityType" Passes="0" Value="Leads" />
      </Outputs>
    </Scenario>
    <Scenario Id="ReportCall" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="[IIf([ReportCallEnabled]!=True||[EntityId]==&quot;&quot;,True,[IIf([CallType]!=Inbound,True,False)])]" Url="[URL]call-journal" MessagePasses="0" Message="" RequestContentType="application/json" RequestEncoding="Json" RequestType="Post" ResponseType="Json">
        <PostValues Key="" If="" SkipIf="">
          <Value Key="call_type" If="" SkipIf="" Passes="1" Type="String">[CallType]</Value>
          <Value Key="phone_number" If="" SkipIf="" Passes="1" Type="String">[Number]</Value>
          <Value Key="call_direction" If="" SkipIf="" Passes="1" Type="String">[CallDirection]</Value>
          <Value Key="name" If="" SkipIf="" Passes="1" Type="String">[Name]</Value>
          <Value Key="contact_id" If="" SkipIf="" Passes="1" Type="String">[EntityId]</Value>
          <Value Key="call_duration" If="" SkipIf="" Passes="1" Type="String">[Duration]</Value>
          <Value Key="timestamp" If="" SkipIf="" Passes="1" Type="String">[DateTime]</Value>
          <Value Key="agent_extension" If="" SkipIf="" Passes="1" Type="String">[Agent]</Value>
          <Value Key="agent_name" If="" SkipIf="" Passes="1" Type="String">[AgentFirstName] [AgentLastName]</Value>
          <Value Key="subject" If="" SkipIf="" Passes="2" Type="String">[Subject]</Value>
          <Value Key="description" If="" SkipIf="" Passes="2" Type="String">[InboundCallText]</Value>
        </PostValues>
      </Request>
      <Variables />
      <Outputs Next="ReportCallMissed" AllowEmpty="true" />
    </Scenario>
    <Scenario Id="ReportCallMissed" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="[IIf([ReportCallEnabled]!=True||[EntityId]==&quot;&quot;,True,[IIf([CallType]!=Missed,True,False)])]" Url="[URL]call-journal" MessagePasses="0" Message="" RequestContentType="application/json" RequestEncoding="Json" RequestType="Post" ResponseType="Json">
        <PostValues Key="" If="" SkipIf="">
          <Value Key="call_type" If="" SkipIf="" Passes="1" Type="String">[CallType]</Value>
          <Value Key="phone_number" If="" SkipIf="" Passes="1" Type="String">[Number]</Value>
          <Value Key="call_direction" If="" SkipIf="" Passes="1" Type="String">[CallDirection]</Value>
          <Value Key="name" If="" SkipIf="" Passes="1" Type="String">[Name]</Value>
          <Value Key="contact_id" If="" SkipIf="" Passes="1" Type="String">[EntityId]</Value>
          <Value Key="call_duration" If="" SkipIf="" Passes="1" Type="String">[Duration]</Value>
          <Value Key="timestamp" If="" SkipIf="" Passes="1" Type="String">[DateTime]</Value>
          <Value Key="agent_extension" If="" SkipIf="" Passes="1" Type="String">[Agent]</Value>
          <Value Key="agent_name" If="" SkipIf="" Passes="1" Type="String">[AgentFirstName] [AgentLastName]</Value>
          <Value Key="subject" If="" SkipIf="" Passes="2" Type="String">[Subject]</Value>
          <Value Key="description" If="" SkipIf="" Passes="2" Type="String">[MissedCallText]</Value>
        </PostValues>
      </Request>
      <Variables />
      <Outputs Next="ReportCallOutbound" AllowEmpty="true" />
    </Scenario>
    <Scenario Id="ReportCallOutbound" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="[IIf([ReportCallEnabled]!=True||[EntityId]==&quot;&quot;,True,[IIf([CallType]!=Outbound,True,False)])]" Url="[URL]call-journal" MessagePasses="0" Message="" RequestContentType="application/json" RequestEncoding="Json" RequestType="Post" ResponseType="Json">
        <PostValues Key="" If="" SkipIf="">
          <Value Key="call_type" If="" SkipIf="" Passes="1" Type="String">[CallType]</Value>
          <Value Key="phone_number" If="" SkipIf="" Passes="1" Type="String">[Number]</Value>
          <Value Key="call_direction" If="" SkipIf="" Passes="1" Type="String">[CallDirection]</Value>
          <Value Key="name" If="" SkipIf="" Passes="1" Type="String">[Name]</Value>
          <Value Key="contact_id" If="" SkipIf="" Passes="1" Type="String">[EntityId]</Value>
          <Value Key="call_duration" If="" SkipIf="" Passes="1" Type="String">[Duration]</Value>
          <Value Key="timestamp" If="" SkipIf="" Passes="1" Type="String">[DateTime]</Value>
          <Value Key="agent_extension" If="" SkipIf="" Passes="1" Type="String">[Agent]</Value>
          <Value Key="agent_name" If="" SkipIf="" Passes="1" Type="String">[AgentFirstName] [AgentLastName]</Value>
          <Value Key="subject" If="" SkipIf="" Passes="2" Type="String">[Subject]</Value>
          <Value Key="description" If="" SkipIf="" Passes="2" Type="String">[OutboundCallText]</Value>
        </PostValues>
      </Request>
      <Variables />
      <Outputs Next="ReportCallNotanswered" AllowEmpty="true" />
    </Scenario>
    <Scenario Id="ReportCallNotanswered" Type="REST" EntityId="" EntityOrder="">
      <Request SkipIf="[IIf([ReportCallEnabled]!=True||[EntityId]==&quot;&quot;,True,[IIf([CallType]!=Notanswered,True,False)])]" Url="[URL]call-journal" MessagePasses="0" Message="" RequestContentType="application/json" RequestEncoding="Json" RequestType="Post" ResponseType="Json">
        <PostValues Key="" If="" SkipIf="">
          <Value Key="call_type" If="" SkipIf="" Passes="1" Type="String">[CallType]</Value>
          <Value Key="phone_number" If="" SkipIf="" Passes="1" Type="String">[Number]</Value>
          <Value Key="call_direction" If="" SkipIf="" Passes="1" Type="String">[CallDirection]</Value>
          <Value Key="name" If="" SkipIf="" Passes="1" Type="String">[Name]</Value>
          <Value Key="contact_id" If="" SkipIf="" Passes="1" Type="String">[EntityId]</Value>
          <Value Key="call_duration" If="" SkipIf="" Passes="1" Type="String">[Duration]</Value>
          <Value Key="timestamp" If="" SkipIf="" Passes="1" Type="String">[DateTime]</Value>
          <Value Key="agent_extension" If="" SkipIf="" Passes="1" Type="String">[Agent]</Value>
          <Value Key="agent_name" If="" SkipIf="" Passes="1" Type="String">[AgentFirstName] [AgentLastName]</Value>
          <Value Key="subject" If="" SkipIf="" Passes="2" Type="String">[Subject]</Value>
          <Value Key="description" If="" SkipIf="" Passes="2" Type="String">[NotAnsweredOutboundCallText]</Value>
        </PostValues>
      </Request>
      <Variables />
      <Outputs AllowEmpty="false" />
    </Scenario>
  </Scenarios>
</Crm>'''
    
    return {
        "template": template,
        "instructions": {
            "step1": "Download this XML file using the 'Download XML' button",
            "step2": "Go to your 3CX Admin Console > Integrations > CRM",
            "step3": "Click '+ Add Template' button",
            "step4": "Upload the downloaded XML file",
            "step5": "Select 'CLT Academy ERP' from the dropdown",
            "step6": "The API URL should be pre-filled. Click Save",
            "step7": "Click TEST button to verify connection"
        },
        "backend_url": backend_url,
        "endpoints": {
            "contact_lookup": f"{backend_url}/api/3cx/contact-lookup?phone_number={{phone}}",
            "contact_search": f"{backend_url}/api/3cx/contact-search?search_text={{text}}",
            "contact_create": f"{backend_url}/api/3cx/contact-create",
            "call_journal": f"{backend_url}/api/3cx/call-journal"
        }
    }

# ==================== DOUBLE ENTRY ACCOUNTING ENGINE ====================

from accounting_engine import (
    AccountCreate, AccountUpdate, AccountResponse,
    JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse, JournalLineCreate,
    SettlementBatchCreate, SettlementBatchSettle, SettlementBatchResponse,
    ExpenseCreate, ExpenseResponse, TransferCreate, TransferResponse,
    FinanceConfigUpdate, DEFAULT_ACCOUNTS, DEFAULT_FINANCE_CONFIG,
    AccountType, AccountSubtype, JournalStatus, LockStatus, SettlementStatus, SettlementProvider,
    get_inr_to_aed_rate, convert_to_aed, calculate_expected_settlement_date, is_settlement_overdue,
    create_finance_audit_entry, SETTLEMENT_RULES
)

# ==================== SALES TO ACCOUNTING INTEGRATION ====================

async def create_sales_journal_entry(
    sale_amount: float,
    payment_method: str,
    customer_name: str,
    lead_id: str,
    user_id: str,
    user_name: str
):
    """
    Automatically create a double-entry journal entry when a sale is completed.
    
    For BNPL (Tabby/Tamara): DR Receivable, CR Revenue
    For Bank/Card/Cash: DR Bank, CR Revenue
    """
    now = datetime.now(timezone.utc)
    entry_id = str(uuid.uuid4())
    
    # Determine which account to debit based on payment method
    payment_method_lower = payment_method.lower() if payment_method else ""
    
    # Map payment method to receivable account
    receivable_map = {
        "tabby": "1101",      # Tabby Receivable
        "tamara": "1102",     # Tamara Receivable
        "stripe": "1103",     # Network Receivable (for card payments)
        "unipay": "1103",     # Network Receivable
        "bank_transfer": "1001",  # ADCB Bank (direct to bank)
        "cash": "1006",       # Cash
        "usdt": "1005",       # USDT Wallet
    }
    
    debit_account_code = receivable_map.get(payment_method_lower, "1103")  # Default to Network
    
    # Get debit account
    debit_account = await db.accounts.find_one({"code": debit_account_code})
    if not debit_account:
        print(f"Warning: Account {debit_account_code} not found for sales journal")
        return None
    
    # Get revenue account (Course Revenue)
    revenue_account = await db.accounts.find_one({"code": "4001"})
    if not revenue_account:
        print("Warning: Revenue account 4001 not found")
        return None
    
    # Determine source for settlement tracking
    provider_map = {
        "tabby": "Tabby",
        "tamara": "Tamara", 
        "stripe": "Network",
        "unipay": "Network",
    }
    provider = provider_map.get(payment_method_lower)
    
    # Create journal entry
    journal_entry = {
        "id": entry_id,
        "entry_date": now.isoformat(),
        "description": f"Sale: {customer_name} - {payment_method}",
        "source_module": "Sales",
        "source_id": lead_id,
        "status": JournalStatus.APPROVED.value,  # Auto-approve sales entries
        "lock_status": LockStatus.OPEN.value,
        "approved_by": "System",
        "approved_at": now.isoformat(),
        "created_by": user_id,
        "created_by_name": user_name,
        "created_at": now.isoformat(),
        "settlement_status": "Pending" if provider else None,
        "settlement_provider": provider
    }
    
    await db.journal_entries.insert_one(journal_entry)
    
    # Create debit line (Asset increase)
    debit_line = {
        "id": str(uuid.uuid4()),
        "journal_entry_id": entry_id,
        "account_id": debit_account["id"],
        "debit_amount": sale_amount,
        "credit_amount": 0,
        "currency": "AED",
        "base_amount_aed": sale_amount,
        "memo": f"Sale to {customer_name}"
    }
    await db.journal_lines.insert_one(debit_line)
    
    # Create credit line (Revenue increase)
    credit_line = {
        "id": str(uuid.uuid4()),
        "journal_entry_id": entry_id,
        "account_id": revenue_account["id"],
        "debit_amount": 0,
        "credit_amount": sale_amount,
        "currency": "AED",
        "base_amount_aed": sale_amount,
        "memo": f"Course revenue - {customer_name}"
    }
    await db.journal_lines.insert_one(credit_line)
    
    # Create audit log
    audit_entry = create_finance_audit_entry(
        user_id, user_name, "journal_entry", entry_id,
        "create_sales", None, {"sale_amount": sale_amount, "customer": customer_name}
    )
    await db.finance_audit_log.insert_one(audit_entry)
    
    print(f"Created sales journal entry {entry_id} for {customer_name}: AED {sale_amount}")
    return entry_id

# ==================== CHART OF ACCOUNTS ====================

@api_router.get("/accounting/accounts")
async def get_accounts(
    account_type: Optional[str] = None,
    subtype: Optional[str] = None,
    active_only: bool = True,
    user = Depends(get_current_user)
):
    """Get all accounts in the chart of accounts"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if account_type:
        query["account_type"] = account_type
    if subtype:
        query["subtype"] = subtype
    if active_only:
        query["active"] = True
    
    accounts = await db.accounts.find(query, {"_id": 0}).sort("code", 1).to_list(200)
    return accounts

@api_router.post("/accounting/accounts")
async def create_account(data: AccountCreate, user = Depends(get_current_user)):
    """Create a new account"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check for duplicate code
    if data.code:
        existing = await db.accounts.find_one({"code": data.code})
        if existing:
            raise HTTPException(status_code=400, detail="Account code already exists")
    
    account = {
        "id": str(uuid.uuid4()),
        "code": data.code,
        "name": data.name,
        "account_type": data.account_type.value,
        "subtype": data.subtype.value,
        "currency": data.currency,
        "parent_account_id": data.parent_account_id,
        "description": data.description,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.accounts.insert_one(account)
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "account", account["id"], 
        "create", None, {k: v for k, v in account.items() if k != "_id"}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return {k: v for k, v in account.items() if k != "_id"}

@api_router.put("/accounting/accounts/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, user = Depends(get_current_user)):
    """Update an account"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing = await db.accounts.find_one({"id": account_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.code is not None:
        update_data["code"] = data.code
    if data.description is not None:
        update_data["description"] = data.description
    if data.active is not None:
        update_data["active"] = data.active
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.accounts.update_one({"id": account_id}, {"$set": update_data})
    
    updated = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "account", account_id,
        "update", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

@api_router.post("/accounting/accounts/seed")
async def seed_accounts(user = Depends(get_current_user)):
    """Seed the default chart of accounts"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can seed accounts")
    
    created = 0
    for acc in DEFAULT_ACCOUNTS:
        existing = await db.accounts.find_one({"code": acc["code"]})
        if not existing:
            account = {
                "id": str(uuid.uuid4()),
                **acc,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": user["id"]
            }
            await db.accounts.insert_one(account)
            created += 1
    
    # Seed default config
    existing_config = await db.finance_config.find_one({"key": "settings"})
    if not existing_config:
        await db.finance_config.insert_one({
            "key": "settings",
            **DEFAULT_FINANCE_CONFIG,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": f"Seeded {created} accounts", "total_default": len(DEFAULT_ACCOUNTS)}

# ==================== JOURNAL ENTRIES ====================

async def get_account_name(account_id: str) -> str:
    """Helper to get account name"""
    account = await db.accounts.find_one({"id": account_id}, {"name": 1})
    return account.get("name", "Unknown") if account else "Unknown"

async def get_exchange_rates():
    """Get current exchange rates"""
    api_key = os.environ.get("EXCHANGE_RATE_API_KEY", "")
    usd_rate = float(os.environ.get("USD_TO_AED_RATE", "3.674"))
    inr_rate = await get_inr_to_aed_rate(api_key) if api_key else 0.044
    return {"INR": inr_rate, "USD": usd_rate, "USDT": usd_rate}

@api_router.get("/accounting/journal-entries")
async def get_journal_entries(
    status: Optional[str] = None,
    source_module: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    user = Depends(get_current_user)
):
    """Get journal entries with filters"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if status:
        query["status"] = status
    if source_module:
        query["source_module"] = source_module
    if from_date:
        query["entry_date"] = {"$gte": from_date}
    if to_date:
        if "entry_date" in query:
            query["entry_date"]["$lte"] = to_date
        else:
            query["entry_date"] = {"$lte": to_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("entry_date", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with lines and account names
    for entry in entries:
        lines = await db.journal_lines.find({"journal_entry_id": entry["id"]}, {"_id": 0}).to_list(100)
        for line in lines:
            line["account_name"] = await get_account_name(line["account_id"])
        entry["lines"] = lines
        entry["total_debit"] = sum(l.get("debit_amount", 0) for l in lines)
        entry["total_credit"] = sum(l.get("credit_amount", 0) for l in lines)
        entry["is_balanced"] = abs(entry["total_debit"] - entry["total_credit"]) < 0.01
    
    total = await db.journal_entries.count_documents(query)
    
    return {"entries": entries, "total": total, "limit": limit, "skip": skip}

@api_router.post("/accounting/journal-entries")
async def create_journal_entry(data: JournalEntryCreate, user = Depends(get_current_user)):
    """Create a new journal entry"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate balance
    total_debit = sum(line.debit_amount for line in data.lines)
    total_credit = sum(line.credit_amount for line in data.lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journal entry is not balanced. Debit: {total_debit}, Credit: {total_credit}")
    
    # Get exchange rates
    rates = await get_exchange_rates()
    
    entry_id = str(uuid.uuid4())
    entry = {
        "id": entry_id,
        "entry_date": data.entry_date,
        "description": data.description,
        "source_module": data.source_module,
        "source_id": data.source_id,
        "status": JournalStatus.DRAFT.value,
        "lock_status": LockStatus.OPEN.value,
        "approved_by": None,
        "approved_at": None,
        "created_by": user["id"],
        "created_by_name": user.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "unlock_reason": None
    }
    
    await db.journal_entries.insert_one(entry)
    
    # Create lines
    for line in data.lines:
        line_data = {
            "id": str(uuid.uuid4()),
            "journal_entry_id": entry_id,
            "account_id": line.account_id,
            "debit_amount": line.debit_amount,
            "credit_amount": line.credit_amount,
            "currency": line.currency,
            "base_amount_aed": convert_to_aed(
                line.debit_amount or line.credit_amount,
                line.currency,
                rates.get("INR", 0.044),
                rates.get("USD", 3.674)
            ),
            "memo": line.memo
        }
        await db.journal_lines.insert_one(line_data)
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "create", None, {k: v for k, v in entry.items() if k != "_id"}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return {k: v for k, v in entry.items() if k != "_id"}

@api_router.put("/accounting/journal-entries/{entry_id}")
async def update_journal_entry(entry_id: str, data: JournalEntryUpdate, user = Depends(get_current_user)):
    """Update a draft journal entry"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing = await db.journal_entries.find_one({"id": entry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if existing.get("lock_status") == LockStatus.LOCKED.value:
        raise HTTPException(status_code=400, detail="Cannot edit locked journal entry")
    
    if existing.get("status") == JournalStatus.APPROVED.value:
        raise HTTPException(status_code=400, detail="Cannot edit approved journal entry")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    update_data = {}
    if data.entry_date:
        update_data["entry_date"] = data.entry_date
    if data.description:
        update_data["description"] = data.description
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.journal_entries.update_one({"id": entry_id}, {"$set": update_data})
    
    # Update lines if provided
    if data.lines:
        # Validate balance
        total_debit = sum(line.debit_amount for line in data.lines)
        total_credit = sum(line.credit_amount for line in data.lines)
        
        if abs(total_debit - total_credit) > 0.01:
            raise HTTPException(status_code=400, detail="Journal entry is not balanced")
        
        # Delete old lines and create new ones
        await db.journal_lines.delete_many({"journal_entry_id": entry_id})
        
        rates = await get_exchange_rates()
        for line in data.lines:
            line_data = {
                "id": str(uuid.uuid4()),
                "journal_entry_id": entry_id,
                "account_id": line.account_id,
                "debit_amount": line.debit_amount,
                "credit_amount": line.credit_amount,
                "currency": line.currency,
                "base_amount_aed": convert_to_aed(
                    line.debit_amount or line.credit_amount,
                    line.currency,
                    rates.get("INR", 0.044),
                    rates.get("USD", 3.674)
                ),
                "memo": line.memo
            }
            await db.journal_lines.insert_one(line_data)
    
    updated = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "update", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

@api_router.post("/accounting/journal-entries/{entry_id}/submit")
async def submit_journal_entry(entry_id: str, user = Depends(get_current_user)):
    """Submit a journal entry for approval"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing = await db.journal_entries.find_one({"id": entry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if existing.get("status") != JournalStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft entries can be submitted")
    
    # Validate balance
    lines = await db.journal_lines.find({"journal_entry_id": entry_id}).to_list(100)
    total_debit = sum(l.get("debit_amount", 0) for l in lines)
    total_credit = sum(l.get("credit_amount", 0) for l in lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail="Cannot submit unbalanced journal entry")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    await db.journal_entries.update_one(
        {"id": entry_id},
        {"$set": {
            "status": JournalStatus.SUBMITTED.value,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "submitted_by": user["id"]
        }}
    )
    
    updated = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "submit", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

@api_router.post("/accounting/journal-entries/{entry_id}/approve")
async def approve_journal_entry(entry_id: str, user = Depends(get_current_user)):
    """Approve a submitted journal entry"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    existing = await db.journal_entries.find_one({"id": entry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if existing.get("status") != JournalStatus.SUBMITTED.value:
        raise HTTPException(status_code=400, detail="Only submitted entries can be approved")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    now = datetime.now(timezone.utc).isoformat()
    await db.journal_entries.update_one(
        {"id": entry_id},
        {"$set": {
            "status": JournalStatus.APPROVED.value,
            "lock_status": LockStatus.LOCKED.value,
            "approved_at": now,
            "approved_by": user["id"],
            "approved_by_name": user.get("full_name")
        }}
    )
    
    updated = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "approve", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

@api_router.post("/accounting/journal-entries/{entry_id}/lock")
async def lock_journal_entry(entry_id: str, user = Depends(get_current_user)):
    """Lock a journal entry (super admin only)"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can lock entries")
    
    existing = await db.journal_entries.find_one({"id": entry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    await db.journal_entries.update_one(
        {"id": entry_id},
        {"$set": {"lock_status": LockStatus.LOCKED.value}}
    )
    
    updated = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "lock", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

class UnlockRequest(BaseModel):
    reason: str

@api_router.post("/accounting/journal-entries/{entry_id}/unlock")
async def unlock_journal_entry(entry_id: str, data: UnlockRequest, user = Depends(get_current_user)):
    """Unlock a locked journal entry (super admin only)"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can unlock entries")
    
    existing = await db.journal_entries.find_one({"id": entry_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    if existing.get("lock_status") != LockStatus.LOCKED.value:
        raise HTTPException(status_code=400, detail="Entry is not locked")
    
    before_state = {k: v for k, v in existing.items() if k != "_id"}
    
    await db.journal_entries.update_one(
        {"id": entry_id},
        {"$set": {
            "lock_status": LockStatus.OPEN.value,
            "unlock_reason": data.reason,
            "unlocked_at": datetime.now(timezone.utc).isoformat(),
            "unlocked_by": user["id"]
        }}
    )
    
    updated = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "journal_entry", entry_id,
        "unlock", before_state, {"unlock_reason": data.reason, **updated}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

# ==================== SETTLEMENT BATCHES ====================

@api_router.get("/accounting/settlements")
async def get_settlement_batches(
    provider: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    user = Depends(get_current_user)
):
    """Get settlement batches"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if provider:
        query["provider"] = provider
    if status:
        query["status"] = status
    
    batches = await db.settlement_batches.find(query, {"_id": 0}).sort("expected_settlement_date", -1).limit(limit).to_list(limit)
    
    # Get config for grace period
    config = await db.finance_config.find_one({"key": "settings"})
    grace_days = config.get("grace_period_days", 2) if config else 2
    
    # Enrich with account names and overdue status
    for batch in batches:
        account = await db.accounts.find_one({"id": batch.get("bank_account_id")})
        batch["bank_account_name"] = account.get("name", "Unknown") if account else "Unknown"
        
        if batch.get("status") == "Pending" and batch.get("expected_settlement_date"):
            expected = datetime.fromisoformat(batch["expected_settlement_date"].replace("Z", "+00:00"))
            batch["is_overdue"] = is_settlement_overdue(expected, grace_days)
        else:
            batch["is_overdue"] = False
    
    return batches

@api_router.get("/accounting/settlements/pending-receivables")
async def get_pending_receivables(
    provider: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get pending receivable entries for settlement batch creation"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find journal entries with receivable debits that are not yet settled
    query = {
        "source_module": "Sales",
        "status": JournalStatus.APPROVED.value,
        "settlement_status": {"$ne": SettlementStatus.SETTLED.value}
    }
    
    if provider:
        query["provider"] = provider
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("entry_date", -1).to_list(500)
    
    # Enrich with amounts
    for entry in entries:
        lines = await db.journal_lines.find({"journal_entry_id": entry["id"]}, {"_id": 0}).to_list(10)
        entry["lines"] = lines
        # Find the receivable debit amount
        receivable_amount = 0
        for line in lines:
            account = await db.accounts.find_one({"id": line["account_id"]})
            if account and account.get("subtype") == "Receivable":
                receivable_amount += line.get("debit_amount", 0)
        entry["receivable_amount"] = receivable_amount
    
    return entries

@api_router.post("/accounting/settlements")
async def create_settlement_batch(data: SettlementBatchCreate, user = Depends(get_current_user)):
    """Create a new settlement batch"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate gross amount from selected entries
    gross_amount = 0
    for entry_id in data.entry_ids:
        lines = await db.journal_lines.find({"journal_entry_id": entry_id}).to_list(10)
        for line in lines:
            account = await db.accounts.find_one({"id": line["account_id"]})
            if account and account.get("subtype") == "Receivable":
                gross_amount += line.get("debit_amount", 0)
    
    batch_id = str(uuid.uuid4())
    batch = {
        "id": batch_id,
        "provider": data.provider.value,
        "period_start": data.period_start,
        "period_end": data.period_end,
        "gross_amount": gross_amount,
        "net_received": None,
        "fees_withheld": None,
        "bank_account_id": data.bank_account_id,
        "expected_settlement_date": data.expected_settlement_date,
        "actual_received_date": None,
        "status": JournalStatus.DRAFT.value,
        "lock_status": LockStatus.OPEN.value,
        "approved_by": None,
        "approved_at": None,
        "proof_link": None,
        "entry_ids": data.entry_ids,
        "notes": data.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settlement_batches.insert_one(batch)
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "settlement_batch", batch_id,
        "create", None, {k: v for k, v in batch.items() if k != "_id"}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return {k: v for k, v in batch.items() if k != "_id"}

@api_router.post("/accounting/settlements/{batch_id}/settle")
async def settle_batch(batch_id: str, data: SettlementBatchSettle, user = Depends(get_current_user)):
    """Record settlement receipt and create settlement journal entry"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    batch = await db.settlement_batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Settlement batch not found")
    
    if batch.get("status") == SettlementStatus.SETTLED.value:
        raise HTTPException(status_code=400, detail="Batch already settled")
    
    before_state = {k: v for k, v in batch.items() if k != "_id"}
    
    # Calculate fees
    fees_withheld = batch["gross_amount"] - data.net_received
    
    # Get provider receivable account
    provider_map = {
        "Tabby": "Tabby Receivable",
        "Tamara": "Tamara Receivable",
        "Network": "Network Receivable"
    }
    receivable_account = await db.accounts.find_one({"name": provider_map.get(batch["provider"])})
    bank_account = await db.accounts.find_one({"id": batch["bank_account_id"]})
    fees_account = await db.accounts.find_one({"name": "Payment Provider Fees"})
    
    if not receivable_account or not bank_account or not fees_account:
        raise HTTPException(status_code=400, detail="Required accounts not found. Please seed accounts first.")
    
    rates = await get_exchange_rates()
    
    # Create settlement journal entry
    settlement_entry_id = str(uuid.uuid4())
    settlement_entry = {
        "id": settlement_entry_id,
        "entry_date": data.actual_received_date,
        "description": f"{batch['provider']} Settlement - {batch['period_start']} to {batch['period_end']}",
        "source_module": "Settlement",
        "source_id": batch_id,
        "status": JournalStatus.DRAFT.value,
        "lock_status": LockStatus.OPEN.value,
        "created_by": user["id"],
        "created_by_name": user.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.journal_entries.insert_one(settlement_entry)
    
    # Create journal lines:
    # Debit: Bank (net_received)
    # Debit: Payment Provider Fees (fees_withheld)
    # Credit: Provider Receivable (gross_amount)
    
    lines = [
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": settlement_entry_id,
            "account_id": bank_account["id"],
            "debit_amount": data.net_received,
            "credit_amount": 0,
            "currency": "AED",
            "base_amount_aed": data.net_received,
            "memo": f"Net received from {batch['provider']}"
        },
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": settlement_entry_id,
            "account_id": fees_account["id"],
            "debit_amount": fees_withheld,
            "credit_amount": 0,
            "currency": "AED",
            "base_amount_aed": fees_withheld,
            "memo": f"{batch['provider']} processing fees"
        },
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": settlement_entry_id,
            "account_id": receivable_account["id"],
            "debit_amount": 0,
            "credit_amount": batch["gross_amount"],
            "currency": "AED",
            "base_amount_aed": batch["gross_amount"],
            "memo": f"Clear {batch['provider']} receivable"
        }
    ]
    
    for line in lines:
        await db.journal_lines.insert_one(line)
    
    # Update batch
    await db.settlement_batches.update_one(
        {"id": batch_id},
        {"$set": {
            "net_received": data.net_received,
            "fees_withheld": fees_withheld,
            "actual_received_date": data.actual_received_date,
            "proof_link": data.proof_link,
            "status": SettlementStatus.SETTLED.value,
            "settlement_journal_id": settlement_entry_id,
            "settled_at": datetime.now(timezone.utc).isoformat(),
            "settled_by": user["id"]
        }}
    )
    
    # Mark original sale journal entries as settled
    for entry_id in batch["entry_ids"]:
        await db.journal_entries.update_one(
            {"id": entry_id},
            {"$set": {"settlement_status": SettlementStatus.SETTLED.value}}
        )
    
    updated = await db.settlement_batches.find_one({"id": batch_id}, {"_id": 0})
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "settlement_batch", batch_id,
        "settle", before_state, updated
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return updated

# ==================== EXPENSES ====================

@api_router.get("/accounting/expenses")
async def get_expenses(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    """Get expenses"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if from_date:
        query["date"] = {"$gte": from_date}
    if to_date:
        if "date" in query:
            query["date"]["$lte"] = to_date
        else:
            query["date"] = {"$lte": to_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    
    # Enrich with account names
    for expense in expenses:
        exp_account = await db.accounts.find_one({"id": expense.get("expense_account_id")})
        paid_account = await db.accounts.find_one({"id": expense.get("paid_from_account_id")})
        expense["expense_account_name"] = exp_account.get("name", "Unknown") if exp_account else "Unknown"
        expense["paid_from_account_name"] = paid_account.get("name", "Unknown") if paid_account else "Unknown"
    
    return expenses

@api_router.post("/accounting/expenses")
async def create_expense(data: ExpenseCreate, user = Depends(get_current_user)):
    """Create an expense entry with journal posting"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    expense_account = await db.accounts.find_one({"id": data.expense_account_id})
    paid_from_account = await db.accounts.find_one({"id": data.paid_from_account_id})
    
    if not expense_account or not paid_from_account:
        raise HTTPException(status_code=400, detail="Invalid account IDs")
    
    rates = await get_exchange_rates()
    base_amount = convert_to_aed(data.amount, data.currency, rates.get("INR", 0.044), rates.get("USD", 3.674))
    
    expense_id = str(uuid.uuid4())
    
    # Create journal entry
    journal_id = str(uuid.uuid4())
    journal_entry = {
        "id": journal_id,
        "entry_date": data.date,
        "description": f"Expense - {data.vendor} - {expense_account['name']}",
        "source_module": "Expense",
        "source_id": expense_id,
        "status": JournalStatus.DRAFT.value,
        "lock_status": LockStatus.OPEN.value,
        "created_by": user["id"],
        "created_by_name": user.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.journal_entries.insert_one(journal_entry)
    
    # Create journal lines: Debit Expense, Credit Bank/Cash
    lines = [
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": journal_id,
            "account_id": data.expense_account_id,
            "debit_amount": data.amount,
            "credit_amount": 0,
            "currency": data.currency,
            "base_amount_aed": base_amount,
            "memo": data.notes
        },
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": journal_id,
            "account_id": data.paid_from_account_id,
            "debit_amount": 0,
            "credit_amount": data.amount,
            "currency": data.currency,
            "base_amount_aed": base_amount,
            "memo": f"Payment to {data.vendor}"
        }
    ]
    
    for line in lines:
        await db.journal_lines.insert_one(line)
    
    # Create expense record
    expense = {
        "id": expense_id,
        "date": data.date,
        "vendor": data.vendor,
        "expense_account_id": data.expense_account_id,
        "amount": data.amount,
        "currency": data.currency,
        "base_amount_aed": base_amount,
        "paid_from_account_id": data.paid_from_account_id,
        "proof_link": data.proof_link,
        "notes": data.notes,
        "journal_entry_id": journal_id,
        "status": JournalStatus.DRAFT.value,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.expenses.insert_one(expense)
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "expense", expense_id,
        "create", None, {k: v for k, v in expense.items() if k != "_id"}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return {k: v for k, v in expense.items() if k != "_id"}

# ==================== TRANSFERS ====================

@api_router.get("/accounting/transfers")
async def get_transfers(limit: int = 50, user = Depends(get_current_user)):
    """Get inter-account transfers"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    transfers = await db.transfers.find({}, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    
    # Enrich with account names
    for transfer in transfers:
        src = await db.accounts.find_one({"id": transfer.get("source_account_id")})
        dst = await db.accounts.find_one({"id": transfer.get("destination_account_id")})
        transfer["source_account_name"] = src.get("name", "Unknown") if src else "Unknown"
        transfer["destination_account_name"] = dst.get("name", "Unknown") if dst else "Unknown"
    
    return transfers

@api_router.post("/accounting/transfers")
async def create_transfer(data: TransferCreate, user = Depends(get_current_user)):
    """Create an inter-account transfer"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    source = await db.accounts.find_one({"id": data.source_account_id})
    destination = await db.accounts.find_one({"id": data.destination_account_id})
    
    if not source or not destination:
        raise HTTPException(status_code=400, detail="Invalid account IDs")
    
    rates = await get_exchange_rates()
    base_amount = convert_to_aed(data.amount, data.currency, rates.get("INR", 0.044), rates.get("USD", 3.674))
    
    transfer_id = str(uuid.uuid4())
    
    # Create journal entry
    journal_id = str(uuid.uuid4())
    journal_entry = {
        "id": journal_id,
        "entry_date": data.date,
        "description": f"Transfer: {source['name']} → {destination['name']}",
        "source_module": "Transfer",
        "source_id": transfer_id,
        "status": JournalStatus.DRAFT.value,
        "lock_status": LockStatus.OPEN.value,
        "created_by": user["id"],
        "created_by_name": user.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.journal_entries.insert_one(journal_entry)
    
    # Create journal lines: Debit destination, Credit source
    lines = [
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": journal_id,
            "account_id": data.destination_account_id,
            "debit_amount": data.amount,
            "credit_amount": 0,
            "currency": data.currency,
            "base_amount_aed": base_amount,
            "memo": f"Transfer from {source['name']}"
        },
        {
            "id": str(uuid.uuid4()),
            "journal_entry_id": journal_id,
            "account_id": data.source_account_id,
            "debit_amount": 0,
            "credit_amount": data.amount,
            "currency": data.currency,
            "base_amount_aed": base_amount,
            "memo": f"Transfer to {destination['name']}"
        }
    ]
    
    for line in lines:
        await db.journal_lines.insert_one(line)
    
    # Create transfer record
    transfer = {
        "id": transfer_id,
        "date": data.date,
        "source_account_id": data.source_account_id,
        "destination_account_id": data.destination_account_id,
        "amount": data.amount,
        "currency": data.currency,
        "base_amount_aed": base_amount,
        "notes": data.notes,
        "journal_entry_id": journal_id,
        "status": JournalStatus.DRAFT.value,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transfers.insert_one(transfer)
    
    # Audit log
    audit = create_finance_audit_entry(
        user["id"], user.get("full_name"), "transfer", transfer_id,
        "create", None, {k: v for k, v in transfer.items() if k != "_id"}
    )
    await db.finance_audit_logs.insert_one(audit)
    
    return {k: v for k, v in transfer.items() if k != "_id"}

# ==================== CFO DASHBOARD ====================

@api_router.get("/accounting/dashboard")
async def get_cfo_dashboard(user = Depends(get_current_user)):
    """Get CFO dashboard data with live balances, KPIs, and alerts"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Get config
    config = await db.finance_config.find_one({"key": "settings"})
    grace_days = config.get("grace_period_days", 2) if config else 2
    large_fee_threshold = config.get("large_fee_threshold", 1000) if config else 1000
    
    # 1. LIVE ACCOUNT BALANCES
    # Calculate balance as Sum(Debits - Credits) per Asset account
    accounts = await db.accounts.find({"account_type": "Asset", "active": True}, {"_id": 0}).to_list(50)
    
    account_balances = []
    for account in accounts:
        # Get all approved journal lines for this account
        lines = await db.journal_lines.find({"account_id": account["id"]}).to_list(10000)
        
        total_debit = sum(l.get("debit_amount", 0) for l in lines)
        total_credit = sum(l.get("credit_amount", 0) for l in lines)
        balance = total_debit - total_credit
        
        account_balances.append({
            "id": account["id"],
            "name": account["name"],
            "code": account.get("code"),
            "subtype": account.get("subtype"),
            "currency": account.get("currency", "AED"),
            "balance": balance,
            "balance_aed": balance  # Already in AED for most accounts
        })
    
    # Separate balances by type
    bank_balances = [a for a in account_balances if a["subtype"] in ["Bank", "Wallet", "Cash"]]
    receivable_balances = [a for a in account_balances if a["subtype"] == "Receivable"]
    
    # 2. KPIs
    # Today's metrics
    today_entries = await db.journal_entries.find({
        "entry_date": {"$gte": today_start},
        "source_module": "Sales",
        "status": JournalStatus.APPROVED.value
    }).to_list(1000)
    
    today_revenue = 0
    for entry in today_entries:
        lines = await db.journal_lines.find({"journal_entry_id": entry["id"]}).to_list(10)
        for line in lines:
            account = await db.accounts.find_one({"id": line["account_id"]})
            if account and account.get("account_type") == "Income":
                today_revenue += line.get("credit_amount", 0)
    
    # MTD metrics
    mtd_entries = await db.journal_entries.find({
        "entry_date": {"$gte": month_start},
        "status": JournalStatus.APPROVED.value
    }).to_list(10000)
    
    mtd_revenue = 0
    mtd_fees = 0
    mtd_net_received = 0
    
    for entry in mtd_entries:
        lines = await db.journal_lines.find({"journal_entry_id": entry["id"]}).to_list(10)
        for line in lines:
            account = await db.accounts.find_one({"id": line["account_id"]})
            if account:
                if account.get("account_type") == "Income":
                    mtd_revenue += line.get("credit_amount", 0)
                if account.get("name") == "Payment Provider Fees":
                    mtd_fees += line.get("debit_amount", 0)
    
    # Get MTD settlements
    mtd_settlements = await db.settlement_batches.find({
        "actual_received_date": {"$gte": month_start},
        "status": SettlementStatus.SETTLED.value
    }).to_list(1000)
    
    mtd_net_received = sum(s.get("net_received", 0) for s in mtd_settlements)
    
    # Total pending receivables
    pending_receivables = sum(a["balance"] for a in receivable_balances)
    
    # Total cash position
    total_cash = sum(a["balance"] for a in bank_balances)
    
    # 3. SETTLEMENT PANEL
    # Pending settlements by provider
    pending_batches = await db.settlement_batches.find({
        "status": {"$ne": SettlementStatus.SETTLED.value}
    }, {"_id": 0}).to_list(100)
    
    pending_by_provider = {}
    for batch in pending_batches:
        provider = batch.get("provider", "Unknown")
        if provider not in pending_by_provider:
            pending_by_provider[provider] = {"count": 0, "gross_amount": 0, "overdue": 0}
        pending_by_provider[provider]["count"] += 1
        pending_by_provider[provider]["gross_amount"] += batch.get("gross_amount", 0)
        
        if batch.get("expected_settlement_date"):
            expected = datetime.fromisoformat(batch["expected_settlement_date"].replace("Z", "+00:00"))
            if is_settlement_overdue(expected, grace_days):
                pending_by_provider[provider]["overdue"] += 1
    
    # Overdue settlements
    overdue_settlements = []
    for batch in pending_batches:
        if batch.get("expected_settlement_date"):
            expected = datetime.fromisoformat(batch["expected_settlement_date"].replace("Z", "+00:00"))
            if is_settlement_overdue(expected, grace_days):
                batch["days_overdue"] = (now - expected).days - grace_days
                overdue_settlements.append(batch)
    
    # Next 7 days forecast
    seven_days_later = (now + timedelta(days=7)).isoformat()
    upcoming_settlements = await db.settlement_batches.find({
        "expected_settlement_date": {"$gte": now.isoformat(), "$lte": seven_days_later},
        "status": {"$ne": SettlementStatus.SETTLED.value}
    }, {"_id": 0}).to_list(100)
    
    forecast_amount = sum(s.get("gross_amount", 0) for s in upcoming_settlements)
    
    # 4. ALERTS
    alerts = []
    
    # Overdue settlements
    for settlement in overdue_settlements:
        alerts.append({
            "type": "overdue_settlement",
            "severity": "high",
            "message": f"{settlement.get('provider')} settlement overdue by {settlement.get('days_overdue', 0)} days",
            "entity_id": settlement.get("id"),
            "amount": settlement.get("gross_amount", 0)
        })
    
    # Large fees (from recent settlements)
    recent_settlements = await db.settlement_batches.find({
        "status": SettlementStatus.SETTLED.value,
        "fees_withheld": {"$gt": large_fee_threshold}
    }, {"_id": 0}).sort("settled_at", -1).limit(10).to_list(10)
    
    for settlement in recent_settlements:
        alerts.append({
            "type": "large_fees",
            "severity": "medium",
            "message": f"Large fees on {settlement.get('provider')} settlement: AED {settlement.get('fees_withheld', 0):,.2f}",
            "entity_id": settlement.get("id"),
            "amount": settlement.get("fees_withheld", 0)
        })
    
    # Draft entries older than 7 days
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    old_drafts = await db.journal_entries.find({
        "status": JournalStatus.DRAFT.value,
        "created_at": {"$lt": seven_days_ago}
    }, {"_id": 0}).to_list(50)
    
    for draft in old_drafts:
        alerts.append({
            "type": "old_draft",
            "severity": "low",
            "message": f"Draft journal entry pending for over 7 days: {draft.get('description', 'Unknown')}",
            "entity_id": draft.get("id")
        })
    
    return {
        "generated_at": now.isoformat(),
        "account_balances": {
            "banks_and_wallets": bank_balances,
            "receivables": receivable_balances,
            "total_cash_position": total_cash,
            "total_pending_receivables": pending_receivables
        },
        "kpis": {
            "today": {
                "revenue": today_revenue,
                "date": today_start
            },
            "mtd": {
                "gross_revenue": mtd_revenue,
                "provider_fees": mtd_fees,
                "net_received": mtd_net_received,
                "month_start": month_start
            }
        },
        "settlements": {
            "pending_by_provider": pending_by_provider,
            "overdue_count": len(overdue_settlements),
            "overdue_settlements": overdue_settlements[:5],  # Top 5
            "next_7_days_forecast": forecast_amount,
            "upcoming_count": len(upcoming_settlements)
        },
        "alerts": alerts,
        "config": {
            "grace_period_days": grace_days,
            "large_fee_threshold": large_fee_threshold
        }
    }

# ==================== FINANCE CONFIG ====================

@api_router.get("/accounting/config")
async def get_finance_config(user = Depends(get_current_user)):
    """Get finance configuration"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    config = await db.finance_config.find_one({"key": "settings"}, {"_id": 0})
    if not config:
        return DEFAULT_FINANCE_CONFIG
    return config

@api_router.put("/accounting/config")
async def update_finance_config(data: FinanceConfigUpdate, user = Depends(get_current_user)):
    """Update finance configuration"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can update config")
    
    existing = await db.finance_config.find_one({"key": "settings"})
    
    update_data = {}
    if data.tabby_settlement_day is not None:
        update_data["tabby_settlement_day"] = data.tabby_settlement_day
    if data.tamara_settlement_days is not None:
        update_data["tamara_settlement_days"] = data.tamara_settlement_days
    if data.network_settlement_days is not None:
        update_data["network_settlement_days"] = data.network_settlement_days
    if data.grace_period_days is not None:
        update_data["grace_period_days"] = data.grace_period_days
    if data.large_fee_threshold is not None:
        update_data["large_fee_threshold"] = data.large_fee_threshold
    if data.overdue_alert_days is not None:
        update_data["overdue_alert_days"] = data.overdue_alert_days
    if data.reconciliation_variance_threshold is not None:
        update_data["reconciliation_variance_threshold"] = data.reconciliation_variance_threshold
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.finance_config.update_one({"key": "settings"}, {"$set": update_data})
    else:
        await db.finance_config.insert_one({"key": "settings", **DEFAULT_FINANCE_CONFIG, **update_data})
    
    return await db.finance_config.find_one({"key": "settings"}, {"_id": 0})

# ==================== FINANCE AUDIT LOG ====================

@api_router.get("/accounting/audit-logs")
async def get_finance_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    user = Depends(get_current_user)
):
    """Get finance audit logs"""
    if user.get("role") not in ["super_admin", "finance"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if action:
        query["action"] = action
    
    logs = await db.finance_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ==================== BANK STATEMENT IMPORT & RECONCILIATION ====================

class BankStatementUpload(BaseModel):
    bank_account_id: str
    statement_data: List[Dict[str, Any]]  # Parsed CSV data
    statement_date: str  # YYYY-MM-DD
    file_name: Optional[str] = None

class ReconciliationMatch(BaseModel):
    statement_line_id: str
    payment_id: Optional[str] = None
    journal_entry_id: Optional[str] = None
    match_type: str  # auto, manual, unmatched

@api_router.post("/accounting/bank-statements/upload")
async def upload_bank_statement(data: BankStatementUpload, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Upload a bank statement for reconciliation"""
    # Validate bank account
    account = await db.accounts.find_one({"id": data.bank_account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    now = datetime.now(timezone.utc)
    statement_id = str(uuid.uuid4())
    
    # Create statement record
    statement = {
        "id": statement_id,
        "bank_account_id": data.bank_account_id,
        "bank_account_name": account.get("name"),
        "statement_date": data.statement_date,
        "file_name": data.file_name,
        "line_count": len(data.statement_data),
        "total_debits": 0,
        "total_credits": 0,
        "reconciled_count": 0,
        "unmatched_count": len(data.statement_data),
        "status": "pending",  # pending, in_progress, completed
        "created_by": user["id"],
        "created_by_name": user["full_name"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    # Process statement lines
    statement_lines = []
    total_debits = 0
    total_credits = 0
    
    for i, row in enumerate(data.statement_data):
        line_id = str(uuid.uuid4())
        amount = float(row.get("amount", 0))
        
        line = {
            "id": line_id,
            "statement_id": statement_id,
            "line_number": i + 1,
            "transaction_date": row.get("date", row.get("transaction_date", "")),
            "description": row.get("description", row.get("narration", "")),
            "reference": row.get("reference", row.get("ref", "")),
            "amount": amount,
            "transaction_type": "credit" if amount >= 0 else "debit",
            "balance": float(row.get("balance", 0)),
            "status": "unmatched",  # unmatched, matched, excluded
            "matched_payment_id": None,
            "matched_journal_id": None,
            "match_confidence": 0,
            "match_notes": None,
            "created_at": now.isoformat()
        }
        
        if amount >= 0:
            total_credits += amount
        else:
            total_debits += abs(amount)
        
        statement_lines.append(line)
    
    statement["total_debits"] = total_debits
    statement["total_credits"] = total_credits
    
    await db.bank_statements.insert_one(statement)
    if statement_lines:
        await db.bank_statement_lines.insert_many(statement_lines)
    
    # Log audit
    await db.finance_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "bank_statement",
        "entity_id": statement_id,
        "action": "upload",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now.isoformat(),
        "details": {"line_count": len(statement_lines), "bank": account.get("name")}
    })
    
    return {
        "statement_id": statement_id,
        "line_count": len(statement_lines),
        "total_debits": total_debits,
        "total_credits": total_credits,
        "message": f"Bank statement uploaded with {len(statement_lines)} transactions"
    }

@api_router.get("/accounting/bank-statements")
async def get_bank_statements(
    bank_account_id: Optional[str] = None,
    status: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Get all bank statements"""
    query = {}
    if bank_account_id:
        query["bank_account_id"] = bank_account_id
    if status:
        query["status"] = status
    
    statements = await db.bank_statements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return statements

@api_router.get("/accounting/bank-statements/{statement_id}")
async def get_bank_statement(statement_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Get a bank statement with its lines"""
    statement = await db.bank_statements.find_one({"id": statement_id}, {"_id": 0})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    lines = await db.bank_statement_lines.find(
        {"statement_id": statement_id}, 
        {"_id": 0}
    ).sort("line_number", 1).to_list(5000)
    
    statement["lines"] = lines
    return statement

@api_router.post("/accounting/bank-statements/{statement_id}/auto-reconcile")
async def auto_reconcile_statement(statement_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Auto-match statement lines with payments and journal entries"""
    statement = await db.bank_statements.find_one({"id": statement_id})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    lines = await db.bank_statement_lines.find(
        {"statement_id": statement_id, "status": "unmatched"},
        {"_id": 0}
    ).to_list(5000)
    
    matched_count = 0
    now = datetime.now(timezone.utc)
    
    for line in lines:
        # Try to match with payments by amount and date
        amount = abs(line["amount"])
        date_str = line.get("transaction_date", "")
        
        # Search for matching payment
        payment_query = {
            "amount": {"$gte": amount - 1, "$lte": amount + 1},  # Allow small variance
        }
        payment = await db.payments.find_one(payment_query)
        
        if payment:
            # Found a match
            await db.bank_statement_lines.update_one(
                {"id": line["id"]},
                {"$set": {
                    "status": "matched",
                    "matched_payment_id": payment["id"],
                    "match_confidence": 90,
                    "match_notes": "Auto-matched by amount"
                }}
            )
            matched_count += 1
            continue
        
        # Try matching with journal entries
        je_query = {
            "status": {"$in": ["approved", "posted"]}
        }
        # Search journal lines
        je_line = await db.journal_lines.find_one({
            "$or": [
                {"debit": {"$gte": amount - 1, "$lte": amount + 1}},
                {"credit": {"$gte": amount - 1, "$lte": amount + 1}}
            ]
        })
        
        if je_line:
            await db.bank_statement_lines.update_one(
                {"id": line["id"]},
                {"$set": {
                    "status": "matched",
                    "matched_journal_id": je_line.get("journal_entry_id"),
                    "match_confidence": 80,
                    "match_notes": "Auto-matched with journal entry"
                }}
            )
            matched_count += 1
    
    # Update statement stats
    unmatched = await db.bank_statement_lines.count_documents({"statement_id": statement_id, "status": "unmatched"})
    matched = await db.bank_statement_lines.count_documents({"statement_id": statement_id, "status": "matched"})
    
    await db.bank_statements.update_one(
        {"id": statement_id},
        {"$set": {
            "reconciled_count": matched,
            "unmatched_count": unmatched,
            "status": "completed" if unmatched == 0 else "in_progress",
            "updated_at": now.isoformat()
        }}
    )
    
    return {
        "matched_count": matched_count,
        "remaining_unmatched": unmatched,
        "total_matched": matched,
        "message": f"Auto-reconciliation complete. {matched_count} new matches found."
    }

@api_router.put("/accounting/bank-statements/{statement_id}/lines/{line_id}/match")
async def manual_match_line(
    statement_id: str,
    line_id: str,
    match_data: ReconciliationMatch,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Manually match a statement line with a payment or journal entry"""
    line = await db.bank_statement_lines.find_one({"id": line_id, "statement_id": statement_id})
    if not line:
        raise HTTPException(status_code=404, detail="Statement line not found")
    
    now = datetime.now(timezone.utc)
    update = {
        "status": "matched" if match_data.match_type != "unmatched" else "unmatched",
        "matched_payment_id": match_data.payment_id,
        "matched_journal_id": match_data.journal_entry_id,
        "match_confidence": 100 if match_data.match_type == "manual" else 0,
        "match_notes": f"Manual match by {user['full_name']}"
    }
    
    await db.bank_statement_lines.update_one({"id": line_id}, {"$set": update})
    
    # Update statement stats
    unmatched = await db.bank_statement_lines.count_documents({"statement_id": statement_id, "status": "unmatched"})
    matched = await db.bank_statement_lines.count_documents({"statement_id": statement_id, "status": "matched"})
    
    await db.bank_statements.update_one(
        {"id": statement_id},
        {"$set": {
            "reconciled_count": matched,
            "unmatched_count": unmatched,
            "status": "completed" if unmatched == 0 else "in_progress",
            "updated_at": now.isoformat()
        }}
    )
    
    return {"message": "Match updated", "status": update["status"]}

@api_router.get("/accounting/reconciliation/summary")
async def get_reconciliation_summary(user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Get overall reconciliation summary"""
    # Get all bank accounts
    bank_accounts = await db.accounts.find(
        {"account_type": "asset", "subtype": "bank"},
        {"_id": 0}
    ).to_list(50)
    
    summary = {
        "total_statements": await db.bank_statements.count_documents({}),
        "pending_reconciliation": await db.bank_statements.count_documents({"status": {"$ne": "completed"}}),
        "completed_statements": await db.bank_statements.count_documents({"status": "completed"}),
        "total_unmatched_lines": await db.bank_statement_lines.count_documents({"status": "unmatched"}),
        "accounts": []
    }
    
    for acc in bank_accounts:
        acc_statements = await db.bank_statements.find(
            {"bank_account_id": acc["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(1).to_list(1)
        
        last_reconciled = acc_statements[0] if acc_statements else None
        
        summary["accounts"].append({
            "account_id": acc["id"],
            "account_name": acc["name"],
            "balance": acc.get("balance", 0),
            "last_reconciled": last_reconciled.get("statement_date") if last_reconciled else None,
            "status": last_reconciled.get("status") if last_reconciled else "never"
        })
    
    return summary

# ==================== USER PROFILE MANAGEMENT ====================

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    additional_phones: Optional[List[str]] = None
    profile_photo_url: Optional[str] = None
    bio: Optional[str] = None

@api_router.put("/users/me/profile")
async def update_my_profile(data: UserProfileUpdate, user = Depends(get_current_user)):
    """Update current user's profile (self-service)"""
    update_data = {}
    
    if data.full_name:
        update_data["full_name"] = data.full_name
    if data.phone:
        update_data["phone"] = data.phone
    if data.additional_phones is not None:
        update_data["additional_phones"] = data.additional_phones
    if data.profile_photo_url is not None:
        update_data["profile_photo_url"] = data.profile_photo_url
    if data.bio is not None:
        update_data["bio"] = data.bio
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Log the update
    await log_audit(
        user,
        "profile_update",
        "user",
        entity_id=user["id"],
        entity_name=user.get("full_name"),
        details={"fields_updated": list(update_data.keys())}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.post("/users/me/profile-photo")
async def upload_profile_photo(file: UploadFile, user = Depends(get_current_user)):
    """Upload profile photo"""
    import base64
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, WebP allowed.")
    
    # Read and convert to base64 (simple storage for now)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 2MB allowed.")
    
    # Store as base64 data URL
    b64 = base64.b64encode(contents).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{b64}"
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"profile_photo_url": data_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Profile photo uploaded", "photo_url": data_url[:100] + "..."}

# ==================== MENTOR LEADERBOARD ====================

@api_router.get("/mentor/leaderboard")
async def get_mentor_leaderboard(
    period: str = "monthly",  # monthly, quarterly, yearly, all_time
    user = Depends(get_current_user)
):
    """Get mentor leaderboard with rankings"""
    now = datetime.now(timezone.utc)
    
    # Define date range
    if period == "monthly":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarterly":
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "yearly":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # all_time
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    # Get all mentors
    mentors = await db.users.find(
        {"role": {"$in": ["mentor", "academic_master"]}, "is_active": True},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    leaderboard = []
    
    for mentor in mentors:
        mentor_id = mentor["id"]
        
        # Count students
        total_students = await db.students.count_documents({"mentor_id": mentor_id})
        
        # Active students (with activity after start_date)
        active_students = await db.students.count_documents({
            "mentor_id": mentor_id,
            "updated_at": {"$gte": start_date.isoformat()}
        })
        
        # Upgrades
        upgrades = await db.students.count_documents({
            "mentor_id": mentor_id,
            "upgrade_closed": True,
            "updated_at": {"$gte": start_date.isoformat()}
        })
        
        # Commissions
        commissions_pipeline = [
            {"$match": {
                "user_id": mentor_id,
                "created_at": {"$gte": start_date.isoformat()}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$commission_amount"},
                "count": {"$sum": 1}
            }}
        ]
        commission_result = await db.commissions.aggregate(commissions_pipeline).to_list(1)
        total_commission = commission_result[0]["total"] if commission_result else 0
        
        # Student satisfaction (avg score)
        satisfaction_pipeline = [
            {"$match": {"mentor_id": mentor_id, "satisfaction_score": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$satisfaction_score"}, "count": {"$sum": 1}}}
        ]
        satisfaction_result = await db.students.aggregate(satisfaction_pipeline).to_list(1)
        avg_satisfaction = satisfaction_result[0]["avg"] if satisfaction_result else 0
        reviews_count = satisfaction_result[0]["count"] if satisfaction_result else 0
        
        leaderboard.append({
            "mentor_id": mentor_id,
            "mentor_name": mentor.get("full_name"),
            "email": mentor.get("email"),
            "department": mentor.get("department"),
            "total_students": total_students,
            "active_students": active_students,
            "upgrades": upgrades,
            "total_commission": total_commission,
            "avg_satisfaction": round(avg_satisfaction, 1) if avg_satisfaction else 0,
            "reviews_count": reviews_count,
            "score": (upgrades * 100) + (total_commission / 100) + (avg_satisfaction * 20)  # Composite score
        })
    
    # Sort by score
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    
    # Add ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "leaderboard": leaderboard,
        "total_mentors": len(leaderboard)
    }

# ==================== QUICK STATS WIDGET ====================

@api_router.get("/dashboard/quick-stats")
async def get_quick_stats(user = Depends(get_current_user)):
    """Get quick stats for home launcher widget"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    stats = {}
    role = user.get("role")
    
    # Role-specific stats
    if role in ["super_admin", "admin", "sales_manager", "team_leader", "sales_executive"]:
        # Sales stats
        if role == "sales_executive":
            lead_query = {"assigned_to": user["id"]}
        elif role == "team_leader":
            team_members = await db.users.find({"team_id": user.get("team_id")}).to_list(100)
            team_ids = [t["id"] for t in team_members] + [user["id"]]
            lead_query = {"assigned_to": {"$in": team_ids}}
        else:
            lead_query = {}
        
        stats["total_leads"] = await db.leads.count_documents(lead_query)
        stats["new_leads_today"] = await db.leads.count_documents({
            **lead_query,
            "created_at": {"$gte": today_start.isoformat()}
        })
        stats["hot_leads"] = await db.leads.count_documents({**lead_query, "stage": "hot_lead"})
        stats["enrolled_this_month"] = await db.leads.count_documents({
            **lead_query,
            "stage": "enrolled",
            "updated_at": {"$gte": month_start.isoformat()}
        })
    
    if role in ["super_admin", "admin", "cs_head", "cs_agent"]:
        # CS stats
        if role == "cs_agent":
            student_query = {"cs_agent_id": user["id"]}
        else:
            student_query = {}
        
        stats["total_students"] = await db.students.count_documents(student_query)
        stats["new_students_today"] = await db.students.count_documents({
            **student_query,
            "created_at": {"$gte": today_start.isoformat()}
        })
        stats["pending_activation"] = await db.students.count_documents({
            **student_query,
            "stage": "new_student"
        })
    
    if role in ["super_admin", "admin", "mentor", "academic_master"]:
        # Mentor stats
        if role in ["mentor", "academic_master"]:
            mentor_query = {"mentor_id": user["id"]}
        else:
            mentor_query = {}
        
        stats["mentor_students"] = await db.students.count_documents({**mentor_query, "mentor_id": {"$exists": True}})
        stats["upgrade_opportunities"] = await db.students.count_documents({
            **mentor_query,
            "upgrade_eligible": True,
            "upgrade_closed": {"$ne": True}
        })
    
    if role in ["super_admin", "admin", "finance"]:
        # Finance stats
        stats["pending_payments"] = await db.payments.count_documents({"stage": "pending_verification"})
        stats["pending_settlements"] = await db.settlement_batches.count_documents({"status": "pending"})
        
        # MTD Revenue
        revenue_pipeline = [
            {"$match": {
                "stage": "verified",
                "created_at": {"$gte": month_start.isoformat()}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        revenue_result = await db.payments.aggregate(revenue_pipeline).to_list(1)
        stats["mtd_revenue"] = revenue_result[0]["total"] if revenue_result else 0
    
    # Common stats for all
    stats["pending_followups"] = await db.leads.count_documents({
        "reminder_date": {"$lte": now.isoformat()},
        "reminder_completed": {"$ne": True}
    })
    
    # Unread notifications
    stats["unread_notifications"] = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    
    return stats

# ==================== HR MODULE - EMPLOYEE MASTER ====================

from hr_module import (
    Gender, MaritalStatus, EmploymentType, EmploymentStatus, EmployeeCategory,
    VisaType, CommissionPlanType, LeaveType, LeaveStatus, RegularizationType,
    PayrollStatus, EmployeeCreate, EmployeeUpdate, LeaveRequest, LeaveApproval,
    RegularizationRequest, PayrollCreate, EXPIRY_ALERT_DAYS, HR_SLA_CONFIG,
    SAMPLE_EMPLOYEE_DATA, calculate_days_until_expiry, calculate_leave_days,
    calculate_gross_salary, generate_wps_record, WPS_BANK_CODES
)

class EmployeeResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    personal_email: Optional[str] = None
    company_email: Optional[str] = None
    mobile_number: Optional[str] = None
    emergency_contact: Optional[Dict] = None
    marital_status: Optional[str] = None
    department: str
    designation: str
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    employment_type: str
    work_location: str
    joining_date: str
    probation_days: int
    confirmation_date: Optional[str] = None
    notice_period_days: int
    employment_status: str
    termination_date: Optional[str] = None
    role: Optional[str] = None
    employee_category: Optional[str] = None
    grade: Optional[str] = None
    # Enhanced Document Tracking
    passport: Optional[Dict] = None  # number, issue_date, expiry_date, issuing_country
    visa: Optional[Dict] = None  # type, number, expiry_date, status
    emirates_id: Optional[Dict] = None  # number, expiry_date
    labour_card: Optional[Dict] = None  # number, expiry_date
    work_permit: Optional[Dict] = None  # number, expiry_date
    health_insurance: Optional[Dict] = None  # provider, card_number, expiry_date
    driving_license: Optional[Dict] = None  # number, expiry_date, type
    educational_certificates: Optional[List[Dict]] = None  # list of certificates
    other_documents: Optional[List[Dict]] = None  # custom documents
    visa_details: Optional[Dict] = None  # Legacy field
    # Enhanced Salary Structure
    salary_structure: Optional[Dict] = None
    bank_details: Optional[Dict] = None
    annual_leave_balance: float
    sick_leave_balance: float
    documents: List[Dict] = []
    user_id: Optional[str] = None
    created_via: Optional[str] = None
    created_at: str
    updated_at: str

# Salary Structure Model for validation
class SalaryStructure(BaseModel):
    basic_salary: float = 0
    housing_allowance: float = 0
    transport_allowance: float = 0
    telephone_allowance: float = 0
    other_allowances: float = 0
    deductions: float = 0
    commission: float = 0
    incentives: float = 0
    payment_frequency: str = "monthly"
    currency: str = "AED"
    
    @property
    def gross_salary(self) -> float:
        return (self.basic_salary + self.housing_allowance + self.transport_allowance + 
                self.telephone_allowance + self.other_allowances + self.commission + self.incentives)
    
    @property
    def net_salary(self) -> float:
        return self.gross_salary - self.deductions

@api_router.get("/hr/employees", response_model=List[EmployeeResponse])
async def get_employees(
    department: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get all employees with optional filters"""
    query = {}
    
    if department:
        query["department"] = department
    if status:
        query["employment_status"] = status
    if location:
        query["work_location"] = location
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"employee_id": {"$regex": search, "$options": "i"}},
            {"company_email": {"$regex": search, "$options": "i"}},
            {"mobile_number": {"$regex": search, "$options": "i"}}
        ]
    
    employees = await db.hr_employees.find(query, {"_id": 0}).sort("employee_id", 1).to_list(500)
    
    # Enrich with reporting manager names
    for emp in employees:
        if emp.get("reporting_manager_id"):
            manager = await db.hr_employees.find_one({"id": emp["reporting_manager_id"]}, {"_id": 0, "full_name": 1})
            emp["reporting_manager_name"] = manager["full_name"] if manager else None
    
    return employees

@api_router.get("/hr/employees/next-id")
async def get_next_employee_id(prefix: str = "CLT", user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get the next available employee ID"""
    # Find the highest existing ID with this prefix
    employees = await db.hr_employees.find(
        {"employee_id": {"$regex": f"^{prefix}-"}},
        {"employee_id": 1, "_id": 0}
    ).sort("employee_id", -1).limit(1).to_list(1)
    
    if employees:
        last_id = employees[0]["employee_id"]
        try:
            last_num = int(last_id.split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return {"next_employee_id": f"{prefix}-{str(next_num).zfill(3)}"}

@api_router.get("/hr/employees/sync-options")
async def get_employee_sync_options(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get all available options for employee creation (departments, roles, teams, managers)"""
    # Get departments
    departments = await db.departments.find({}, {"_id": 0, "id": 1, "name": 1, "head_id": 1, "head_name": 1}).to_list(100)
    
    # Get roles (predefined)
    roles = [
        {"value": "super_admin", "label": "Super Admin", "description": "Full system access"},
        {"value": "admin", "label": "Admin", "description": "Administrative access"},
        {"value": "sales_manager", "label": "Sales Manager", "description": "Sales team management"},
        {"value": "team_leader", "label": "Team Leader", "description": "Team lead access"},
        {"value": "sales_executive", "label": "Sales Executive", "description": "Sales access"},
        {"value": "cs_head", "label": "CS Head", "description": "Customer service management"},
        {"value": "cs_agent", "label": "CS Agent", "description": "Customer service access"},
        {"value": "mentor", "label": "Mentor", "description": "Academic mentoring"},
        {"value": "academic_master", "label": "Academic Master", "description": "Academic management"},
        {"value": "finance", "label": "Finance", "description": "Finance access"},
        {"value": "hr", "label": "HR", "description": "Human resources access"},
        {"value": "marketing", "label": "Marketing", "description": "Marketing access"},
        {"value": "operations", "label": "Operations", "description": "Operations access"},
        {"value": "quality_control", "label": "Quality Control", "description": "QC access"},
    ]
    
    # Get teams
    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1, "department": 1, "leader_id": 1, "leader_name": 1}).to_list(100)
    
    # Get active employees as potential managers
    managers = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"_id": 0, "id": 1, "employee_id": 1, "full_name": 1, "department": 1, "designation": 1}
    ).sort("full_name", 1).to_list(500)
    
    # Get work locations
    locations = ["Dubai", "Abu Dhabi", "Sharjah", "Remote", "Hybrid"]
    
    # Get employment types
    employment_types = [
        {"value": "full_time", "label": "Full Time"},
        {"value": "part_time", "label": "Part Time"},
        {"value": "contract", "label": "Contract"},
        {"value": "intern", "label": "Intern"},
        {"value": "consultant", "label": "Consultant"},
    ]
    
    return {
        "departments": departments,
        "roles": roles,
        "teams": teams,
        "managers": managers,
        "locations": locations,
        "employment_types": employment_types
    }

@api_router.get("/hr/employees/unlinked")
async def get_unlinked_employees_route(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get employees who don't have a user account linked"""
    employees = await db.hr_employees.find(
        {"$or": [{"user_id": None}, {"user_id": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(500)
    return employees

@api_router.get("/hr/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get a single employee by ID"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get reporting manager name
    if employee.get("reporting_manager_id"):
        manager = await db.hr_employees.find_one({"id": employee["reporting_manager_id"]}, {"_id": 0, "full_name": 1})
        employee["reporting_manager_name"] = manager["full_name"] if manager else None
    
    return employee

@api_router.post("/hr/employees", response_model=EmployeeResponse)
async def create_employee(data: EmployeeCreate, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Create a new employee record with automatic user account creation"""
    # Check for duplicate employee_id
    existing = await db.hr_employees.find_one({"employee_id": data.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Employee ID {data.employee_id} already exists")
    
    # Check for duplicate company email
    if data.company_email:
        existing_email = await db.hr_employees.find_one({"company_email": data.company_email})
        if existing_email:
            raise HTTPException(status_code=400, detail="Company email already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    employee_uuid = str(uuid.uuid4())
    
    employee = {
        "id": employee_uuid,
        **data.model_dump(),
        "documents": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"],
        "created_by_name": user["full_name"]
    }
    
    # Convert nested Pydantic models to dict
    if data.emergency_contact:
        employee["emergency_contact"] = data.emergency_contact.model_dump() if hasattr(data.emergency_contact, 'model_dump') else data.emergency_contact
    if data.visa_details:
        employee["visa_details"] = data.visa_details.model_dump() if hasattr(data.visa_details, 'model_dump') else data.visa_details
    if data.salary_structure:
        employee["salary_structure"] = data.salary_structure.model_dump() if hasattr(data.salary_structure, 'model_dump') else data.salary_structure
    if data.bank_details:
        employee["bank_details"] = data.bank_details.model_dump() if hasattr(data.bank_details, 'model_dump') else data.bank_details
    
    await db.hr_employees.insert_one(employee)
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee",
        "entity_id": employee_uuid,
        "action": "create",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {"new": data.model_dump()}
    })
    
    employee.pop("_id", None)
    return employee

# ==================== HR-USER SYNC SYSTEM ====================

class EmployeeWithUserCreate(BaseModel):
    """Create employee with automatic user account"""
    # Employee fields
    employee_id: str
    full_name: str
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    personal_email: Optional[str] = None
    company_email: str  # Required for user creation
    mobile_number: Optional[str] = None
    department: str
    designation: str
    reporting_manager_id: Optional[str] = None
    employment_type: str = "full_time"
    work_location: str = "Dubai"
    joining_date: str
    probation_days: int = 90
    employment_status: str = "active"
    # User account fields
    role: str  # User role for access control
    team_id: Optional[str] = None  # Team assignment
    create_user_account: bool = True  # Whether to create user account
    initial_password: Optional[str] = None  # If None, auto-generate
    # Salary and other optional fields
    salary_structure: Optional[Dict] = None
    bank_details: Optional[Dict] = None
    visa_details: Optional[Dict] = None

@api_router.post("/hr/employees/with-user")
async def create_employee_with_user(
    data: EmployeeWithUserCreate,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Create employee record and automatically create/link user account"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for duplicate employee_id
    existing = await db.hr_employees.find_one({"employee_id": data.employee_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Employee ID {data.employee_id} already exists")
    
    # Check for duplicate email in both employees and users
    existing_email = await db.hr_employees.find_one({"company_email": data.company_email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Company email already exists in employee records")
    
    existing_user = await db.users.find_one({"email": data.company_email})
    
    employee_uuid = str(uuid.uuid4())
    user_uuid = None
    
    # Handle user account creation/linking
    if data.create_user_account:
        if existing_user:
            # Link existing user to employee
            user_uuid = existing_user["id"]
            # Update user's department if different
            await db.users.update_one(
                {"id": user_uuid},
                {"$set": {
                    "department": data.department,
                    "role": data.role,
                    "full_name": data.full_name,
                    "updated_at": now
                }}
            )
        else:
            # Create new user account
            user_uuid = str(uuid.uuid4())
            
            # Generate password if not provided
            if data.initial_password:
                password = data.initial_password
            else:
                # Auto-generate password: First name + @123
                first_name = data.full_name.split()[0]
                password = f"{first_name}@123"
            
            # Get default permissions for role
            permissions = get_default_permissions(data.role)
            
            new_user = {
                "id": user_uuid,
                "email": data.company_email,
                "password": hash_password(password),
                "full_name": data.full_name,
                "role": data.role,
                "department": data.department,
                "is_active": True,
                "status": "active",
                "permissions": permissions,
                "employee_id": employee_uuid,  # Link to employee
                "created_at": now,
                "updated_at": now,
                "created_via": "employee_master"
            }
            
            await db.users.insert_one(new_user)
            
            # Add to team if specified
            if data.team_id:
                team = await db.teams.find_one({"id": data.team_id})
                if team:
                    await db.teams.update_one(
                        {"id": data.team_id},
                        {"$addToSet": {"members": {
                            "user_id": user_uuid,
                            "name": data.full_name,
                            "role": data.role,
                            "added_at": now
                        }}}
                    )
    
    # Create employee record
    employee = {
        "id": employee_uuid,
        "employee_id": data.employee_id,
        "full_name": data.full_name,
        "gender": data.gender,
        "date_of_birth": data.date_of_birth,
        "nationality": data.nationality,
        "personal_email": data.personal_email,
        "company_email": data.company_email,
        "mobile_number": data.mobile_number,
        "department": data.department,
        "designation": data.designation,
        "reporting_manager_id": data.reporting_manager_id,
        "employment_type": data.employment_type,
        "work_location": data.work_location,
        "joining_date": data.joining_date,
        "probation_days": data.probation_days,
        "employment_status": data.employment_status,
        "notice_period_days": 30,
        "annual_leave_balance": 30.0,
        "sick_leave_balance": 15.0,
        "user_id": user_uuid,  # Link to user account
        "role": data.role,
        "team_id": data.team_id,
        "salary_structure": data.salary_structure or {},
        "bank_details": data.bank_details or {},
        "visa_details": data.visa_details or {},
        "documents": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"],
        "created_by_name": user["full_name"]
    }
    
    await db.hr_employees.insert_one(employee)
    
    # Update user record with employee_id if user was linked
    if user_uuid and existing_user:
        await db.users.update_one(
            {"id": user_uuid},
            {"$set": {"employee_id": employee_uuid}}
        )
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee",
        "entity_id": employee_uuid,
        "action": "create_with_user",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {
            "employee_created": True,
            "user_created": user_uuid is not None and not existing_user,
            "user_linked": user_uuid is not None and existing_user is not None
        }
    })
    
    employee.pop("_id", None)
    return {
        "employee": employee,
        "user_created": user_uuid is not None and not existing_user,
        "user_linked": user_uuid is not None,
        "user_id": user_uuid,
        "message": f"Employee created successfully" + (
            f". User account created with email {data.company_email}" if user_uuid and not existing_user
            else f". Linked to existing user account" if user_uuid and existing_user
            else ""
        )
    }

@api_router.post("/hr/employees/sync-to-users")
async def sync_employees_to_users(
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """
    Sync existing employees to user accounts.
    Creates user accounts for employees that don't have linked users.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Get all employees without user_id
    employees_without_users = await db.hr_employees.find(
        {"$or": [{"user_id": None}, {"user_id": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(500)
    
    synced = 0
    skipped = 0
    errors = []
    
    for emp in employees_without_users:
        email = emp.get("company_email")
        if not email:
            skipped += 1
            errors.append(f"{emp.get('employee_id')}: No company email")
            continue
        
        # Check if user already exists with this email
        existing_user = await db.users.find_one({"email": email})
        
        if existing_user:
            # Link existing user to employee
            await db.hr_employees.update_one(
                {"id": emp["id"]},
                {"$set": {"user_id": existing_user["id"], "updated_at": now}}
            )
            # Also link employee to user
            await db.users.update_one(
                {"id": existing_user["id"]},
                {"$set": {"employee_id": emp["id"], "updated_at": now}}
            )
            synced += 1
        else:
            # Create new user
            user_uuid = str(uuid.uuid4())
            role = emp.get("role", "staff")
            
            # Generate password: First name + @123
            first_name = emp.get("full_name", "User").split()[0]
            password = f"{first_name}@123"
            
            permissions = get_default_permissions(role)
            
            new_user = {
                "id": user_uuid,
                "email": email,
                "password": hash_password(password),
                "full_name": emp.get("full_name"),
                "role": role,
                "department": emp.get("department"),
                "is_active": True,
                "status": "active",
                "permissions": permissions,
                "employee_id": emp["id"],
                "created_at": now,
                "updated_at": now,
                "created_via": "employee_sync"
            }
            
            await db.users.insert_one(new_user)
            
            # Update employee with user_id
            await db.hr_employees.update_one(
                {"id": emp["id"]},
                {"$set": {"user_id": user_uuid, "updated_at": now}}
            )
            
            synced += 1
    
    return {
        "success": True,
        "synced": synced,
        "skipped": skipped,
        "errors": errors,
        "message": f"Synced {synced} employees to user accounts, skipped {skipped}"
    }

# ==================== EMPLOYEE DOCUMENT MANAGEMENT ====================

@api_router.put("/hr/employees/{employee_id}/documents")
async def update_employee_documents(
    employee_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Update employee documents (passport, visa, Emirates ID, etc.)"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Document fields that can be updated
    document_fields = [
        "passport", "visa", "emirates_id", "labour_card", 
        "work_permit", "health_insurance", "driving_license",
        "educational_certificates", "other_documents"
    ]
    
    update_data = {"updated_at": now}
    for field in document_fields:
        if field in data:
            update_data[field] = data[field]
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": update_data}
    )
    
    return {"message": "Documents updated successfully", "updated_fields": list(update_data.keys())}

@api_router.put("/hr/employees/{employee_id}/bank-details")
async def update_employee_bank_details(
    employee_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Update employee bank details"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    bank_details = {
        "bank_name": data.get("bank_name", ""),
        "account_number": data.get("account_number", ""),
        "iban": data.get("iban", ""),
        "updated_at": now
    }
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": {
            "bank_details": bank_details,
            "updated_at": now
        }}
    )
    
    return {"message": "Bank details updated successfully"}

@api_router.put("/hr/employees/{employee_id}/gender")
async def update_employee_gender(
    employee_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Update employee gender"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    gender = data.get("gender")
    if gender not in ["male", "female", "other"]:
        raise HTTPException(status_code=400, detail="Gender must be: male, female, or other")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": {
            "gender": gender,
            "updated_at": now
        }}
    )
    
    return {"message": "Gender updated successfully"}

@api_router.get("/hr/employees/gender-ratio")
async def get_gender_ratio(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get gender ratio of all active employees"""
    pipeline = [
        {"$match": {"employment_status": {"$in": ["active", "probation"]}}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]
    
    results = await db.hr_employees.aggregate(pipeline).to_list(10)
    
    ratio = {"male": 0, "female": 0, "other": 0, "unspecified": 0}
    total = 0
    for r in results:
        gender = r["_id"] or "unspecified"
        ratio[gender] = r["count"]
        total += r["count"]
    
    return {
        "counts": ratio,
        "total": total,
        "percentages": {
            k: round((v / total * 100), 1) if total > 0 else 0 
            for k, v in ratio.items()
        }
    }

@api_router.put("/hr/employees/{employee_id}/salary")
async def update_employee_salary(
    employee_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Update employee salary structure"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build salary structure
    salary_structure = {
        "basic_salary": data.get("basic_salary", 0),
        "housing_allowance": data.get("housing_allowance", 0),
        "transport_allowance": data.get("transport_allowance", 0),
        "telephone_allowance": data.get("telephone_allowance", 0),
        "other_allowances": data.get("other_allowances", 0),
        "deductions": data.get("deductions", 0),
        "commission": data.get("commission", 0),
        "incentives": data.get("incentives", 0),
        "payment_frequency": "monthly",
        "currency": data.get("currency", "AED"),
        "effective_date": data.get("effective_date", now[:10]),
        "updated_at": now,
        "updated_by": user["id"]
    }
    
    # Calculate totals
    gross = (salary_structure["basic_salary"] + salary_structure["housing_allowance"] + 
             salary_structure["transport_allowance"] + salary_structure["telephone_allowance"] + 
             salary_structure["other_allowances"] + salary_structure["commission"] + 
             salary_structure["incentives"])
    salary_structure["gross_salary"] = gross
    salary_structure["net_salary"] = gross - salary_structure["deductions"]
    
    # Store salary history
    salary_history = employee.get("salary_history", [])
    if employee.get("salary_structure"):
        salary_history.append({
            **employee["salary_structure"],
            "ended_at": now
        })
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": {
            "salary_structure": salary_structure,
            "salary_history": salary_history,
            "updated_at": now
        }}
    )
    
    return {"message": "Salary updated successfully", "salary_structure": salary_structure}

@api_router.get("/hr/employees/expiring-documents")
async def get_expiring_documents(
    days: int = 90,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get documents expiring within specified days"""
    today = datetime.now(timezone.utc).date()
    cutoff_date = (today + timedelta(days=days)).isoformat()
    today_str = today.isoformat()
    
    employees = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"_id": 0}
    ).to_list(500)
    
    expiring_docs = []
    document_types = [
        ("passport", "expiry_date", "Passport"),
        ("visa", "expiry_date", "Visa"),
        ("emirates_id", "expiry_date", "Emirates ID"),
        ("labour_card", "expiry_date", "Labour Card"),
        ("work_permit", "expiry_date", "Work Permit"),
        ("health_insurance", "expiry_date", "Health Insurance"),
        ("driving_license", "expiry_date", "Driving License"),
    ]
    
    for emp in employees:
        for field, date_key, doc_name in document_types:
            doc = emp.get(field)
            if doc and doc.get(date_key):
                expiry = doc[date_key]
                if today_str <= expiry <= cutoff_date:
                    days_until = (datetime.strptime(expiry, "%Y-%m-%d").date() - today).days
                    expiring_docs.append({
                        "employee_id": emp["employee_id"],
                        "employee_name": emp["full_name"],
                        "company_email": emp.get("company_email"),
                        "department": emp.get("department"),
                        "document_type": doc_name,
                        "expiry_date": expiry,
                        "days_until_expiry": days_until,
                        "urgency": "critical" if days_until <= 7 else "high" if days_until <= 15 else "medium" if days_until <= 30 else "low"
                    })
        
        # Check other_documents
        for doc in emp.get("other_documents", []):
            if doc.get("expiry_date"):
                expiry = doc["expiry_date"]
                if today_str <= expiry <= cutoff_date:
                    days_until = (datetime.strptime(expiry, "%Y-%m-%d").date() - today).days
                    expiring_docs.append({
                        "employee_id": emp["employee_id"],
                        "employee_name": emp["full_name"],
                        "company_email": emp.get("company_email"),
                        "department": emp.get("department"),
                        "document_type": doc.get("name", "Other Document"),
                        "expiry_date": expiry,
                        "days_until_expiry": days_until,
                        "urgency": "critical" if days_until <= 7 else "high" if days_until <= 15 else "medium" if days_until <= 30 else "low"
                    })
    
    # Sort by days until expiry
    expiring_docs.sort(key=lambda x: x["days_until_expiry"])
    
    return {
        "total": len(expiring_docs),
        "critical": len([d for d in expiring_docs if d["urgency"] == "critical"]),
        "high": len([d for d in expiring_docs if d["urgency"] == "high"]),
        "medium": len([d for d in expiring_docs if d["urgency"] == "medium"]),
        "low": len([d for d in expiring_docs if d["urgency"] == "low"]),
        "documents": expiring_docs
    }

@api_router.post("/hr/employees/send-expiry-alerts")
async def send_document_expiry_alerts(
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Send email alerts for expiring documents (90, 60, 30, 15, 7 days)"""
    alert_days = [90, 60, 30, 15, 7]
    today = datetime.now(timezone.utc).date()
    
    employees = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"_id": 0}
    ).to_list(500)
    
    # Get HR emails for CC
    hr_users = await db.users.find(
        {"role": {"$in": ["hr", "admin", "super_admin"]}, "is_active": True},
        {"_id": 0, "email": 1}
    ).to_list(50)
    hr_emails = [u["email"] for u in hr_users]
    
    alerts_sent = 0
    document_types = [
        ("passport", "expiry_date", "Passport"),
        ("visa", "expiry_date", "Visa"),
        ("emirates_id", "expiry_date", "Emirates ID"),
        ("labour_card", "expiry_date", "Labour Card"),
        ("work_permit", "expiry_date", "Work Permit"),
        ("health_insurance", "expiry_date", "Health Insurance"),
    ]
    
    for emp in employees:
        employee_alerts = []
        
        for field, date_key, doc_name in document_types:
            doc = emp.get(field)
            if doc and doc.get(date_key):
                expiry = doc[date_key]
                try:
                    expiry_date = datetime.strptime(expiry, "%Y-%m-%d").date()
                    days_until = (expiry_date - today).days
                    
                    if days_until in alert_days:
                        employee_alerts.append({
                            "document": doc_name,
                            "expiry_date": expiry,
                            "days_until": days_until
                        })
                except:
                    continue
        
        # Send email if there are alerts
        if employee_alerts and emp.get("company_email"):
            # Log the alert (email sending would be implemented with SendGrid/SMTP)
            await db.document_expiry_alerts.insert_one({
                "id": str(uuid.uuid4()),
                "employee_id": emp["id"],
                "employee_name": emp["full_name"],
                "email": emp["company_email"],
                "alerts": employee_alerts,
                "hr_cc": hr_emails[:3],  # CC first 3 HR emails
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "logged"  # Would be "sent" with actual email integration
            })
            alerts_sent += 1
    
    return {
        "message": f"Document expiry alerts processed for {alerts_sent} employees",
        "alerts_sent": alerts_sent,
        "note": "Email integration required for actual sending. Alerts have been logged."
    }

# ==================== PAYSLIP GENERATION ====================

@api_router.get("/hr/employees/{employee_id}/payslip")
async def generate_payslip(
    employee_id: str,
    month: int,
    year: int,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Generate payslip data for an employee"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    salary = employee.get("salary_structure", {})
    
    # Get payroll record if exists
    payroll = await db.hr_payroll.find_one({
        "employee_id": employee["id"],
        "month": month,
        "year": year
    }, {"_id": 0})
    
    # Calculate components
    basic = salary.get("basic_salary", 0)
    housing = salary.get("housing_allowance", 0)
    transport = salary.get("transport_allowance", 0)
    telephone = salary.get("telephone_allowance", 0)
    other_allowances = salary.get("other_allowances", 0)
    commission = payroll.get("commission", salary.get("commission", 0)) if payroll else salary.get("commission", 0)
    incentives = payroll.get("incentives", salary.get("incentives", 0)) if payroll else salary.get("incentives", 0)
    deductions = payroll.get("deductions", salary.get("deductions", 0)) if payroll else salary.get("deductions", 0)
    
    gross = basic + housing + transport + telephone + other_allowances + commission + incentives
    net = gross - deductions
    
    # Month name
    month_names = ["", "January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"]
    
    payslip = {
        "company": {
            "name": "CLT Academy",
            "address": "Dubai, UAE",
            "logo_url": None
        },
        "employee": {
            "id": employee["employee_id"],
            "name": employee["full_name"],
            "email": employee.get("company_email"),
            "department": employee.get("department"),
            "designation": employee.get("designation"),
            "joining_date": employee.get("joining_date"),
            "bank_name": employee.get("bank_details", {}).get("bank_name"),
            "account_number": employee.get("bank_details", {}).get("account_number"),
            "iban": employee.get("bank_details", {}).get("iban")
        },
        "pay_period": {
            "month": month,
            "month_name": month_names[month],
            "year": year,
            "pay_date": f"{year}-{month:02d}-28"
        },
        "earnings": {
            "basic_salary": basic,
            "housing_allowance": housing,
            "transport_allowance": transport,
            "telephone_allowance": telephone,
            "other_allowances": other_allowances,
            "commission": commission,
            "incentives": incentives,
            "gross_salary": gross
        },
        "deductions": {
            "total_deductions": deductions,
            "breakdown": payroll.get("deduction_breakdown", []) if payroll else []
        },
        "summary": {
            "gross_salary": gross,
            "total_deductions": deductions,
            "net_salary": net,
            "currency": salary.get("currency", "AED")
        },
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    return payslip

@api_router.post("/hr/employees/{employee_id}/payslip/email")
async def email_payslip(
    employee_id: str,
    month: int,
    year: int,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Email payslip to employee"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if not employee.get("company_email"):
        raise HTTPException(status_code=400, detail="Employee has no email address")
    
    # Generate payslip
    salary = employee.get("salary_structure", {})
    payroll = await db.hr_payroll.find_one({
        "employee_id": employee["id"],
        "month": month,
        "year": year
    }, {"_id": 0})
    
    basic = salary.get("basic_salary", 0)
    housing = salary.get("housing_allowance", 0)
    transport = salary.get("transport_allowance", 0)
    telephone = salary.get("telephone_allowance", 0)
    other = salary.get("other_allowances", 0)
    commission = payroll.get("commission", salary.get("commission", 0)) if payroll else salary.get("commission", 0)
    incentives = payroll.get("incentives", salary.get("incentives", 0)) if payroll else salary.get("incentives", 0)
    deductions = payroll.get("deductions", salary.get("deductions", 0)) if payroll else salary.get("deductions", 0)
    gross = basic + housing + transport + telephone + other + commission + incentives
    net = gross - deductions
    
    month_names = ["", "January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"]
    
    # Log the email (actual sending would use SendGrid/SMTP integration)
    email_log = {
        "id": str(uuid.uuid4()),
        "type": "payslip",
        "recipient": employee["company_email"],
        "employee_id": employee["id"],
        "employee_name": employee["full_name"],
        "subject": f"Payslip for {month_names[month]} {year}",
        "pay_period": f"{month_names[month]} {year}",
        "gross_salary": gross,
        "net_salary": net,
        "currency": salary.get("currency", "AED"),
        "sent_by": user["id"],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "status": "logged"  # Would be "sent" with actual email integration
    }
    
    await db.payslip_emails.insert_one(email_log)
    
    return {
        "message": f"Payslip for {month_names[month]} {year} prepared for {employee['full_name']}",
        "recipient": employee["company_email"],
        "net_salary": net,
        "note": "Email integration required for actual sending. Email has been logged."
    }

@api_router.put("/hr/employees/{employee_id}/status")
async def update_employee_status(
    employee_id: str,
    new_status: str,
    termination_date: Optional[str] = None,
    resignation_date: Optional[str] = None,
    last_working_date: Optional[str] = None,
    exit_notes: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Update employee status with automatic user account sync"""
    valid_statuses = ["active", "probation", "resigned", "terminated", "on_notice", "absconding", "long_leave"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    old_status = employee.get("employment_status")
    
    update_data = {
        "employment_status": new_status,
        "updated_at": now
    }
    
    if termination_date:
        update_data["termination_date"] = termination_date
    if resignation_date:
        update_data["resignation_date"] = resignation_date
    if last_working_date:
        update_data["last_working_date"] = last_working_date
    if exit_notes:
        update_data["exit_notes"] = exit_notes
    
    await db.hr_employees.update_one({"id": employee["id"]}, {"$set": update_data})
    
    # Sync user account status
    user_status_synced = False
    if employee.get("user_id"):
        user_account = await db.users.find_one({"id": employee["user_id"]})
        if user_account:
            # Deactivate user if employee is resigned/terminated/absconding
            if new_status in ["resigned", "terminated", "absconding"]:
                await db.users.update_one(
                    {"id": employee["user_id"]},
                    {"$set": {"status": "inactive", "deactivated_at": now, "deactivation_reason": f"Employee status: {new_status}"}}
                )
                user_status_synced = True
            # Reactivate if status changed back to active
            elif new_status in ["active", "probation"] and user_account.get("status") == "inactive":
                await db.users.update_one(
                    {"id": employee["user_id"]},
                    {"$set": {"status": "active", "reactivated_at": now}}
                )
                user_status_synced = True
    
    # Also check by email if user_id is not set
    if not employee.get("user_id") and employee.get("company_email"):
        user_account = await db.users.find_one({"email": employee["company_email"]})
        if user_account:
            if new_status in ["resigned", "terminated", "absconding"]:
                await db.users.update_one(
                    {"email": employee["company_email"]},
                    {"$set": {"status": "inactive", "deactivated_at": now, "deactivation_reason": f"Employee status: {new_status}"}}
                )
                user_status_synced = True
            elif new_status in ["active", "probation"]:
                await db.users.update_one(
                    {"email": employee["company_email"]},
                    {"$set": {"status": "active", "reactivated_at": now}}
                )
                user_status_synced = True
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee",
        "entity_id": employee["id"],
        "action": "status_change",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {
            "old_status": old_status,
            "new_status": new_status,
            "user_status_synced": user_status_synced
        }
    })
    
    return {
        "message": f"Employee status updated to {new_status}",
        "employee_id": employee["employee_id"],
        "user_status_synced": user_status_synced
    }

@api_router.post("/hr/sync-user-to-employee")
async def sync_user_to_employee(
    user_id: str,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Create employee record from existing user account"""
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if employee already exists for this user
    existing_employee = await db.hr_employees.find_one({
        "$or": [
            {"user_id": user_id},
            {"company_email": target_user.get("email")}
        ]
    })
    if existing_employee:
        raise HTTPException(status_code=400, detail="Employee record already exists for this user")
    
    now = datetime.now(timezone.utc).isoformat()
    employee_uuid = str(uuid.uuid4())
    
    # Generate employee ID
    last_emp = await db.hr_employees.find_one(sort=[("employee_id", -1)])
    if last_emp and last_emp.get("employee_id", "").startswith("CLT-"):
        try:
            last_num = int(last_emp["employee_id"].split("-")[-1])
            emp_id = f"CLT-{str(last_num + 1).zfill(3)}"
        except:
            emp_id = "CLT-001"
    else:
        emp_id = "CLT-001"
    
    employee = {
        "id": employee_uuid,
        "employee_id": emp_id,
        "full_name": target_user.get("full_name", ""),
        "company_email": target_user.get("email", ""),
        "department": target_user.get("department", "Operations"),
        "designation": target_user.get("role", "").replace("_", " ").title(),
        "role": target_user.get("role", ""),
        "employment_type": "full_time",
        "work_location": "Dubai",
        "joining_date": target_user.get("created_at", now)[:10],
        "probation_days": 90,
        "notice_period_days": 30,
        "employment_status": "active" if target_user.get("status") == "active" else "inactive",
        "annual_leave_balance": 30.0,
        "sick_leave_balance": 15.0,
        "user_id": user_id,
        "documents": [],
        "salary_structure": {},
        "bank_details": {},
        "visa_details": {},
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"],
        "created_by_name": user["full_name"],
        "created_via": "user_sync"
    }
    
    await db.hr_employees.insert_one(employee)
    
    # Update user with employee_id
    await db.users.update_one({"id": user_id}, {"$set": {"employee_id": employee_uuid}})
    
    employee.pop("_id", None)
    return {
        "message": "Employee record created from user account",
        "employee": employee
    }

@api_router.get("/hr/unlinked-users")
async def get_unlinked_users(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get users who don't have an employee record linked"""
    # Get all user IDs that are linked to employees
    employees = await db.hr_employees.find(
        {"user_id": {"$ne": None}},
        {"user_id": 1, "company_email": 1}
    ).to_list(1000)
    
    linked_user_ids = {e["user_id"] for e in employees if e.get("user_id")}
    linked_emails = {e["company_email"] for e in employees if e.get("company_email")}
    
    # Get users not in linked lists
    users = await db.users.find(
        {"id": {"$nin": list(linked_user_ids)}, "email": {"$nin": list(linked_emails)}},
        {"_id": 0, "password": 0}
    ).to_list(500)
    
    return users

@api_router.get("/hr/unlinked-employees")
async def get_unlinked_employees(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get employees who don't have a user account linked"""
    employees = await db.hr_employees.find(
        {"$or": [{"user_id": None}, {"user_id": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(500)
    
    return employees

@api_router.post("/hr/link-employee-user")
async def link_employee_to_user(
    employee_id: str,
    user_id: str,
    sync_data: bool = True,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Link an existing employee to an existing user account"""
    employee = await db.hr_employees.find_one({"$or": [{"id": employee_id}, {"employee_id": employee_id}]})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Link employee to user
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": {"user_id": user_id, "updated_at": now}}
    )
    
    # Link user to employee
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"employee_id": employee["id"], "updated_at": now}}
    )
    
    # Sync data if requested
    if sync_data:
        # Sync department, role from employee to user
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "department": employee.get("department"),
                "full_name": employee.get("full_name"),
                "role": employee.get("role") or target_user.get("role")
            }}
        )
    
    return {"message": "Employee and user linked successfully"}

@api_router.put("/hr/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, data: EmployeeUpdate, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Update an employee record with automatic user sync"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Convert nested models
    if "emergency_contact" in update_data and update_data["emergency_contact"]:
        update_data["emergency_contact"] = update_data["emergency_contact"] if isinstance(update_data["emergency_contact"], dict) else update_data["emergency_contact"].model_dump()
    if "visa_details" in update_data and update_data["visa_details"]:
        update_data["visa_details"] = update_data["visa_details"] if isinstance(update_data["visa_details"], dict) else update_data["visa_details"].model_dump()
    if "salary_structure" in update_data and update_data["salary_structure"]:
        update_data["salary_structure"] = update_data["salary_structure"] if isinstance(update_data["salary_structure"], dict) else update_data["salary_structure"].model_dump()
    if "bank_details" in update_data and update_data["bank_details"]:
        update_data["bank_details"] = update_data["bank_details"] if isinstance(update_data["bank_details"], dict) else update_data["bank_details"].model_dump()
    
    update_data["updated_at"] = now
    
    # Store old values for audit
    old_values = {k: employee.get(k) for k in update_data.keys() if k != "updated_at"}
    
    await db.hr_employees.update_one({"id": employee["id"]}, {"$set": update_data})
    
    # Sync changes to linked user account
    user_synced = False
    if employee.get("user_id"):
        user_update = {}
        if "full_name" in update_data:
            user_update["full_name"] = update_data["full_name"]
        if "department" in update_data:
            user_update["department"] = update_data["department"]
        if "role" in update_data:
            user_update["role"] = update_data["role"]
        if "company_email" in update_data:
            user_update["email"] = update_data["company_email"]
        
        if user_update:
            user_update["updated_at"] = now
            await db.users.update_one({"id": employee["user_id"]}, {"$set": user_update})
            user_synced = True
    
    # Handle status changes - sync to user
    if "employment_status" in update_data:
        new_status = update_data["employment_status"]
        if new_status in ["resigned", "terminated", "absconding"] and employee.get("user_id"):
            await db.users.update_one(
                {"id": employee["user_id"]},
                {"$set": {"status": "inactive", "deactivated_at": now}}
            )
            user_synced = True
        elif new_status in ["active", "probation"] and employee.get("user_id"):
            await db.users.update_one(
                {"id": employee["user_id"]},
                {"$set": {"status": "active", "reactivated_at": now}}
            )
            user_synced = True
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee",
        "entity_id": employee["id"],
        "action": "update",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {"old": old_values, "new": update_data, "user_synced": user_synced}
    })
    
    updated = await db.hr_employees.find_one({"id": employee["id"]}, {"_id": 0})
    return updated

@api_router.delete("/hr/employees/{employee_id}")
async def delete_employee(employee_id: str, user = Depends(require_roles(["super_admin"]))):
    """Delete an employee (soft delete - marks as terminated)"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$set": {
            "employment_status": "terminated",
            "termination_date": now,
            "updated_at": now
        }}
    )
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee",
        "entity_id": employee["id"],
        "action": "delete",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {"old_status": employee.get("employment_status"), "new_status": "terminated"}
    })
    
    return {"message": "Employee marked as terminated", "employee_id": employee["employee_id"]}

# ==================== HR MODULE - DOCUMENT MANAGEMENT ====================

@api_router.post("/hr/employees/{employee_id}/documents")
async def upload_employee_document(
    employee_id: str,
    document_type: str,
    file: UploadFile,
    notes: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Upload a document for an employee"""
    import base64
    
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": employee_id}, {"employee_id": employee_id}]}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Validate file type
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPEG, PNG, WebP")
    
    # Read file
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB")
    
    # Store as base64
    b64 = base64.b64encode(contents).decode('utf-8')
    file_url = f"data:{file.content_type};base64,{b64}"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for existing document of same type to determine version
    existing_docs = [d for d in employee.get("documents", []) if d.get("document_type") == document_type]
    version = len(existing_docs) + 1
    
    doc = {
        "id": str(uuid.uuid4()),
        "document_type": document_type,
        "file_name": file.filename,
        "file_url": file_url,
        "file_size": len(contents),
        "version": version,
        "uploaded_by": user["id"],
        "uploaded_by_name": user["full_name"],
        "uploaded_at": now,
        "notes": notes
    }
    
    await db.hr_employees.update_one(
        {"id": employee["id"]},
        {"$push": {"documents": doc}, "$set": {"updated_at": now}}
    )
    
    # Audit log
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "employee_document",
        "entity_id": employee["id"],
        "action": "upload",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {"document_type": document_type, "file_name": file.filename, "version": version}
    })
    
    return {"message": "Document uploaded successfully", "document_id": doc["id"], "version": version}

# ==================== HR MODULE - DOCUMENT EXPIRY ALERTS ====================

@api_router.get("/hr/expiry-alerts")
async def get_document_expiry_alerts(
    days_threshold: int = 90,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get all employees with documents expiring within threshold days"""
    employees = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"_id": 0}
    ).to_list(1000)
    
    alerts = []
    today = datetime.now(timezone.utc).date()
    
    for emp in employees:
        emp_alerts = []
        visa = emp.get("visa_details", {}) or {}
        
        # Check visa expiry
        if visa.get("visa_expiry"):
            days = calculate_days_until_expiry(visa["visa_expiry"])
            if 0 <= days <= days_threshold:
                emp_alerts.append({
                    "document_type": "Visa",
                    "expiry_date": visa["visa_expiry"],
                    "days_remaining": days,
                    "urgency": "critical" if days <= 30 else "warning" if days <= 60 else "info"
                })
        
        # Check Emirates ID expiry
        if visa.get("emirates_id_expiry"):
            days = calculate_days_until_expiry(visa["emirates_id_expiry"])
            if 0 <= days <= days_threshold:
                emp_alerts.append({
                    "document_type": "Emirates ID",
                    "expiry_date": visa["emirates_id_expiry"],
                    "days_remaining": days,
                    "urgency": "critical" if days <= 30 else "warning" if days <= 60 else "info"
                })
        
        # Check Passport expiry
        if visa.get("passport_expiry"):
            days = calculate_days_until_expiry(visa["passport_expiry"])
            if 0 <= days <= days_threshold:
                emp_alerts.append({
                    "document_type": "Passport",
                    "expiry_date": visa["passport_expiry"],
                    "days_remaining": days,
                    "urgency": "critical" if days <= 30 else "warning" if days <= 60 else "info"
                })
        
        # Check Labor Card expiry
        if visa.get("labor_card_expiry"):
            days = calculate_days_until_expiry(visa["labor_card_expiry"])
            if 0 <= days <= days_threshold:
                emp_alerts.append({
                    "document_type": "Labor Card",
                    "expiry_date": visa["labor_card_expiry"],
                    "days_remaining": days,
                    "urgency": "critical" if days <= 30 else "warning" if days <= 60 else "info"
                })
        
        if emp_alerts:
            alerts.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["full_name"],
                "department": emp.get("department"),
                "alerts": emp_alerts
            })
    
    # Sort by most urgent
    alerts.sort(key=lambda x: min([a["days_remaining"] for a in x["alerts"]]))
    
    # Summary
    summary = {
        "critical_30_days": len([a for a in alerts if any(al["days_remaining"] <= 30 for al in a["alerts"])]),
        "warning_60_days": len([a for a in alerts if any(30 < al["days_remaining"] <= 60 for al in a["alerts"])]),
        "info_90_days": len([a for a in alerts if any(60 < al["days_remaining"] <= 90 for al in a["alerts"])]),
        "total_employees_with_alerts": len(alerts)
    }
    
    return {"summary": summary, "alerts": alerts}

# ==================== HR MODULE - LEAVE MANAGEMENT ====================

@api_router.post("/hr/leave-requests")
async def create_leave_request(data: LeaveRequest, user = Depends(get_current_user)):
    """Create a new leave request"""
    # Get employee record
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": data.employee_id}, {"user_id": user["id"]}]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found")
    
    # Calculate leave days
    leave_days = calculate_leave_days(data.start_date, data.end_date, data.half_day)
    
    # Check leave balance
    if data.leave_type.value == "annual":
        if employee.get("annual_leave_balance", 0) < leave_days:
            raise HTTPException(status_code=400, detail=f"Insufficient annual leave balance. Available: {employee.get('annual_leave_balance', 0)} days")
    elif data.leave_type.value == "sick":
        if employee.get("sick_leave_balance", 0) < leave_days:
            raise HTTPException(status_code=400, detail=f"Insufficient sick leave balance. Available: {employee.get('sick_leave_balance', 0)} days")
    
    now = datetime.now(timezone.utc).isoformat()
    request_id = str(uuid.uuid4())
    
    # Determine approval workflow based on role
    # Direct to CEO roles skip team lead/sales manager
    direct_to_ceo_roles = ["hr", "finance", "admin"]
    employee_role = user.get("role", "")
    
    leave_request = {
        "id": request_id,
        "employee_id": employee["id"],
        "employee_code": employee["employee_id"],
        "employee_name": employee["full_name"],
        "department": employee.get("department"),
        "leave_type": data.leave_type.value,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "half_day": data.half_day,
        "leave_days": leave_days,
        "reason": data.reason,
        "contact_during_leave": data.contact_during_leave,
        "handover_to": data.handover_to,
        "status": "pending",
        "current_approver_level": "hr" if employee_role in direct_to_ceo_roles else "team_lead",
        "approval_history": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.hr_leave_requests.insert_one(leave_request)
    
    # Create notification for approver
    # TODO: Find actual approver and notify
    
    return {"message": "Leave request submitted", "request_id": request_id, "leave_days": leave_days}

@api_router.get("/hr/leave-requests")
async def get_leave_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    pending_approval: bool = False,
    user = Depends(get_current_user)
):
    """Get leave requests"""
    query = {}
    
    # If not HR/admin, only show own requests
    if user["role"] not in ["super_admin", "admin", "hr", "sales_manager", "team_leader"]:
        query["created_by"] = user["id"]
    elif employee_id:
        query["$or"] = [{"employee_id": employee_id}, {"employee_code": employee_id}]
    
    if status:
        query["status"] = status
    
    if pending_approval and user["role"] in ["team_leader", "sales_manager", "hr", "super_admin"]:
        # Show requests pending at user's approval level
        level_map = {
            "team_leader": "team_lead",
            "sales_manager": "sales_manager",
            "hr": "hr",
            "super_admin": "ceo",
            "admin": "ceo"
        }
        query["current_approver_level"] = level_map.get(user["role"], "team_lead")
        query["status"] = "pending"
    
    requests = await db.hr_leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return requests

@api_router.put("/hr/leave-requests/{request_id}/approve")
async def approve_leave_request(
    request_id: str,
    data: LeaveApproval,
    user = Depends(require_roles(["super_admin", "admin", "hr", "sales_manager", "team_leader"]))
):
    """Approve or reject a leave request"""
    leave_req = await db.hr_leave_requests.find_one({"id": request_id})
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    if leave_req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Leave request is not pending approval")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine current level and next level
    level_progression = ["team_lead", "sales_manager", "hr", "ceo"]
    current_level = leave_req.get("current_approver_level", "team_lead")
    
    approval_entry = {
        "level": current_level,
        "action": data.action,
        "approved_by": user["id"],
        "approved_by_name": user["full_name"],
        "comments": data.comments,
        "timestamp": now
    }
    
    if data.action == "reject":
        # Rejected at any level stops the process
        await db.hr_leave_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "updated_at": now
            }, "$push": {"approval_history": approval_entry}}
        )
        return {"message": "Leave request rejected", "status": "rejected"}
    
    # Approve and move to next level
    if current_level == "ceo" or (current_level == "hr" and user["role"] in ["super_admin", "admin"]):
        # Final approval - deduct leave balance
        employee = await db.hr_employees.find_one({"id": leave_req["employee_id"]})
        if employee:
            leave_type = leave_req.get("leave_type", "annual")
            leave_days = leave_req.get("leave_days", 0)
            
            if leave_type == "annual":
                new_balance = max(0, employee.get("annual_leave_balance", 0) - leave_days)
                await db.hr_employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"annual_leave_balance": new_balance}}
                )
            elif leave_type == "sick":
                new_balance = max(0, employee.get("sick_leave_balance", 0) - leave_days)
                await db.hr_employees.update_one(
                    {"id": employee["id"]},
                    {"$set": {"sick_leave_balance": new_balance}}
                )
        
        await db.hr_leave_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "final_approved_by": user["id"],
                "final_approved_at": now,
                "updated_at": now
            }, "$push": {"approval_history": approval_entry}}
        )
        return {"message": "Leave request fully approved", "status": "approved"}
    else:
        # Move to next level
        current_idx = level_progression.index(current_level) if current_level in level_progression else 0
        next_level = level_progression[min(current_idx + 1, len(level_progression) - 1)]
        
        await db.hr_leave_requests.update_one(
            {"id": request_id},
            {"$set": {
                "current_approver_level": next_level,
                "updated_at": now
            }, "$push": {"approval_history": approval_entry}}
        )
        return {"message": f"Approved at {current_level} level. Pending {next_level} approval", "next_level": next_level}

# ==================== HR MODULE - ATTENDANCE ====================

@api_router.post("/hr/attendance/biometric-sync")
async def sync_biometric_attendance(
    employee_id: str,
    timestamp: str,
    punch_type: str,  # IN or OUT
    biometric_id: Optional[str] = None
):
    """API endpoint for biometric device to sync attendance"""
    # Find employee by employee_id or biometric_id
    query = {"employee_id": employee_id}
    if biometric_id:
        query = {"$or": [{"employee_id": employee_id}, {"biometric_id": biometric_id}]}
    
    employee = await db.hr_employees.find_one(query, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Parse timestamp
    try:
        punch_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except:
        punch_time = datetime.now(timezone.utc)
    
    date_str = punch_time.strftime("%Y-%m-%d")
    time_str = punch_time.strftime("%H:%M:%S")
    
    # Find or create attendance record for today
    attendance = await db.hr_attendance.find_one({
        "employee_id": employee["id"],
        "date": date_str
    })
    
    now = datetime.now(timezone.utc).isoformat()
    
    if attendance:
        update = {"updated_at": now}
        if punch_type.upper() == "IN":
            update["biometric_in"] = time_str
            # Calculate late minutes (assuming 9:00 AM start)
            if time_str > "09:00:00":
                try:
                    in_time = datetime.strptime(time_str, "%H:%M:%S")
                    start_time = datetime.strptime("09:00:00", "%H:%M:%S")
                    update["late_minutes"] = int((in_time - start_time).total_seconds() / 60)
                except:
                    pass
        else:
            update["biometric_out"] = time_str
            # Calculate early exit (assuming 6:00 PM end)
            if time_str < "18:00:00":
                try:
                    out_time = datetime.strptime(time_str, "%H:%M:%S")
                    end_time = datetime.strptime("18:00:00", "%H:%M:%S")
                    update["early_exit_minutes"] = int((end_time - out_time).total_seconds() / 60)
                except:
                    pass
            
            # Calculate total work hours if both in and out exist
            if attendance.get("biometric_in"):
                try:
                    in_time = datetime.strptime(attendance["biometric_in"], "%H:%M:%S")
                    out_time = datetime.strptime(time_str, "%H:%M:%S")
                    work_hours = (out_time - in_time).total_seconds() / 3600
                    update["total_work_hours"] = round(work_hours, 2)
                except:
                    pass
        
        await db.hr_attendance.update_one({"id": attendance["id"]}, {"$set": update})
    else:
        # Create new attendance record
        attendance_record = {
            "id": str(uuid.uuid4()),
            "employee_id": employee["id"],
            "employee_code": employee["employee_id"],
            "employee_name": employee["full_name"],
            "department": employee.get("department"),
            "date": date_str,
            "biometric_in": time_str if punch_type.upper() == "IN" else None,
            "biometric_out": time_str if punch_type.upper() == "OUT" else None,
            "crm_login": None,
            "crm_logout": None,
            "total_work_hours": 0,
            "break_hours": 0,
            "late_minutes": 0,
            "early_exit_minutes": 0,
            "status": "present",
            "created_at": now,
            "updated_at": now
        }
        
        # Calculate late minutes for IN punch
        if punch_type.upper() == "IN" and time_str > "09:00:00":
            try:
                in_time = datetime.strptime(time_str, "%H:%M:%S")
                start_time = datetime.strptime("09:00:00", "%H:%M:%S")
                attendance_record["late_minutes"] = int((in_time - start_time).total_seconds() / 60)
            except:
                pass
        
        await db.hr_attendance.insert_one(attendance_record)
    
    return {"message": f"Attendance {punch_type} recorded", "employee_id": employee["employee_id"], "time": time_str}

@api_router.get("/hr/attendance")
async def get_attendance(
    employee_id: Optional[str] = None,
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "team_leader"]))
):
    """Get attendance records"""
    query = {}
    
    if employee_id:
        query["$or"] = [{"employee_id": employee_id}, {"employee_code": employee_id}]
    if date:
        query["date"] = date
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    if department:
        query["department"] = department
    
    records = await db.hr_attendance.find(query, {"_id": 0}).sort([("date", -1), ("employee_code", 1)]).to_list(1000)
    return records

# ==================== BIOCLOUD INTEGRATION ====================

@api_router.get("/hr/biocloud/employees")
async def get_biocloud_employees(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Fetch employees from BioCloud for mapping"""
    result = await get_biocloud_employees_for_mapping(db)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to fetch BioCloud employees"))
    return result

@api_router.post("/hr/biocloud/auto-sync")
async def auto_sync_biocloud_employees(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Auto-sync employees from BioCloud to CLT Synapse by name matching"""
    result = await sync_biocloud_employees(db)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to sync employees"))
    return result

@api_router.post("/hr/biocloud/mapping")
async def save_biocloud_mapping(
    mappings: List[Dict],
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Save manual employee mappings between BioCloud and CLT Synapse"""
    result = await save_employee_mapping(db, mappings)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to save mappings"))
    return result

@api_router.post("/hr/biocloud/fetch-attendance")
async def fetch_biocloud_attendance(
    date: Optional[str] = None,
    retry_count: int = 3,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """
    Fetch attendance from BioCloud and sync to CLT Synapse
    Uses Playwright web scraping since direct API not available for attendance
    Navigates to Attendance > Daily Attendance and scrapes the layui table
    
    Improvements:
    - Retry logic with configurable retry count
    - Better error handling and recovery
    - More robust element selection with fallbacks
    - Date filter support
    - Detailed logging for debugging
    """
    import os as os_module
    os_module.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/pw-browsers"
    
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
    
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    last_error = None
    
    for attempt in range(retry_count):
        try:
            logger.info(f"BioCloud sync: Attempt {attempt + 1}/{retry_count} for date {target_date}")
            
            async with async_playwright() as p:
                # Launch browser with more stable settings
                browser = await p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                )
                context = await browser.new_context(
                    ignore_https_errors=True,
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = await context.new_page()
                page.set_default_timeout(30000)  # 30 second default timeout
                
                biocloud_url = os.environ.get('BIOCLOUD_URL', 'https://56.biocloud.me:8085')
                biocloud_user = os.environ.get('BIOCLOUD_USERNAME', 'Admin')
                biocloud_pass = os.environ.get('BIOCLOUD_PASSWORD', '1')
                
                logger.info(f"BioCloud sync: Connecting to {biocloud_url}")
                
                # Login to BioCloud with retry on page load
                try:
                    await page.goto(biocloud_url, wait_until="domcontentloaded", timeout=45000)
                    await page.wait_for_timeout(3000)  # Wait for JS to fully load
                except PlaywrightTimeout:
                    logger.warning(f"BioCloud sync: Page load timeout, waiting for fallback...")
                    await page.wait_for_timeout(5000)
                
                # Try multiple selectors for login form (more robust)
                username_input = None
                password_input = None
                
                # Try different selector strategies
                login_selectors = [
                    {'user': 'input[type="text"]', 'pass': 'input[type="password"]'},
                    {'user': 'input[name="username"]', 'pass': 'input[name="password"]'},
                    {'user': '#username', 'pass': '#password'},
                    {'user': 'input.form-control', 'pass': 'input[type="password"]'},
                ]
                
                for selectors in login_selectors:
                    try:
                        username_input = page.locator(selectors['user']).first
                        password_input = page.locator(selectors['pass']).first
                        if await username_input.count() > 0 and await password_input.count() > 0:
                            break
                    except:
                        continue
                
                if not username_input or not password_input:
                    raise Exception("Could not find login form elements")
                
                await username_input.fill(biocloud_user)
                await password_input.fill(biocloud_pass)
                
                # Click login button with fallback selectors
                login_clicked = False
                login_btn_selectors = [
                    'button[type="submit"]',
                    'button:has-text("Login")',
                    'button:has-text("Sign")',
                    'input[type="submit"]',
                    'button.btn-primary',
                    'button'
                ]
                
                for selector in login_btn_selectors:
                    try:
                        login_btn = page.locator(selector).first
                        if await login_btn.count() > 0:
                            await login_btn.click()
                            login_clicked = True
                            break
                    except:
                        continue
                
                if not login_clicked:
                    # Try pressing Enter as fallback
                    await password_input.press('Enter')
                
                await page.wait_for_timeout(5000)
                
                # Verify login success by checking for menu items
                try:
                    await page.wait_for_selector('a:has-text("Attendance")', timeout=10000)
                    logger.info("BioCloud sync: Logged in successfully")
                except PlaywrightTimeout:
                    # Check if still on login page (login failed)
                    if await page.locator('input[type="password"]').count() > 0:
                        raise Exception("Login failed - check credentials")
                    logger.info("BioCloud sync: Login page changed, assuming success")
                
                # Navigate to Attendance menu with retry
                attendance_menu = None
                menu_selectors = [
                    'a:has-text("Attendance")',
                    'li:has-text("Attendance") a',
                    '[data-menu="attendance"]',
                    '.nav-item:has-text("Attendance")'
                ]
                
                for selector in menu_selectors:
                    try:
                        attendance_menu = page.locator(selector).first
                        if await attendance_menu.count() > 0:
                            await attendance_menu.click()
                            break
                    except:
                        continue
                
                if not attendance_menu:
                    raise Exception("Could not find Attendance menu")
                
                await page.wait_for_timeout(2000)
                
                # Click on Daily Attendance with fallback
                daily_att_selectors = [
                    'a:has-text("Daily Attendance")',
                    'a:has-text("Daily")',
                    '[href*="daily"]',
                    '.submenu a:has-text("Daily")'
                ]
                
                daily_att_clicked = False
                for selector in daily_att_selectors:
                    try:
                        daily_att = page.locator(selector).first
                        if await daily_att.count() > 0:
                            await daily_att.click()
                            daily_att_clicked = True
                            break
                    except:
                        continue
                
                if not daily_att_clicked:
                    raise Exception("Could not find Daily Attendance link")
                
                await page.wait_for_timeout(4000)
                logger.info("BioCloud sync: Navigated to Daily Attendance")
                
                # Try to set date filter if needed (for specific date sync)
                try:
                    date_input = page.locator('input[type="date"], input.date-picker, input[name="date"]').first
                    if await date_input.count() > 0:
                        await date_input.fill(target_date)
                        await page.wait_for_timeout(1000)
                        # Try to trigger search/filter
                        search_btn = page.locator('button:has-text("Search"), button:has-text("Filter"), button.btn-search').first
                        if await search_btn.count() > 0:
                            await search_btn.click()
                            await page.wait_for_timeout(2000)
                except Exception as e:
                    logger.info(f"BioCloud sync: Date filter not available or not needed: {e}")
                
                # Find the Daily Attendance table container (layui-table-box)
                # The Daily Attendance table is the second container with Employee ID, Weekday, Name, etc.
                await page.wait_for_selector('.layui-table-box, .table, table', timeout=15000)
                layui_containers = await page.locator('.layui-table-box').all()
            
            attendance_data = []
            
            if len(layui_containers) >= 2:
                daily_container = layui_containers[1]  # Second container has Daily Attendance
                
                # Try to set page size to maximum (50) to get more records
                try:
                    page_size_select = page.locator('.layui-laypage-limits select').nth(1)
                    await page_size_select.select_option(value='50')
                    await page.wait_for_timeout(2000)
                except Exception as e:
                    logger.warning(f"Could not set page size: {e}")
                
                # Get total page count
                total_pages = 1
                try:
                    # Look for last page link to determine total pages
                    last_page_link = page.locator('.layui-laypage-last')
                    if await last_page_link.count() > 0:
                        last_page_text = await last_page_link.get_attribute('data-page')
                        if last_page_text:
                            total_pages = int(last_page_text)
                except:
                    pass
                
                logger.info(f"BioCloud sync: Found {total_pages} pages of data")
                
                # Loop through all pages
                current_page = 1
                while current_page <= total_pages:
                    # Get body from the container
                    body_elements = await daily_container.locator('.layui-table-body').all()
                    
                    if body_elements:
                        body = body_elements[0]
                        rows = await body.locator('tr').all()
                        
                        for row in rows:
                            cells = await row.locator('td').all()
                            if len(cells) >= 7:
                                try:
                                    cell_texts = []
                                    for cell in cells[:11]:
                                        try:
                                            text = await cell.inner_text()
                                            cell_texts.append(text.strip())
                                        except:
                                            cell_texts.append('')
                                    
                                    # Columns: Employee ID | Weekday | Employee Name | Department Name | Punch Date | Actual In | Actual Out | Actual BIn | Actual BOut | Day off
                                    emp_code = cell_texts[0]
                                    emp_name = cell_texts[2]
                                    dept = cell_texts[3]
                                    punch_date = cell_texts[4]
                                    actual_in = cell_texts[5] if len(cell_texts) > 5 else ""
                                    actual_out = cell_texts[6] if len(cell_texts) > 6 else ""
                                    day_off = cell_texts[9] if len(cell_texts) > 9 else ""
                                    
                                    # Validate record
                                    if emp_code.isdigit() and punch_date and '-' in punch_date:
                                        status = "Absent" if day_off == "Absent" else ("Present" if actual_in else "No Punch")
                                        
                                        record = {
                                            "emp_code": emp_code,
                                            "name": emp_name,
                                            "department": dept,
                                            "punch_date": punch_date,
                                            "first_in": actual_in if actual_in else None,
                                            "last_out": actual_out if actual_out else None,
                                            "status": status
                                        }
                                        attendance_data.append(record)
                                except Exception as e:
                                    continue
                    
                    # Go to next page if not on last page
                    if current_page < total_pages:
                        try:
                            next_page_link = page.locator(f'.layui-laypage a[data-page="{current_page + 1}"]').nth(1)
                            await next_page_link.click()
                            await page.wait_for_timeout(2000)
                        except Exception as e:
                            logger.warning(f"Could not navigate to page {current_page + 1}: {e}")
                            break
                    
                    current_page += 1
            
            await browser.close()
            
            logger.info(f"BioCloud sync: Fetched {len(attendance_data)} raw attendance records")
            
            # Log all unique emp_codes found for debugging
            found_emp_codes = set([att["emp_code"] for att in attendance_data])
            logger.info(f"BioCloud sync: Found emp_codes: {found_emp_codes}")
            
            # Get all mapped emp_codes from DB
            mapped_employees = await db.hr_employees.find(
                {"biocloud_emp_code": {"$exists": True, "$ne": None}},
                {"_id": 0, "full_name": 1, "biocloud_emp_code": 1}
            ).to_list(100)
            mapped_emp_codes = {emp["biocloud_emp_code"]: emp["full_name"] for emp in mapped_employees}
            logger.info(f"BioCloud sync: Mapped emp_codes in DB: {list(mapped_emp_codes.keys())}")
            
            # Process and save attendance data
            synced = 0
            skipped = 0
            unmatched_emp_codes = []
            
            for att in attendance_data:
                emp_code = att["emp_code"]
                
                # Find mapped employee by biocloud_emp_code
                employee = await db.hr_employees.find_one(
                    {"biocloud_emp_code": emp_code},
                    {"_id": 0}
                )
                
                if employee:
                    now = datetime.now(timezone.utc).isoformat()
                    record_date = att["punch_date"]
                    
                    # Check if attendance already exists for this date
                    existing = await db.hr_attendance.find_one({
                        "employee_id": employee["id"],
                        "date": record_date
                    })
                    
                    # Determine status
                    if att["status"] == "Absent":
                        status = "absent"
                    elif att["first_in"]:
                        status = "present"
                    else:
                        status = "absent"
                    
                    attendance_record = {
                        "employee_id": employee["id"],
                        "employee_code": employee["employee_id"],
                        "employee_name": employee["full_name"],
                        "department": employee.get("department"),
                        "date": record_date,
                        "biometric_in": att["first_in"],
                        "biometric_out": att["last_out"],
                        "status": status,
                        "source": "biocloud_sync",
                        "synced_at": now
                    }
                    
                    # Calculate total worked hours
                    if att["first_in"] and att["last_out"]:
                        try:
                            in_time = datetime.strptime(att["first_in"][:8], "%H:%M:%S")
                            out_time = datetime.strptime(att["last_out"][:8], "%H:%M:%S")
                            if out_time > in_time:
                                total_seconds = (out_time - in_time).total_seconds()
                                total_hours = round(total_seconds / 3600, 2)
                                attendance_record["total_hours"] = total_hours
                        except Exception as e:
                            # Try with HH:MM format
                            try:
                                in_time = datetime.strptime(att["first_in"][:5], "%H:%M")
                                out_time = datetime.strptime(att["last_out"][:5], "%H:%M")
                                if out_time > in_time:
                                    total_seconds = (out_time - in_time).total_seconds()
                                    total_hours = round(total_seconds / 3600, 2)
                                    attendance_record["total_hours"] = total_hours
                            except:
                                pass
                    
                    # Calculate late minutes (if check-in after 09:00)
                    if att["first_in"]:
                        try:
                            in_time = datetime.strptime(att["first_in"][:5], "%H:%M")
                            start_time = datetime.strptime("09:00", "%H:%M")
                            if in_time > start_time:
                                attendance_record["late_minutes"] = int((in_time - start_time).total_seconds() / 60)
                            else:
                                attendance_record["late_minutes"] = 0
                        except:
                            pass
                    
                    # Calculate early exit minutes (if check-out before 18:00)
                    if att["last_out"]:
                        try:
                            out_time = datetime.strptime(att["last_out"][:5], "%H:%M")
                            end_time = datetime.strptime("18:00", "%H:%M")
                            if out_time < end_time:
                                attendance_record["early_exit_minutes"] = int((end_time - out_time).total_seconds() / 60)
                            else:
                                attendance_record["early_exit_minutes"] = 0
                        except:
                            pass
                    
                    if existing:
                        await db.hr_attendance.update_one(
                            {"id": existing["id"]},
                            {"$set": attendance_record}
                        )
                    else:
                        attendance_record["id"] = str(uuid.uuid4())
                        attendance_record["created_at"] = now
                        await db.hr_attendance.insert_one(attendance_record)
                    
                    synced += 1
                else:
                    skipped += 1
                    if emp_code not in unmatched_emp_codes:
                        unmatched_emp_codes.append(emp_code)
            
            # Log unmatched emp_codes
            if unmatched_emp_codes:
                logger.warning(f"BioCloud sync: Unmatched emp_codes (not in DB): {unmatched_emp_codes}")
            
            # Check which mapped employees didn't have attendance data
            missing_mapped = [name for code, name in mapped_emp_codes.items() if code not in found_emp_codes]
            if missing_mapped:
                logger.warning(f"BioCloud sync: Mapped employees without attendance data: {missing_mapped}")
            
            # Log successful sync to history
            await db.biocloud_sync_log.insert_one({
                "id": str(uuid.uuid4()),
                "date": target_date,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "fetched": len(attendance_data),
                "synced": synced,
                "skipped": skipped,
                "success": True,
                "attempt": attempt + 1,
                "user_id": user.get("id")
            })
            
            return {
                "success": True,
                "date": target_date,
                "fetched": len(attendance_data),
                "synced": synced,
                "skipped": skipped,
                "found_emp_codes": list(found_emp_codes),
                "unmatched_emp_codes": unmatched_emp_codes,
                "missing_mapped_employees": missing_mapped,
                "attempt": attempt + 1,
                "message": f"Fetched {len(attendance_data)} records, synced {synced} to CLT Synapse ({skipped} unmapped employees skipped)"
            }
            
        except Exception as e:
            last_error = str(e)
            logger.warning(f"BioCloud sync attempt {attempt + 1} failed: {last_error}")
            if attempt < retry_count - 1:
                await asyncio.sleep(2)  # Wait before retry
                continue
    
    # All retries failed
    logger.error(f"BioCloud attendance fetch failed after {retry_count} attempts: {last_error}")
    raise HTTPException(status_code=500, detail=f"Failed to fetch attendance after {retry_count} attempts: {last_error}")

@api_router.get("/hr/biocloud/status")
async def get_biocloud_status(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Check BioCloud connection status and mapped employees"""
    try:
        client = BioCloudClient()
        connected = await client.authenticate()
        await client.close()
        
        # Get mapping stats
        total_employees = await db.hr_employees.count_documents({})
        mapped_employees = await db.hr_employees.count_documents({"biocloud_emp_code": {"$exists": True, "$ne": None}})
        
        # Get last sync info
        last_sync = await db.biocloud_sync_log.find_one(
            {"success": True},
            sort=[("timestamp", -1)]
        )
        
        return {
            "connected": connected,
            "biocloud_url": os.environ.get('BIOCLOUD_URL', 'https://56.biocloud.me:8085'),
            "total_clt_employees": total_employees,
            "mapped_employees": mapped_employees,
            "unmapped_employees": total_employees - mapped_employees,
            "last_sync": {
                "date": last_sync.get("date") if last_sync else None,
                "timestamp": last_sync.get("timestamp") if last_sync else None,
                "records_synced": last_sync.get("synced") if last_sync else 0
            } if last_sync else None
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

@api_router.post("/hr/biocloud/bulk-sync")
async def bulk_sync_biocloud_attendance(
    start_date: str,
    end_date: str,
    background_tasks: BackgroundTasks,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """
    Sync attendance for a date range in the background.
    Useful for initial setup or catching up on missed syncs.
    """
    from datetime import datetime as dt
    
    try:
        start = dt.strptime(start_date, "%Y-%m-%d")
        end = dt.strptime(end_date, "%Y-%m-%d")
        
        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Calculate number of days
        delta = (end - start).days + 1
        if delta > 31:
            raise HTTPException(status_code=400, detail="Maximum date range is 31 days")
        
        # Generate list of dates
        dates_to_sync = []
        current = start
        while current <= end:
            dates_to_sync.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
        
        # Create a bulk sync job record
        job_id = str(uuid.uuid4())
        job = {
            "id": job_id,
            "type": "bulk_sync",
            "start_date": start_date,
            "end_date": end_date,
            "total_dates": len(dates_to_sync),
            "completed_dates": 0,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("id"),
            "results": []
        }
        await db.biocloud_sync_jobs.insert_one(job)
        
        # Run sync in background
        async def run_bulk_sync():
            try:
                for i, sync_date in enumerate(dates_to_sync):
                    try:
                        # Import the function reference
                        result = await _sync_single_date(sync_date, user)
                        
                        await db.biocloud_sync_jobs.update_one(
                            {"id": job_id},
                            {
                                "$inc": {"completed_dates": 1},
                                "$push": {"results": {"date": sync_date, "success": True, "synced": result.get("synced", 0)}},
                                "$set": {"status": "in_progress"}
                            }
                        )
                    except Exception as e:
                        await db.biocloud_sync_jobs.update_one(
                            {"id": job_id},
                            {
                                "$inc": {"completed_dates": 1},
                                "$push": {"results": {"date": sync_date, "success": False, "error": str(e)}},
                            }
                        )
                    
                    # Small delay between syncs to avoid overwhelming the server
                    await asyncio.sleep(2)
                
                # Mark job as complete
                await db.biocloud_sync_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
                )
            except Exception as e:
                await db.biocloud_sync_jobs.update_one(
                    {"id": job_id},
                    {"$set": {"status": "failed", "error": str(e)}}
                )
        
        background_tasks.add_task(run_bulk_sync)
        
        return {
            "success": True,
            "job_id": job_id,
            "dates_to_sync": len(dates_to_sync),
            "message": f"Bulk sync started for {len(dates_to_sync)} dates. Check job status with job_id."
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format. Use YYYY-MM-DD: {str(e)}")

@api_router.get("/hr/biocloud/sync-job/{job_id}")
async def get_biocloud_sync_job(job_id: str, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get status of a bulk sync job"""
    job = await db.biocloud_sync_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    return job

@api_router.get("/hr/biocloud/sync-history")
async def get_biocloud_sync_history(
    limit: int = 20,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get history of BioCloud sync operations"""
    history = await db.biocloud_sync_log.find(
        {},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {
        "history": history,
        "total": len(history)
    }

async def _sync_single_date(sync_date: str, user: dict) -> dict:
    """Internal helper for syncing a single date (used by bulk sync)"""
    import os as os_module
    os_module.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/pw-browsers"
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
    
    # Similar logic to fetch_biocloud_attendance but simplified for internal use
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        context = await browser.new_context(
            ignore_https_errors=True,
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        
        biocloud_url = os.environ.get('BIOCLOUD_URL', 'https://56.biocloud.me:8085')
        biocloud_user = os.environ.get('BIOCLOUD_USERNAME', 'Admin')
        biocloud_pass = os.environ.get('BIOCLOUD_PASSWORD', '1')
        
        await page.goto(biocloud_url, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(3000)
        
        # Login
        username_input = page.locator('input[type="text"]').first
        password_input = page.locator('input[type="password"]').first
        await username_input.fill(biocloud_user)
        await password_input.fill(biocloud_pass)
        
        login_btn = page.locator('button').first
        await login_btn.click()
        await page.wait_for_timeout(5000)
        
        # Navigate to Daily Attendance
        attendance_menu = page.locator('a:has-text("Attendance")').first
        await attendance_menu.click()
        await page.wait_for_timeout(1500)
        
        daily_att = page.locator('a:has-text("Daily Attendance")').first
        await daily_att.click()
        await page.wait_for_timeout(4000)
        
        # Scrape data (simplified)
        layui_containers = await page.locator('.layui-table-box').all()
        attendance_data = []
        
        if len(layui_containers) >= 2:
            daily_container = layui_containers[1]
            body_elements = await daily_container.locator('.layui-table-body').all()
            
            if body_elements:
                body = body_elements[0]
                rows = await body.locator('tr').all()
                
                for row in rows:
                    cells = await row.locator('td').all()
                    if len(cells) >= 7:
                        try:
                            cell_texts = []
                            for cell in cells[:11]:
                                text = await cell.inner_text()
                                cell_texts.append(text.strip())
                            
                            emp_code = cell_texts[0]
                            punch_date = cell_texts[4]
                            actual_in = cell_texts[5] if len(cell_texts) > 5 else ""
                            actual_out = cell_texts[6] if len(cell_texts) > 6 else ""
                            
                            if emp_code.isdigit() and punch_date and '-' in punch_date:
                                attendance_data.append({
                                    "emp_code": emp_code,
                                    "name": cell_texts[2],
                                    "punch_date": punch_date,
                                    "first_in": actual_in if actual_in else None,
                                    "last_out": actual_out if actual_out else None
                                })
                        except:
                            continue
        
        await browser.close()
        
        # Sync to DB
        synced = 0
        for att in attendance_data:
            employee = await db.hr_employees.find_one(
                {"biocloud_emp_code": att["emp_code"]},
                {"_id": 0}
            )
            
            if employee:
                existing = await db.hr_attendance.find_one({
                    "employee_id": employee["id"],
                    "date": att["punch_date"]
                })
                
                attendance_record = {
                    "employee_id": employee["id"],
                    "employee_code": employee["employee_id"],
                    "employee_name": employee["full_name"],
                    "date": att["punch_date"],
                    "biometric_in": att["first_in"],
                    "biometric_out": att["last_out"],
                    "status": "present" if att["first_in"] else "absent",
                    "source": "biocloud_sync",
                    "synced_at": datetime.now(timezone.utc).isoformat()
                }
                
                if existing:
                    await db.hr_attendance.update_one(
                        {"id": existing["id"]},
                        {"$set": attendance_record}
                    )
                else:
                    attendance_record["id"] = str(uuid.uuid4())
                    await db.hr_attendance.insert_one(attendance_record)
                
                synced += 1
        
        # Log the sync
        await db.biocloud_sync_log.insert_one({
            "id": str(uuid.uuid4()),
            "date": sync_date,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fetched": len(attendance_data),
            "synced": synced,
            "success": True,
            "user_id": user.get("id")
        })
        
        return {"synced": synced, "fetched": len(attendance_data)}

# ==================== HR MODULE - ATTENDANCE REGULARIZATION ====================

@api_router.post("/hr/regularization-requests")
async def create_regularization_request(data: RegularizationRequest, user = Depends(get_current_user)):
    """Create attendance regularization request"""
    employee = await db.hr_employees.find_one(
        {"$or": [{"id": data.employee_id}, {"user_id": user["id"]}]},
        {"_id": 0}
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee record not found")
    
    now = datetime.now(timezone.utc).isoformat()
    request_id = str(uuid.uuid4())
    
    request = {
        "id": request_id,
        "employee_id": employee["id"],
        "employee_code": employee["employee_id"],
        "employee_name": employee["full_name"],
        "department": employee.get("department"),
        "date": data.date,
        "type": data.type.value,
        "original_in": data.original_in,
        "original_out": data.original_out,
        "corrected_in": data.corrected_in,
        "corrected_out": data.corrected_out,
        "reason": data.reason,
        "supporting_document_url": data.supporting_document_url,
        "status": "pending",
        "current_approver_level": "team_lead",
        "approval_history": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.hr_regularization_requests.insert_one(request)
    
    return {"message": "Regularization request submitted", "request_id": request_id}

@api_router.get("/hr/regularization-requests")
async def get_regularization_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    pending_approval: bool = False,
    user = Depends(get_current_user)
):
    """Get regularization requests"""
    query = {}
    
    if user["role"] not in ["super_admin", "admin", "hr", "team_leader"]:
        query["created_by"] = user["id"]
    elif employee_id:
        query["$or"] = [{"employee_id": employee_id}, {"employee_code": employee_id}]
    
    if status:
        query["status"] = status
    
    if pending_approval:
        query["status"] = "pending"
    
    requests = await db.hr_regularization_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return requests

@api_router.put("/hr/regularization-requests/{request_id}/approve")
async def approve_regularization(
    request_id: str,
    action: str,  # approve or reject
    comments: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "team_leader"]))
):
    """Approve or reject regularization request - CEO approval required for final"""
    request = await db.hr_regularization_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request is not pending")
    
    now = datetime.now(timezone.utc).isoformat()
    
    level_progression = ["team_lead", "hr", "ceo"]
    current_level = request.get("current_approver_level", "team_lead")
    
    approval_entry = {
        "level": current_level,
        "action": action,
        "approved_by": user["id"],
        "approved_by_name": user["full_name"],
        "comments": comments,
        "timestamp": now
    }
    
    if action == "reject":
        await db.hr_regularization_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "rejected", "updated_at": now}, "$push": {"approval_history": approval_entry}}
        )
        return {"message": "Request rejected", "status": "rejected"}
    
    # CEO approval (super_admin) is final
    if current_level == "ceo" or user["role"] == "super_admin":
        # Apply the regularization to attendance record
        attendance = await db.hr_attendance.find_one({
            "employee_id": request["employee_id"],
            "date": request["date"]
        })
        
        if attendance:
            update = {"updated_at": now}
            if request.get("corrected_in"):
                update["biometric_in"] = request["corrected_in"]
                update["regularized"] = True
            if request.get("corrected_out"):
                update["biometric_out"] = request["corrected_out"]
                update["regularized"] = True
            if request["type"] == "work_from_home":
                update["status"] = "wfh"
                update["regularized"] = True
            
            await db.hr_attendance.update_one({"id": attendance["id"]}, {"$set": update})
        
        await db.hr_regularization_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "final_approved_by": user["id"],
                "final_approved_at": now,
                "updated_at": now
            }, "$push": {"approval_history": approval_entry}}
        )
        
        # Audit log
        await db.hr_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "entity_type": "regularization",
            "entity_id": request_id,
            "action": "final_approval",
            "user_id": user["id"],
            "user_name": user["full_name"],
            "timestamp": now,
            "changes": {
                "old": {"in": request.get("original_in"), "out": request.get("original_out")},
                "new": {"in": request.get("corrected_in"), "out": request.get("corrected_out")}
            }
        })
        
        return {"message": "Regularization approved and applied", "status": "approved"}
    else:
        # Move to next level
        current_idx = level_progression.index(current_level) if current_level in level_progression else 0
        next_level = level_progression[min(current_idx + 1, len(level_progression) - 1)]
        
        await db.hr_regularization_requests.update_one(
            {"id": request_id},
            {"$set": {"current_approver_level": next_level, "updated_at": now}, "$push": {"approval_history": approval_entry}}
        )
        return {"message": f"Approved at {current_level}. Pending {next_level} approval", "next_level": next_level}

# ==================== HR MODULE - DASHBOARD ====================

@api_router.get("/hr/dashboard")
async def get_hr_dashboard(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get HR dashboard with real-time metrics"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    
    # Workforce Insights
    total_employees = await db.hr_employees.count_documents({"employment_status": {"$in": ["active", "probation"]}})
    
    gender_pipeline = [
        {"$match": {"employment_status": {"$in": ["active", "probation"]}}},
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
    ]
    gender_data = await db.hr_employees.aggregate(gender_pipeline).to_list(10)
    gender_counts = {g["_id"]: g["count"] for g in gender_data if g["_id"]}
    
    dept_pipeline = [
        {"$match": {"employment_status": {"$in": ["active", "probation"]}}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    dept_data = await db.hr_employees.aggregate(dept_pipeline).to_list(20)
    dept_counts = {d["_id"]: d["count"] for d in dept_data if d["_id"]}
    
    # Visa counts
    visa_pipeline = [
        {"$match": {"employment_status": {"$in": ["active", "probation"]}}},
        {"$group": {"_id": "$visa_details.company_sponsor", "count": {"$sum": 1}}}
    ]
    visa_data = await db.hr_employees.aggregate(visa_pipeline).to_list(5)
    company_visa = sum(v["count"] for v in visa_data if v["_id"] == True)
    
    # Document expiry alerts
    expiry_alerts = await get_document_expiry_alerts(90, user)
    
    # Attendance Insights
    present_today = await db.hr_attendance.count_documents({"date": today, "status": "present"})
    absent_today = total_employees - present_today
    late_today = await db.hr_attendance.count_documents({"date": today, "late_minutes": {"$gt": 0}})
    
    # Leave & Regularization
    pending_leaves = await db.hr_leave_requests.count_documents({"status": "pending"})
    pending_regularizations = await db.hr_regularization_requests.count_documents({"status": "pending"})
    
    # Leave balance summary
    leave_pipeline = [
        {"$match": {"employment_status": {"$in": ["active", "probation"]}}},
        {"$group": {
            "_id": None,
            "total_annual": {"$sum": "$annual_leave_balance"},
            "total_sick": {"$sum": "$sick_leave_balance"}
        }}
    ]
    leave_data = await db.hr_employees.aggregate(leave_pipeline).to_list(1)
    
    # Upcoming confirmations (employees in probation)
    probation_employees = await db.hr_employees.find(
        {"employment_status": "probation"},
        {"_id": 0, "employee_id": 1, "full_name": 1, "joining_date": 1, "probation_days": 1}
    ).to_list(50)
    
    upcoming_confirmations = []
    for emp in probation_employees:
        if emp.get("joining_date") and emp.get("probation_days"):
            try:
                join_date = datetime.strptime(emp["joining_date"], "%Y-%m-%d")
                confirm_date = join_date + timedelta(days=emp["probation_days"])
                days_remaining = (confirm_date.date() - now.date()).days
                if 0 <= days_remaining <= 30:
                    upcoming_confirmations.append({
                        "employee_id": emp["employee_id"],
                        "employee_name": emp["full_name"],
                        "confirmation_date": confirm_date.strftime("%Y-%m-%d"),
                        "days_remaining": days_remaining
                    })
            except:
                pass
    
    return {
        "workforce": {
            "total_employees": total_employees,
            "gender_ratio": gender_counts,
            "by_department": dept_counts,
            "company_visa": company_visa,
            "own_visa": total_employees - company_visa,
            "probation": await db.hr_employees.count_documents({"employment_status": "probation"}),
            "active": await db.hr_employees.count_documents({"employment_status": "active"})
        },
        "document_alerts": expiry_alerts["summary"],
        "attendance": {
            "present_today": present_today,
            "absent_today": absent_today,
            "late_today": late_today,
            "on_leave_today": await db.hr_attendance.count_documents({"date": today, "status": "leave"})
        },
        "approvals": {
            "pending_leave_requests": pending_leaves,
            "pending_regularizations": pending_regularizations
        },
        "leave_summary": {
            "total_annual_balance": leave_data[0]["total_annual"] if leave_data else 0,
            "total_sick_balance": leave_data[0]["total_sick"] if leave_data else 0
        },
        "upcoming_confirmations": upcoming_confirmations[:10]
    }

# ==================== HR MODULE - SAMPLE DATA & IMPORT ====================

@api_router.get("/hr/sample-data")
async def get_sample_employee_data(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get sample employee data format for bulk import"""
    return {
        "sample_record": SAMPLE_EMPLOYEE_DATA,
        "field_descriptions": {
            "employee_id": "Unique ID like CLT-001 (required)",
            "full_name": "Full name of employee (required)",
            "gender": "male, female, or other",
            "date_of_birth": "YYYY-MM-DD format",
            "nationality": "Country name",
            "personal_email": "Personal email address",
            "company_email": "Company email (must be unique)",
            "mobile_number": "With country code like +971xxxxxxxxx",
            "department": "One of: Sales, Finance, Customer Service, Mentors/Academics, Operations, Marketing, HR, Quality Control",
            "designation": "Job title",
            "employment_type": "full_time, contract, consultant, intern, part_time",
            "work_location": "UAE, India, or other location",
            "joining_date": "YYYY-MM-DD format (required)",
            "employment_status": "active, probation, suspended, resigned, terminated",
            "employee_category": "A+, A, B, C (for sales team)",
            "visa_details": "Object with visa_type, visa_expiry, emirates_id, etc.",
            "salary_structure": "Object with basic_salary, allowances, commission settings",
            "bank_details": "Object with bank_name, iban, wps_id"
        },
        "import_endpoint": "POST /api/hr/employees/bulk-import",
        "import_format": "JSON array of employee records"
    }

@api_router.post("/hr/employees/bulk-import")
async def bulk_import_employees(
    employees: List[Dict[str, Any]],
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Bulk import employees from JSON array"""
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    errors = []
    
    for idx, emp_data in enumerate(employees):
        try:
            # Validate required fields
            if not emp_data.get("employee_id"):
                errors.append({"row": idx + 1, "error": "Missing employee_id"})
                continue
            if not emp_data.get("full_name"):
                errors.append({"row": idx + 1, "error": "Missing full_name"})
                continue
            if not emp_data.get("joining_date"):
                errors.append({"row": idx + 1, "error": "Missing joining_date"})
                continue
            if not emp_data.get("department"):
                errors.append({"row": idx + 1, "error": "Missing department"})
                continue
            if not emp_data.get("designation"):
                errors.append({"row": idx + 1, "error": "Missing designation"})
                continue
            
            # Check for duplicate
            existing = await db.hr_employees.find_one({"employee_id": emp_data["employee_id"]})
            if existing:
                errors.append({"row": idx + 1, "error": f"Employee ID {emp_data['employee_id']} already exists"})
                continue
            
            # Create employee record
            employee = {
                "id": str(uuid.uuid4()),
                **emp_data,
                "documents": [],
                "annual_leave_balance": emp_data.get("annual_leave_balance", 30),
                "sick_leave_balance": emp_data.get("sick_leave_balance", 15),
                "created_at": now,
                "updated_at": now,
                "created_by": user["id"],
                "created_by_name": user["full_name"],
                "imported": True
            }
            
            await db.hr_employees.insert_one(employee)
            imported += 1
            
        except Exception as e:
            errors.append({"row": idx + 1, "error": str(e)})
    
    return {
        "message": f"Import complete. {imported} employees imported, {len(errors)} errors",
        "imported_count": imported,
        "error_count": len(errors),
        "errors": errors
    }

# ==================== HR MODULE - AUDIT LOGS ====================

@api_router.get("/hr/audit-logs")
async def get_hr_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get HR audit logs"""
    query = {}
    
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if action:
        query["action"] = action
    if start_date and end_date:
        query["timestamp"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.hr_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ==================== HR MODULE - PAYROLL ENGINE ====================

class PayrollRunCreate(BaseModel):
    month: int  # 1-12
    year: int
    department: Optional[str] = None

class PayrollAdjustment(BaseModel):
    deductions: Optional[List[Dict]] = None
    additions: Optional[List[Dict]] = None
    comments: Optional[str] = None

@api_router.post("/hr/payroll/run")
async def run_payroll(
    data: PayrollRunCreate,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Generate payroll for a specific month"""
    now = datetime.now(timezone.utc).isoformat()
    month_str = f"{data.year}-{str(data.month).zfill(2)}"
    
    # Check if payroll batch already exists for this month
    existing_batch = await db.hr_payroll_batches.find_one({"month": month_str, "status": {"$ne": "draft"}})
    if existing_batch:
        raise HTTPException(status_code=400, detail=f"Payroll for {month_str} already processed (status: {existing_batch['status']})")
    
    # Get all active employees
    emp_query = {"employment_status": {"$in": ["active", "probation"]}}
    if data.department:
        emp_query["department"] = data.department
    
    employees = await db.hr_employees.find(emp_query, {"_id": 0}).to_list(500)
    
    if not employees:
        raise HTTPException(status_code=404, detail="No employees found for payroll processing")
    
    # Calculate working days in month
    import calendar
    total_days = calendar.monthrange(data.year, data.month)[1]
    
    payroll_records = []
    
    for emp in employees:
        salary = emp.get("salary_structure", {})
        if not salary:
            continue
        
        # Get attendance data for the month
        start_date = f"{data.year}-{str(data.month).zfill(2)}-01"
        end_date = f"{data.year}-{str(data.month).zfill(2)}-{total_days}"
        
        attendance = await db.hr_attendance.find({
            "employee_id": emp["id"],
            "date": {"$gte": start_date, "$lte": end_date}
        }).to_list(31)
        
        # Calculate attendance metrics
        present_days = len([a for a in attendance if a.get("status") == "present"])
        absent_days = total_days - present_days - len([a for a in attendance if a.get("status") in ["leave", "holiday", "wfh"]])
        total_late_minutes = sum(a.get("late_minutes", 0) for a in attendance)
        
        # Calculate base salary
        basic = salary.get("basic_salary", 0)
        housing = salary.get("housing_allowance", 0)
        transport = salary.get("transport_allowance", 0)
        food = salary.get("food_allowance", 0)
        phone = salary.get("phone_allowance", 0)
        other = salary.get("other_allowances", 0)
        fixed_incentive = salary.get("fixed_incentive", 0)
        
        gross_salary = basic + housing + transport + food + phone + other + fixed_incentive
        daily_rate = gross_salary / 30  # Fixed 30-day calculation as per requirement
        
        # Calculate deductions based on attendance
        deductions = []
        
        # Half-day deduction for late arrivals (> 30 mins late = half day)
        late_days = len([a for a in attendance if a.get("late_minutes", 0) > 30])
        if late_days > 0:
            late_deduction = round((late_days * 0.5) * daily_rate, 2)  # Half day per late day
            deductions.append({
                "type": "late",
                "description": f"Late arrivals ({late_days} days > 30 mins = {late_days * 0.5} half days)",
                "amount": late_deduction
            })
        
        # Full day absence deduction
        if absent_days > 0:
            absence_deduction = round(absent_days * daily_rate, 2)
            deductions.append({
                "type": "absence",
                "description": f"Absent days ({absent_days} days)",
                "amount": absence_deduction
            })
        
        total_deductions = sum(d["amount"] for d in deductions)
        
        # Get commissions for this month
        commissions = await db.commissions.find({
            "user_id": emp.get("user_id"),
            "month": month_str,
            "status": {"$in": ["pending", "approved"]}
        }).to_list(100)
        
        additions = []
        commission_amount = sum(c.get("commission_amount", 0) for c in commissions)
        if commission_amount > 0:
            additions.append({
                "type": "commission",
                "description": f"Sales commission for {month_str}",
                "amount": commission_amount
            })
        
        total_additions = sum(a["amount"] for a in additions)
        net_salary = gross_salary - total_deductions + total_additions
        
        payroll_record = {
            "id": str(uuid.uuid4()),
            "employee_id": emp["id"],
            "employee_code": emp["employee_id"],
            "employee_name": emp["full_name"],
            "department": emp.get("department"),
            "month": month_str,
            "year": data.year,
            "month_num": data.month,
            "basic_salary": basic,
            "housing_allowance": housing,
            "transport_allowance": transport,
            "food_allowance": food,
            "phone_allowance": phone,
            "other_allowances": other,
            "fixed_incentive": fixed_incentive,
            "gross_salary": round(gross_salary, 2),
            "deductions": deductions,
            "total_deductions": round(total_deductions, 2),
            "additions": additions,
            "total_additions": round(total_additions, 2),
            "net_salary": round(net_salary, 2),
            "days_worked": present_days,
            "absent_days": absent_days,
            "late_minutes": total_late_minutes,
            "bank_details": emp.get("bank_details", {}),
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "created_by": user["id"]
        }
        
        payroll_records.append(payroll_record)
    
    # Delete existing draft payroll for this month
    await db.hr_payroll.delete_many({"month": month_str, "status": "draft"})
    
    # Insert new payroll records
    if payroll_records:
        await db.hr_payroll.insert_many(payroll_records)
    
    # Create payroll batch
    batch = {
        "id": str(uuid.uuid4()),
        "month": month_str,
        "year": data.year,
        "month_num": data.month,
        "department": data.department,
        "employee_count": len(payroll_records),
        "total_gross": sum(p["gross_salary"] for p in payroll_records),
        "total_deductions": sum(p["total_deductions"] for p in payroll_records),
        "total_additions": sum(p["total_additions"] for p in payroll_records),
        "total_net": sum(p["net_salary"] for p in payroll_records),
        "status": "draft",
        "created_at": now,
        "created_by": user["id"],
        "created_by_name": user["full_name"]
    }
    
    await db.hr_payroll_batches.insert_one(batch)
    
    return {
        "message": f"Payroll generated for {len(payroll_records)} employees",
        "batch_id": batch["id"],
        "month": month_str,
        "total_gross": batch["total_gross"],
        "total_net": batch["total_net"]
    }

@api_router.get("/hr/payroll")
async def get_payroll(
    month: Optional[str] = None,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Get payroll records"""
    query = {}
    if month:
        query["month"] = month
    if employee_id:
        query["$or"] = [{"employee_id": employee_id}, {"employee_code": employee_id}]
    if status:
        query["status"] = status
    
    records = await db.hr_payroll.find(query, {"_id": 0}).sort([("month", -1), ("employee_code", 1)]).to_list(500)
    return records

@api_router.get("/hr/payroll/batches")
async def get_payroll_batches(
    year: Optional[int] = None,
    status: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Get payroll batches"""
    query = {}
    if year:
        query["year"] = year
    if status:
        query["status"] = status
    
    batches = await db.hr_payroll_batches.find(query, {"_id": 0}).sort("month", -1).to_list(100)
    return batches

@api_router.put("/hr/payroll/{payroll_id}/adjust")
async def adjust_payroll(
    payroll_id: str,
    data: PayrollAdjustment,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Adjust individual payroll record"""
    payroll = await db.hr_payroll.find_one({"id": payroll_id})
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    if payroll["status"] not in ["draft", "calculated"]:
        raise HTTPException(status_code=400, detail="Cannot adjust approved/paid payroll")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update = {"updated_at": now}
    
    if data.deductions is not None:
        update["deductions"] = data.deductions
        update["total_deductions"] = sum(d.get("amount", 0) for d in data.deductions)
    
    if data.additions is not None:
        update["additions"] = data.additions
        update["total_additions"] = sum(a.get("amount", 0) for a in data.additions)
    
    if data.comments:
        update["adjustment_comments"] = data.comments
    
    # Recalculate net salary
    current_deductions = update.get("total_deductions", payroll["total_deductions"])
    current_additions = update.get("total_additions", payroll["total_additions"])
    update["net_salary"] = round(payroll["gross_salary"] - current_deductions + current_additions, 2)
    
    await db.hr_payroll.update_one({"id": payroll_id}, {"$set": update})
    
    # Log audit
    await db.hr_audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "entity_type": "payroll",
        "entity_id": payroll_id,
        "action": "adjustment",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now,
        "changes": {"adjustments": data.model_dump()}
    })
    
    return {"message": "Payroll adjusted", "new_net_salary": update["net_salary"]}

@api_router.put("/hr/payroll/batch/{batch_id}/approve")
async def approve_payroll_batch(
    batch_id: str,
    approval_level: str,  # hr, finance
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Approve payroll batch"""
    batch = await db.hr_payroll_batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Payroll batch not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if approval_level == "hr" and batch["status"] in ["draft", "calculated"]:
        new_status = "hr_approved"
    elif approval_level == "finance" and batch["status"] == "hr_approved":
        new_status = "finance_approved"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid approval sequence. Current status: {batch['status']}")
    
    await db.hr_payroll_batches.update_one(
        {"id": batch_id},
        {"$set": {
            "status": new_status,
            f"{approval_level}_approved_by": user["id"],
            f"{approval_level}_approved_at": now,
            "updated_at": now
        }}
    )
    
    # Update all payroll records in batch
    await db.hr_payroll.update_many(
        {"month": batch["month"], "status": {"$in": ["draft", "calculated", "hr_approved"]}},
        {"$set": {"status": new_status, "updated_at": now}}
    )
    
    return {"message": f"Payroll batch {new_status}", "batch_id": batch_id}

@api_router.put("/hr/payroll/batch/{batch_id}/pay")
async def mark_payroll_paid(
    batch_id: str,
    payment_reference: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "finance"]))
):
    """Mark payroll as paid"""
    batch = await db.hr_payroll_batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Payroll batch not found")
    
    if batch["status"] != "finance_approved":
        raise HTTPException(status_code=400, detail="Payroll must be finance approved before payment")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.hr_payroll_batches.update_one(
        {"id": batch_id},
        {"$set": {
            "status": "paid",
            "paid_at": now,
            "paid_by": user["id"],
            "payment_reference": payment_reference,
            "updated_at": now
        }}
    )
    
    await db.hr_payroll.update_many(
        {"month": batch["month"]},
        {"$set": {"status": "paid", "paid_at": now, "updated_at": now}}
    )
    
    return {"message": "Payroll marked as paid", "batch_id": batch_id}

# ==================== HR MODULE - ASSET MANAGEMENT ====================

@api_router.get("/hr/assets")
async def get_assets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Get all assets"""
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to_id"] = assigned_to
    
    assets = await db.hr_assets.find(query, {"_id": 0}).sort("asset_code", 1).to_list(500)
    return assets

@api_router.post("/hr/assets")
async def create_asset(
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Create a new asset"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Check for duplicate asset code
    if data.get("asset_code"):
        existing = await db.hr_assets.find_one({"asset_code": data["asset_code"]})
        if existing:
            raise HTTPException(status_code=400, detail="Asset code already exists")
    else:
        # Auto-generate asset code
        last_asset = await db.hr_assets.find_one(sort=[("asset_code", -1)])
        if last_asset and last_asset.get("asset_code", "").startswith("AST-"):
            try:
                last_num = int(last_asset["asset_code"].split("-")[1])
                data["asset_code"] = f"AST-{str(last_num + 1).zfill(4)}"
            except:
                data["asset_code"] = "AST-0001"
        else:
            data["asset_code"] = "AST-0001"
    
    asset = {
        "id": str(uuid.uuid4()),
        **data,
        "status": "available",
        "assigned_to_id": None,
        "assigned_to_name": None,
        "assignment_history": [],
        "maintenance_history": [],
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.hr_assets.insert_one(asset)
    
    return {"message": "Asset created", "asset_id": asset["id"], "asset_code": asset["asset_code"]}

@api_router.put("/hr/assets/{asset_id}")
async def update_asset(
    asset_id: str,
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Update asset details"""
    asset = await db.hr_assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update = {k: v for k, v in data.items() if k not in ["id", "created_at", "asset_code"]}
    update["updated_at"] = now
    
    await db.hr_assets.update_one({"id": asset_id}, {"$set": update})
    
    return {"message": "Asset updated"}

@api_router.post("/hr/assets/{asset_id}/assign")
async def assign_asset(
    asset_id: str,
    employee_id: str,
    notes: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Assign asset to employee"""
    asset = await db.hr_assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.get("status") != "available":
        raise HTTPException(status_code=400, detail=f"Asset is not available. Current status: {asset.get('status')}")
    
    employee = await db.hr_employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    assignment = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "employee_name": employee["full_name"],
        "employee_code": employee["employee_id"],
        "assigned_at": now,
        "assigned_by": user["id"],
        "assigned_by_name": user["full_name"],
        "notes": notes,
        "returned_at": None
    }
    
    await db.hr_assets.update_one(
        {"id": asset_id},
        {
            "$set": {
                "status": "assigned",
                "assigned_to_id": employee_id,
                "assigned_to_name": employee["full_name"],
                "assigned_to_code": employee["employee_id"],
                "current_assignment_id": assignment["id"],
                "updated_at": now
            },
            "$push": {"assignment_history": assignment}
        }
    )
    
    # Create asset assignment record
    await db.hr_asset_assignments.insert_one({
        **assignment,
        "asset_id": asset_id,
        "asset_code": asset["asset_code"],
        "asset_name": asset["asset_name"],
        "category": asset.get("category")
    })
    
    return {"message": f"Asset assigned to {employee['full_name']}", "assignment_id": assignment["id"]}

@api_router.post("/hr/assets/{asset_id}/return")
async def return_asset(
    asset_id: str,
    condition: str = "good",
    notes: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Return assigned asset"""
    asset = await db.hr_assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.get("status") != "assigned":
        raise HTTPException(status_code=400, detail="Asset is not currently assigned")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update current assignment in history
    await db.hr_assets.update_one(
        {"id": asset_id, "assignment_history.id": asset.get("current_assignment_id")},
        {"$set": {
            "assignment_history.$.returned_at": now,
            "assignment_history.$.return_condition": condition,
            "assignment_history.$.return_notes": notes,
            "assignment_history.$.returned_by": user["id"]
        }}
    )
    
    # Update asset status
    await db.hr_assets.update_one(
        {"id": asset_id},
        {"$set": {
            "status": "available",
            "assigned_to_id": None,
            "assigned_to_name": None,
            "assigned_to_code": None,
            "current_assignment_id": None,
            "condition": condition,
            "updated_at": now
        }}
    )
    
    # Update assignment record
    await db.hr_asset_assignments.update_one(
        {"asset_id": asset_id, "returned_at": None},
        {"$set": {
            "returned_at": now,
            "return_condition": condition,
            "return_notes": notes
        }}
    )
    
    return {"message": "Asset returned successfully"}

@api_router.get("/hr/assets/requests")
async def get_asset_requests(
    status: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get asset requests"""
    query = {}
    
    if user["role"] not in ["super_admin", "admin", "hr", "operations"]:
        query["requested_by"] = user["id"]
    
    if status:
        query["status"] = status
    
    requests = await db.hr_asset_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return requests

@api_router.post("/hr/assets/requests")
async def create_asset_request(
    data: Dict[str, Any],
    user = Depends(get_current_user)
):
    """Create asset request"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Get employee record
    employee = await db.hr_employees.find_one(
        {"$or": [{"user_id": user["id"]}, {"company_email": user["email"]}]},
        {"_id": 0}
    )
    
    request = {
        "id": str(uuid.uuid4()),
        "employee_id": employee["id"] if employee else None,
        "employee_name": employee["full_name"] if employee else user["full_name"],
        "employee_code": employee["employee_id"] if employee else None,
        "department": employee.get("department") if employee else user.get("department"),
        "asset_category": data.get("asset_category"),
        "asset_id": data.get("asset_id"),  # If requesting specific asset
        "reason": data.get("reason"),
        "expected_return_date": data.get("expected_return_date"),
        "status": "pending",
        "requested_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.hr_asset_requests.insert_one(request)
    
    return {"message": "Asset request submitted", "request_id": request["id"]}

@api_router.put("/hr/assets/requests/{request_id}/approve")
async def approve_asset_request(
    request_id: str,
    action: str,  # approve or reject
    asset_id: Optional[str] = None,  # Asset to assign if approved
    comments: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))
):
    """Approve or reject asset request"""
    request = await db.hr_asset_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if action == "reject":
        await db.hr_asset_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "rejected",
                "rejected_by": user["id"],
                "rejected_at": now,
                "rejection_reason": comments,
                "updated_at": now
            }}
        )
        return {"message": "Request rejected"}
    
    if action == "approve":
        if asset_id:
            # Assign specific asset
            asset = await db.hr_assets.find_one({"id": asset_id})
            if not asset or asset.get("status") != "available":
                raise HTTPException(status_code=400, detail="Asset not available")
            
            # Auto-assign asset
            employee = await db.hr_employees.find_one({"id": request["employee_id"]})
            if employee:
                assignment = {
                    "id": str(uuid.uuid4()),
                    "employee_id": employee["id"],
                    "employee_name": employee["full_name"],
                    "employee_code": employee["employee_id"],
                    "assigned_at": now,
                    "assigned_by": user["id"],
                    "assigned_by_name": user["full_name"],
                    "notes": f"Auto-assigned from request {request_id}",
                    "returned_at": None
                }
                
                await db.hr_assets.update_one(
                    {"id": asset_id},
                    {
                        "$set": {
                            "status": "assigned",
                            "assigned_to_id": employee["id"],
                            "assigned_to_name": employee["full_name"],
                            "current_assignment_id": assignment["id"],
                            "updated_at": now
                        },
                        "$push": {"assignment_history": assignment}
                    }
                )
        
        await db.hr_asset_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "approved",
                "approved_by": user["id"],
                "approved_at": now,
                "assigned_asset_id": asset_id,
                "comments": comments,
                "updated_at": now
            }}
        )
        return {"message": "Request approved", "assigned_asset_id": asset_id}
    
    raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/hr/assets/dashboard")
async def get_asset_dashboard(user = Depends(require_roles(["super_admin", "admin", "hr", "operations"]))):
    """Get asset dashboard statistics"""
    total = await db.hr_assets.count_documents({})
    available = await db.hr_assets.count_documents({"status": "available"})
    assigned = await db.hr_assets.count_documents({"status": "assigned"})
    maintenance = await db.hr_assets.count_documents({"status": "under_maintenance"})
    
    # By category
    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}, "value": {"$sum": "$purchase_price"}}}
    ]
    categories = await db.hr_assets.aggregate(category_pipeline).to_list(20)
    
    # Pending requests
    pending_requests = await db.hr_asset_requests.count_documents({"status": "pending"})
    
    # Warranty expiring soon
    from datetime import datetime, timedelta
    thirty_days = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    warranty_expiring = await db.hr_assets.count_documents({
        "warranty_expiry": {"$gte": today, "$lte": thirty_days}
    })
    
    return {
        "summary": {
            "total": total,
            "available": available,
            "assigned": assigned,
            "under_maintenance": maintenance
        },
        "by_category": {c["_id"]: {"count": c["count"], "value": c.get("value", 0)} for c in categories if c["_id"]},
        "pending_requests": pending_requests,
        "warranty_expiring": warranty_expiring
    }

# ==================== HR MODULE - PERFORMANCE & KPIs ====================

@api_router.get("/hr/kpis")
async def get_kpis(
    category: Optional[str] = None,
    department: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get KPI definitions"""
    query = {}
    if category:
        query["category"] = category
    if department:
        query["department"] = department
    
    kpis = await db.hr_kpis.find(query, {"_id": 0}).to_list(100)
    return kpis

@api_router.post("/hr/kpis")
async def create_kpi(
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Create KPI definition"""
    now = datetime.now(timezone.utc).isoformat()
    
    kpi = {
        "id": str(uuid.uuid4()),
        **data,
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.hr_kpis.insert_one(kpi)
    return {"message": "KPI created", "kpi_id": kpi["id"]}

@api_router.put("/hr/kpis/{kpi_id}")
async def update_kpi(
    kpi_id: str,
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Update KPI definition"""
    kpi = await db.hr_kpis.find_one({"id": kpi_id})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update = {k: v for k, v in data.items() if k not in ["id", "created_at"]}
    update["updated_at"] = now
    
    await db.hr_kpis.update_one({"id": kpi_id}, {"$set": update})
    return {"message": "KPI updated"}

@api_router.delete("/hr/kpis/{kpi_id}")
async def delete_kpi(
    kpi_id: str,
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Delete KPI"""
    result = await db.hr_kpis.delete_one({"id": kpi_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="KPI not found")
    return {"message": "KPI deleted"}

@api_router.post("/hr/kpi-scores")
async def record_kpi_score(
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr", "team_leader"]))
):
    """Record KPI score"""
    kpi = await db.hr_kpis.find_one({"id": data.get("kpi_id")})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    actual = data.get("actual_value", 0)
    target = kpi.get("target_value", 1)
    achievement = min((actual / target) * 100, 150) if target > 0 else 0
    
    score_record = {
        "id": str(uuid.uuid4()),
        "kpi_id": data["kpi_id"],
        "kpi_name": kpi["name"],
        "employee_id": data.get("employee_id"),
        "department": data.get("department") or kpi.get("department"),
        "period_month": data.get("period_month"),
        "period_year": data.get("period_year"),
        "target_value": target,
        "actual_value": actual,
        "achievement_percentage": round(achievement, 2),
        "weighted_score": round(achievement * kpi.get("weight", 1), 2),
        "comments": data.get("comments"),
        "created_at": now,
        "recorded_by": user["id"]
    }
    
    await db.hr_kpi_scores.insert_one(score_record)
    return {"message": "KPI score recorded", "achievement": achievement}

@api_router.get("/hr/kpi-scores")
async def get_kpi_scores(
    employee_id: Optional[str] = None,
    department: Optional[str] = None,
    period_month: Optional[int] = None,
    period_year: Optional[int] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "team_leader"]))
):
    """Get KPI scores"""
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if department:
        query["department"] = department
    if period_month:
        query["period_month"] = period_month
    if period_year:
        query["period_year"] = period_year
    
    scores = await db.hr_kpi_scores.find(query, {"_id": 0}).sort([("period_year", -1), ("period_month", -1)]).to_list(500)
    return scores

@api_router.get("/hr/performance-reviews")
async def get_performance_reviews(
    employee_id: Optional[str] = None,
    review_period: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get performance reviews"""
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if review_period:
        query["review_period"] = review_period
    
    reviews = await db.hr_performance_reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return reviews

@api_router.post("/hr/performance-reviews")
async def create_performance_review(
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr", "team_leader"]))
):
    """Create performance review"""
    employee = await db.hr_employees.find_one({"id": data.get("employee_id")})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    review = {
        "id": str(uuid.uuid4()),
        "employee_id": data["employee_id"],
        "employee_name": employee["full_name"],
        "employee_code": employee["employee_id"],
        "department": employee.get("department"),
        "review_period": data.get("review_period"),
        "reviewer_id": data.get("reviewer_id") or user["id"],
        "reviewer_name": data.get("reviewer_name") or user["full_name"],
        "overall_rating": data.get("overall_rating"),
        "strengths": data.get("strengths"),
        "areas_for_improvement": data.get("areas_for_improvement"),
        "goals_next_period": data.get("goals_next_period"),
        "kpi_scores": data.get("kpi_scores", []),
        "comments": data.get("comments"),
        "status": "draft",
        "created_at": now,
        "updated_at": now,
        "created_by": user["id"]
    }
    
    await db.hr_performance_reviews.insert_one(review)
    return {"message": "Performance review created", "review_id": review["id"]}

@api_router.put("/hr/performance-reviews/{review_id}")
async def update_performance_review(
    review_id: str,
    data: Dict[str, Any],
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Update performance review"""
    review = await db.hr_performance_reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update = {k: v for k, v in data.items() if k not in ["id", "created_at", "employee_id"]}
    update["updated_at"] = now
    
    await db.hr_performance_reviews.update_one({"id": review_id}, {"$set": update})
    return {"message": "Performance review updated"}

# ==================== HR MODULE - ANALYTICS & REPORTS ====================

@api_router.get("/hr/analytics/overview")
async def get_hr_analytics_overview(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get HR analytics overview"""
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    current_year = now.year
    
    # Headcount trends (last 12 months)
    headcount_data = []
    for i in range(12):
        month_date = now - timedelta(days=30*i)
        month_str = month_date.strftime("%Y-%m")
        # Count employees who were active at that time (simplified)
        count = await db.hr_employees.count_documents({
            "employment_status": {"$in": ["active", "probation"]},
            "joining_date": {"$lte": f"{month_str}-28"}
        })
        headcount_data.append({"month": month_str, "count": count})
    
    # Attrition data
    resigned = await db.hr_employees.count_documents({
        "employment_status": {"$in": ["resigned", "terminated"]},
        "updated_at": {"$gte": f"{current_year}-01-01"}
    })
    total_active = await db.hr_employees.count_documents({"employment_status": {"$in": ["active", "probation"]}})
    attrition_rate = round((resigned / max(total_active + resigned, 1)) * 100, 2)
    
    # Tenure distribution
    tenure_data = {"0-1 year": 0, "1-2 years": 0, "2-5 years": 0, "5+ years": 0}
    employees = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"joining_date": 1}
    ).to_list(1000)
    
    for emp in employees:
        if emp.get("joining_date"):
            try:
                join = datetime.strptime(emp["joining_date"], "%Y-%m-%d")
                years = (now - join).days / 365
                if years < 1:
                    tenure_data["0-1 year"] += 1
                elif years < 2:
                    tenure_data["1-2 years"] += 1
                elif years < 5:
                    tenure_data["2-5 years"] += 1
                else:
                    tenure_data["5+ years"] += 1
            except:
                pass
    
    # Age distribution
    age_data = {"18-25": 0, "26-35": 0, "36-45": 0, "46+": 0}
    employees_dob = await db.hr_employees.find(
        {"employment_status": {"$in": ["active", "probation"]}},
        {"date_of_birth": 1}
    ).to_list(1000)
    
    for emp in employees_dob:
        if emp.get("date_of_birth"):
            try:
                dob = datetime.strptime(emp["date_of_birth"], "%Y-%m-%d")
                age = (now - dob).days / 365
                if age < 26:
                    age_data["18-25"] += 1
                elif age < 36:
                    age_data["26-35"] += 1
                elif age < 46:
                    age_data["36-45"] += 1
                else:
                    age_data["46+"] += 1
            except:
                pass
    
    # Department costs (from payroll)
    dept_cost_pipeline = [
        {"$match": {"month": current_month}},
        {"$group": {"_id": "$department", "total_cost": {"$sum": "$net_salary"}}}
    ]
    dept_costs = await db.hr_payroll.aggregate(dept_cost_pipeline).to_list(20)
    
    return {
        "headcount_trends": list(reversed(headcount_data)),
        "attrition": {
            "resigned_ytd": resigned,
            "attrition_rate": attrition_rate
        },
        "tenure_distribution": tenure_data,
        "age_distribution": age_data,
        "department_costs": {d["_id"]: d["total_cost"] for d in dept_costs if d["_id"]}
    }

@api_router.get("/hr/analytics/attendance")
async def get_attendance_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get attendance analytics"""
    now = datetime.now(timezone.utc)
    
    if not start_date:
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = now.strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date, "$lte": end_date}}
    if department:
        query["department"] = department
    
    records = await db.hr_attendance.find(query).to_list(5000)
    
    # Calculate metrics
    total_records = len(records)
    present = len([r for r in records if r.get("status") == "present"])
    absent = len([r for r in records if r.get("status") == "absent"])
    late = len([r for r in records if r.get("late_minutes", 0) > 0])
    wfh = len([r for r in records if r.get("status") == "wfh"])
    
    total_late_minutes = sum(r.get("late_minutes", 0) for r in records)
    avg_work_hours = sum(r.get("total_work_hours", 0) for r in records) / max(present, 1)
    
    # By day of week
    day_stats = {i: {"present": 0, "absent": 0, "late": 0} for i in range(7)}
    for r in records:
        try:
            date = datetime.strptime(r["date"], "%Y-%m-%d")
            day = date.weekday()
            if r.get("status") == "present":
                day_stats[day]["present"] += 1
            elif r.get("status") == "absent":
                day_stats[day]["absent"] += 1
            if r.get("late_minutes", 0) > 0:
                day_stats[day]["late"] += 1
        except:
            pass
    
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    by_day = {day_names[i]: day_stats[i] for i in range(7)}
    
    return {
        "period": {"start": start_date, "end": end_date},
        "summary": {
            "total_records": total_records,
            "present": present,
            "absent": absent,
            "late": late,
            "wfh": wfh,
            "attendance_rate": round((present / max(total_records, 1)) * 100, 2),
            "punctuality_rate": round(((present - late) / max(present, 1)) * 100, 2)
        },
        "late_minutes": {
            "total": total_late_minutes,
            "average_per_employee": round(total_late_minutes / max(present, 1), 2)
        },
        "avg_work_hours": round(avg_work_hours, 2),
        "by_day_of_week": by_day
    }

@api_router.get("/hr/analytics/leave")
async def get_leave_analytics(
    year: Optional[int] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """Get leave analytics"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    start = f"{year}-01-01"
    end = f"{year}-12-31"
    
    # Leave requests by type
    type_pipeline = [
        {"$match": {"created_at": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": "$leave_type", "count": {"$sum": 1}, "total_days": {"$sum": "$leave_days"}}}
    ]
    by_type = await db.hr_leave_requests.aggregate(type_pipeline).to_list(20)
    
    # Leave by status
    status_pipeline = [
        {"$match": {"created_at": {"$gte": start, "$lte": end}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    by_status = await db.hr_leave_requests.aggregate(status_pipeline).to_list(10)
    
    # Leave by department
    dept_pipeline = [
        {"$match": {"created_at": {"$gte": start, "$lte": end}, "status": "approved"}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}, "total_days": {"$sum": "$leave_days"}}}
    ]
    by_dept = await db.hr_leave_requests.aggregate(dept_pipeline).to_list(20)
    
    # Monthly trend
    monthly_pipeline = [
        {"$match": {"created_at": {"$gte": start, "$lte": end}}},
        {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}, "total_days": {"$sum": "$leave_days"}}}
    ]
    monthly = await db.hr_leave_requests.aggregate(monthly_pipeline).to_list(12)
    
    return {
        "year": year,
        "by_type": {t["_id"]: {"count": t["count"], "total_days": t.get("total_days", 0)} for t in by_type if t["_id"]},
        "by_status": {s["_id"]: s["count"] for s in by_status if s["_id"]},
        "by_department": {d["_id"]: {"count": d["count"], "total_days": d.get("total_days", 0)} for d in by_dept if d["_id"]},
        "monthly_trend": sorted([{"month": m["_id"], "count": m["count"]} for m in monthly if m["_id"]], key=lambda x: x["month"])
    }

@api_router.get("/hr/analytics/payroll")
async def get_payroll_analytics(
    year: Optional[int] = None,
    user = Depends(require_roles(["super_admin", "admin", "hr", "finance"]))
):
    """Get payroll analytics"""
    if not year:
        year = datetime.now(timezone.utc).year
    
    # Monthly payroll totals
    monthly_pipeline = [
        {"$match": {"year": year}},
        {"$group": {
            "_id": "$month",
            "total_gross": {"$sum": "$gross_salary"},
            "total_deductions": {"$sum": "$total_deductions"},
            "total_additions": {"$sum": "$total_additions"},
            "total_net": {"$sum": "$net_salary"},
            "employee_count": {"$sum": 1}
        }}
    ]
    monthly = await db.hr_payroll.aggregate(monthly_pipeline).to_list(12)
    
    # By department
    dept_pipeline = [
        {"$match": {"year": year}},
        {"$group": {
            "_id": "$department",
            "total_net": {"$sum": "$net_salary"},
            "avg_salary": {"$avg": "$net_salary"},
            "employee_count": {"$sum": 1}
        }}
    ]
    by_dept = await db.hr_payroll.aggregate(dept_pipeline).to_list(20)
    
    # Deduction breakdown
    # This is an approximation since deductions are stored as array
    total_late = 0
    total_absence = 0
    payroll_records = await db.hr_payroll.find({"year": year}).to_list(1000)
    for p in payroll_records:
        for d in p.get("deductions", []):
            if d.get("type") == "late":
                total_late += d.get("amount", 0)
            elif d.get("type") == "absence":
                total_absence += d.get("amount", 0)
    
    return {
        "year": year,
        "monthly_trend": sorted([{
            "month": m["_id"],
            "total_gross": m["total_gross"],
            "total_net": m["total_net"],
            "employee_count": m["employee_count"]
        } for m in monthly if m["_id"]], key=lambda x: x["month"]),
        "by_department": {d["_id"]: {
            "total_net": round(d["total_net"], 2),
            "avg_salary": round(d["avg_salary"], 2),
            "employee_count": d["employee_count"]
        } for d in by_dept if d["_id"]},
        "deduction_breakdown": {
            "late_penalties": round(total_late, 2),
            "absence_deductions": round(total_absence, 2)
        }
    }

# ==================== ESS (EMPLOYEE SELF-SERVICE) MODULE ====================

# Helper function to get employee's manager
async def get_employee_manager(employee_id: str):
    """Get the manager for an employee based on team_leader_id or department head"""
    employee = await db.hr_employees.find_one({"employee_id": employee_id})
    if not employee:
        return None
    
    # Check if linked user has a team leader
    if employee.get("user_id"):
        user = await db.users.find_one({"id": employee["user_id"]})
        if user and user.get("team_leader_id"):
            manager = await db.users.find_one({"id": user["team_leader_id"]})
            if manager:
                return {"id": manager["id"], "name": manager["full_name"], "role": manager["role"]}
    
    # Fallback: Find department head
    if employee.get("department"):
        dept = await db.departments.find_one({"name": employee["department"]})
        if dept and dept.get("head_id"):
            head = await db.users.find_one({"id": dept["head_id"]})
            if head:
                return {"id": head["id"], "name": head["full_name"], "role": head["role"]}
    
    return None

# Helper to calculate leave days
def calculate_leave_days(start_date: str, end_date: str, half_day_type: str = None) -> float:
    """Calculate number of leave days including weekends check"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    if half_day_type:
        return 0.5
    
    total_days = 0
    current = start
    while current <= end:
        # Skip weekends (Saturday=5, Sunday=6)
        if current.weekday() < 5:
            total_days += 1
        current += timedelta(days=1)
    
    return float(total_days)

@api_router.get("/ess/my-profile")
async def get_my_ess_profile(user = Depends(get_current_user)):
    """Get current user's ESS profile including employee details"""
    # Find linked employee record
    employee = await db.hr_employees.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not employee:
        # Try to find by email match
        employee = await db.hr_employees.find_one({"email": user["email"]}, {"_id": 0})
    
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "department": user.get("department"),
        },
        "employee": employee,
        "has_employee_record": employee is not None
    }

@api_router.get("/ess/leave-balance")
async def get_my_leave_balance(user = Depends(get_current_user)):
    """Get current user's leave balance"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        raise HTTPException(status_code=404, detail="No employee record found for your account")
    
    employment_type = employee.get("employment_type", "full_time")
    is_full_time = employment_type == "full_time"
    gender = employee.get("gender", "").lower()  # male/female
    
    # Get current month start for tracking half_day/unpaid usage
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
    year_start = datetime(now.year, 1, 1).strftime("%Y-%m-%d")
    
    # Get leave balances from employee record or defaults
    balances = []
    
    for leave_type, config in LEAVE_TYPES.items():
        # Skip full-time only leaves if not full-time
        if config["full_time_only"] and not is_full_time:
            continue
        
        # Skip maternity leave for males
        if leave_type == "maternity_leave" and gender == "male":
            continue
        
        total_days = config["days_per_year"]
        is_unlimited = total_days == -1
        if is_unlimited:
            total_days = None  # Will display as unlimited
        
        # Get used days from approved leave requests this year
        used_query = {
            "employee_id": employee["employee_id"],
            "leave_type": leave_type,
            "status": "approved",
            "start_date": {"$gte": year_start}
        }
        used_leaves = await db.ess_leave_requests.find(used_query).to_list(100)
        used_days = sum(l.get("total_days", 0) for l in used_leaves)
        
        # For half_day and unpaid_leave, get THIS MONTH's usage
        taken_this_month = 0
        if leave_type in ["half_day", "unpaid_leave"]:
            month_query = {
                "employee_id": employee["employee_id"],
                "leave_type": leave_type,
                "status": "approved",
                "start_date": {"$gte": month_start}
            }
            month_leaves = await db.ess_leave_requests.find(month_query).to_list(100)
            taken_this_month = sum(l.get("total_days", 0) for l in month_leaves)
        
        # Calculate remaining for limited leave types
        remaining = None
        if not is_unlimited:
            # Get pending days
            pending_query = {
                "employee_id": employee["employee_id"],
                "leave_type": leave_type,
                "status": {"$in": ["pending_manager", "pending_hr", "pending_ceo"]},
                "start_date": {"$gte": year_start}
            }
            pending_leaves = await db.ess_leave_requests.find(pending_query).to_list(100)
            pending_days = sum(l.get("total_days", 0) for l in pending_leaves)
            remaining = max(0, total_days - used_days - pending_days)
        
        balance_entry = {
            "leave_type": leave_type,
            "leave_type_name": config["name"],
            "is_unlimited": is_unlimited,
            "total_days": total_days,
            "used_days": used_days,
            "remaining_days": remaining,
            "requires_document": config["requires_document"]
        }
        
        # Add taken_this_month only for unlimited types
        if is_unlimited:
            balance_entry["taken_this_month"] = taken_this_month
        
        balances.append(balance_entry)
    
    return balances

@api_router.post("/ess/leave-requests")
async def create_leave_request(data: LeaveRequestCreate, user = Depends(get_current_user)):
    """Submit a new leave request"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        raise HTTPException(status_code=404, detail="No employee record found for your account")
    
    # Validate leave type
    if data.leave_type not in LEAVE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid leave type: {data.leave_type}")
    
    leave_config = LEAVE_TYPES[data.leave_type]
    
    # Check if requires document
    if leave_config["requires_document"] and not data.document_url:
        raise HTTPException(status_code=400, detail=f"{leave_config['name']} requires a supporting document")
    
    # Calculate total days
    total_days = calculate_leave_days(data.start_date, data.end_date, data.half_day_type)
    
    # Get manager for first approval
    manager = await get_employee_manager(employee["employee_id"])
    
    now = datetime.now(timezone.utc).isoformat()
    request_id = str(uuid.uuid4())
    
    leave_request = {
        "id": request_id,
        "employee_id": employee["employee_id"],
        "employee_name": employee["full_name"],
        "user_id": user["id"],
        "leave_type": data.leave_type,
        "leave_type_name": leave_config["name"],
        "start_date": data.start_date,
        "end_date": data.end_date,
        "total_days": total_days,
        "reason": data.reason,
        "half_day_type": data.half_day_type,
        "document_url": data.document_url,
        "status": "pending_manager",
        "approval_chain": [
            {
                "level": "manager",
                "user_id": manager["id"] if manager else None,
                "user_name": manager["name"] if manager else "N/A",
                "status": "pending",
                "action_date": None,
                "comments": None
            },
            {
                "level": "hr",
                "user_id": None,
                "user_name": None,
                "status": "pending",
                "action_date": None,
                "comments": None
            },
            {
                "level": "ceo",
                "user_id": None,
                "user_name": None,
                "status": "pending",
                "action_date": None,
                "comments": None
            }
        ],
        "created_at": now,
        "updated_at": now
    }
    
    await db.ess_leave_requests.insert_one(leave_request)
    
    # Create notification for manager
    if manager:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": manager["id"],
            "title": "New Leave Request",
            "message": f"{employee['full_name']} has requested {leave_config['name']} from {data.start_date} to {data.end_date}",
            "entity_type": "leave_request",
            "entity_id": request_id,
            "read": False,
            "created_at": now
        })
        
        # Send email notification to manager
        if is_email_configured():
            manager_user = await db.users.find_one({"id": manager["id"]})
            if manager_user and manager_user.get("email"):
                try:
                    email_html = get_leave_request_template(
                        employee_name=employee["full_name"],
                        leave_type=leave_config["name"],
                        start_date=data.start_date,
                        end_date=data.end_date,
                        total_days=total_days,
                        reason=data.reason,
                        approver_name=manager["name"]
                    )
                    await send_email_async(
                        to_email=manager_user["email"],
                        subject=f"Leave Request: {employee['full_name']} - {leave_config['name']}",
                        html_content=email_html
                    )
                except Exception as e:
                    logger.error(f"Failed to send leave request email: {str(e)}")
    
    return {"id": request_id, "message": "Leave request submitted successfully", "status": "pending_manager"}

@api_router.get("/ess/leave-requests")
async def get_my_leave_requests(
    status: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get current user's leave requests"""
    query = {"user_id": user["id"]}
    if status:
        if status == "pending":
            query["status"] = {"$in": ["pending_manager", "pending_hr", "pending_ceo"]}
        else:
            query["status"] = status
    
    requests = await db.ess_leave_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.get("/ess/pending-approvals")
async def get_pending_approvals_for_me(user = Depends(get_current_user)):
    """Get leave and regularization requests pending my approval"""
    user_role = user["role"]
    user_id = user["id"]
    
    pending_leaves = []
    pending_regularizations = []
    
    # Determine which level to check based on role
    if user_role in ["super_admin"]:
        # CEO sees pending_ceo
        leave_query = {"status": "pending_ceo"}
        reg_query = {"status": "pending_ceo"}
    elif user_role in ["hr", "admin"]:
        # HR sees pending_hr
        leave_query = {"status": "pending_hr"}
        reg_query = {"status": "pending_hr"}
    elif user_role in ["sales_manager", "team_leader", "cs_head", "academic_master"]:
        # Managers see requests from their team members
        # Check if they are the assigned manager in approval chain
        leave_query = {
            "status": "pending_manager",
            "approval_chain": {"$elemMatch": {"level": "manager", "user_id": user_id}}
        }
        reg_query = {
            "status": "pending_manager",
            "approval_chain": {"$elemMatch": {"level": "manager", "user_id": user_id}}
        }
    else:
        return {"leave_requests": [], "regularization_requests": []}
    
    pending_leaves = await db.ess_leave_requests.find(leave_query, {"_id": 0}).to_list(100)
    pending_regularizations = await db.ess_attendance_regularization.find(reg_query, {"_id": 0}).to_list(100)
    
    return {
        "leave_requests": pending_leaves,
        "regularization_requests": pending_regularizations
    }

@api_router.post("/ess/leave-requests/{request_id}/action")
async def action_leave_request(
    request_id: str,
    action_data: ESSApprovalAction,
    user = Depends(get_current_user)
):
    """Approve or reject a leave request"""
    request = await db.ess_leave_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    user_role = user["role"]
    current_status = request["status"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine which level this user can act on
    can_act = False
    current_level = None
    
    if current_status == "pending_manager" and user_role in ["sales_manager", "team_leader", "cs_head", "academic_master", "admin", "super_admin"]:
        # Check if user is the assigned manager
        for chain in request["approval_chain"]:
            if chain["level"] == "manager" and (chain["user_id"] == user["id"] or user_role in ["admin", "super_admin"]):
                can_act = True
                current_level = "manager"
                break
    elif current_status == "pending_hr" and user_role in ["hr", "admin", "super_admin"]:
        can_act = True
        current_level = "hr"
    elif current_status == "pending_ceo" and user_role == "super_admin":
        can_act = True
        current_level = "ceo"
    
    if not can_act:
        raise HTTPException(status_code=403, detail="You are not authorized to act on this request")
    
    # Update approval chain
    updated_chain = request["approval_chain"]
    for chain in updated_chain:
        if chain["level"] == current_level:
            chain["status"] = action_data.action + "d"  # approved or rejected
            chain["user_id"] = user["id"]
            chain["user_name"] = user["full_name"]
            chain["action_date"] = now
            chain["comments"] = action_data.comments
            break
    
    if action_data.action == "reject":
        new_status = "rejected"
    else:
        # Move to next level
        if current_level == "manager":
            new_status = "pending_hr"
        elif current_level == "hr":
            new_status = "pending_ceo"
        else:  # CEO approved
            new_status = "approved"
            # Update employee leave balance
            employee = await db.hr_employees.find_one({"employee_id": request["employee_id"]})
            if employee:
                leave_field = f"{request['leave_type']}_used"
                current_used = employee.get(leave_field, 0)
                await db.hr_employees.update_one(
                    {"employee_id": request["employee_id"]},
                    {"$set": {leave_field: current_used + request["total_days"]}}
                )
    
    await db.ess_leave_requests.update_one(
        {"id": request_id},
        {"$set": {"status": new_status, "approval_chain": updated_chain, "updated_at": now}}
    )
    
    # Notify employee
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": request["user_id"],
        "title": f"Leave Request {action_data.action.capitalize()}d",
        "message": f"Your {request['leave_type_name']} request has been {action_data.action}d by {user['full_name']}" + 
                   (f". Comments: {action_data.comments}" if action_data.comments else ""),
        "entity_type": "leave_request",
        "entity_id": request_id,
        "read": False,
        "created_at": now
    })
    
    # Send email notification to employee
    if is_email_configured() and (new_status == "approved" or new_status == "rejected"):
        employee_user = await db.users.find_one({"id": request["user_id"]})
        if employee_user and employee_user.get("email"):
            try:
                email_html = get_leave_status_template(
                    employee_name=request["employee_name"],
                    leave_type=request["leave_type_name"],
                    start_date=request["start_date"],
                    end_date=request["end_date"],
                    status=new_status,
                    approver_name=user["full_name"],
                    comments=action_data.comments
                )
                status_text = "Approved" if new_status == "approved" else "Rejected"
                await send_email_async(
                    to_email=employee_user["email"],
                    subject=f"Leave Request {status_text}: {request['leave_type_name']}",
                    html_content=email_html
                )
            except Exception as e:
                logger.error(f"Failed to send leave status email: {str(e)}")
    
    # If moved to next level (not final), notify next approver
    if new_status in ["pending_hr", "pending_ceo"] and is_email_configured():
        # Find HR users or CEO (super_admin) to notify
        if new_status == "pending_hr":
            next_approvers = await db.users.find({"role": "hr"}, {"_id": 0, "email": 1, "full_name": 1}).to_list(10)
        else:  # pending_ceo
            next_approvers = await db.users.find({"role": "super_admin"}, {"_id": 0, "email": 1, "full_name": 1}).to_list(10)
        
        for approver in next_approvers:
            if approver.get("email"):
                try:
                    email_html = get_leave_request_template(
                        employee_name=request["employee_name"],
                        leave_type=request["leave_type_name"],
                        start_date=request["start_date"],
                        end_date=request["end_date"],
                        total_days=request["total_days"],
                        reason=request["reason"],
                        approver_name=approver.get("full_name", "Approver")
                    )
                    await send_email_async(
                        to_email=approver["email"],
                        subject=f"Leave Request Pending Your Approval: {request['employee_name']}",
                        html_content=email_html
                    )
                except Exception as e:
                    logger.error(f"Failed to send leave request email to next approver: {str(e)}")
    
    return {"message": f"Request {action_data.action}d successfully", "new_status": new_status}

@api_router.get("/ess/my-attendance")
async def get_my_attendance(
    month: Optional[str] = None,  # YYYY-MM
    user = Depends(get_current_user)
):
    """Get current user's attendance records"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        raise HTTPException(status_code=404, detail="No employee record found for your account")
    
    # Default to current month
    if not month:
        month = datetime.now().strftime("%Y-%m")
    
    # Query attendance for the month
    start_date = f"{month}-01"
    end_date = f"{month}-31"
    
    attendance = await db.hr_attendance.find({
        "employee_id": employee["employee_id"],
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).sort("date", 1).to_list(31)
    
    # Calculate summary
    total_present = sum(1 for a in attendance if a.get("status") == "present")
    total_absent = sum(1 for a in attendance if a.get("status") == "absent")
    total_late = sum(1 for a in attendance if a.get("late_minutes", 0) > 0)
    total_hours = sum(a.get("worked_hours", 0) for a in attendance)
    
    return {
        "month": month,
        "employee_id": employee["employee_id"],
        "employee_name": employee["full_name"],
        "records": attendance,
        "summary": {
            "total_present": total_present,
            "total_absent": total_absent,
            "total_late": total_late,
            "total_hours_worked": round(total_hours, 2),
            "avg_hours_per_day": round(total_hours / max(total_present, 1), 2)
        }
    }

@api_router.post("/ess/attendance-regularization")
async def create_attendance_regularization(
    data: AttendanceRegularizationCreate,
    user = Depends(get_current_user)
):
    """Submit attendance regularization request"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        raise HTTPException(status_code=404, detail="No employee record found for your account")
    
    # Get original attendance record
    attendance = await db.hr_attendance.find_one({
        "employee_id": employee["employee_id"],
        "date": data.date
    })
    
    # Get manager
    manager = await get_employee_manager(employee["employee_id"])
    
    now = datetime.now(timezone.utc).isoformat()
    request_id = str(uuid.uuid4())
    
    regularization = {
        "id": request_id,
        "employee_id": employee["employee_id"],
        "employee_name": employee["full_name"],
        "user_id": user["id"],
        "date": data.date,
        "original_check_in": attendance.get("biometric_in") if attendance else None,
        "original_check_out": attendance.get("biometric_out") if attendance else None,
        "requested_check_in": data.requested_check_in,
        "requested_check_out": data.requested_check_out,
        "reason": data.reason,
        "status": "pending_manager",
        "approval_chain": [
            {
                "level": "manager",
                "user_id": manager["id"] if manager else None,
                "user_name": manager["name"] if manager else "N/A",
                "status": "pending",
                "action_date": None,
                "comments": None
            },
            {
                "level": "hr",
                "user_id": None,
                "user_name": None,
                "status": "pending",
                "action_date": None,
                "comments": None
            },
            {
                "level": "ceo",
                "user_id": None,
                "user_name": None,
                "status": "pending",
                "action_date": None,
                "comments": None
            }
        ],
        "created_at": now,
        "updated_at": now
    }
    
    await db.ess_attendance_regularization.insert_one(regularization)
    
    # Notify manager
    if manager:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": manager["id"],
            "title": "Attendance Regularization Request",
            "message": f"{employee['full_name']} has requested attendance regularization for {data.date}",
            "entity_type": "regularization_request",
            "entity_id": request_id,
            "read": False,
            "created_at": now
        })
        
        # Send email notification to manager
        if is_email_configured():
            manager_user = await db.users.find_one({"id": manager["id"]})
            if manager_user and manager_user.get("email"):
                try:
                    email_html = get_regularization_request_template(
                        employee_name=employee["full_name"],
                        date=data.date,
                        original_in=regularization["original_check_in"],
                        original_out=regularization["original_check_out"],
                        requested_in=data.requested_check_in,
                        requested_out=data.requested_check_out,
                        reason=data.reason,
                        approver_name=manager["name"]
                    )
                    await send_email_async(
                        to_email=manager_user["email"],
                        subject=f"Attendance Regularization Request: {employee['full_name']} - {data.date}",
                        html_content=email_html
                    )
                except Exception as e:
                    logger.error(f"Failed to send regularization request email: {str(e)}")
    
    return {"id": request_id, "message": "Regularization request submitted", "status": "pending_manager"}

@api_router.get("/ess/attendance-regularization")
async def get_my_regularization_requests(
    status: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Get current user's regularization requests"""
    query = {"user_id": user["id"]}
    if status:
        if status == "pending":
            query["status"] = {"$in": ["pending_manager", "pending_hr", "pending_ceo"]}
        else:
            query["status"] = status
    
    requests = await db.ess_attendance_regularization.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.post("/ess/attendance-regularization/{request_id}/action")
async def action_regularization_request(
    request_id: str,
    action_data: ESSApprovalAction,
    user = Depends(get_current_user)
):
    """Approve or reject regularization request"""
    request = await db.ess_attendance_regularization.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Regularization request not found")
    
    user_role = user["role"]
    current_status = request["status"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine which level this user can act on
    can_act = False
    current_level = None
    
    if current_status == "pending_manager" and user_role in ["sales_manager", "team_leader", "cs_head", "academic_master", "admin", "super_admin"]:
        for chain in request["approval_chain"]:
            if chain["level"] == "manager" and (chain["user_id"] == user["id"] or user_role in ["admin", "super_admin"]):
                can_act = True
                current_level = "manager"
                break
    elif current_status == "pending_hr" and user_role in ["hr", "admin", "super_admin"]:
        can_act = True
        current_level = "hr"
    elif current_status == "pending_ceo" and user_role == "super_admin":
        can_act = True
        current_level = "ceo"
    
    if not can_act:
        raise HTTPException(status_code=403, detail="You are not authorized to act on this request")
    
    # Update approval chain
    updated_chain = request["approval_chain"]
    for chain in updated_chain:
        if chain["level"] == current_level:
            chain["status"] = action_data.action + "d"
            chain["user_id"] = user["id"]
            chain["user_name"] = user["full_name"]
            chain["action_date"] = now
            chain["comments"] = action_data.comments
            break
    
    if action_data.action == "reject":
        new_status = "rejected"
    else:
        if current_level == "manager":
            new_status = "pending_hr"
        elif current_level == "hr":
            new_status = "pending_ceo"
        else:  # CEO approved - apply regularization
            new_status = "approved"
            # Update attendance record
            await db.hr_attendance.update_one(
                {"employee_id": request["employee_id"], "date": request["date"]},
                {"$set": {
                    "biometric_in": request["requested_check_in"],
                    "biometric_out": request["requested_check_out"],
                    "regularized": True,
                    "regularization_id": request_id,
                    "updated_at": now
                }},
                upsert=True
            )
    
    await db.ess_attendance_regularization.update_one(
        {"id": request_id},
        {"$set": {"status": new_status, "approval_chain": updated_chain, "updated_at": now}}
    )
    
    # Notify employee
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": request["user_id"],
        "title": f"Regularization {action_data.action.capitalize()}d",
        "message": f"Your attendance regularization for {request['date']} has been {action_data.action}d by {user['full_name']}",
        "entity_type": "regularization_request",
        "entity_id": request_id,
        "read": False,
        "created_at": now
    })
    
    # Send email notification to employee
    if is_email_configured() and (new_status == "approved" or new_status == "rejected"):
        employee_user = await db.users.find_one({"id": request["user_id"]})
        if employee_user and employee_user.get("email"):
            try:
                email_html = get_regularization_status_template(
                    employee_name=request["employee_name"],
                    date=request["date"],
                    status=new_status,
                    approver_name=user["full_name"],
                    comments=action_data.comments
                )
                status_text = "Approved" if new_status == "approved" else "Rejected"
                await send_email_async(
                    to_email=employee_user["email"],
                    subject=f"Attendance Regularization {status_text}: {request['date']}",
                    html_content=email_html
                )
            except Exception as e:
                logger.error(f"Failed to send regularization status email: {str(e)}")
    
    # If moved to next level (not final), notify next approver
    if new_status in ["pending_hr", "pending_ceo"] and is_email_configured():
        if new_status == "pending_hr":
            next_approvers = await db.users.find({"role": "hr"}, {"_id": 0, "email": 1, "full_name": 1}).to_list(10)
        else:
            next_approvers = await db.users.find({"role": "super_admin"}, {"_id": 0, "email": 1, "full_name": 1}).to_list(10)
        
        for approver in next_approvers:
            if approver.get("email"):
                try:
                    email_html = get_regularization_request_template(
                        employee_name=request["employee_name"],
                        date=request["date"],
                        original_in=request.get("original_check_in"),
                        original_out=request.get("original_check_out"),
                        requested_in=request["requested_check_in"],
                        requested_out=request["requested_check_out"],
                        reason=request["reason"],
                        approver_name=approver.get("full_name", "Approver")
                    )
                    await send_email_async(
                        to_email=approver["email"],
                        subject=f"Regularization Request Pending Your Approval: {request['employee_name']}",
                        html_content=email_html
                    )
                except Exception as e:
                    logger.error(f"Failed to send regularization request email to next approver: {str(e)}")
    
    return {"message": f"Request {action_data.action}d successfully", "new_status": new_status}

@api_router.get("/ess/my-assets")
async def get_my_assets(user = Depends(get_current_user)):
    """Get assets allocated to current user"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        return []
    
    # Get allocated assets
    assets = await db.hr_assets.find({
        "assigned_to": employee["employee_id"],
        "status": "assigned"
    }, {"_id": 0}).to_list(100)
    
    return assets

@api_router.get("/ess/dashboard")
async def get_ess_dashboard(user = Depends(get_current_user)):
    """Get employee self-service dashboard data"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    week_start = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    month = now.strftime("%Y-%m")
    
    result = {
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user.get("role"),
            "department": user.get("department")
        },
        "employee": None,
        "attendance": {
            "today": None,
            "weekly_summary": {"present": 0, "absent": 0, "late": 0, "total_hours": 0},
            "recent_records": []
        },
        "leave_balance": [],
        "pending_requests": {"leave": 0, "regularization": 0},
        "assets": [],
        "request_history": {"leave": [], "regularization": []}
    }
    
    if employee:
        result["employee"] = {
            "employee_id": employee["employee_id"],
            "full_name": employee["full_name"],
            "designation": employee.get("designation"),
            "department": employee.get("department"),
            "employment_type": employee.get("employment_type"),
            "joining_date": employee.get("joining_date")
        }
        
        emp_id = employee["employee_id"]
        
        # Today's attendance
        today_att = await db.hr_attendance.find_one({"employee_id": emp_id, "date": today}, {"_id": 0})
        result["attendance"]["today"] = today_att
        
        # Weekly attendance
        weekly_att = await db.hr_attendance.find({
            "employee_id": emp_id,
            "date": {"$gte": week_start, "$lte": today}
        }, {"_id": 0}).to_list(7)
        
        result["attendance"]["weekly_summary"] = {
            "present": sum(1 for a in weekly_att if a.get("status") == "present"),
            "absent": sum(1 for a in weekly_att if a.get("status") == "absent"),
            "late": sum(1 for a in weekly_att if a.get("late_minutes", 0) > 0),
            "total_hours": round(sum(a.get("worked_hours", 0) for a in weekly_att), 2)
        }
        
        # Recent attendance records (last 10)
        recent_att = await db.hr_attendance.find(
            {"employee_id": emp_id},
            {"_id": 0}
        ).sort("date", -1).limit(10).to_list(10)
        result["attendance"]["recent_records"] = recent_att
        
        # Leave balance (with gender-based filtering)
        gender = employee.get("gender", "").lower()
        month_start = now.replace(day=1).strftime("%Y-%m-%d")
        
        for leave_type, config in LEAVE_TYPES.items():
            if config["full_time_only"] and employee.get("employment_type") != "full_time":
                continue
            
            # Skip maternity leave for males
            if leave_type == "maternity_leave" and gender == "male":
                continue
            
            total = config["days_per_year"]
            is_unlimited = total == -1
            year_start = f"{now.year}-01-01"
            
            # Count used leaves this year
            used = await db.ess_leave_requests.count_documents({
                "employee_id": emp_id,
                "leave_type": leave_type,
                "status": "approved",
                "start_date": {"$gte": year_start}
            })
            
            leave_entry = {
                "leave_type": leave_type,
                "leave_type_name": config["name"],
                "is_unlimited": is_unlimited,
                "total_days": total if not is_unlimited else None,
                "used_days": used,
                "remaining_days": max(0, total - used) if not is_unlimited else None
            }
            
            # Add taken this month for unlimited types
            if is_unlimited:
                taken_this_month = await db.ess_leave_requests.count_documents({
                    "employee_id": emp_id,
                    "leave_type": leave_type,
                    "status": "approved",
                    "start_date": {"$gte": month_start}
                })
                leave_entry["taken_this_month"] = taken_this_month
            
            result["leave_balance"].append(leave_entry)
        
        # Pending requests count
        result["pending_requests"]["leave"] = await db.ess_leave_requests.count_documents({
            "user_id": user["id"],
            "status": {"$in": ["pending_manager", "pending_hr", "pending_ceo"]}
        })
        result["pending_requests"]["regularization"] = await db.ess_attendance_regularization.count_documents({
            "user_id": user["id"],
            "status": {"$in": ["pending_manager", "pending_hr", "pending_ceo"]}
        })
        
        # Assets
        assets = await db.hr_assets.find({
            "assigned_to": emp_id,
            "status": "assigned"
        }, {"_id": 0}).to_list(20)
        result["assets"] = assets
        
        # Recent request history
        recent_leaves = await db.ess_leave_requests.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        result["request_history"]["leave"] = recent_leaves
        
        recent_regs = await db.ess_attendance_regularization.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(5).to_list(5)
        result["request_history"]["regularization"] = recent_regs
    
    return result

@api_router.get("/ess/leave-types")
async def get_leave_types(user = Depends(get_current_user)):
    """Get available leave types configuration"""
    return [
        {
            "id": k,
            "name": v["name"],
            "days_per_year": v["days_per_year"],
            "full_time_only": v["full_time_only"],
            "requires_document": v["requires_document"]
        }
        for k, v in LEAVE_TYPES.items()
    ]

# ==================== PAYSLIPS ====================

@api_router.get("/ess/payslips")
async def get_my_payslips(year: Optional[int] = None, user = Depends(get_current_user)):
    """Get current user's payslips"""
    # Find linked employee
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee:
        return []
    
    query = {"employee_id": employee["employee_id"]}
    if year:
        query["month"] = {"$regex": f"^{year}-"}
    
    payslips = await db.hr_payslips.find(query, {"_id": 0}).sort("month", -1).to_list(100)
    return payslips

@api_router.get("/ess/payslips/{payslip_id}")
async def get_payslip_detail(payslip_id: str, user = Depends(get_current_user)):
    """Get payslip detail"""
    payslip = await db.hr_payslips.find_one({"id": payslip_id}, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    
    # Verify ownership
    employee = await db.hr_employees.find_one({"user_id": user["id"]})
    if not employee:
        employee = await db.hr_employees.find_one({"email": user["email"]})
    
    if not employee or payslip.get("employee_id") != employee["employee_id"]:
        if user["role"] not in ["super_admin", "admin", "hr", "finance"]:
            raise HTTPException(status_code=403, detail="Not authorized to view this payslip")
    
    return payslip

# ==================== COMPANY DOCUMENTS ====================

class CompanyDocumentCreate(BaseModel):
    document_type: str
    document_name: str
    description: Optional[str] = None
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    document_url: Optional[str] = None
    reminder_days: Optional[int] = 30

@api_router.get("/hr/company-documents")
async def get_company_documents(user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get all company documents"""
    documents = await db.hr_company_documents.find({}, {"_id": 0}).sort("expiry_date", 1).to_list(200)
    return documents

@api_router.post("/hr/company-documents")
async def create_company_document(data: CompanyDocumentCreate, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Create a new company document"""
    now = datetime.now(timezone.utc).isoformat()
    doc_id = str(uuid.uuid4())
    
    document = {
        "id": doc_id,
        **data.model_dump(),
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.hr_company_documents.insert_one(document)
    await log_audit(user, "create", "company_document", entity_id=doc_id, entity_name=data.document_name)
    
    return {"id": doc_id, "message": "Document created successfully"}

@api_router.put("/hr/company-documents/{doc_id}")
async def update_company_document(doc_id: str, data: CompanyDocumentCreate, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Update a company document"""
    existing = await db.hr_company_documents.find_one({"id": doc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.hr_company_documents.update_one(
        {"id": doc_id},
        {"$set": {
            **data.model_dump(),
            "updated_at": now,
            "updated_by": user["id"]
        }}
    )
    
    await log_audit(user, "update", "company_document", entity_id=doc_id, entity_name=data.document_name)
    
    return {"message": "Document updated successfully"}

@api_router.delete("/hr/company-documents/{doc_id}")
async def delete_company_document(doc_id: str, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Delete a company document"""
    existing = await db.hr_company_documents.find_one({"id": doc_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.hr_company_documents.delete_one({"id": doc_id})
    await log_audit(user, "delete", "company_document", entity_id=doc_id, entity_name=existing.get("document_name"))
    
    return {"message": "Document deleted successfully"}

@api_router.get("/hr/company-documents/expiring")
async def get_company_documents_expiring(days: int = 30, user = Depends(require_roles(["super_admin", "admin", "hr"]))):
    """Get documents expiring within the specified days"""
    today = datetime.now(timezone.utc)
    future_date = (today + timedelta(days=days)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    
    # Get documents expiring within the timeframe or already expired
    documents = await db.hr_company_documents.find({
        "expiry_date": {"$ne": None, "$lte": future_date}
    }, {"_id": 0}).sort("expiry_date", 1).to_list(100)
    
    # Categorize
    expired = []
    expiring_soon = []
    
    for doc in documents:
        if doc.get("expiry_date") and doc["expiry_date"] < today_str:
            expired.append(doc)
        else:
            expiring_soon.append(doc)
    
    return {
        "expired": expired,
        "expiring_soon": expiring_soon,
        "total_alerts": len(expired) + len(expiring_soon)
    }

# ==================== FINANCE SUITE ENDPOINTS ====================

# --- CLT Payables ---
@api_router.get("/finance/clt/payables")
async def get_clt_payables(user = Depends(get_current_user)):
    """Get all CLT payables"""
    payables = await db.finance_clt_payables.find({}, {"_id": 0}).to_list(length=1000)
    return payables

@api_router.post("/finance/clt/payables")
async def create_clt_payable(data: dict, user = Depends(get_current_user)):
    """Create a CLT payable record"""
    payable = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_clt_payables.insert_one(payable)
    return {"id": payable["id"], "message": "Payable created"}

@api_router.put("/finance/clt/payables/{payable_id}")
async def update_clt_payable(payable_id: str, data: dict, user = Depends(get_current_user)):
    """Update a CLT payable record"""
    result = await db.finance_clt_payables.update_one(
        {"id": payable_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payable not found")
    return {"message": "Payable updated"}

@api_router.delete("/finance/clt/payables/{payable_id}")
async def delete_clt_payable(payable_id: str, user = Depends(get_current_user)):
    """Delete a CLT payable record"""
    result = await db.finance_clt_payables.delete_one({"id": payable_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payable not found")
    return {"message": "Payable deleted"}

# --- CLT Receivables ---
@api_router.get("/finance/clt/receivables")
async def get_clt_receivables(user = Depends(get_current_user)):
    """Get all CLT receivables"""
    receivables = await db.finance_clt_receivables.find({}, {"_id": 0}).to_list(length=1000)
    return receivables

@api_router.post("/finance/clt/receivables")
async def create_clt_receivable(data: dict, user = Depends(get_current_user)):
    """Create a CLT receivable record"""
    receivable = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_clt_receivables.insert_one(receivable)
    return {"id": receivable["id"], "message": "Receivable created"}

@api_router.put("/finance/clt/receivables/{receivable_id}")
async def update_clt_receivable(receivable_id: str, data: dict, user = Depends(get_current_user)):
    """Update a CLT receivable record"""
    result = await db.finance_clt_receivables.update_one(
        {"id": receivable_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Receivable not found")
    return {"message": "Receivable updated"}

@api_router.delete("/finance/clt/receivables/{receivable_id}")
async def delete_clt_receivable(receivable_id: str, user = Depends(get_current_user)):
    """Delete a CLT receivable record"""
    result = await db.finance_clt_receivables.delete_one({"id": receivable_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receivable not found")
    return {"message": "Receivable deleted"}

# --- Miles Deposits ---
@api_router.get("/finance/miles/deposits")
async def get_miles_deposits(user = Depends(get_current_user)):
    """Get all Miles deposits"""
    deposits = await db.finance_miles_deposits.find({}, {"_id": 0}).to_list(length=1000)
    return deposits

@api_router.post("/finance/miles/deposits")
async def create_miles_deposit(data: dict, user = Depends(get_current_user)):
    """Create a Miles deposit record"""
    deposit = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_miles_deposits.insert_one(deposit)
    return {"id": deposit["id"], "message": "Deposit created"}

@api_router.put("/finance/miles/deposits/{deposit_id}")
async def update_miles_deposit(deposit_id: str, data: dict, user = Depends(get_current_user)):
    """Update a Miles deposit record"""
    result = await db.finance_miles_deposits.update_one(
        {"id": deposit_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return {"message": "Deposit updated"}

@api_router.delete("/finance/miles/deposits/{deposit_id}")
async def delete_miles_deposit(deposit_id: str, user = Depends(get_current_user)):
    """Delete a Miles deposit record"""
    result = await db.finance_miles_deposits.delete_one({"id": deposit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return {"message": "Deposit deleted"}

# --- Miles Withdrawals ---
@api_router.get("/finance/miles/withdrawals")
async def get_miles_withdrawals(user = Depends(get_current_user)):
    """Get all Miles withdrawals"""
    withdrawals = await db.finance_miles_withdrawals.find({}, {"_id": 0}).to_list(length=1000)
    return withdrawals

@api_router.post("/finance/miles/withdrawals")
async def create_miles_withdrawal(data: dict, user = Depends(get_current_user)):
    """Create a Miles withdrawal record"""
    withdrawal = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_miles_withdrawals.insert_one(withdrawal)
    return {"id": withdrawal["id"], "message": "Withdrawal created"}

@api_router.put("/finance/miles/withdrawals/{withdrawal_id}")
async def update_miles_withdrawal(withdrawal_id: str, data: dict, user = Depends(get_current_user)):
    """Update a Miles withdrawal record"""
    result = await db.finance_miles_withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return {"message": "Withdrawal updated"}

@api_router.delete("/finance/miles/withdrawals/{withdrawal_id}")
async def delete_miles_withdrawal(withdrawal_id: str, user = Depends(get_current_user)):
    """Delete a Miles withdrawal record"""
    result = await db.finance_miles_withdrawals.delete_one({"id": withdrawal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return {"message": "Withdrawal deleted"}

# --- Miles Expenses ---
@api_router.get("/finance/miles/expenses")
async def get_miles_expenses(user = Depends(get_current_user)):
    """Get all Miles expenses"""
    expenses = await db.finance_miles_expenses.find({}, {"_id": 0}).to_list(length=1000)
    return expenses

@api_router.post("/finance/miles/expenses")
async def create_miles_expense(data: dict, user = Depends(get_current_user)):
    """Create a Miles expense record"""
    expense = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_miles_expenses.insert_one(expense)
    return {"id": expense["id"], "message": "Expense created"}

@api_router.put("/finance/miles/expenses/{expense_id}")
async def update_miles_expense(expense_id: str, data: dict, user = Depends(get_current_user)):
    """Update a Miles expense record"""
    result = await db.finance_miles_expenses.update_one(
        {"id": expense_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense updated"}

@api_router.delete("/finance/miles/expenses/{expense_id}")
async def delete_miles_expense(expense_id: str, user = Depends(get_current_user)):
    """Delete a Miles expense record"""
    result = await db.finance_miles_expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# --- Miles Operating Profit ---
@api_router.get("/finance/miles/operating-profit")
async def get_miles_operating_profit(user = Depends(get_current_user)):
    """Get all Miles operating profit records"""
    profits = await db.finance_miles_operating_profit.find({}, {"_id": 0}).to_list(length=1000)
    return profits

@api_router.post("/finance/miles/operating-profit")
async def create_miles_operating_profit(data: dict, user = Depends(get_current_user)):
    """Create a Miles operating profit record"""
    profit = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_miles_operating_profit.insert_one(profit)
    return {"id": profit["id"], "message": "Operating profit recorded"}

@api_router.put("/finance/miles/operating-profit/{profit_id}")
async def update_miles_operating_profit(profit_id: str, data: dict, user = Depends(get_current_user)):
    """Update a Miles operating profit record"""
    result = await db.finance_miles_operating_profit.update_one(
        {"id": profit_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Operating profit updated"}

@api_router.delete("/finance/miles/operating-profit/{profit_id}")
async def delete_miles_operating_profit(profit_id: str, user = Depends(get_current_user)):
    """Delete a Miles operating profit record"""
    result = await db.finance_miles_operating_profit.delete_one({"id": profit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Operating profit deleted"}

# --- Treasury Balances ---
@api_router.get("/finance/treasury/balances")
async def get_treasury_balances(user = Depends(get_current_user)):
    """Get all treasury balances"""
    balances = await db.finance_treasury_balances.find({}, {"_id": 0}).to_list(length=1000)
    return balances

@api_router.post("/finance/treasury/balances")
async def create_treasury_balance(data: dict, user = Depends(get_current_user)):
    """Create a treasury balance record"""
    balance = {
        "id": str(uuid.uuid4()),
        **data,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.finance_treasury_balances.insert_one(balance)
    return {"id": balance["id"], "message": "Balance created"}

@api_router.put("/finance/treasury/balances/{balance_id}")
async def update_treasury_balance(balance_id: str, data: dict, user = Depends(get_current_user)):
    """Update a treasury balance record"""
    result = await db.finance_treasury_balances.update_one(
        {"id": balance_id},
        {"$set": {**data, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Balance not found")
    return {"message": "Balance updated"}

@api_router.delete("/finance/treasury/balances/{balance_id}")
async def delete_treasury_balance(balance_id: str, user = Depends(get_current_user)):
    """Delete a treasury balance record"""
    result = await db.finance_treasury_balances.delete_one({"id": balance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Balance not found")
    return {"message": "Balance deleted"}

# --- Treasury Pending Settlements ---
@api_router.get("/finance/treasury/pending-settlements")
async def get_treasury_settlements(user = Depends(get_current_user)):
    """Get all treasury pending settlements"""
    settlements = await db.finance_treasury_settlements.find({}, {"_id": 0}).to_list(length=1000)
    return settlements

@api_router.put("/finance/treasury/pending-settlements/{settlement_id}/settle")
async def settle_treasury_settlement(settlement_id: str, user = Depends(get_current_user)):
    """Mark a settlement as settled"""
    result = await db.finance_treasury_settlements.update_one(
        {"id": settlement_id},
        {"$set": {"status": "settled", "settled_at": datetime.now(timezone.utc).isoformat(), "settled_by": user["id"]}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return {"message": "Settlement marked as settled"}

# --- Budgeting ---
@api_router.get("/finance/budgeting/sheet")
async def get_budget_sheet(year: int, entity: str, user = Depends(get_current_user)):
    """Get budget sheet for a year and entity"""
    budgets = await db.finance_budgets.find(
        {"year": year, "entity": entity},
        {"_id": 0}
    ).to_list(length=100)
    return budgets

@api_router.post("/finance/budgeting/sheet")
async def save_budget_sheet(data: dict, user = Depends(get_current_user)):
    """Save budget sheet for a year and entity"""
    year = data.get("year")
    entity = data.get("entity")
    items = data.get("items", [])
    
    # Delete existing budgets for this year/entity
    await db.finance_budgets.delete_many({"year": year, "entity": entity})
    
    # Insert new budgets
    for item in items:
        budget = {
            "id": str(uuid.uuid4()),
            "year": year,
            "entity": entity,
            "cost_center": item.get("cost_center"),
            "monthly_budgets": item.get("monthly_budgets", {}),
            "created_by": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.finance_budgets.insert_one(budget)
    
    return {"message": f"Budget saved for {entity} {year}", "count": len(items)}

@api_router.get("/finance/budgeting/actuals")
async def get_budget_actuals(year: int, entity: str, user = Depends(get_current_user)):
    """Get actual spending vs budget for a year and entity"""
    # This would aggregate from payables/expenses collections
    # For now, return empty to allow frontend to display
    return []

# ==================== ADMIN: DATA RESET & FEATURE FLAGS ====================

class DataResetRequest(BaseModel):
    password: str
    confirm_text: str  # Must be "RESET ALL DATA"

@api_router.post("/admin/reset-data")
async def reset_all_data(request: DataResetRequest, user = Depends(require_roles(["super_admin"]))):
    """
    Reset all data except Super Admin accounts.
    Requires password confirmation and typing 'RESET ALL DATA'.
    """
    # Verify confirmation text
    if request.confirm_text != "RESET ALL DATA":
        raise HTTPException(status_code=400, detail="Please type 'RESET ALL DATA' to confirm")
    
    # Verify password
    stored_user = await db.users.find_one({"id": user["id"]})
    if not stored_user or not verify_password(request.password, stored_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Collections to clear (everything except system data)
    collections_to_clear = [
        "leads", "students", "payments", "payment_verifications",
        "notifications", "activity_logs", "call_logs", "sms_logs",
        "email_logs", "tasks", "notes", "follow_ups",
        "commissions", "approval_requests", "bank_transactions",
        "bank_statements", "reconciliation_logs",
        "hr_employees", "hr_attendance", "hr_leave_requests",
        "hr_payroll", "hr_performance", "hr_assets",
        "finance_payables", "finance_receivables",
        "finance_deposits", "finance_withdrawals",
        "finance_expenses", "finance_operating_profit",
        "finance_treasury_balances", "finance_settlements",
        "finance_budgets", "finance_audit_logs",
        "mentor_activities", "student_activities",
        "upgrade_pipelines", "redeposit_pipelines"
    ]
    
    # Preserve super_admin users, clear all others
    non_super_admin_count = await db.users.count_documents({"role": {"$ne": "super_admin"}})
    await db.users.delete_many({"role": {"$ne": "super_admin"}})
    
    # Clear all other collections
    cleared_counts = {"users (non-super_admin)": non_super_admin_count}
    for collection_name in collections_to_clear:
        try:
            collection = db[collection_name]
            result = await collection.delete_many({})
            cleared_counts[collection_name] = result.deleted_count
        except Exception as e:
            logger.warning(f"Could not clear {collection_name}: {e}")
            cleared_counts[collection_name] = f"Error: {str(e)}"
    
    # Log the reset action
    await log_activity("system", "data_reset", "reset", user, {
        "cleared_collections": list(cleared_counts.keys()),
        "environment": os.environ.get('APP_ENV', 'production')
    })
    
    return {
        "success": True,
        "message": "All data has been reset. Super Admin accounts preserved.",
        "cleared": cleared_counts
    }

@api_router.get("/admin/data-stats")
async def get_data_stats(user = Depends(require_roles(["super_admin"]))):
    """Get counts of all data that would be affected by reset"""
    stats = {}
    
    # User counts by role
    stats["users"] = {
        "super_admin": await db.users.count_documents({"role": "super_admin"}),
        "other_users": await db.users.count_documents({"role": {"$ne": "super_admin"}}),
    }
    
    # Main collections
    collections = [
        ("leads", "leads"),
        ("students", "students"),
        ("payments", "payments"),
        ("employees", "hr_employees"),
        ("attendance_records", "hr_attendance"),
        ("tasks", "tasks"),
        ("call_logs", "call_logs"),
        ("commissions", "commissions"),
    ]
    
    for name, collection in collections:
        try:
            stats[name] = await db[collection].count_documents({})
        except:
            stats[name] = 0
    
    return stats

# ==================== FEATURE FLAGS ====================

@api_router.get("/admin/feature-flags")
async def get_feature_flags(user = Depends(require_roles(["super_admin", "admin"]))):
    """Get all feature flags"""
    flags = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
    
    # If no flags exist, create defaults
    if not flags:
        default_flags = [
            {
                "id": str(uuid.uuid4()),
                "name": "finance_suite",
                "display_name": "Finance Suite",
                "description": "CLT & MILES Finance modules including Treasury, Budgeting, PNL",
                "enabled_environments": ["development", "testing", "production"],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "biocloud_sync",
                "display_name": "BioCloud Attendance Sync",
                "description": "Automatic attendance sync with ZK BioCloud",
                "enabled_environments": ["development", "testing", "production"],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "3cx_integration",
                "display_name": "3CX Phone Integration",
                "description": "Click-to-call and call logging with 3CX PBX",
                "enabled_environments": ["development", "testing", "production"],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "commission_engine",
                "display_name": "Commission Engine",
                "description": "Automatic commission calculation for sales",
                "enabled_environments": ["development", "testing", "production"],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "mentor_crm",
                "display_name": "Mentor CRM",
                "description": "Mentor student management and redeposit pipeline",
                "enabled_environments": ["development", "testing", "production"],
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        await db.feature_flags.insert_many(default_flags)
        # Re-fetch to avoid _id in response
        flags = await db.feature_flags.find({}, {"_id": 0}).to_list(100)
    
    return flags

@api_router.post("/admin/feature-flags")
async def create_feature_flag(data: Dict, user = Depends(require_roles(["super_admin"]))):
    """Create a new feature flag"""
    flag = {
        "id": str(uuid.uuid4()),
        "name": data.get("name"),
        "display_name": data.get("display_name"),
        "description": data.get("description", ""),
        "enabled_environments": data.get("enabled_environments", ["development"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.feature_flags.insert_one(flag)
    return {k: v for k, v in flag.items() if k != "_id"}

@api_router.put("/admin/feature-flags/{flag_id}")
async def update_feature_flag(flag_id: str, data: Dict, user = Depends(require_roles(["super_admin"]))):
    """Update a feature flag's enabled environments"""
    update_data = {
        "enabled_environments": data.get("enabled_environments", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    if "display_name" in data:
        update_data["display_name"] = data["display_name"]
    if "description" in data:
        update_data["description"] = data["description"]
    
    result = await db.feature_flags.update_one(
        {"id": flag_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    return {"message": "Feature flag updated"}

@api_router.delete("/admin/feature-flags/{flag_id}")
async def delete_feature_flag(flag_id: str, user = Depends(require_roles(["super_admin"]))):
    """Delete a feature flag"""
    result = await db.feature_flags.delete_one({"id": flag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    return {"message": "Feature flag deleted"}

@api_router.get("/admin/feature-flags/check/{feature_name}")
async def check_feature_enabled(feature_name: str, user = Depends(get_current_user)):
    """Check if a feature is enabled for the current environment"""
    current_env = os.environ.get('APP_ENV', 'production').lower()
    
    flag = await db.feature_flags.find_one({"name": feature_name}, {"_id": 0})
    if not flag:
        return {"enabled": True, "environment": current_env}  # Default to enabled if flag doesn't exist
    
    enabled = current_env in flag.get("enabled_environments", [])
    return {
        "enabled": enabled,
        "environment": current_env,
        "flag": flag
    }

# ==================== ENVIRONMENT MANAGEMENT ====================

@api_router.get("/admin/environment")
async def get_current_environment(user = Depends(get_current_user)):
    """Get current environment and database info"""
    current_env = os.environ.get('APP_ENV', 'production').lower()
    return {
        "environment": current_env,
        "database": CURRENT_DB_NAME,
        "available_environments": ["development", "testing", "production"]
    }

@api_router.post("/admin/switch-environment")
async def switch_environment(data: Dict, user = Depends(require_roles(["super_admin"]))):
    """
    Switch the application environment.
    Note: This requires a server restart to take effect.
    """
    new_env = data.get("environment", "").lower()
    if new_env not in ["development", "testing", "production"]:
        raise HTTPException(status_code=400, detail="Invalid environment. Use: development, testing, or production")
    
    # Update the environment variable (will require restart)
    os.environ['APP_ENV'] = new_env
    
    # Calculate new database name
    if new_env == 'development':
        new_db = os.environ.get('DB_NAME_DEV', 'clt_synapse_dev')
    elif new_env == 'testing':
        new_db = os.environ.get('DB_NAME_TEST', 'clt_synapse_test')
    else:
        new_db = os.environ.get('DB_NAME_PROD', os.environ.get('DB_NAME', 'clt_synapse_prod'))
    
    return {
        "message": f"Environment switched to {new_env}. Server restart required for database switch.",
        "new_environment": new_env,
        "new_database": new_db,
        "restart_required": True
    }

@api_router.post("/admin/send-daily-finance-report")
async def trigger_daily_finance_report(user = Depends(require_roles(["super_admin", "ceo"]))):
    """
    Manually trigger the daily finance report email.
    Useful for testing or sending ad-hoc reports.
    """
    try:
        await send_daily_finance_report()
        return {
            "success": True,
            "message": "Daily finance report has been sent to accounts@clt-academy.com, aqib@clt-academy.com, and faizeen@clt-academy.com"
        }
    except Exception as e:
        logger.error(f"Error sending manual finance report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send report: {str(e)}")

@api_router.get("/admin/email-status")
async def get_email_status(user = Depends(require_roles(["super_admin", "admin"]))):
    """Check email configuration status"""
    return {
        "email_configured": is_email_configured(),
        "smtp_host": os.environ.get("SMTP_HOST", "not set"),
        "smtp_user": os.environ.get("SMTP_USER", "not set"),
        "from_name": os.environ.get("SMTP_FROM_NAME", "CLT Synapse"),
        "daily_report_recipients": [
            "accounts@clt-academy.com",
            "aqib@clt-academy.com",
            "faizeen@clt-academy.com"
        ]
    }
# Meta Ads Integration for lead import and analytics

# Initialize Meta Ads Service (only if credentials are configured)
META_APP_ID = os.environ.get('META_APP_ID', '')
META_APP_SECRET = os.environ.get('META_APP_SECRET', '')
META_WEBHOOK_VERIFY_TOKEN = os.environ.get('META_WEBHOOK_VERIFY_TOKEN', 'clt_synapse_meta_webhook_2024')
BACKEND_URL = os.environ.get('BACKEND_URL', '')

meta_ads_service = None
if META_APP_ID and META_APP_SECRET:
    meta_ads_service = MetaAdsService(META_APP_ID, META_APP_SECRET)
    logger.info("Meta Ads Service initialized")
else:
    logger.warning("Meta Ads credentials not configured - Marketing module OAuth disabled")

@api_router.get("/marketing/config")
async def get_marketing_config(user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Get Marketing module configuration status"""
    return {
        "meta_configured": bool(META_APP_ID and META_APP_SECRET),
        "webhook_configured": bool(META_WEBHOOK_VERIFY_TOKEN),
        "webhook_url": f"{BACKEND_URL}/api/marketing/webhook" if BACKEND_URL else None
    }

@api_router.get("/marketing/accounts")
async def get_meta_accounts(user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Get all connected Meta Ads accounts"""
    accounts = await db.meta_ad_accounts.find(
        {}, 
        {"_id": 0, "access_token": 0, "refresh_token": 0}
    ).to_list(100)
    return accounts

@api_router.post("/marketing/oauth/start")
async def start_meta_oauth(user = Depends(require_roles(["super_admin", "admin"]))):
    """Initiate Meta OAuth flow - returns URL to redirect user"""
    if not meta_ads_service:
        raise HTTPException(status_code=400, detail="Meta Ads credentials not configured. Add META_APP_ID and META_APP_SECRET to .env")
    
    # Generate state token for security
    state = str(uuid.uuid4())
    
    # Store state in DB for verification
    await db.meta_oauth_states.insert_one({
        "state": state,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    redirect_uri = f"{BACKEND_URL}/api/marketing/oauth/callback"
    oauth_url = meta_ads_service.get_oauth_url(redirect_uri, state)
    
    return {
        "oauth_url": oauth_url,
        "state": state
    }

@api_router.get("/marketing/oauth/callback")
async def meta_oauth_callback(code: str, state: str):
    """Handle OAuth callback from Meta"""
    if not meta_ads_service:
        raise HTTPException(status_code=400, detail="Meta Ads not configured")
    
    # Verify state token
    state_doc = await db.meta_oauth_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired state token")
    
    # Check expiry
    if datetime.fromisoformat(state_doc["expires_at"]) < datetime.now(timezone.utc):
        await db.meta_oauth_states.delete_one({"state": state})
        raise HTTPException(status_code=400, detail="State token expired")
    
    user_id = state_doc["user_id"]
    
    try:
        redirect_uri = f"{BACKEND_URL}/api/marketing/oauth/callback"
        
        # Exchange code for token
        token_data = await meta_ads_service.exchange_code_for_token(code, redirect_uri)
        access_token = token_data.get("access_token")
        
        # Get long-lived token
        long_lived_data = await meta_ads_service.get_long_lived_token(access_token)
        long_lived_token = long_lived_data.get("access_token")
        expires_in = long_lived_data.get("expires_in", 5184000)  # Default 60 days
        
        # Get user info
        user_info = await meta_ads_service.get_user_info(long_lived_token)
        
        # Get ad accounts
        ad_accounts = await meta_ads_service.get_ad_accounts(long_lived_token)
        
        # Store each ad account
        for account in ad_accounts:
            account_doc = {
                "id": str(uuid.uuid4()),
                "meta_account_id": account["id"],
                "name": account.get("name", "Unknown Account"),
                "access_token": long_lived_token,
                "token_expiry": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
                "currency": account.get("currency"),
                "timezone": account.get("timezone_name"),
                "status": "active" if account.get("account_status") == 1 else "disabled",
                "is_active": True,
                "connected_by": user_id,
                "meta_user_id": user_info.get("id"),
                "meta_user_name": user_info.get("name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "last_synced": None
            }
            
            # Upsert - update if exists, insert if not
            await db.meta_ad_accounts.update_one(
                {"meta_account_id": account["id"]},
                {"$set": account_doc},
                upsert=True
            )
        
        # Clean up state
        await db.meta_oauth_states.delete_one({"state": state})
        
        # Redirect to frontend with success
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return {"status": "success", "message": f"Connected {len(ad_accounts)} ad account(s)", "accounts_connected": len(ad_accounts)}
    
    except Exception as e:
        logger.error(f"Meta OAuth error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

@api_router.delete("/marketing/accounts/{account_id}")
async def disconnect_meta_account(account_id: str, user = Depends(require_roles(["super_admin", "admin"]))):
    """Disconnect a Meta Ads account"""
    result = await db.meta_ad_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Also delete related campaigns and leads
    await db.meta_campaigns.delete_many({"account_id": account_id})
    await db.meta_leads.delete_many({"account_id": account_id})
    
    return {"message": "Account disconnected"}

@api_router.post("/marketing/accounts/{account_id}/sync")
async def sync_meta_account(account_id: str, background_tasks: BackgroundTasks, user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Sync campaigns and leads from a Meta Ads account"""
    account = await db.meta_ad_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if not meta_ads_service:
        raise HTTPException(status_code=400, detail="Meta Ads not configured")
    
    # Run sync in background
    background_tasks.add_task(sync_meta_account_data, account_id, account["access_token"], account["meta_account_id"])
    
    return {"message": "Sync started", "account_id": account_id}

async def sync_meta_account_data(account_id: str, access_token: str, meta_account_id: str):
    """Background task to sync Meta Ads data"""
    try:
        # Sync campaigns
        campaigns = await meta_ads_service.get_campaigns(meta_account_id, access_token)
        
        for campaign in campaigns:
            campaign_doc = {
                "id": str(uuid.uuid4()),
                "account_id": account_id,
                "meta_campaign_id": campaign["id"],
                "name": campaign.get("name"),
                "objective": campaign.get("objective"),
                "status": campaign.get("status"),
                "daily_budget": campaign.get("daily_budget"),
                "lifetime_budget": campaign.get("lifetime_budget"),
                "created_time": campaign.get("created_time"),
                "start_time": campaign.get("start_time"),
                "stop_time": campaign.get("stop_time"),
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.meta_campaigns.update_one(
                {"meta_campaign_id": campaign["id"]},
                {"$set": campaign_doc},
                upsert=True
            )
            
            # Get campaign insights
            try:
                insights = await meta_ads_service.get_campaign_insights(campaign["id"], access_token)
                if insights:
                    await db.meta_campaigns.update_one(
                        {"meta_campaign_id": campaign["id"]},
                        {"$set": {"insights": insights}}
                    )
            except Exception as e:
                logger.warning(f"Could not get insights for campaign {campaign['id']}: {e}")
        
        # Update account last_synced
        await db.meta_ad_accounts.update_one(
            {"id": account_id},
            {"$set": {"last_synced": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"Synced {len(campaigns)} campaigns for account {account_id}")
        
    except Exception as e:
        logger.error(f"Error syncing Meta account {account_id}: {e}")
        await db.meta_ad_accounts.update_one(
            {"id": account_id},
            {"$set": {"status": "error", "error_message": str(e), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

@api_router.get("/marketing/campaigns")
async def get_meta_campaigns(
    account_id: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "marketing"]))
):
    """Get all campaigns, optionally filtered by account"""
    query = {}
    if account_id:
        query["account_id"] = account_id
    
    campaigns = await db.meta_campaigns.find(query, {"_id": 0}).to_list(500)
    return campaigns

@api_router.get("/marketing/campaigns/{campaign_id}/insights")
async def get_campaign_insights(
    campaign_id: str,
    date_preset: str = "last_30d",
    user = Depends(require_roles(["super_admin", "admin", "marketing"]))
):
    """Get insights for a specific campaign"""
    campaign = await db.meta_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get account for access token
    account = await db.meta_ad_accounts.find_one({"id": campaign["account_id"]}, {"_id": 0})
    if not account or not meta_ads_service:
        return campaign.get("insights", {})
    
    try:
        insights = await meta_ads_service.get_campaign_insights(
            campaign["meta_campaign_id"], 
            account["access_token"],
            date_preset
        )
        return insights
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        return campaign.get("insights", {})

@api_router.get("/marketing/dashboard")
async def get_marketing_dashboard(
    account_id: Optional[str] = None,
    date_preset: str = "last_30d",
    user = Depends(require_roles(["super_admin", "admin", "marketing"]))
):
    """Get marketing dashboard metrics"""
    # Get accounts
    account_query = {}
    if account_id:
        account_query["id"] = account_id
    
    accounts = await db.meta_ad_accounts.find(account_query, {"_id": 0, "access_token": 0, "refresh_token": 0}).to_list(100)
    
    # Get campaigns with insights
    campaign_query = {}
    if account_id:
        campaign_query["account_id"] = account_id
    
    campaigns = await db.meta_campaigns.find(campaign_query, {"_id": 0}).to_list(500)
    
    # Aggregate metrics
    total_spend = 0
    total_impressions = 0
    total_clicks = 0
    total_reach = 0
    total_leads = 0
    
    campaign_metrics = []
    for campaign in campaigns:
        insights = campaign.get("insights", {})
        spend = float(insights.get("spend", 0))
        impressions = int(insights.get("impressions", 0))
        clicks = int(insights.get("clicks", 0))
        reach = int(insights.get("reach", 0))
        
        # Calculate leads from actions
        actions = insights.get("actions", [])
        leads = 0
        for action in actions if isinstance(actions, list) else []:
            if action.get("action_type") == "lead":
                leads += int(action.get("value", 0))
        
        total_spend += spend
        total_impressions += impressions
        total_clicks += clicks
        total_reach += reach
        total_leads += leads
        
        # Calculate campaign metrics
        cpl = spend / leads if leads > 0 else 0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0
        cpc = spend / clicks if clicks > 0 else 0
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        
        campaign_metrics.append({
            "id": campaign["id"],
            "name": campaign["name"],
            "status": campaign["status"],
            "objective": campaign.get("objective"),
            "spend": spend,
            "impressions": impressions,
            "clicks": clicks,
            "reach": reach,
            "leads": leads,
            "cpl": round(cpl, 2),
            "cpm": round(cpm, 2),
            "cpc": round(cpc, 2),
            "ctr": round(ctr, 2)
        })
    
    # Calculate overall metrics
    overall_cpl = total_spend / total_leads if total_leads > 0 else 0
    overall_cpm = (total_spend / total_impressions * 1000) if total_impressions > 0 else 0
    overall_cpc = total_spend / total_clicks if total_clicks > 0 else 0
    overall_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    frequency = total_impressions / total_reach if total_reach > 0 else 0
    
    # Get leads from DB
    lead_query = {}
    if account_id:
        lead_query["account_id"] = account_id
    db_leads = await db.meta_leads.count_documents(lead_query)
    
    return {
        "period": date_preset,
        "accounts": accounts,
        "summary": {
            "total_spend": round(total_spend, 2),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "total_reach": total_reach,
            "total_leads": total_leads,
            "db_leads": db_leads,
            "cpl": round(overall_cpl, 2),
            "cpm": round(overall_cpm, 2),
            "cpc": round(overall_cpc, 2),
            "ctr": round(overall_ctr, 2),
            "frequency": round(frequency, 2)
        },
        "campaigns": campaign_metrics
    }

@api_router.get("/marketing/leads")
async def get_meta_leads(
    account_id: Optional[str] = None,
    synced_to_crm: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    user = Depends(require_roles(["super_admin", "admin", "marketing", "sales_manager"]))
):
    """Get leads from Meta Ads"""
    query = {}
    if account_id:
        query["account_id"] = account_id
    if synced_to_crm is not None:
        query["synced_to_crm"] = synced_to_crm
    
    leads = await db.meta_leads.find(query, {"_id": 0}).sort("received_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.meta_leads.count_documents(query)
    
    return {
        "leads": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.post("/marketing/leads/{lead_id}/import")
async def import_meta_lead_to_crm(lead_id: str, user = Depends(require_roles(["super_admin", "admin", "marketing", "sales_manager"]))):
    """Import a Meta lead to the CRM"""
    meta_lead = await db.meta_leads.find_one({"id": lead_id}, {"_id": 0})
    if not meta_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if meta_lead.get("synced_to_crm"):
        raise HTTPException(status_code=400, detail="Lead already imported to CRM")
    
    # Parse lead data
    lead_data = meta_lead.get("lead_data", {})
    
    # Create CRM lead
    now = datetime.now(timezone.utc)
    crm_lead = {
        "id": str(uuid.uuid4()),
        "full_name": lead_data.get("full_name", lead_data.get("name", "Unknown")),
        "phone": lead_data.get("phone_number", lead_data.get("phone", "")),
        "email": lead_data.get("email", ""),
        "country": lead_data.get("country", ""),
        "city": lead_data.get("city", ""),
        "lead_source": "meta_ads",
        "campaign_name": meta_lead.get("campaign_name", ""),
        "notes": f"Imported from Meta Ads. Form: {meta_lead.get('form_name', 'Unknown')}",
        "stage": "new_lead",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "last_activity": now.isoformat(),
        "assigned_at": None,
        "first_contact_at": None,
        "sla_status": "ok",
        "in_pool": False,
        "meta_lead_id": lead_id
    }
    
    try:
        await db.leads.insert_one(crm_lead)
        
        # Update meta lead
        await db.meta_leads.update_one(
            {"id": lead_id},
            {"$set": {"synced_to_crm": True, "crm_lead_id": crm_lead["id"]}}
        )
        
        return {"message": "Lead imported to CRM", "crm_lead_id": crm_lead["id"]}
    except Exception as e:
        if "duplicate key" in str(e):
            raise HTTPException(status_code=400, detail="A lead with this phone number already exists in CRM")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/marketing/leads/import-all")
async def import_all_meta_leads(
    account_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    user = Depends(require_roles(["super_admin", "admin"]))
):
    """Import all unsynced Meta leads to CRM"""
    query = {"synced_to_crm": False}
    if account_id:
        query["account_id"] = account_id
    
    unsynced_count = await db.meta_leads.count_documents(query)
    
    if unsynced_count == 0:
        return {"message": "No leads to import", "imported": 0}
    
    # Import in background
    background_tasks.add_task(bulk_import_meta_leads, query, user["id"])
    
    return {"message": f"Importing {unsynced_count} leads in background", "queued": unsynced_count}

async def bulk_import_meta_leads(query: dict, user_id: str):
    """Background task to bulk import leads"""
    cursor = db.meta_leads.find(query, {"_id": 0})
    imported = 0
    errors = 0
    
    async for meta_lead in cursor:
        try:
            lead_data = meta_lead.get("lead_data", {})
            now = datetime.now(timezone.utc)
            
            crm_lead = {
                "id": str(uuid.uuid4()),
                "full_name": lead_data.get("full_name", lead_data.get("name", "Unknown")),
                "phone": lead_data.get("phone_number", lead_data.get("phone", "")),
                "email": lead_data.get("email", ""),
                "country": lead_data.get("country", ""),
                "city": lead_data.get("city", ""),
                "lead_source": "meta_ads",
                "campaign_name": meta_lead.get("campaign_name", ""),
                "notes": f"Imported from Meta Ads. Form: {meta_lead.get('form_name', 'Unknown')}",
                "stage": "new_lead",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "last_activity": now.isoformat(),
                "assigned_at": None,
                "first_contact_at": None,
                "sla_status": "ok",
                "in_pool": False,
                "meta_lead_id": meta_lead["id"]
            }
            
            await db.leads.insert_one(crm_lead)
            await db.meta_leads.update_one(
                {"id": meta_lead["id"]},
                {"$set": {"synced_to_crm": True, "crm_lead_id": crm_lead["id"]}}
            )
            imported += 1
        except Exception as e:
            errors += 1
            logger.warning(f"Error importing lead {meta_lead.get('id')}: {e}")
    
    logger.info(f"Bulk import complete: {imported} imported, {errors} errors")

# Webhook endpoint for real-time lead data
@api_router.get("/marketing/webhook")
async def verify_meta_webhook(request: Request):
    """
    Meta webhook verification endpoint
    Meta sends: hub.mode, hub.challenge, hub.verify_token as query params
    Must return the challenge as plain text (not JSON)
    """
    from fastapi.responses import PlainTextResponse
    
    # Get query params (Meta uses dots which FastAPI doesn't handle well)
    params = dict(request.query_params)
    
    # Try both formats (with dots and underscores)
    hub_mode = params.get("hub.mode") or params.get("hub_mode", "")
    hub_challenge = params.get("hub.challenge") or params.get("hub_challenge", "")
    hub_verify_token = params.get("hub.verify_token") or params.get("hub_verify_token", "")
    
    logger.info(f"Meta webhook verification: mode={hub_mode}, token={hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == META_WEBHOOK_VERIFY_TOKEN:
        # Must return challenge as plain text, not JSON
        return PlainTextResponse(content=hub_challenge, status_code=200)
    
    logger.warning(f"Meta webhook verification failed: mode={hub_mode}, token_match={hub_verify_token == META_WEBHOOK_VERIFY_TOKEN}")
    raise HTTPException(status_code=403, detail="Verification failed")

@api_router.post("/marketing/webhook")
async def receive_meta_webhook(request_body: Dict, background_tasks: BackgroundTasks):
    """Receive webhook notifications from Meta"""
    # Process in background
    background_tasks.add_task(process_meta_webhook, request_body)
    return {"status": "received"}

async def process_meta_webhook(data: dict):
    """Process Meta webhook data - saves leads directly to main leads collection (Leads Pool)"""
    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") == "leadgen":
                    lead_value = change.get("value", {})
                    leadgen_id = lead_value.get("leadgen_id")
                    form_id = lead_value.get("form_id")
                    page_id = lead_value.get("page_id")
                    ad_id = lead_value.get("ad_id")
                    created_time = lead_value.get("created_time")
                    
                    # Find account by page
                    account = await db.meta_ad_accounts.find_one(
                        {"meta_page_id": page_id},
                        {"_id": 0}
                    )
                    
                    if account and meta_ads_service:
                        # Get lead details from Meta
                        try:
                            lead_details = await meta_ads_service.get_lead_details(
                                leadgen_id, 
                                account["access_token"]
                            )
                            
                            # Parse field data
                            field_data = lead_details.get("field_data", [])
                            parsed_data = meta_ads_service.parse_lead_field_data(field_data)
                            
                            # Check for duplicate by phone/email in main leads collection
                            phone = parsed_data.get("phone_number", "")
                            email = parsed_data.get("email", "")
                            
                            existing_lead = None
                            if phone:
                                existing_lead = await db.leads.find_one({"phone": phone})
                            if not existing_lead and email:
                                existing_lead = await db.leads.find_one({"email": email})
                            
                            if existing_lead:
                                logger.info(f"Duplicate lead from Meta Ads (phone/email already exists): {leadgen_id}")
                                continue
                            
                            # Get round-robin agent for assignment
                            assigned_agent = await get_round_robin_agent("sales_executive")
                            
                            # Create lead directly in main leads collection (Leads Pool)
                            now = datetime.now(timezone.utc).isoformat()
                            lead_doc = {
                                "id": str(uuid.uuid4()),
                                "full_name": parsed_data.get("full_name", f"Meta Lead {leadgen_id[:8]}"),
                                "phone": phone,
                                "email": email,
                                "city": parsed_data.get("city", ""),
                                "country": parsed_data.get("country", ""),
                                "lead_source": "meta_ads",
                                "campaign_name": lead_details.get("campaign_name", ""),
                                "notes": f"Form: {lead_details.get('form_name', form_id)}\nAd ID: {ad_id}",
                                "stage": "new_lead",
                                "assigned_to": assigned_agent["id"] if assigned_agent else None,
                                "assigned_to_name": assigned_agent.get("full_name") if assigned_agent else None,
                                "assigned_at": now if assigned_agent else None,
                                "in_pool": not bool(assigned_agent),
                                "meta_lead_id": leadgen_id,
                                "meta_form_id": form_id,
                                "meta_campaign_id": lead_details.get("campaign_id"),
                                "created_at": now,
                                "updated_at": now,
                                "last_activity": now
                            }
                            
                            await db.leads.insert_one(lead_doc)
                            logger.info(f"Meta lead {leadgen_id} added to Leads Pool, assigned to: {assigned_agent.get('full_name') if assigned_agent else 'Unassigned'}")
                            
                            # Notify assigned agent
                            if assigned_agent:
                                await create_notification(
                                    assigned_agent["id"],
                                    "New Lead Assigned",
                                    f"New lead from Meta Ads: {lead_doc['full_name']}",
                                    "info",
                                    "/sales",
                                    entity_type="lead",
                                    entity_id=lead_doc["id"]
                                )
                            
                        except Exception as e:
                            logger.error(f"Error fetching lead details: {e}")
                    else:
                        logger.warning(f"No account found for page {page_id}")
                        
    except Exception as e:
        logger.error(f"Error processing Meta webhook: {e}")

# ==================== GOOGLE SHEETS CONNECTOR ====================

# Initialize Google Sheets Service
GOOGLE_SHEETS_CLIENT_ID = os.environ.get('GOOGLE_SHEETS_CLIENT_ID', '')
GOOGLE_SHEETS_CLIENT_SECRET = os.environ.get('GOOGLE_SHEETS_CLIENT_SECRET', '')

sheets_service = None
if GOOGLE_SHEETS_CLIENT_ID and GOOGLE_SHEETS_CLIENT_SECRET:
    sheets_service = GoogleSheetsService(db)
    logger.info("Google Sheets Service initialized")
else:
    logger.warning("Google Sheets credentials not configured - Sheet connectors disabled")

# Pydantic models for Google Sheets
class SheetConnectorCreate(BaseModel):
    name: str
    sheet_url: str
    sheet_name: str = "Sheet1"
    assigned_agent_ids: List[str]  # Can be one or multiple agents
    column_mapping: Optional[Dict[str, str]] = None  # Custom column mapping
    auto_sync_enabled: bool = True
    sync_interval_minutes: int = 5

class SheetConnectorResponse(BaseModel):
    id: str
    name: str
    sheet_url: str
    sheet_id: str
    sheet_name: str
    assigned_agent_ids: List[str]
    assigned_agent_names: List[str]
    column_mapping: Dict[str, str]
    auto_sync_enabled: bool
    sync_interval_minutes: int
    is_connected: bool
    last_sync: Optional[Dict] = None
    last_synced_at: Optional[str] = None
    created_at: str
    created_by: str
    created_by_name: str

@api_router.get("/connectors/config")
async def get_connectors_config(user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Get connectors configuration status"""
    return {
        "google_sheets_configured": bool(GOOGLE_SHEETS_CLIENT_ID and GOOGLE_SHEETS_CLIENT_SECRET),
        "google_sheets_oauth_url": f"{BACKEND_URL}/api/connectors/google-sheets/oauth" if BACKEND_URL else None
    }

@api_router.get("/connectors/google-sheets")
async def get_sheet_connectors(user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Get all Google Sheet connectors"""
    connectors = await db.sheet_connectors.find({}, {"_id": 0}).to_list(100)
    
    # Enrich with agent names
    for conn in connectors:
        agent_names = []
        for agent_id in conn.get("assigned_agent_ids", []):
            agent = await db.users.find_one({"id": agent_id}, {"full_name": 1})
            if agent:
                agent_names.append(agent.get("full_name", "Unknown"))
        conn["assigned_agent_names"] = agent_names
    
    return connectors

@api_router.post("/connectors/google-sheets")
async def create_sheet_connector(data: SheetConnectorCreate, user = Depends(require_roles(["super_admin", "admin"]))):
    """Create a new Google Sheet connector"""
    if not sheets_service:
        raise HTTPException(status_code=400, detail="Google Sheets not configured. Add GOOGLE_SHEETS_CLIENT_ID and GOOGLE_SHEETS_CLIENT_SECRET to .env")
    
    # Extract sheet ID from URL
    sheet_id = extract_sheet_id(data.sheet_url)
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Invalid Google Sheets URL")
    
    # Check for duplicate
    existing = await db.sheet_connectors.find_one({"sheet_id": sheet_id})
    if existing:
        raise HTTPException(status_code=400, detail="This sheet is already connected")
    
    # Validate agents exist
    for agent_id in data.assigned_agent_ids:
        agent = await db.users.find_one({"id": agent_id, "is_active": True})
        if not agent:
            raise HTTPException(status_code=400, detail=f"Agent {agent_id} not found or inactive")
    
    # Get agent names
    agent_names = []
    for agent_id in data.assigned_agent_ids:
        agent = await db.users.find_one({"id": agent_id}, {"full_name": 1})
        if agent:
            agent_names.append(agent.get("full_name", "Unknown"))
    
    now = datetime.now(timezone.utc).isoformat()
    connector = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "sheet_url": data.sheet_url,
        "sheet_id": sheet_id,
        "sheet_name": data.sheet_name,
        "assigned_agent_ids": data.assigned_agent_ids,
        "assigned_agent_names": agent_names,
        "column_mapping": data.column_mapping or DEFAULT_COLUMN_MAPPING,
        "auto_sync_enabled": data.auto_sync_enabled,
        "sync_interval_minutes": data.sync_interval_minutes,
        "is_connected": False,  # Need OAuth first
        "oauth_tokens": None,
        "last_sync": None,
        "last_synced_at": None,
        "created_at": now,
        "created_by": user["id"],
        "created_by_name": user.get("full_name", ""),
        "updated_at": now
    }
    
    await db.sheet_connectors.insert_one(connector)
    
    # Log audit
    await log_audit(user, "create", "sheet_connector", connector["id"], data.name, 
                    {"sheet_url": data.sheet_url, "agents": data.assigned_agent_ids})
    
    # Return without sensitive data
    del connector["oauth_tokens"]
    return connector

@api_router.put("/connectors/google-sheets/{connector_id}")
async def update_sheet_connector(connector_id: str, data: Dict, user = Depends(require_roles(["super_admin", "admin"]))):
    """Update a Google Sheet connector"""
    connector = await db.sheet_connectors.find_one({"id": connector_id})
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # Fields that can be updated
    allowed_fields = ["name", "sheet_name", "assigned_agent_ids", "column_mapping", 
                      "auto_sync_enabled", "sync_interval_minutes"]
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update agent names if agents changed
    if "assigned_agent_ids" in update_data:
        agent_names = []
        for agent_id in update_data["assigned_agent_ids"]:
            agent = await db.users.find_one({"id": agent_id}, {"full_name": 1})
            if agent:
                agent_names.append(agent.get("full_name", "Unknown"))
        update_data["assigned_agent_names"] = agent_names
    
    await db.sheet_connectors.update_one({"id": connector_id}, {"$set": update_data})
    
    await log_audit(user, "update", "sheet_connector", connector_id, connector.get("name"), update_data)
    
    updated = await db.sheet_connectors.find_one({"id": connector_id}, {"_id": 0, "oauth_tokens": 0})
    return updated

@api_router.delete("/connectors/google-sheets/{connector_id}")
async def delete_sheet_connector(connector_id: str, user = Depends(require_roles(["super_admin", "admin"]))):
    """Delete a Google Sheet connector"""
    connector = await db.sheet_connectors.find_one({"id": connector_id})
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    await db.sheet_connectors.delete_one({"id": connector_id})
    
    await log_audit(user, "delete", "sheet_connector", connector_id, connector.get("name"))
    
    return {"message": "Connector deleted"}

@api_router.get("/connectors/google-sheets/{connector_id}/oauth")
async def start_sheets_oauth(connector_id: str, user = Depends(require_roles(["super_admin", "admin"]))):
    """Start Google Sheets OAuth flow for a connector"""
    if not sheets_service:
        raise HTTPException(status_code=400, detail="Google Sheets not configured")
    
    connector = await db.sheet_connectors.find_one({"id": connector_id})
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    # Generate state token
    state = str(uuid.uuid4())
    
    # Get auth URL and code verifier (for PKCE)
    auth_url, code_verifier = await sheets_service.get_auth_url(state)
    
    # Store state and code_verifier for verification and token exchange
    await db.sheets_oauth_states.insert_one({
        "state": state,
        "connector_id": connector_id,
        "user_id": user["id"],
        "code_verifier": code_verifier,  # Store for PKCE
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10)
    })
    
    return {"auth_url": auth_url}

@api_router.get("/connectors/google-sheets/callback")
async def sheets_oauth_callback(code: str = "", state: str = "", error: str = ""):
    """Handle Google OAuth callback"""
    from fastapi.responses import HTMLResponse
    
    if error:
        return HTMLResponse(f"""
        <html><body>
        <h2>Authorization Failed</h2>
        <p>Error: {error}</p>
        <script>setTimeout(() => window.close(), 3000);</script>
        </body></html>
        """)
    
    # Verify state
    state_doc = await db.sheets_oauth_states.find_one({"state": state})
    if not state_doc:
        return HTMLResponse("""
        <html><body>
        <h2>Invalid State</h2>
        <p>The authorization request has expired or is invalid.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
        </body></html>
        """)
    
    connector_id = state_doc["connector_id"]
    code_verifier = state_doc.get("code_verifier")
    
    # Clean up state from DB
    await db.sheets_oauth_states.delete_one({"state": state})
    
    if not code_verifier:
        return HTMLResponse("""
        <html><body>
        <h2>Authorization Failed</h2>
        <p>Missing code verifier. Please try connecting again.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
        </body></html>
        """)
    
    try:
        # Exchange code for tokens with PKCE code_verifier
        tokens = await sheets_service.exchange_code(code, code_verifier)
        
        # Update connector with tokens
        await db.sheet_connectors.update_one(
            {"id": connector_id},
            {"$set": {
                "oauth_tokens": tokens,
                "is_connected": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return HTMLResponse("""
        <html><body>
        <h2>Success!</h2>
        <p>Google Sheets connected successfully. You can close this window.</p>
        <script>
            setTimeout(() => {
                if (window.opener) {
                    window.opener.location.reload();
                }
                window.close();
            }, 2000);
        </script>
        </body></html>
        """)
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        return HTMLResponse(f"""
        <html><body>
        <h2>Authorization Failed</h2>
        <p>Error: {str(e)}</p>
        <script>setTimeout(() => window.close(), 5000);</script>
        </body></html>
        """)

@api_router.post("/connectors/google-sheets/{connector_id}/sync")
async def trigger_sheet_sync(connector_id: str, background_tasks: BackgroundTasks, user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Manually trigger a sync for a Google Sheet connector"""
    connector = await db.sheet_connectors.find_one({"id": connector_id})
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    if not connector.get("is_connected") or not connector.get("oauth_tokens"):
        raise HTTPException(status_code=400, detail="Connector not connected. Please complete OAuth first.")
    
    # Run sync in background
    background_tasks.add_task(
        run_sheet_sync,
        connector_id,
        connector["oauth_tokens"],
        connector["sheet_id"],
        connector["sheet_name"],
        connector["column_mapping"],
        connector["assigned_agent_ids"]
    )
    
    return {"message": "Sync started", "connector_id": connector_id}

async def run_sheet_sync(connector_id: str, tokens: Dict, sheet_id: str, sheet_name: str, column_mapping: Dict, assigned_agents: List[str]):
    """Background task to sync leads from Google Sheet"""
    if not sheets_service:
        logger.error("Sheets service not initialized")
        return
    
    try:
        stats = await sheets_service.sync_sheet_leads(
            connector_id=connector_id,
            token_data=tokens,
            spreadsheet_id=sheet_id,
            sheet_name=sheet_name,
            column_mapping=column_mapping,
            assigned_agents=assigned_agents
        )
        logger.info(f"Sheet sync complete for {connector_id}: {stats}")
        
        # Update tokens if refreshed
        # (handled inside sync_sheet_leads)
        
    except Exception as e:
        logger.error(f"Sheet sync error for {connector_id}: {e}")
        await db.sheet_connectors.update_one(
            {"id": connector_id},
            {"$set": {
                "last_sync": {"error": str(e), "synced_at": datetime.now(timezone.utc).isoformat()},
                "last_synced_at": datetime.now(timezone.utc).isoformat()
            }}
        )

@api_router.get("/connectors/google-sheets/{connector_id}/preview")
async def preview_sheet_data(connector_id: str, user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Preview data from a connected Google Sheet"""
    connector = await db.sheet_connectors.find_one({"id": connector_id})
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    if not connector.get("is_connected") or not connector.get("oauth_tokens"):
        raise HTTPException(status_code=400, detail="Connector not connected")
    
    try:
        # Read first 10 rows
        range_name = f"'{connector['sheet_name']}'!A1:Z10"
        rows = await sheets_service.read_sheet(connector["oauth_tokens"], connector["sheet_id"], range_name)
        
        return {
            "rows": rows,
            "column_mapping": connector["column_mapping"],
            "sheet_name": connector["sheet_name"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading sheet: {str(e)}")

@api_router.get("/connectors/agents")
async def get_available_agents(user = Depends(require_roles(["super_admin", "admin", "marketing"]))):
    """Get list of agents available for lead assignment"""
    agents = await db.users.find(
        {
            "is_active": True,
            "role": {"$in": ["sales_executive", "team_leader", "sales_manager"]}
        },
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1}
    ).to_list(500)
    return agents

# Auto-sync scheduler for Google Sheets
async def run_auto_sync():
    """Run auto-sync for all enabled sheet connectors"""
    if not sheets_service:
        return
    
    try:
        connectors = await db.sheet_connectors.find({
            "auto_sync_enabled": True,
            "is_connected": True,
            "oauth_tokens": {"$ne": None}
        }).to_list(100)
        
        for conn in connectors:
            # Check if enough time has passed since last sync
            last_synced = conn.get("last_synced_at")
            interval = conn.get("sync_interval_minutes", 5)
            
            should_sync = True
            if last_synced:
                last_sync_time = datetime.fromisoformat(last_synced.replace('Z', '+00:00'))
                if last_sync_time.tzinfo is None:
                    last_sync_time = last_sync_time.replace(tzinfo=timezone.utc)
                
                next_sync = last_sync_time + timedelta(minutes=interval)
                should_sync = datetime.now(timezone.utc) >= next_sync
            
            if should_sync:
                logger.info(f"Auto-syncing sheet connector: {conn['name']}")
                await run_sheet_sync(
                    conn["id"],
                    conn["oauth_tokens"],
                    conn["sheet_id"],
                    conn["sheet_name"],
                    conn["column_mapping"],
                    conn["assigned_agent_ids"]
                )
                
    except Exception as e:
        logger.error(f"Auto-sync error: {e}")

# ==================== FINANCE VERIFICATION ====================

@api_router.get("/finance/verifications")
async def get_finance_verifications(
    status: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get all pending payment verifications for Finance team"""
    query = {}
    if status:
        query["status"] = status
    
    verifications = await db.finance_verifications.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(500)
    return verifications

@api_router.get("/finance/verifications/{verification_id}")
async def get_verification_detail(
    verification_id: str,
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get verification detail"""
    verification = await db.finance_verifications.find_one({"id": verification_id}, {"_id": 0})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    return verification

@api_router.post("/finance/verifications/{verification_id}/verify")
async def verify_payment(
    verification_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Finance team verifies payment and creates transaction. Settlements first, then journal entries."""
    verification = await db.finance_verifications.find_one({"id": verification_id})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    if verification["status"] != "pending_verification":
        raise HTTPException(status_code=400, detail="Verification already processed")
    
    now = datetime.now(timezone.utc)
    is_split_payment = verification.get("is_split_payment", False)
    payment_splits = verification.get("payment_splits", [])
    
    # For split payments, handle each payment method separately
    settlement_records = []
    all_immediate = True
    
    if is_split_payment and payment_splits:
        # Process each split payment
        split_references = data.get("split_references", [])
        for idx, split in enumerate(payment_splits):
            payment_method = split.get("method", "").lower()
            amount = split.get("amount", 0)
            reference = split_references[idx].get("reference", "") if idx < len(split_references) else ""
            
            settlement_info = calculate_settlement_date(payment_method, now)
            
            if settlement_info["status"] == "pending_settlement":
                all_immediate = False
                settlement_records.append({
                    "id": str(uuid.uuid4()),
                    "payment_method": payment_method,
                    "amount": amount,
                    "reference": reference,
                    "expected_settlement_date": settlement_info["settlement_date"],
                    "settlement_type": settlement_info["type"],
                })
    else:
        # Single payment
        payment_method = (verification.get("payment_method") or "").lower()
        settlement_info = calculate_settlement_date(payment_method, now)
        if settlement_info["status"] == "pending_settlement":
            all_immediate = False
            settlement_records.append({
                "id": str(uuid.uuid4()),
                "payment_method": payment_method,
                "amount": verification["sale_amount"],
                "reference": data.get("payment_reference", ""),
                "expected_settlement_date": settlement_info["settlement_date"],
                "settlement_type": settlement_info["type"],
            })
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "type": "enrollment_payment",
        "verification_id": verification_id,
        "lead_id": verification.get("lead_id"),
        "student_id": verification.get("student_id"),
        "customer_name": verification["customer_name"],
        "course_id": verification.get("course_id"),
        "course_name": verification.get("course_name"),
        "amount": verification["sale_amount"],
        "currency": "AED",
        "payment_method": verification.get("payment_method", ""),
        "is_split_payment": is_split_payment,
        "payment_splits": payment_splits,
        "split_references": data.get("split_references", []),
        "payment_reference": data.get("payment_reference", "") or verification.get("transaction_id", ""),
        "payment_date": data.get("payment_date", now.strftime("%Y-%m-%d")),
        "sales_executive_id": verification.get("sales_executive_id"),
        "sales_executive_name": verification.get("sales_executive_name"),
        "verified_by": user["id"],
        "verified_by_name": user["full_name"],
        "status": "pending_settlement" if not all_immediate else "completed",
        "settlement_status": "pending" if not all_immediate else "settled",
        "notes": data.get("notes", ""),
        "created_at": now.isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Create pending settlement records for non-immediate payments
    for settlement in settlement_records:
        settlement_record = {
            "id": settlement["id"],
            "transaction_id": transaction["id"],
            "verification_id": verification_id,
            "student_id": verification.get("student_id"),
            "customer_name": verification["customer_name"],
            "course_name": verification.get("course_name"),
            "amount": settlement["amount"],
            "currency": "AED",
            "payment_method": settlement["payment_method"],
            "payment_gateway": settlement["payment_method"],
            "payment_reference": settlement["reference"],
            "payment_date": data.get("payment_date", now.strftime("%Y-%m-%d")),
            "expected_settlement_date": settlement["expected_settlement_date"],
            "settlement_type": settlement["settlement_type"],
            "status": "pending",
            "sales_executive_id": verification.get("sales_executive_id"),
            "sales_executive_name": verification.get("sales_executive_name"),
            "created_at": now.isoformat(),
            "settled_at": None,
            "settled_by": None,
            "notes": ""
        }
        await db.pending_settlements.insert_one(settlement_record)
    
    # Only create journal entry if all payments are immediate (no pending settlements)
    journal_entry_id = None
    receivable_id = None
    
    if all_immediate:
        journal_entry = {
            "id": str(uuid.uuid4()),
            "type": "revenue",
            "transaction_id": transaction["id"],
            "student_id": verification.get("student_id"),
            "customer_name": verification["customer_name"],
            "description": f"Course enrollment - {verification.get('course_name', 'N/A')} - {verification['customer_name']}",
            "debit_account": "bank",
            "credit_account": "revenue",
            "amount": verification["sale_amount"],
            "currency": "AED",
            "payment_method": verification.get("payment_method", ""),
            "reference": data.get("payment_reference", "") or verification.get("transaction_id", ""),
            "date": data.get("payment_date", now.strftime("%Y-%m-%d")),
            "status": "posted",
            "created_by": user["id"],
            "created_by_name": user["full_name"],
            "created_at": now.isoformat()
        }
        await db.journal_entries.insert_one(journal_entry)
        journal_entry_id = journal_entry["id"]
    
    # Create CLT Receivables entry for all verified payments
    receivable = {
        "id": str(uuid.uuid4()),
        "date": data.get("payment_date", now.strftime("%Y-%m-%d")),
        "account_name": verification["customer_name"],
        "amount": verification["sale_amount"],
        "currency": "AED",
        "amount_in_aed": verification["sale_amount"],
        "payment_method": verification.get("payment_method") or "",
        "payment_for": verification.get("course_name") or "Course Enrollment",
        "transaction_id": data.get("payment_reference", "") or verification.get("transaction_id", "") or "",
        "verification_id": verification_id,
        "lead_id": verification.get("lead_id"),
        "student_id": verification.get("student_id"),
        "sales_executive_id": verification.get("sales_executive_id"),
        "sales_executive_name": verification.get("sales_executive_name"),
        "is_split_payment": is_split_payment,
        "payment_splits": payment_splits,
        "settlement_status": "settled" if all_immediate else "pending",
        "source": "finance_verification",
        "created_by": user["id"],
        "created_by_name": user["full_name"],
        "created_at": now.isoformat()
    }
    await db.finance_clt_receivables.insert_one(receivable)
    receivable_id = receivable["id"]
    logger.info(f"Created receivable entry {receivable_id} for verification {verification_id}")
    
    # Update verification record
    await db.finance_verifications.update_one(
        {"id": verification_id},
        {"$set": {
            "status": "verified",
            "verified_at": now.isoformat(),
            "verified_by": user["id"],
            "verified_by_name": user["full_name"],
            "transaction_id": transaction["id"],
            "journal_entry_id": journal_entry_id,
            "receivable_id": receivable_id,
            "settlement_status": "pending" if not all_immediate else "settled",
            "pending_settlement_count": len(settlement_records),
            "verified_references": data.get("split_references", []) if is_split_payment else [{"reference": data.get("payment_reference", "")}]
        }}
    )
    
    # Update student record
    if verification.get("student_id"):
        await db.students.update_one(
            {"id": verification["student_id"]},
            {"$set": {"payment_verified": True, "payment_verified_at": now.isoformat()}}
        )
    
    # Update lead
    if verification.get("lead_id"):
        await db.leads.update_one(
            {"id": verification["lead_id"]},
            {"$set": {"payment_verified": True, "payment_verified_at": now.isoformat()}}
        )
    
    # Notify sales executive
    if verification.get("sales_executive_id"):
        if all_immediate:
            await create_notification(
                verification["sales_executive_id"],
                "Payment Verified & Completed",
                f"Payment for {verification['customer_name']} (AED {verification['sale_amount']:.2f}) has been verified. Journal entry created.",
                "success",
                f"/sales"
            )
        else:
            await create_notification(
                verification["sales_executive_id"],
                "Payment Verified - Pending Settlement",
                f"Payment for {verification['customer_name']} (AED {verification['sale_amount']:.2f}) verified. {len(settlement_records)} settlement(s) pending from payment gateway.",
                "success",
                f"/sales"
            )
    
    await log_audit(user, "verify", "finance_verification", verification_id, verification["customer_name"],
                    {"amount": verification["sale_amount"], "transaction_id": transaction["id"], 
                     "settlement_count": len(settlement_records), "all_immediate": all_immediate})
    
    return {
        "success": True, 
        "transaction_id": transaction["id"], 
        "journal_entry_id": journal_entry_id,
        "receivable_id": receivable_id,
        "settlement_status": "settled" if all_immediate else "pending",
        "pending_settlements": len(settlement_records),
        "message": "Payment verified and added to Receivables. " + ("Journal entry created." if all_immediate else f"{len(settlement_records)} settlement(s) pending. Journal entry will be created after settlement.")
    }

@api_router.post("/finance/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Finance team rejects payment verification"""
    verification = await db.finance_verifications.find_one({"id": verification_id})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")
    
    if verification["status"] != "pending_verification":
        raise HTTPException(status_code=400, detail="Verification already processed")
    
    rejection_reason = data.get("rejection_reason")
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    now = datetime.now(timezone.utc)
    
    # Update verification record
    await db.finance_verifications.update_one(
        {"id": verification_id},
        {"$set": {
            "status": "rejected",
            "verified_at": now.isoformat(),
            "verified_by": user["id"],
            "verified_by_name": user["full_name"],
            "rejection_reason": rejection_reason
        }}
    )
    
    # Revert lead stage back to in_progress (they need to resolve payment)
    if verification.get("lead_id"):
        await db.leads.update_one(
            {"id": verification["lead_id"]},
            {"$set": {
                "stage": "in_progress",
                "payment_verification_failed": True,
                "payment_rejection_reason": rejection_reason,
                "updated_at": now.isoformat()
            }}
        )
    
    # Get sales executive details for team leader lookup
    sales_exec = None
    team_leader = None
    if verification.get("sales_executive_id"):
        sales_exec = await db.users.find_one({"id": verification["sales_executive_id"]}, {"_id": 0})
        if sales_exec and sales_exec.get("team_leader_id"):
            team_leader = await db.users.find_one({"id": sales_exec["team_leader_id"]}, {"_id": 0})
    
    notification_message = f"Payment for {verification['customer_name']} (AED {verification.get('sale_amount', 0):,.2f}) was REJECTED by Finance.\n\nReason: {rejection_reason}\n\nPlease contact the customer to resolve this issue and resubmit the payment."
    
    # Notify sales executive
    if verification.get("sales_executive_id"):
        await create_notification(
            verification["sales_executive_id"],
            "Payment Verification REJECTED - Action Required",
            notification_message,
            "error",
            f"/sales"
        )
    
    # Notify team leader
    if team_leader:
        team_leader_message = f"Payment rejection for {verification['customer_name']} (handled by {verification.get('sales_executive_name', 'Unknown')}).\n\nAmount: AED {verification.get('sale_amount', 0):,.2f}\nReason: {rejection_reason}\n\nPlease follow up with your team member."
        await create_notification(
            team_leader["id"],
            "Team Payment Rejected - Follow Up Required",
            team_leader_message,
            "warning",
            f"/sales"
        )
    
    await log_audit(user, "reject", "finance_verification", verification_id, verification["customer_name"],
                    {"reason": rejection_reason, "sales_exec": verification.get("sales_executive_name"), "team_leader": team_leader.get("full_name") if team_leader else None})
    
    return {"success": True, "message": "Verification rejected. Agent and team leader have been notified."}

@api_router.get("/finance/transactions")
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get all verified transactions"""
    query = {"status": "completed"}
    
    if start_date:
        query["payment_date"] = {"$gte": start_date}
    if end_date:
        if "payment_date" in query:
            query["payment_date"]["$lte"] = end_date
        else:
            query["payment_date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Calculate totals
    total_amount = sum(t.get("amount", 0) for t in transactions)
    
    return {
        "transactions": transactions,
        "summary": {
            "count": len(transactions),
            "total_amount": total_amount
        }
    }

# ==================== PENDING SETTLEMENTS ====================

@api_router.get("/finance/pending-settlements")
async def get_pending_settlements(
    status: Optional[str] = None,
    payment_gateway: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get all pending settlements from payment gateways"""
    query = {}
    
    if status:
        query["status"] = status
    else:
        query["status"] = "pending"
    
    if payment_gateway:
        query["payment_gateway"] = payment_gateway.lower()
    
    settlements = await db.pending_settlements.find(query, {"_id": 0}).sort("expected_settlement_date", 1).to_list(1000)
    
    # Group by payment gateway
    by_gateway = {}
    for s in settlements:
        gateway = s.get("payment_gateway", "unknown")
        if gateway not in by_gateway:
            by_gateway[gateway] = {"count": 0, "total": 0, "settlements": []}
        by_gateway[gateway]["count"] += 1
        by_gateway[gateway]["total"] += s.get("amount", 0)
        by_gateway[gateway]["settlements"].append(s)
    
    # Calculate totals
    total_pending = sum(s.get("amount", 0) for s in settlements if s.get("status") == "pending")
    
    # Get overdue settlements
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue = [s for s in settlements if s.get("expected_settlement_date") and s.get("expected_settlement_date") < today]
    
    return {
        "settlements": settlements,
        "by_gateway": by_gateway,
        "summary": {
            "total_pending": total_pending,
            "total_count": len(settlements),
            "overdue_count": len(overdue),
            "overdue_amount": sum(s.get("amount", 0) for s in overdue)
        }
    }

@api_router.post("/finance/pending-settlements/{settlement_id}/mark-settled")
async def mark_settlement_settled(
    settlement_id: str,
    data: Dict,
    user = Depends(require_roles(["super_admin", "admin", "finance"]))
):
    """Mark a pending settlement as settled"""
    settlement = await db.pending_settlements.find_one({"id": settlement_id})
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
    
    if settlement["status"] != "pending":
        raise HTTPException(status_code=400, detail="Settlement already processed")
    
    now = datetime.now(timezone.utc)
    
    # Update settlement record
    await db.pending_settlements.update_one(
        {"id": settlement_id},
        {"$set": {
            "status": "settled",
            "settled_at": now.isoformat(),
            "settled_by": user["id"],
            "settled_by_name": user["full_name"],
            "actual_settlement_date": data.get("settlement_date", now.strftime("%Y-%m-%d")),
            "settlement_reference": data.get("reference", ""),
            "notes": data.get("notes", "")
        }}
    )
    
    # Update the original transaction
    if settlement.get("transaction_id"):
        await db.transactions.update_one(
            {"id": settlement["transaction_id"]},
            {"$set": {"settlement_status": "settled", "settlement_date": now.strftime("%Y-%m-%d")}}
        )
    
    # Create journal entry for settlement (move from A/R to Bank)
    journal_entry = {
        "id": str(uuid.uuid4()),
        "type": "settlement",
        "settlement_id": settlement_id,
        "transaction_id": settlement.get("transaction_id"),
        "customer_name": settlement["customer_name"],
        "description": f"Settlement received - {settlement.get('payment_gateway', 'Gateway').upper()} - {settlement['customer_name']}",
        "debit_account": "bank",
        "credit_account": "accounts_receivable",
        "amount": settlement["amount"],
        "currency": "AED",
        "payment_method": settlement.get("payment_method"),
        "reference": data.get("reference", ""),
        "date": data.get("settlement_date", now.strftime("%Y-%m-%d")),
        "status": "posted",
        "created_by": user["id"],
        "created_by_name": user["full_name"],
        "created_at": now.isoformat()
    }
    await db.journal_entries.insert_one(journal_entry)
    
    await log_audit(user, "settle", "pending_settlement", settlement_id, settlement["customer_name"],
                    {"amount": settlement["amount"], "gateway": settlement.get("payment_gateway")})
    
    return {"success": True, "message": "Settlement marked as received"}

@api_router.get("/finance/journal-entries")
async def get_journal_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    entry_type: Optional[str] = None,
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get all journal entries"""
    query = {}
    
    if entry_type:
        query["type"] = entry_type
    
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Calculate totals by type
    total_revenue = sum(e.get("amount", 0) for e in entries if e.get("type") == "revenue")
    total_settlements = sum(e.get("amount", 0) for e in entries if e.get("type") == "settlement")
    
    return {
        "entries": entries,
        "summary": {
            "count": len(entries),
            "total_revenue": total_revenue,
            "total_settlements": total_settlements
        }
    }

@api_router.get("/finance/payment-receivables")
async def get_payment_receivables(
    user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))
):
    """Get all pending payment receivables (unsettled payments)"""
    # Get pending settlements
    pending = await db.pending_settlements.find({"status": "pending"}, {"_id": 0}).to_list(1000)
    
    # Group by payment gateway
    by_gateway = {}
    gateway_settlement_info = {
        "tabby": "Every Monday",
        "tamara": "7 days from payment",
        "network": "T+1 (Next business day)",
        "cheque": "Manual processing"
    }
    
    for p in pending:
        gateway = p.get("payment_gateway", "other")
        if gateway not in by_gateway:
            by_gateway[gateway] = {
                "gateway": gateway,
                "settlement_rule": gateway_settlement_info.get(gateway, "Varies"),
                "count": 0,
                "total_amount": 0,
                "receivables": []
            }
        by_gateway[gateway]["count"] += 1
        by_gateway[gateway]["total_amount"] += p.get("amount", 0)
        by_gateway[gateway]["receivables"].append(p)
    
    # Calculate overdue
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue = [p for p in pending if p.get("expected_settlement_date") and p.get("expected_settlement_date") < today]
    
    return {
        "receivables": pending,
        "by_gateway": list(by_gateway.values()),
        "summary": {
            "total_receivable": sum(p.get("amount", 0) for p in pending),
            "total_count": len(pending),
            "overdue_count": len(overdue),
            "overdue_amount": sum(p.get("amount", 0) for p in overdue)
        },
        "settlement_rules": gateway_settlement_info
    }

# ==================== FINANCE SETTINGS ENDPOINTS ====================

# Chart of Accounts CRUD
@api_router.get("/finance/settings/chart-of-accounts")
async def get_chart_of_accounts(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all chart of accounts entries"""
    accounts = await db.chart_of_accounts.find({}, {"_id": 0}).to_list(1000)
    return accounts

@api_router.post("/finance/settings/chart-of-accounts")
async def create_chart_of_account(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new chart of accounts entry"""
    # Check if code already exists
    existing = await db.chart_of_accounts.find_one({"code": data.get("code")})
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists")
    
    account = {
        "id": str(uuid.uuid4()),
        "code": data.get("code"),
        "name": data.get("name"),
        "type": data.get("type", "asset"),
        "parent_code": data.get("parent_code"),
        "description": data.get("description"),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.chart_of_accounts.insert_one(account)
    account.pop("_id", None)
    return account

@api_router.put("/finance/settings/chart-of-accounts/{account_id}")
async def update_chart_of_account(account_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a chart of accounts entry"""
    result = await db.chart_of_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "code": data.get("code"),
            "name": data.get("name"),
            "type": data.get("type"),
            "parent_code": data.get("parent_code"),
            "description": data.get("description"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/chart-of-accounts/{account_id}")
async def delete_chart_of_account(account_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a chart of accounts entry"""
    result = await db.chart_of_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "success"}

# Cost Centers CRUD
@api_router.get("/finance/settings/cost-centers")
async def get_cost_centers(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all cost centers"""
    centers = await db.cost_centers.find({}, {"_id": 0}).to_list(1000)
    return centers

@api_router.post("/finance/settings/cost-centers")
async def create_cost_center(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new cost center"""
    existing = await db.cost_centers.find_one({"code": data.get("code")})
    if existing:
        raise HTTPException(status_code=400, detail="Cost center code already exists")
    
    center = {
        "id": str(uuid.uuid4()),
        "code": data.get("code"),
        "name": data.get("name"),
        "department": data.get("department"),
        "description": data.get("description"),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.cost_centers.insert_one(center)
    center.pop("_id", None)  # Remove MongoDB _id before returning
    return center

@api_router.put("/finance/settings/cost-centers/{center_id}")
async def update_cost_center(center_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a cost center"""
    result = await db.cost_centers.update_one(
        {"id": center_id},
        {"$set": {
            "code": data.get("code"),
            "name": data.get("name"),
            "department": data.get("department"),
            "description": data.get("description"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/cost-centers/{center_id}")
async def delete_cost_center(center_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a cost center"""
    result = await db.cost_centers.delete_one({"id": center_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return {"status": "success"}

# Payment Methods CRUD
@api_router.get("/finance/settings/payment-methods")
async def get_payment_methods(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo", "sales", "team_leader"]))):
    """Get all payment methods"""
    methods = await db.payment_methods.find({}, {"_id": 0}).to_list(1000)
    return methods

@api_router.post("/finance/settings/payment-methods")
async def create_payment_method(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new payment method"""
    existing = await db.payment_methods.find_one({"code": data.get("code")})
    if existing:
        raise HTTPException(status_code=400, detail="Payment method code already exists")
    
    method = {
        "id": str(uuid.uuid4()),
        "code": data.get("code"),
        "name": data.get("name"),
        "type": data.get("type", "card"),
        "description": data.get("description"),
        "requires_proof": data.get("requires_proof", True),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.payment_methods.insert_one(method)
    method.pop("_id", None)
    return method

@api_router.put("/finance/settings/payment-methods/{method_id}")
async def update_payment_method(method_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a payment method"""
    result = await db.payment_methods.update_one(
        {"id": method_id},
        {"$set": {
            "code": data.get("code"),
            "name": data.get("name"),
            "type": data.get("type"),
            "description": data.get("description"),
            "requires_proof": data.get("requires_proof"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a payment method"""
    result = await db.payment_methods.delete_one({"id": method_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"status": "success"}

# Payment Gateways CRUD
@api_router.get("/finance/settings/payment-gateways")
async def get_payment_gateways(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo", "sales", "team_leader"]))):
    """Get all payment gateways"""
    gateways = await db.payment_gateways.find({}, {"_id": 0}).to_list(1000)
    return gateways

@api_router.post("/finance/settings/payment-gateways")
async def create_payment_gateway(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new payment gateway"""
    existing = await db.payment_gateways.find_one({"code": data.get("code")})
    if existing:
        raise HTTPException(status_code=400, detail="Payment gateway code already exists")
    
    gateway = {
        "id": str(uuid.uuid4()),
        "code": data.get("code"),
        "name": data.get("name"),
        "provider_type": data.get("provider_type", "card_processor"),
        "settlement_days": data.get("settlement_days", 1),
        "settlement_day_of_week": data.get("settlement_day_of_week"),
        "processing_fee_percent": data.get("processing_fee_percent", 0),
        "processing_fee_fixed": data.get("processing_fee_fixed", 0),
        "currency": data.get("currency", "AED"),
        "description": data.get("description"),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.payment_gateways.insert_one(gateway)
    gateway.pop("_id", None)
    return gateway

@api_router.put("/finance/settings/payment-gateways/{gateway_id}")
async def update_payment_gateway(gateway_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a payment gateway"""
    result = await db.payment_gateways.update_one(
        {"id": gateway_id},
        {"$set": {
            "code": data.get("code"),
            "name": data.get("name"),
            "provider_type": data.get("provider_type"),
            "settlement_days": data.get("settlement_days"),
            "settlement_day_of_week": data.get("settlement_day_of_week"),
            "processing_fee_percent": data.get("processing_fee_percent"),
            "processing_fee_fixed": data.get("processing_fee_fixed"),
            "currency": data.get("currency"),
            "description": data.get("description"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment gateway not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/payment-gateways/{gateway_id}")
async def delete_payment_gateway(gateway_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a payment gateway"""
    result = await db.payment_gateways.delete_one({"id": gateway_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment gateway not found")
    return {"status": "success"}

# PSP Bank Mapping CRUD
@api_router.get("/finance/settings/psp-bank-mapping")
async def get_psp_bank_mappings(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all PSP bank mappings"""
    mappings = await db.psp_bank_mappings.find({}, {"_id": 0}).to_list(1000)
    return mappings

@api_router.post("/finance/settings/psp-bank-mapping")
async def create_psp_bank_mapping(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new PSP bank mapping"""
    mapping = {
        "id": str(uuid.uuid4()),
        "gateway_id": data.get("gateway_id"),
        "gateway_name": data.get("gateway_name"),
        "bank_name": data.get("bank_name"),
        "bank_account_number": data.get("bank_account_number"),
        "bank_account_name": data.get("bank_account_name"),
        "currency": data.get("currency", "AED"),
        "description": data.get("description"),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.psp_bank_mappings.insert_one(mapping)
    mapping.pop("_id", None)
    return mapping

@api_router.put("/finance/settings/psp-bank-mapping/{mapping_id}")
async def update_psp_bank_mapping(mapping_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a PSP bank mapping"""
    result = await db.psp_bank_mappings.update_one(
        {"id": mapping_id},
        {"$set": {
            "gateway_id": data.get("gateway_id"),
            "gateway_name": data.get("gateway_name"),
            "bank_name": data.get("bank_name"),
            "bank_account_number": data.get("bank_account_number"),
            "bank_account_name": data.get("bank_account_name"),
            "currency": data.get("currency"),
            "description": data.get("description"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="PSP bank mapping not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/psp-bank-mapping/{mapping_id}")
async def delete_psp_bank_mapping(mapping_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a PSP bank mapping"""
    result = await db.psp_bank_mappings.delete_one({"id": mapping_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="PSP bank mapping not found")
    return {"status": "success"}

# Bank Accounts CRUD
@api_router.get("/finance/settings/bank-accounts")
async def get_bank_accounts(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all bank accounts"""
    accounts = await db.bank_accounts.find({}, {"_id": 0}).to_list(1000)
    return accounts

@api_router.post("/finance/settings/bank-accounts")
async def create_bank_account(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new bank account"""
    existing = await db.bank_accounts.find_one({"account_number": data.get("account_number"), "bank_name": data.get("bank_name")})
    if existing:
        raise HTTPException(status_code=400, detail="Bank account already exists")
    
    account = {
        "id": str(uuid.uuid4()),
        "account_name": data.get("account_name"),
        "bank_name": data.get("bank_name"),
        "account_number": data.get("account_number"),
        "iban": data.get("iban"),
        "swift_code": data.get("swift_code"),
        "branch": data.get("branch"),
        "currency": data.get("currency", "AED"),
        "account_type": data.get("account_type", "current"),
        "opening_balance": data.get("opening_balance", 0),
        "opening_balance_date": data.get("opening_balance_date"),
        "current_balance": data.get("opening_balance", 0),  # Initialize with opening balance
        "description": data.get("description"),
        "is_active": data.get("is_active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.bank_accounts.insert_one(account)
    
    # Also create an opening balance entry in treasury if balance > 0
    if account.get("opening_balance", 0) != 0:
        treasury_entry = {
            "id": str(uuid.uuid4()),
            "bank_account_id": account["id"],
            "account": account["account_name"],
            "opening_balance": account["opening_balance"],
            "currency": account["currency"],
            "date": account["opening_balance_date"] or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.get("id")
        }
        await db.treasury_balances.insert_one(treasury_entry)
    
    account.pop("_id", None)  # Remove MongoDB _id before returning
    return account

@api_router.put("/finance/settings/bank-accounts/{account_id}")
async def update_bank_account(account_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a bank account"""
    result = await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "account_name": data.get("account_name"),
            "bank_name": data.get("bank_name"),
            "account_number": data.get("account_number"),
            "iban": data.get("iban"),
            "swift_code": data.get("swift_code"),
            "branch": data.get("branch"),
            "currency": data.get("currency"),
            "account_type": data.get("account_type"),
            "opening_balance": data.get("opening_balance"),
            "opening_balance_date": data.get("opening_balance_date"),
            "description": data.get("description"),
            "is_active": data.get("is_active"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return {"status": "success"}

@api_router.delete("/finance/settings/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a bank account"""
    result = await db.bank_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return {"status": "success"}

# ==================== VENDOR MANAGEMENT ====================

@api_router.get("/finance/vendors")
async def get_vendors(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all vendors"""
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(1000)
    return vendors

@api_router.post("/finance/vendors")
async def create_vendor(data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Create a new vendor"""
    vendor = {
        "id": str(uuid.uuid4()),
        "name": data.get("name"),
        "trading_name": data.get("trading_name"),
        "category": data.get("category"),
        "items_supplied": data.get("items_supplied"),
        "contact_person": data.get("contact_person"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "address": data.get("address"),
        "city": data.get("city"),
        "country": data.get("country", "UAE"),
        "bank_name": data.get("bank_name"),
        "bank_account_number": data.get("bank_account_number"),
        "bank_iban": data.get("bank_iban"),
        "bank_swift": data.get("bank_swift"),
        "bank_branch": data.get("bank_branch"),
        "trn": data.get("trn"),
        "payment_terms": data.get("payment_terms", "net_30"),
        "custom_payment_days": data.get("custom_payment_days"),
        "credit_limit": data.get("credit_limit", 0),
        "currency": data.get("currency", "AED"),
        "is_active": data.get("is_active", True),
        "notes": data.get("notes"),
        "total_paid": 0,
        "outstanding_balance": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.vendors.insert_one(vendor)
    vendor.pop("_id", None)
    return vendor

@api_router.put("/finance/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, data: dict, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Update a vendor"""
    result = await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {
            "name": data.get("name"),
            "trading_name": data.get("trading_name"),
            "category": data.get("category"),
            "items_supplied": data.get("items_supplied"),
            "contact_person": data.get("contact_person"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "address": data.get("address"),
            "city": data.get("city"),
            "country": data.get("country"),
            "bank_name": data.get("bank_name"),
            "bank_account_number": data.get("bank_account_number"),
            "bank_iban": data.get("bank_iban"),
            "bank_swift": data.get("bank_swift"),
            "bank_branch": data.get("bank_branch"),
            "trn": data.get("trn"),
            "payment_terms": data.get("payment_terms"),
            "custom_payment_days": data.get("custom_payment_days"),
            "credit_limit": data.get("credit_limit"),
            "currency": data.get("currency"),
            "is_active": data.get("is_active"),
            "notes": data.get("notes"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"status": "success"}

@api_router.delete("/finance/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, user = Depends(require_roles(["super_admin", "admin", "finance"]))):
    """Delete a vendor"""
    result = await db.vendors.delete_one({"id": vendor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"status": "success"}

# ==================== UNIFIED TRANSACTIONS ====================

@api_router.get("/finance/unified-transactions")
async def get_unified_transactions(user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all unified transactions from various sources"""
    transactions = []
    
    # Get bank accounts for reference
    bank_accounts = {ba["id"]: ba for ba in await db.bank_accounts.find({}, {"_id": 0}).to_list(100)}
    
    # 1. Get Receivables (Money In)
    receivables = await db.clt_receivables.find({}, {"_id": 0}).to_list(5000)
    for r in receivables:
        bank_name = bank_accounts.get(r.get("bank_account_id"), {}).get("account_name", r.get("destination_bank", ""))
        transactions.append({
            "id": f"rcv_{r.get('id')}",
            "date": r.get("date"),
            "type": "credit",
            "party_name": r.get("account_name"),
            "description": f"{r.get('payment_for', '')} - {r.get('payment_method', '')}",
            "source": "Sales",
            "bank_account_id": r.get("bank_account_id"),
            "bank_account_name": bank_name,
            "reference": r.get("transaction_id"),
            "amount": r.get("amount_in_aed", 0),
            "original_record_id": r.get("id"),
            "original_collection": "clt_receivables"
        })
    
    # 2. Get Payables (Money Out)
    payables = await db.clt_payables.find({}, {"_id": 0}).to_list(5000)
    for p in payables:
        bank_name = bank_accounts.get(p.get("bank_account_id"), {}).get("account_name", p.get("source", ""))
        transactions.append({
            "id": f"pay_{p.get('id')}",
            "date": p.get("date"),
            "type": "debit",
            "party_name": p.get("account_name"),
            "description": f"{p.get('cost_center', '')} - {p.get('sub_cost_center', '')}",
            "source": "Payables",
            "bank_account_id": p.get("bank_account_id"),
            "bank_account_name": bank_name,
            "reference": p.get("reference"),
            "amount": p.get("amount_in_aed", 0),
            "original_record_id": p.get("id"),
            "original_collection": "clt_payables"
        })
    
    # 3. Get Expenses (Money Out)
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(5000)
    for e in expenses:
        transactions.append({
            "id": f"exp_{e.get('id')}",
            "date": e.get("date"),
            "type": "debit",
            "party_name": e.get("vendor"),
            "description": f"{e.get('category', '')} - {e.get('description', '')}",
            "source": "Expenses",
            "bank_account_id": e.get("bank_account_id"),
            "bank_account_name": e.get("bank_account_name", ""),
            "reference": e.get("reference"),
            "amount": e.get("amount", 0),
            "original_record_id": e.get("id"),
            "original_collection": "expenses"
        })
    
    # 4. Get Commission Payouts (Money Out)
    commissions = await db.commission_settlements.find({"status": "paid"}, {"_id": 0}).to_list(5000)
    for c in commissions:
        transactions.append({
            "id": f"com_{c.get('id')}",
            "date": c.get("paid_at") or c.get("created_at"),
            "type": "debit",
            "party_name": c.get("employee_name"),
            "description": f"Commission payout - {c.get('period', '')}",
            "source": "Commissions",
            "bank_account_id": None,
            "bank_account_name": "",
            "reference": c.get("reference"),
            "amount": c.get("amount", 0),
            "original_record_id": c.get("id"),
            "original_collection": "commission_settlements"
        })
    
    # 5. Get Verified Finance Payments (Money In from student enrollments)
    verifications = await db.finance_verifications.find({"status": "approved"}, {"_id": 0}).to_list(5000)
    for v in verifications:
        # Skip if already captured in receivables
        if not v.get("posted_to_receivables"):
            transactions.append({
                "id": f"ver_{v.get('id')}",
                "date": v.get("verified_at") or v.get("created_at"),
                "type": "credit",
                "party_name": v.get("customer_name"),
                "description": f"Enrollment - {v.get('course_name', '')}",
                "source": "Enrollments",
                "bank_account_id": None,
                "bank_account_name": v.get("payment_method", ""),
                "reference": v.get("transaction_reference"),
                "amount": v.get("sale_amount", 0),
                "original_record_id": v.get("id"),
                "original_collection": "finance_verifications"
            })
    
    # Sort by date descending
    transactions.sort(key=lambda x: x.get("date") or "", reverse=True)
    
    return transactions

# ==================== BANK ACCOUNT TRANSACTIONS ====================

@api_router.get("/finance/bank-account-transactions/{account_id}")
async def get_bank_account_transactions(account_id: str, user = Depends(require_roles(["super_admin", "admin", "finance", "ceo"]))):
    """Get all transactions for a specific bank account"""
    # Verify account exists
    account = await db.bank_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    transactions = []
    
    # Get receivables for this bank account
    receivables = await db.clt_receivables.find({"bank_account_id": account_id}, {"_id": 0}).to_list(1000)
    for r in receivables:
        transactions.append({
            "id": f"rcv_{r.get('id')}",
            "date": r.get("date"),
            "type": "credit",
            "party_name": r.get("account_name"),
            "description": f"Receivable: {r.get('payment_for', '')}",
            "reference": r.get("transaction_id"),
            "amount": r.get("amount_in_aed", 0),
            "source": "Receivables"
        })
    
    # Get payables from this bank account
    payables = await db.clt_payables.find({"bank_account_id": account_id}, {"_id": 0}).to_list(1000)
    for p in payables:
        transactions.append({
            "id": f"pay_{p.get('id')}",
            "date": p.get("date"),
            "type": "debit",
            "party_name": p.get("account_name"),
            "description": f"Payable: {p.get('cost_center', '')}",
            "reference": p.get("reference"),
            "amount": p.get("amount_in_aed", 0),
            "source": "Payables"
        })
    
    # Get expenses from this bank account
    expenses = await db.expenses.find({"bank_account_id": account_id}, {"_id": 0}).to_list(1000)
    for e in expenses:
        transactions.append({
            "id": f"exp_{e.get('id')}",
            "date": e.get("date"),
            "type": "debit",
            "party_name": e.get("vendor"),
            "description": f"Expense: {e.get('category', '')}",
            "reference": e.get("reference"),
            "amount": e.get("amount", 0),
            "source": "Expenses"
        })
    
    # Sort by date descending
    transactions.sort(key=lambda x: x.get("date") or "", reverse=True)
    
    # Calculate running balance
    opening_balance = account.get("opening_balance", 0)
    transactions_sorted = sorted(transactions, key=lambda x: x.get("date") or "")
    running_balance = opening_balance
    
    for txn in transactions_sorted:
        if txn["type"] == "credit":
            running_balance += txn["amount"]
        else:
            running_balance -= txn["amount"]
        txn["running_balance"] = running_balance
    
    # Re-sort descending for display
    transactions_sorted.reverse()
    
    return {
        "account": account,
        "opening_balance": opening_balance,
        "current_balance": running_balance,
        "transactions": transactions_sorted
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== APP LIFECYCLE ====================

@app.on_event("startup")
async def startup_event():
    await bootstrap_super_admin()
    await bootstrap_departments()
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("department")
    await db.leads.create_index("phone", unique=True)
    await db.leads.create_index("stage")
    await db.leads.create_index("assigned_to")
    await db.students.create_index("phone")
    await db.students.create_index("stage")
    await db.students.create_index("mentor_stage")
    await db.students.create_index("cs_agent_id")
    await db.students.create_index("mentor_id")
    await db.payments.create_index("stage")
    await db.notifications.create_index("user_id")
    await db.activity_logs.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.departments.create_index("name", unique=True)
    await db.courses.create_index("code", unique=True)
    await db.commissions.create_index([("user_id", 1), ("month", 1)])
    await db.approval_requests.create_index("status")
    await db.call_logs.create_index([("contact_id", 1), ("call_date", -1)])
    await db.call_logs.create_index("phone_number")
    
    # Accounting module indexes
    await db.accounts.create_index("code", unique=True, sparse=True)
    await db.accounts.create_index("account_type")
    await db.accounts.create_index("subtype")
    await db.journal_entries.create_index("entry_date")
    await db.journal_entries.create_index("status")
    await db.journal_entries.create_index("source_module")
    await db.journal_lines.create_index("journal_entry_id")
    await db.journal_lines.create_index("account_id")
    await db.settlement_batches.create_index("provider")
    await db.settlement_batches.create_index("status")
    await db.settlement_batches.create_index("expected_settlement_date")
    await db.expenses.create_index("date")
    await db.transfers.create_index("date")
    await db.finance_audit_logs.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.finance_audit_logs.create_index("timestamp")
    
    # HR Module indexes
    await db.hr_employees.create_index("employee_id", unique=True)
    await db.hr_employees.create_index("company_email", unique=True, sparse=True)
    await db.hr_employees.create_index("department")
    await db.hr_employees.create_index("employment_status")
    await db.hr_employees.create_index("user_id", sparse=True)
    await db.hr_attendance.create_index([("employee_id", 1), ("date", 1)], unique=True)
    await db.hr_attendance.create_index("date")
    await db.hr_leave_requests.create_index("employee_id")
    await db.hr_leave_requests.create_index("status")
    await db.hr_regularization_requests.create_index("employee_id")
    await db.hr_regularization_requests.create_index("status")
    await db.hr_audit_logs.create_index([("entity_type", 1), ("entity_id", 1)])
    await db.hr_audit_logs.create_index("timestamp")
    
    # HR Extended Module indexes
    await db.hr_payroll.create_index([("month", 1), ("employee_id", 1)], unique=True)
    await db.hr_payroll.create_index("status")
    await db.hr_payroll_batches.create_index("month", unique=True)
    await db.hr_assets.create_index("asset_code", unique=True)
    await db.hr_assets.create_index("status")
    await db.hr_assets.create_index("assigned_to_id", sparse=True)
    await db.hr_asset_requests.create_index("status")
    await db.hr_asset_assignments.create_index([("asset_id", 1), ("returned_at", 1)])
    await db.hr_kpis.create_index("category")
    await db.hr_kpi_scores.create_index([("employee_id", 1), ("period_year", 1), ("period_month", 1)])
    await db.hr_performance_reviews.create_index("employee_id")
    await db.hr_performance_reviews.create_index("review_period")
    
    # Marketing Module indexes
    await db.meta_ad_accounts.create_index("meta_account_id", unique=True)
    await db.meta_ad_accounts.create_index("is_active")
    await db.meta_campaigns.create_index("meta_campaign_id", unique=True)
    await db.meta_campaigns.create_index("account_id")
    await db.meta_leads.create_index("meta_lead_id", unique=True)
    await db.meta_leads.create_index("account_id")
    await db.meta_leads.create_index("synced_to_crm")
    await db.meta_oauth_states.create_index("state", unique=True)
    await db.meta_oauth_states.create_index("expires_at", expireAfterSeconds=0)
    
    # Google Sheets Connector indexes
    await db.sheet_connectors.create_index("sheet_id", unique=True)
    await db.sheet_connectors.create_index("auto_sync_enabled")
    await db.sheets_oauth_states.create_index("state", unique=True)
    await db.sheets_oauth_states.create_index("expires_at", expireAfterSeconds=0)
    
    # Start background scheduler for Google Sheets auto-sync
    asyncio.create_task(sheets_auto_sync_loop())
    
    # Start background scheduler for daily finance report
    asyncio.create_task(daily_finance_report_loop())
    
    logger.info("CLT Synapse ERP v2.0 started successfully")

async def sheets_auto_sync_loop():
    """Background loop for Google Sheets auto-sync (runs every minute)"""
    while True:
        try:
            await asyncio.sleep(60)  # Check every minute
            await run_auto_sync()
        except Exception as e:
            logger.error(f"Sheets auto-sync loop error: {e}")

async def daily_finance_report_loop():
    """Background loop for daily finance report at 12:00 AM UAE Time"""
    import pytz
    uae_tz = pytz.timezone('Asia/Dubai')
    
    while True:
        try:
            # Calculate seconds until next 12:00 AM UAE time
            now_uae = datetime.now(uae_tz)
            next_midnight = now_uae.replace(hour=0, minute=0, second=0, microsecond=0)
            if now_uae >= next_midnight:
                next_midnight += timedelta(days=1)
            
            seconds_until_midnight = (next_midnight - now_uae).total_seconds()
            
            logger.info(f"Daily Finance Report: Next run in {seconds_until_midnight/3600:.1f} hours at {next_midnight}")
            
            # Wait until midnight
            await asyncio.sleep(seconds_until_midnight)
            
            # Generate and send the report
            await send_daily_finance_report()
            
            # Wait a bit before recalculating to avoid running twice
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Daily finance report loop error: {e}")
            await asyncio.sleep(3600)  # Wait 1 hour on error

async def send_daily_finance_report():
    """Generate and send the daily finance report email"""
    import pytz
    uae_tz = pytz.timezone('Asia/Dubai')
    now_uae = datetime.now(uae_tz)
    today_str = now_uae.strftime("%Y-%m-%d")
    month_start = now_uae.replace(day=1).strftime("%Y-%m-%d")
    
    logger.info(f"Generating daily finance report for {today_str}")
    
    try:
        # Get sales data for today
        today_receivables = await db.finance_clt_receivables.find({
            "date": today_str
        }).to_list(1000)
        sales_today = sum(r.get("amount", 0) for r in today_receivables)
        sales_today_count = len(today_receivables)
        
        # Get sales data for this month
        month_receivables = await db.finance_clt_receivables.find({
            "date": {"$gte": month_start, "$lte": today_str}
        }).to_list(10000)
        sales_this_month = sum(r.get("amount", 0) for r in month_receivables)
        sales_this_month_count = len(month_receivables)
        
        # Get bank accounts and treasury balance
        bank_accounts = await db.bank_accounts.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(100)
        treasury_balance = sum(b.get("current_balance", b.get("opening_balance", 0)) for b in bank_accounts)
        
        # Get expenses
        all_payables = await db.finance_clt_payables.find({}, {"_id": 0}).to_list(10000)
        total_expenses = sum(p.get("amount", 0) for p in all_payables)
        
        month_payables = await db.finance_clt_payables.find({
            "date": {"$gte": month_start, "$lte": today_str}
        }).to_list(10000)
        expenses_this_month = sum(p.get("amount", 0) for p in month_payables)
        
        # Get pending settlements
        pending_settlements_list = await db.pending_settlements.find({"status": "pending"}).to_list(1000)
        pending_settlements = sum(s.get("amount", 0) for s in pending_settlements_list)
        
        # Get pending verifications
        pending_verifications = await db.finance_verifications.count_documents({"status": "pending_verification"})
        
        # Get top sales reps this month
        # Aggregate enrollments by sales executive
        pipeline = [
            {"$match": {"date": {"$gte": month_start}}},
            {"$group": {
                "_id": "$sales_executive_id",
                "name": {"$first": "$sales_executive_name"},
                "revenue": {"$sum": "$amount"},
                "enrollments": {"$sum": 1}
            }},
            {"$sort": {"revenue": -1}},
            {"$limit": 5}
        ]
        top_sales_cursor = db.finance_clt_receivables.aggregate(pipeline)
        top_sales_reps = []
        async for rep in top_sales_cursor:
            if rep.get("name"):
                top_sales_reps.append({
                    "name": rep.get("name", "Unknown"),
                    "revenue": rep.get("revenue", 0),
                    "enrollments": rep.get("enrollments", 0)
                })
        
        # Generate the report HTML
        report_date = now_uae.strftime("%A, %B %d, %Y")
        report_html = get_daily_finance_report_template(
            report_date=report_date,
            sales_today=sales_today,
            sales_today_count=sales_today_count,
            sales_this_month=sales_this_month,
            sales_this_month_count=sales_this_month_count,
            treasury_balance=treasury_balance,
            bank_accounts=bank_accounts,
            total_expenses=total_expenses,
            expenses_this_month=expenses_this_month,
            pending_settlements=pending_settlements,
            pending_verifications=pending_verifications,
            top_sales_reps=top_sales_reps
        )
        
        # Send to recipients
        recipients = [
            "accounts@clt-academy.com",
            "aqib@clt-academy.com",      # CEO
            "faizeen@clt-academy.com"    # COO
        ]
        
        subject = f"📊 CLT Daily Finance Report - {report_date}"
        
        for recipient in recipients:
            try:
                success = await send_email_async(recipient, subject, report_html)
                if success:
                    logger.info(f"Daily finance report sent to {recipient}")
                else:
                    logger.warning(f"Failed to send daily finance report to {recipient}")
            except Exception as e:
                logger.error(f"Error sending daily finance report to {recipient}: {e}")
        
        # Log the report generation
        await db.system_logs.insert_one({
            "id": str(uuid.uuid4()),
            "type": "daily_finance_report",
            "date": today_str,
            "recipients": recipients,
            "metrics": {
                "sales_today": sales_today,
                "sales_this_month": sales_this_month,
                "treasury_balance": treasury_balance,
                "total_expenses": total_expenses
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"Daily finance report generated and sent successfully for {today_str}")
        
    except Exception as e:
        logger.error(f"Error generating daily finance report: {e}")
        import traceback
        traceback.print_exc()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
