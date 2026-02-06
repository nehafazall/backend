from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
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
JWT_SECRET = os.environ.get('JWT_SECRET', 'clt-academy-erp-secret-key-2024')
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
        
        last_activity = lead.get("last_activity") or lead.get("created_at")
        if isinstance(last_activity, str):
            try:
                last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) - last_activity > timedelta(hours=24):
                    lead["sla_breach"] = True
            except:
                pass
    
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

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CLT Academy ERP API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    logger.info("CLT Academy ERP v2.0 started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
