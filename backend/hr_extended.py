"""
CLT Synapse ERP - HR Extended Module
Payroll Engine, Performance KPIs, Asset Management, and HR Analytics
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid

hr_extended_router = APIRouter(prefix="/hr", tags=["HR Extended"])

# ==================== ENUMS ====================

class PayrollStatus(str, Enum):
    DRAFT = "draft"
    CALCULATED = "calculated"
    HR_APPROVED = "hr_approved"
    FINANCE_APPROVED = "finance_approved"
    PAID = "paid"
    ON_HOLD = "on_hold"

class AssetStatus(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    UNDER_MAINTENANCE = "under_maintenance"
    DISPOSED = "disposed"
    LOST = "lost"

class AssetRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ISSUED = "issued"
    RETURNED = "returned"
    REJECTED = "rejected"

class KPIPeriod(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

# ==================== PYDANTIC MODELS ====================

# Payroll Models
class PayrollCreate(BaseModel):
    month: int  # 1-12
    year: int
    department: Optional[str] = None  # Process specific department or all

class PayrollDeduction(BaseModel):
    type: str  # late, absence, advance, penalty, tax, other
    description: str
    amount: float

class PayrollAddition(BaseModel):
    type: str  # bonus, commission, overtime, incentive, allowance, other
    description: str
    amount: float

class PayrollAdjustment(BaseModel):
    employee_id: str
    deductions: Optional[List[PayrollDeduction]] = None
    additions: Optional[List[PayrollAddition]] = None
    comments: Optional[str] = None

# Asset Models
class AssetCreate(BaseModel):
    asset_code: str
    asset_name: str
    category: str  # laptop, mobile, furniture, vehicle, other
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    warranty_expiry: Optional[str] = None
    location: str = "Office"
    condition: str = "good"  # excellent, good, fair, poor
    notes: Optional[str] = None

class AssetUpdate(BaseModel):
    asset_name: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_expiry: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AssetRequestCreate(BaseModel):
    asset_id: Optional[str] = None  # Specific asset or None for new request
    asset_category: str
    reason: str
    expected_return_date: Optional[str] = None

class AssetAssignment(BaseModel):
    asset_id: str
    employee_id: str
    assignment_date: str
    expected_return_date: Optional[str] = None
    notes: Optional[str] = None

# KPI Models
class KPIDefinitionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str  # company, department, individual
    department: Optional[str] = None
    target_value: float
    unit: str  # percentage, number, currency, rating
    weight: float = 1.0
    period: KPIPeriod = KPIPeriod.MONTHLY

class KPIScoreCreate(BaseModel):
    kpi_id: str
    employee_id: Optional[str] = None
    department: Optional[str] = None
    period_month: int
    period_year: int
    actual_value: float
    comments: Optional[str] = None

class PerformanceReviewCreate(BaseModel):
    employee_id: str
    review_period: str  # Q1-2026, Annual-2025, etc.
    reviewer_id: str
    overall_rating: float  # 1-5
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals_next_period: Optional[str] = None
    kpi_scores: Optional[List[Dict]] = None
    comments: Optional[str] = None

# ==================== UTILITY FUNCTIONS ====================

def calculate_payroll_totals(salary_structure: Dict, deductions: List, additions: List, days_worked: int, total_days: int) -> Dict:
    """Calculate all payroll components"""
    # Base salary components (prorated if needed)
    prorate_factor = days_worked / total_days if total_days > 0 else 1
    
    basic = salary_structure.get("basic_salary", 0) * prorate_factor
    housing = salary_structure.get("housing_allowance", 0) * prorate_factor
    transport = salary_structure.get("transport_allowance", 0) * prorate_factor
    food = salary_structure.get("food_allowance", 0) * prorate_factor
    phone = salary_structure.get("phone_allowance", 0) * prorate_factor
    other_allowances = salary_structure.get("other_allowances", 0) * prorate_factor
    fixed_incentive = salary_structure.get("fixed_incentive", 0)
    
    gross_salary = basic + housing + transport + food + phone + other_allowances + fixed_incentive
    
    # Calculate total deductions
    total_deductions = sum(d.get("amount", 0) for d in deductions)
    
    # Calculate total additions
    total_additions = sum(a.get("amount", 0) for a in additions)
    
    net_salary = gross_salary - total_deductions + total_additions
    
    return {
        "basic_salary": round(basic, 2),
        "housing_allowance": round(housing, 2),
        "transport_allowance": round(transport, 2),
        "food_allowance": round(food, 2),
        "phone_allowance": round(phone, 2),
        "other_allowances": round(other_allowances, 2),
        "fixed_incentive": round(fixed_incentive, 2),
        "gross_salary": round(gross_salary, 2),
        "total_deductions": round(total_deductions, 2),
        "total_additions": round(total_additions, 2),
        "net_salary": round(net_salary, 2)
    }

def calculate_attendance_deductions(late_minutes: int, absent_days: float, daily_rate: float) -> List[Dict]:
    """Calculate deductions based on attendance"""
    deductions = []
    
    # Late penalty: 50 AED per 15 minutes (example policy)
    if late_minutes > 0:
        late_penalty = (late_minutes // 15) * 50
        if late_penalty > 0:
            deductions.append({
                "type": "late",
                "description": f"Late penalty ({late_minutes} minutes)",
                "amount": late_penalty
            })
    
    # Absent days: Deduct daily rate
    if absent_days > 0:
        absence_deduction = absent_days * daily_rate
        deductions.append({
            "type": "absence",
            "description": f"Absent days deduction ({absent_days} days)",
            "amount": round(absence_deduction, 2)
        })
    
    return deductions

def calculate_kpi_score(actual: float, target: float) -> float:
    """Calculate KPI score as percentage of target achieved"""
    if target <= 0:
        return 0
    score = (actual / target) * 100
    return min(score, 150)  # Cap at 150%
