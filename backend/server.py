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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="CLT Academy ERP", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS & CONSTANTS ====================

ROLES = [
    "super_admin", "admin", "sales_manager", "team_leader", 
    "sales_executive", "cs_head", "cs_agent", "mentor", 
    "academic_master", "finance", "hr", "marketing", "operations", "quality_control"
]

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

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
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

async def create_notification(user_id: str, title: str, message: str, notif_type: str = "info", link: str = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "link": link,
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
                        f"/sales"
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
                            f"/sales"
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
                        f"/cs"
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
                        f"/cs"
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
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    user_data = {k: v for k, v in user.items() if k != "password" and k != "_id"}
    
    return TokenResponse(access_token=token, user=user_data)

@api_router.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    user_data = {k: v for k, v in user.items() if k != "password" and k != "_id"}
    return user_data

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
    
    commissions = await db.commissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add user and course names
    for comm in commissions:
        comm_user = await db.users.find_one({"id": comm.get("user_id")})
        comm["user_name"] = comm_user.get("full_name") if comm_user else None
        
        course = await db.courses.find_one({"id": comm.get("course_id")})
        comm["course_name"] = course.get("name") if course else None
    
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
    
    # Set default permissions based on role
    default_permissions = get_default_permissions(data.role)
    
    new_user = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "password": hash_password(data.password),
        "permissions": data.permissions or default_permissions,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    await log_activity("user", new_user["id"], "created", user, {"email": data.email})
    
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
    elif role == "hr":
        permissions["dashboard"] = "view"
        permissions["user_management"] = "edit"
        permissions["department_management"] = "view"
        permissions["settings"] = "view"
    
    return permissions

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: Dict, user = Depends(get_current_user)):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
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
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.approval_requests.insert_one(approval)
            return {"message": "Change request submitted for approval"}
    
    update_data = {k: v for k, v in data.items() if k not in ["id", "created_at", "_id"]}
    if "password" in update_data:
        update_data["password"] = hash_password(update_data["password"])
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    await log_activity("user", user_id, "updated", user, update_data)
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return updated

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user = Depends(require_roles(["super_admin"]))):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_activity("user", user_id, "deleted", user)
    return {"message": "User deleted"}

# ==================== LEADS (SALES CRM) ====================

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    stage: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    user = Depends(get_current_user)
):
    query = {}
    
    # Role-based filtering
    if user["role"] == "sales_executive":
        query["assigned_to"] = user["id"]
    elif user["role"] == "team_leader":
        team = await db.users.find({"team_leader_id": user["id"]}).to_list(100)
        team_ids = [t["id"] for t in team] + [user["id"]]
        query["assigned_to"] = {"$in": team_ids}
    
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
            f"/sales/leads/{new_lead['id']}"
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
    
    update_data["updated_at"] = now.isoformat()
    update_data["last_activity"] = now.isoformat()
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    await log_activity("lead", lead_id, "updated", user, update_data)
    
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
    return {"message": "CLT Academy ERP API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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
        "available_modes": ENVIRONMENT_MODES
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
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"environment_access": access, "updated_at": datetime.now(timezone.utc).isoformat()}}
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
async def get_recent_calls(limit: int = 50, user = Depends(get_current_user)):
    """Get recent calls across all contacts"""
    calls = await db.call_logs.find().sort("call_date", -1).to_list(length=limit)
    
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
                "recording_url": call.get("recording_file")
            }
            for call in calls
        ],
        "total": len(calls)
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
    
    # Log the click-to-call attempt
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
        "status": "initiated",
        "logged_at": now,
        "system": "ERP_Click2Call"
    }
    
    await db.call_logs.insert_one(call_log)
    
    logger.info(f"Click-to-call initiated by {user.get('full_name')} to {phone_number}")
    
    return {
        "success": True,
        "call_id": call_id,
        "phone_number": phone_number,
        "message": "Call initiated - connect via 3CX client"
    }

