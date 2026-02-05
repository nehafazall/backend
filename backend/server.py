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
from bson import ObjectId
import re

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
    "sales_executive", "cs_head", "cs_agent", "mentor", "finance", "hr"
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

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    region: Optional[str] = None  # UAE, India, International

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

class LeadResponse(LeadBase):
    id: str
    stage: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    call_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_activity: Optional[datetime] = None
    sla_breach: bool = False
    
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
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(extra="ignore")

class PaymentBase(BaseModel):
    student_id: Optional[str] = None
    lead_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float
    currency: str = "AED"
    payment_method: str
    transaction_id: Optional[str] = None
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

class ActivityLog(BaseModel):
    entity_type: str  # lead, student, payment, user
    entity_id: str
    action: str
    user_id: str
    user_name: str
    details: Optional[Dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationBase(BaseModel):
    user_id: str
    title: str
    message: str
    type: str  # info, warning, success, error
    link: Optional[str] = None
    read: bool = False

class DashboardStats(BaseModel):
    total_leads: int = 0
    leads_today: int = 0
    hot_leads: int = 0
    enrolled_today: int = 0
    pending_follow_ups: int = 0
    sla_breaches: int = 0
    total_revenue: float = 0
    pending_payments: int = 0

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

async def get_round_robin_agent(role: str, region: str = None) -> Optional[Dict]:
    """Get next available agent using round-robin"""
    query = {"role": role, "is_active": True}
    if region:
        query["region"] = region
    
    agents = await db.users.find(query).to_list(100)
    if not agents:
        return None
    
    # Get assignment counts
    assignment_counts = {}
    for agent in agents:
        if role == "sales_executive":
            count = await db.leads.count_documents({"assigned_to": agent["id"]})
        elif role == "cs_agent":
            count = await db.students.count_documents({"cs_agent_id": agent["id"]})
        elif role == "mentor":
            count = await db.students.count_documents({"mentor_id": agent["id"]})
        else:
            count = 0
        assignment_counts[agent["id"]] = count
    
    # Return agent with lowest count
    min_agent = min(agents, key=lambda a: assignment_counts.get(a["id"], 0))
    return min_agent

# ==================== BOOTSTRAP SUPER ADMIN ====================

async def bootstrap_super_admin():
    """Create super admin on first initialization"""
    existing = await db.users.find_one({"email": "aqib@clt-academy.com"})
    if not existing:
        super_admin = {
            "id": str(uuid.uuid4()),
            "email": "aqib@clt-academy.com",
            "password": hash_password("A@qib1234"),
            "full_name": "Aqib (Super Admin)",
            "role": "super_admin",
            "department": "Management",
            "is_active": True,
            "region": "UAE",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin)
        logger.info("Super admin created: aqib@clt-academy.com")

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

# ==================== USER MANAGEMENT ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    user = Depends(require_roles(["super_admin", "admin", "sales_manager", "cs_head"]))
):
    query = {}
    if role:
        query["role"] = role
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
    
    new_user = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    await log_activity("user", new_user["id"], "created", user, {"email": data.email})
    
    return {k: v for k, v in new_user.items() if k != "password" and k != "_id"}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: Dict, user = Depends(require_roles(["super_admin", "admin"]))):
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
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
        # Get team members
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
    
    # Add assigned user names
    for lead in leads:
        if lead.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": lead["assigned_to"]})
            lead["assigned_to_name"] = assigned_user.get("full_name") if assigned_user else None
        
        # Check SLA breach (no activity in 24 hours)
        last_activity = lead.get("last_activity") or lead.get("created_at")
        if isinstance(last_activity, str):
            last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) - last_activity > timedelta(hours=24):
            lead["sla_breach"] = True
    
    return leads

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(data: LeadCreate, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    # Check for duplicate by phone
    existing = await db.leads.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(status_code=400, detail=f"Lead with this phone already exists. Assigned to: {existing.get('assigned_to_name', 'Unknown')}")
    
    # Determine region from phone
    region = "international"
    if data.phone.startswith("+971") or data.phone.startswith("971"):
        region = "UAE"
    elif data.phone.startswith("+91") or data.phone.startswith("91"):
        region = "India"
    
    # Round-robin assignment
    assigned_agent = await get_round_robin_agent("sales_executive", region)
    
    new_lead = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "stage": "new_lead",
        "assigned_to": assigned_agent["id"] if assigned_agent else None,
        "assigned_to_name": assigned_agent["full_name"] if assigned_agent else None,
        "sla_breach": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_activity": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.insert_one(new_lead)
    await log_activity("lead", new_lead["id"], "created", user, {"phone": data.phone})
    
    # Notify assigned agent
    if assigned_agent:
        await create_notification(
            assigned_agent["id"],
            "New Lead Assigned",
            f"You have been assigned a new lead: {data.full_name}",
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
    
    # Validate stage transition
    if "stage" in update_data:
        if update_data["stage"] not in LEAD_STAGES:
            raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {LEAD_STAGES}")
        
        # Require rejection reason
        if update_data["stage"] == "rejected" and not update_data.get("rejection_reason"):
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        # If enrolled, trigger handoff to CS
        if update_data["stage"] == "enrolled":
            # Create student record
            student_data = {
                "id": str(uuid.uuid4()),
                "lead_id": lead_id,
                "full_name": existing["full_name"],
                "phone": existing["phone"],
                "email": existing.get("email"),
                "country": existing.get("country"),
                "stage": "new_student",
                "mentor_stage": "new_student",
                "onboarding_complete": False,
                "classes_attended": 0,
                "upgrade_eligible": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Assign CS agent
            cs_agent = await get_round_robin_agent("cs_agent")
            if cs_agent:
                student_data["cs_agent_id"] = cs_agent["id"]
                student_data["cs_agent_name"] = cs_agent["full_name"]
                await create_notification(
                    cs_agent["id"],
                    "New Student Assigned",
                    f"New student enrolled: {existing['full_name']}",
                    "success",
                    f"/cs/students/{student_data['id']}"
                )
            
            await db.students.insert_one(student_data)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["last_activity"] = datetime.now(timezone.utc).isoformat()
    
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
    
    # Role-based filtering
    if user["role"] == "cs_agent":
        query["cs_agent_id"] = user["id"]
    elif user["role"] == "mentor":
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
    
    # Validate CS stage
    if "stage" in update_data and update_data["stage"] not in STUDENT_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {STUDENT_STAGES}")
    
    # Validate mentor stage
    if "mentor_stage" in update_data and update_data["mentor_stage"] not in MENTOR_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid mentor stage. Must be one of: {MENTOR_STAGES}")
    
    # Check upgrade eligibility (6+ classes)
    if update_data.get("classes_attended", 0) >= 6:
        update_data["upgrade_eligible"] = True
    
    # Assign mentor if moving to activated and no mentor
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
    
    # Add verifier names
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
    
    # Notify finance team
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
        
        # Record verifier
        if update_data["stage"] == "verified":
            update_data["verified_by"] = user["id"]
        
        if update_data["stage"] == "reconciled":
            update_data["reconciled_at"] = datetime.now(timezone.utc).isoformat()
        
        # Require discrepancy reason
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
    
    stats = {}
    
    # Lead stats
    if user["role"] in ["super_admin", "admin", "sales_manager", "team_leader", "sales_executive"]:
        lead_query = {}
        if user["role"] == "sales_executive":
            lead_query["assigned_to"] = user["id"]
        
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
    
    # Student stats
    if user["role"] in ["super_admin", "admin", "cs_head", "cs_agent", "mentor"]:
        student_query = {}
        if user["role"] == "cs_agent":
            student_query["cs_agent_id"] = user["id"]
        elif user["role"] == "mentor":
            student_query["mentor_id"] = user["id"]
        
        stats["total_students"] = await db.students.count_documents(student_query)
        stats["new_students"] = await db.students.count_documents({**student_query, "stage": "new_student"})
        stats["activated_students"] = await db.students.count_documents({**student_query, "stage": "activated"})
        stats["upgrade_eligible"] = await db.students.count_documents({**student_query, "upgrade_eligible": True})
    
    # Payment stats
    if user["role"] in ["super_admin", "admin", "finance"]:
        stats["pending_payments"] = await db.payments.count_documents({"stage": {"$in": ["new_payment", "pending_verification"]}})
        stats["verified_payments"] = await db.payments.count_documents({"stage": "verified"})
        stats["discrepancies"] = await db.payments.count_documents({"stage": "discrepancy"})
        
        # Total revenue
        pipeline = [
            {"$match": {"stage": {"$in": ["verified", "reconciled", "completed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.payments.aggregate(pipeline).to_list(1)
        stats["total_revenue"] = result[0]["total"] if result else 0
    
    return stats

@api_router.get("/dashboard/lead-funnel")
async def get_lead_funnel(user = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.leads.aggregate(pipeline).to_list(100)
    
    # Order by stage sequence
    stage_order = {stage: i for i, stage in enumerate(LEAD_STAGES)}
    result.sort(key=lambda x: stage_order.get(x["_id"], 999))
    
    return result

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

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "CLT Academy ERP API", "version": "1.0.0"}

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
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.leads.create_index("phone", unique=True)
    await db.leads.create_index("stage")
    await db.leads.create_index("assigned_to")
    await db.students.create_index("phone")
    await db.students.create_index("stage")
    await db.students.create_index("mentor_stage")
    await db.payments.create_index("stage")
    await db.notifications.create_index("user_id")
    await db.activity_logs.create_index([("entity_type", 1), ("entity_id", 1)])
    
    logger.info("CLT Academy ERP started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
