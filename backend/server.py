from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ==================== DATABASE CONFIGURATION ====================
# Environment-based database selection
# APP_ENV can be: development, testing, production

def get_database_name():
    """Get database name based on current environment"""
    app_env = os.environ.get('APP_ENV', 'production').lower()
    
    if app_env == 'development':
        return os.environ.get('DB_NAME_DEV', 'clt_synapse_dev')
    elif app_env == 'testing':
        return os.environ.get('DB_NAME_TEST', 'clt_synapse_test')
    elif app_env == 'production':
        return os.environ.get('DB_NAME_PROD', os.environ.get('DB_NAME', 'clt_synapse_prod'))
    else:
        # Fallback to legacy DB_NAME for backwards compatibility
        return os.environ.get('DB_NAME', 'clt_academy_erp')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
CURRENT_DB_NAME = get_database_name()
db = client[CURRENT_DB_NAME]
CURRENT_APP_ENV = os.environ.get('APP_ENV', 'production').lower()

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
    follow_up_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    course_id: Optional[str] = None
    sale_amount: Optional[float] = None
    addons_selected: Optional[List[str]] = None
    call_recording_url: Optional[str] = None  # 3CX integration placeholder
    # Reminder fields
    reminder_date: Optional[datetime] = None
    reminder_time: Optional[str] = None  # HH:MM format
    reminder_note: Optional[str] = None

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
    """Get next available agent using round-robin"""
    query = {"role": role, "is_active": True}
    if region:
        query["region"] = region
    if department:
        query["department"] = department
    
    agents = await db.users.find(query).to_list(100)
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
    
    # Non-super_admin can only update certain fields
    if user.get("role") != "super_admin":
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
            
            # Create automatic journal entry for the sale (accounting integration)
            payment_method = update_data.get("payment_method") or existing.get("payment_method", "bank_transfer")
            try:
                await create_sales_journal_entry(
                    sale_amount=sale_amount,
                    payment_method=payment_method,
                    customer_name=existing["full_name"],
                    lead_id=lead_id,
                    user_id=current_user["id"],
                    user_name=current_user["full_name"]
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
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query_base = {"reminder_date": today, "reminder_completed": {"$ne": True}}
    
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
    students = []
    if user["role"] in ["cs_agent", "cs_head"]:
        if user["role"] == "cs_agent":
            students = await db.students.find({**query_base, "cs_agent_id": user["id"]}, {"_id": 0}).to_list(1000)
        else:
            students = await db.students.find(query_base, {"_id": 0}).to_list(1000)
    elif user["role"] in ["mentor", "academic_master"]:
        if user["role"] == "mentor":
            students = await db.students.find({**query_base, "mentor_id": user["id"]}, {"_id": 0}).to_list(1000)
        else:
            students = await db.students.find(query_base, {"_id": 0}).to_list(1000)
    elif user["role"] in ["super_admin", "admin"]:
        students = await db.students.find(query_base, {"_id": 0}).to_list(1000)
    
    # Categorize by time
    def get_time_slot(time_str):
        if not time_str:
            return "unscheduled"
        try:
            hour = int(time_str.split(":")[0])
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
        slot = get_time_slot(lead.get("reminder_time"))
        followups[slot].append(lead)
    
    for student in students:
        student["entity_type"] = "student"
        slot = get_time_slot(student.get("reminder_time"))
        followups[slot].append(student)
    
    # Sort each slot by time
    for slot in followups:
        followups[slot].sort(key=lambda x: x.get("reminder_time") or "99:99")
    
    total = len(leads) + len(students)
    
    return {
        "date": today,
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

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user = Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    stats = {}
    user_id = user["id"]
    user_role = user["role"]
    
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
    
    return stats

@api_router.get("/dashboard/lead-funnel")
async def get_lead_funnel(user = Depends(get_current_user)):
    query = {}
    if user["role"] == "sales_executive":
        query["assigned_to"] = user["id"]
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(100)
    
    stage_order = {stage: i for i, stage in enumerate(LEAD_STAGES)}
    result.sort(key=lambda x: stage_order.get(x["_id"], 999))
    
    return result

@api_router.get("/dashboard/sales-by-course")
async def get_sales_by_course(user = Depends(get_current_user)):
    query = {"stage": "enrolled"}
    if user["role"] == "sales_executive":
        query["assigned_to"] = user["id"]
    
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
            "required_fields": ["full_name", "phone"],
            "optional_fields": ["email", "country", "city", "lead_source", "course_of_interest", "campaign_name", "notes"],
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
            "instructions": [
                "Fields marked with * are mandatory",
                "Phone must include country code (e.g., +971501234567)",
                "Duplicate phone numbers will be skipped",
                "Lead source options: Meta Ads, Google Ads, Website, Referral, Walk-in, Other",
                "Leads will be auto-assigned via round-robin to sales executives"
            ]
        },
        "customers": {
            "filename": "customers_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "payment_amount*", "payment_method*", "payment_date*", "closed_by*",
                "cs_agent_email", "mentor_email", "notes"
            ],
            "required_fields": ["full_name", "phone", "package_bought", "payment_amount", "payment_method", "payment_date", "closed_by"],
            "optional_fields": ["email", "country", "cs_agent_email", "mentor_email", "notes"],
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
            "instructions": [
                "Fields marked with * are mandatory",
                "Phone must include country code",
                "closed_by should be the email of the sales person who closed this customer",
                "payment_method options: stripe, unipay, tabby, tamara, bank_transfer, usdt, cash",
                "payment_date format: YYYY-MM-DD",
                "Customers imported here will NOT go through round-robin",
                "If cs_agent_email or mentor_email provided, they will be auto-assigned"
            ]
        },
        "students_cs": {
            "filename": "students_cs_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "cs_agent_email*", "mentor_email", "batch_plan", "preferred_language",
                "trading_level", "class_timings", "notes"
            ],
            "required_fields": ["full_name", "phone", "package_bought", "cs_agent_email"],
            "optional_fields": ["email", "country", "mentor_email", "batch_plan", "preferred_language", "trading_level", "class_timings", "notes"],
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
            "instructions": [
                "Fields marked with * are mandatory",
                "cs_agent_email MUST be a valid CS agent email from the system",
                "mentor_email is optional but must be valid if provided",
                "batch_plan options: Weekday Morning, Weekday Evening, Weekend Morning, Weekend Evening",
                "trading_level options: Beginner, Intermediate, Advanced",
                "Students imported will be assigned to specified CS agent (NOT round-robin)"
            ]
        },
        "students_mentor": {
            "filename": "students_mentor_import_template.csv",
            "headers": [
                "full_name*", "phone*", "email", "country", "package_bought*",
                "mentor_email*", "cs_agent_email", "mentor_stage", "learning_goals", "notes"
            ],
            "required_fields": ["full_name", "phone", "package_bought", "mentor_email"],
            "optional_fields": ["email", "country", "cs_agent_email", "mentor_stage", "learning_goals", "notes"],
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
            "instructions": [
                "Fields marked with * are mandatory",
                "mentor_email MUST be a valid mentor email from the system",
                "mentor_stage options: new_student, discussion_started, pitched_for_redeposit, interested, closed",
                "Students imported will be assigned to specified mentor (NOT round-robin)"
            ]
        }
    }
    
    if template_type not in templates:
        raise HTTPException(status_code=400, detail=f"Invalid template type. Available: {list(templates.keys())}")
    
    return templates[template_type]

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
        {"threecx_extension": {"$exists": True, "$ne": None, "$ne": ""}},
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
    backend_url = os.environ.get('BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://synapse-ui-fix.preview.emergentagent.com'))
    
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
    termination_date: Optional[str] = None  # Date when employee was terminated
    role: Optional[str] = None  # Linked user role for sync
    employee_category: Optional[str] = None
    grade: Optional[str] = None
    visa_details: Optional[Dict] = None
    salary_structure: Optional[Dict] = None
    bank_details: Optional[Dict] = None
    annual_leave_balance: float
    sick_leave_balance: float
    documents: List[Dict] = []
    user_id: Optional[str] = None
    created_via: Optional[str] = None  # Source: user_management, employee_master
    created_at: str
    updated_at: str

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
    user = Depends(require_roles(["super_admin", "admin", "hr"]))
):
    """
    Fetch attendance from BioCloud and sync to CLT Synapse
    Uses web scraping since direct API not available
    """
    from playwright.async_api import async_playwright
    
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Login to BioCloud
            await page.goto(f"{os.environ.get('BIOCLOUD_URL', 'https://56.biocloud.me:8085')}")
            await page.wait_for_timeout(3000)
            
            await page.fill('input[placeholder="Enter Username"]', os.environ.get('BIOCLOUD_USERNAME', 'Admin'))
            await page.fill('input[placeholder="Enter Password"]', os.environ.get('BIOCLOUD_PASSWORD', '1'))
            await page.click('button:has-text("Login")')
            await page.wait_for_timeout(5000)
            
            # Navigate to Attendance > First & Last
            await page.click('text=Attendance')
            await page.wait_for_timeout(2000)
            await page.click('text=First & Last')
            await page.wait_for_timeout(3000)
            
            # Set date range
            date_inputs = await page.locator('input[type="text"]').all()
            if len(date_inputs) >= 2:
                await date_inputs[0].fill(target_date)
                await date_inputs[1].fill(target_date)
                await page.click('text=Search')
                await page.wait_for_timeout(3000)
            
            # Parse the table data
            rows = await page.locator('table tbody tr').all()
            attendance_data = []
            
            for row in rows:
                cells = await row.locator('td').all()
                if len(cells) >= 5:
                    attendance_data.append({
                        "emp_code": await cells[0].inner_text(),
                        "name": await cells[1].inner_text(),
                        "department": await cells[2].inner_text(),
                        "first_in": await cells[3].inner_text() if len(cells) > 3 else None,
                        "last_out": await cells[4].inner_text() if len(cells) > 4 else None,
                    })
            
            await browser.close()
            
            # Process and save attendance data
            synced = 0
            for att in attendance_data:
                emp_code = att["emp_code"].strip()
                
                # Find mapped employee
                employee = await db.hr_employees.find_one(
                    {"biocloud_emp_code": emp_code},
                    {"_id": 0}
                )
                
                if employee:
                    now = datetime.now(timezone.utc).isoformat()
                    
                    # Check if attendance already exists
                    existing = await db.hr_attendance.find_one({
                        "employee_id": employee["id"],
                        "date": target_date
                    })
                    
                    attendance_record = {
                        "employee_id": employee["id"],
                        "employee_code": employee["employee_id"],
                        "employee_name": employee["full_name"],
                        "department": employee.get("department"),
                        "date": target_date,
                        "biometric_in": att["first_in"],
                        "biometric_out": att["last_out"],
                        "source": "biocloud_sync",
                        "synced_at": now
                    }
                    
                    # Calculate late/early
                    if att["first_in"] and att["first_in"] > "09:00":
                        try:
                            in_time = datetime.strptime(att["first_in"][:5], "%H:%M")
                            start_time = datetime.strptime("09:00", "%H:%M")
                            attendance_record["late_minutes"] = int((in_time - start_time).total_seconds() / 60)
                        except:
                            pass
                    
                    if att["last_out"] and att["last_out"] < "18:00":
                        try:
                            out_time = datetime.strptime(att["last_out"][:5], "%H:%M")
                            end_time = datetime.strptime("18:00", "%H:%M")
                            attendance_record["early_exit_minutes"] = int((end_time - out_time).total_seconds() / 60)
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
            
            return {
                "success": True,
                "date": target_date,
                "fetched": len(attendance_data),
                "synced": synced,
                "message": f"Fetched {len(attendance_data)} records, synced {synced} to CLT Synapse"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance: {str(e)}")

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
        
        return {
            "connected": connected,
            "biocloud_url": os.environ.get('BIOCLOUD_URL', 'https://56.biocloud.me:8085'),
            "total_clt_employees": total_employees,
            "mapped_employees": mapped_employees,
            "unmapped_employees": total_employees - mapped_employees
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

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
    
    # Check if payroll already exists for this month
    existing = await db.hr_payroll.find_one({"month": month_str, "status": {"$ne": "draft"}})
    if existing:
        raise HTTPException(status_code=400, detail=f"Payroll for {month_str} already processed")
    
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
        daily_rate = gross_salary / total_days
        
        # Calculate deductions
        deductions = []
        
        # Late penalty
        if total_late_minutes > 0:
            late_penalty = (total_late_minutes // 15) * 50
            if late_penalty > 0:
                deductions.append({
                    "type": "late",
                    "description": f"Late penalty ({total_late_minutes} minutes)",
                    "amount": late_penalty
                })
        
        # Absence deduction
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
    
    logger.info("CLT Synapse ERP v2.0 started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