@api_router.get("/3cx/template")
async def get_3cx_crm_template():
    """
    Returns the 3CX CRM Integration Template XML
    Download this and upload to your 3CX server at:
    https://clt-academy.3cx.ae:5001/#/office/integrations/crm
    """
    # Get the backend URL - use request host or environment variable
    # For production, this should be set to your actual deployed URL
    backend_url = os.environ.get('BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://academy-erp.preview.emergentagent.com'))
    
    # 3CX v18+ compatible XML template format
    template = f'''<?xml version="1.0" encoding="utf-8"?>
<Crm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <CrmName>CLT Academy ERP</CrmName>
  <Version>1.0</Version>
  <IconUrl>https://www.clt-academy.com/favicon.ico</IconUrl>
  <Number>
    <AreaCode>0</AreaCode>
    <CountryCode>971</CountryCode>
    <NoDigits>10</NoDigits>
  </Number>
  <Connection Url="{backend_url}" />
  <Authentication Type="No" />
  
  <Scenarios>
    <Scenario Id="LookupByPhoneNumber" Type="REST">
      <Request Url="{backend_url}/api/3cx/contact-lookup?phone_number=[Number]" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="UrlEncoded" />
      <Response Type="JSON">
        <ContactUrl>[contact_url]</ContactUrl>
        <FirstName>[first_name]</FirstName>
        <LastName>[last_name]</LastName>
        <Email>[email]</Email>
        <PhoneMobile>[phone_mobile]</PhoneMobile>
        <PhoneBusiness>[phone_business]</PhoneBusiness>
        <CompanyName>[company_name]</CompanyName>
        <EntityId>[contact_id]</EntityId>
        <EntityType>[contact_type]</EntityType>
      </Response>
      <Rules>
        <Rule Type="Any">found=true</Rule>
      </Rules>
    </Scenario>

    <Scenario Id="LookupByEmail" Type="REST">
      <Request Url="{backend_url}/api/3cx/contact-search?search_text=[Email]" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="UrlEncoded" />
      <Response Type="JSON">
        <ContactUrl>contacts[0].contact_url</ContactUrl>
        <FirstName>contacts[0].first_name</FirstName>
        <LastName>contacts[0].last_name</LastName>
        <Email>contacts[0].email</Email>
        <PhoneMobile>contacts[0].phone_mobile</PhoneMobile>
        <CompanyName>contacts[0].company_name</CompanyName>
        <EntityId>contacts[0].contact_id</EntityId>
      </Response>
      <Rules>
        <Rule Type="Any">total&gt;0</Rule>
      </Rules>
    </Scenario>

    <Scenario Id="SearchContacts" Type="REST">
      <Request Url="{backend_url}/api/3cx/contact-search?search_text=[SearchText]&amp;limit=20" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="UrlEncoded" />
      <Response Type="JSON">
        <ContactList ListPath="contacts">
          <ContactUrl>contact_url</ContactUrl>
          <FirstName>first_name</FirstName>
          <LastName>last_name</LastName>
          <Email>email</Email>
          <PhoneMobile>phone_mobile</PhoneMobile>
          <CompanyName>company_name</CompanyName>
          <EntityId>contact_id</EntityId>
        </ContactList>
      </Response>
      <Rules>
        <Rule Type="Any">total&gt;0</Rule>
      </Rules>
    </Scenario>

    <Scenario Id="GetAllContacts" Type="REST">
      <Request Url="{backend_url}/api/3cx/contact-search?search_text=&amp;limit=100" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="UrlEncoded" />
      <Response Type="JSON">
        <ContactList ListPath="contacts">
          <ContactUrl>contact_url</ContactUrl>
          <FirstName>first_name</FirstName>
          <LastName>last_name</LastName>
          <Email>email</Email>
          <PhoneMobile>phone_mobile</PhoneMobile>
          <CompanyName>company_name</CompanyName>
          <EntityId>contact_id</EntityId>
        </ContactList>
      </Response>
    </Scenario>

    <Scenario Id="ReportCall" Type="REST">
      <Request Url="{backend_url}/api/3cx/call-journal" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="Json" Method="POST">
        <PostData>
{{
  "call_type": "[CallType]",
  "phone_number": "[Number]",
  "call_direction": "[CallDirection]",
  "name": "[Name]",
  "contact_id": "[EntityId]",
  "call_duration": "[Duration]",
  "timestamp": "[CallStartTimeUTC]",
  "recording_file": "[RecordingUrl]",
  "agent_extension": "[Agent]"
}}
        </PostData>
      </Request>
      <Response Type="JSON" />
    </Scenario>

    <Scenario Id="CreateContactRecord" Type="REST">
      <Request Url="{backend_url}/api/3cx/contact-create" MessageType="QueryMessage" RequestType="QueryMessage" RequestEncoding="Json" Method="POST">
        <PostData>
{{
  "phone_number": "[Number]",
  "first_name": "[FirstName]",
  "last_name": "[LastName]",
  "email": "[Email]",
  "company_name": "[CompanyName]"
}}
        </PostData>
      </Request>
      <Response Type="JSON">
        <ContactUrl>[contact_url]</ContactUrl>
        <EntityId>[contact_id]</EntityId>
      </Response>
      <Rules>
        <Rule Type="Any">success=true</Rule>
      </Rules>
    </Scenario>
  </Scenarios>
</Crm>'''
    
    return {
        "template": template,
        "instructions": {
            "step1": "Download this XML file using the 'Download XML' button",
            "step2": "Go to your 3CX Admin Console > Settings > CRM",
            "step3": "Click 'Server Side' tab, then click 'Add' button",
            "step4": "Select 'From File' and upload the downloaded XML file",
            "step5": "The CRM should appear as 'CLT Academy ERP' in the list",
            "step6": "Enable the integration and test with a sample call"
        },
        "backend_url": backend_url,
        "endpoints": {
            "contact_lookup": f"{backend_url}/api/3cx/contact-lookup?phone_number={{phone}}",
            "contact_search": f"{backend_url}/api/3cx/contact-search?search_text={{text}}",
            "contact_create": f"{backend_url}/api/3cx/contact-create",
            "call_journal": f"{backend_url}/api/3cx/call-journal",
            "call_history": f"{backend_url}/api/3cx/call-history/{{contact_id}}",
            "recent_calls": f"{backend_url}/api/3cx/recent-calls",
            "click_to_call": f"{backend_url}/api/3cx/click-to_call"
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
    
    logger.info("CLT Academy ERP v2.0 started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
