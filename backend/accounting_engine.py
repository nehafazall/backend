"""
CLT Synapse - Double Entry Accounting Engine
CFO-Grade Finance System with Double Entry Ledger
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import httpx

# ==================== ENUMS ====================

class AccountType(str, Enum):
    ASSET = "Asset"
    LIABILITY = "Liability"
    INCOME = "Income"
    EXPENSE = "Expense"
    EQUITY = "Equity"

class AccountSubtype(str, Enum):
    BANK = "Bank"
    WALLET = "Wallet"
    CASH = "Cash"
    RECEIVABLE = "Receivable"
    REVENUE = "Revenue"
    EXPENSE = "Expense"
    CLEARING = "Clearing"
    PAYABLE = "Payable"
    EQUITY = "Equity"

class JournalStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    APPROVED = "Approved"

class LockStatus(str, Enum):
    OPEN = "OPEN"
    LOCKED = "LOCKED"

class SettlementStatus(str, Enum):
    PENDING = "Pending"
    SETTLED = "Settled"
    OVERDUE = "Overdue"

class SettlementProvider(str, Enum):
    TABBY = "Tabby"
    TAMARA = "Tamara"
    NETWORK = "Network"

# ==================== PYDANTIC MODELS ====================

# Chart of Accounts
class AccountCreate(BaseModel):
    code: Optional[str] = None
    name: str
    account_type: AccountType
    subtype: AccountSubtype
    currency: str = "AED"
    parent_account_id: Optional[str] = None
    description: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class AccountResponse(BaseModel):
    id: str
    code: Optional[str]
    name: str
    account_type: str
    subtype: str
    currency: str
    parent_account_id: Optional[str]
    description: Optional[str]
    active: bool
    created_at: str

# Journal Entry
class JournalLineCreate(BaseModel):
    account_id: str
    debit_amount: float = 0
    credit_amount: float = 0
    currency: str = "AED"
    memo: Optional[str] = None

class JournalEntryCreate(BaseModel):
    entry_date: str
    description: str
    source_module: str = "Manual"  # Sales, Settlement, Expense, Transfer, Manual
    source_id: Optional[str] = None
    lines: List[JournalLineCreate]

class JournalEntryUpdate(BaseModel):
    entry_date: Optional[str] = None
    description: Optional[str] = None
    lines: Optional[List[JournalLineCreate]] = None

class JournalLineResponse(BaseModel):
    id: str
    journal_entry_id: str
    account_id: str
    account_name: str
    debit_amount: float
    credit_amount: float
    currency: str
    base_amount_aed: float
    memo: Optional[str]

class JournalEntryResponse(BaseModel):
    id: str
    entry_date: str
    description: str
    source_module: str
    source_id: Optional[str]
    status: str
    lock_status: str
    approved_by: Optional[str]
    approved_at: Optional[str]
    created_by: str
    created_at: str
    unlock_reason: Optional[str]
    lines: List[JournalLineResponse]
    total_debit: float
    total_credit: float
    is_balanced: bool

# Settlement Batch
class SettlementBatchCreate(BaseModel):
    provider: SettlementProvider
    period_start: str
    period_end: str
    bank_account_id: str
    expected_settlement_date: str
    entry_ids: List[str]  # Journal entry IDs to include
    notes: Optional[str] = None

class SettlementBatchSettle(BaseModel):
    net_received: float
    actual_received_date: str
    proof_link: Optional[str] = None

class SettlementBatchResponse(BaseModel):
    id: str
    provider: str
    period_start: str
    period_end: str
    gross_amount: float
    net_received: Optional[float]
    fees_withheld: Optional[float]
    bank_account_id: str
    bank_account_name: str
    expected_settlement_date: str
    actual_received_date: Optional[str]
    status: str
    lock_status: str
    approved_by: Optional[str]
    approved_at: Optional[str]
    proof_link: Optional[str]
    entry_ids: List[str]
    created_at: str
    is_overdue: bool

# Expense
class ExpenseCreate(BaseModel):
    date: str
    vendor: str
    expense_account_id: str
    amount: float
    currency: str = "AED"
    paid_from_account_id: str
    proof_link: Optional[str] = None
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    date: str
    vendor: str
    expense_account_id: str
    expense_account_name: str
    amount: float
    currency: str
    base_amount_aed: float
    paid_from_account_id: str
    paid_from_account_name: str
    proof_link: Optional[str]
    notes: Optional[str]
    journal_entry_id: str
    status: str
    created_by: str
    created_at: str

# Transfer
class TransferCreate(BaseModel):
    date: str
    source_account_id: str
    destination_account_id: str
    amount: float
    currency: str = "AED"
    notes: Optional[str] = None

class TransferResponse(BaseModel):
    id: str
    date: str
    source_account_id: str
    source_account_name: str
    destination_account_id: str
    destination_account_name: str
    amount: float
    currency: str
    base_amount_aed: float
    notes: Optional[str]
    journal_entry_id: str
    status: str
    created_by: str
    created_at: str

# Finance Config
class FinanceConfigUpdate(BaseModel):
    tabby_settlement_day: Optional[str] = None  # "Monday"
    tamara_settlement_days: Optional[int] = None  # T+7
    network_settlement_days: Optional[int] = None  # T+1
    grace_period_days: Optional[int] = None
    large_fee_threshold: Optional[float] = None
    overdue_alert_days: Optional[int] = None
    reconciliation_variance_threshold: Optional[float] = None

# ==================== DEFAULT CHART OF ACCOUNTS ====================

DEFAULT_ACCOUNTS = [
    # ASSETS - Banks
    {"code": "1001", "name": "ADCB Bank", "account_type": "Asset", "subtype": "Bank", "currency": "AED"},
    {"code": "1002", "name": "ADIB Bank", "account_type": "Asset", "subtype": "Bank", "currency": "AED"},
    {"code": "1003", "name": "Mashreq Bank", "account_type": "Asset", "subtype": "Bank", "currency": "AED"},
    {"code": "1004", "name": "Indian Bank", "account_type": "Asset", "subtype": "Bank", "currency": "INR"},
    {"code": "1005", "name": "USDT Wallet", "account_type": "Asset", "subtype": "Wallet", "currency": "USDT"},
    {"code": "1006", "name": "Cash", "account_type": "Asset", "subtype": "Cash", "currency": "AED"},
    
    # ASSETS - Receivables
    {"code": "1101", "name": "Tabby Receivable", "account_type": "Asset", "subtype": "Receivable", "currency": "AED"},
    {"code": "1102", "name": "Tamara Receivable", "account_type": "Asset", "subtype": "Receivable", "currency": "AED"},
    {"code": "1103", "name": "Network Receivable", "account_type": "Asset", "subtype": "Receivable", "currency": "AED"},
    
    # INCOME
    {"code": "4001", "name": "Course Revenue", "account_type": "Income", "subtype": "Revenue", "currency": "AED"},
    {"code": "4002", "name": "Renewal Revenue", "account_type": "Income", "subtype": "Revenue", "currency": "AED"},
    {"code": "4003", "name": "Upsell Revenue", "account_type": "Income", "subtype": "Revenue", "currency": "AED"},
    {"code": "4004", "name": "Other Revenue", "account_type": "Income", "subtype": "Revenue", "currency": "AED"},
    
    # EXPENSES
    {"code": "5001", "name": "Payment Provider Fees", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5002", "name": "Marketing Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5003", "name": "Salary Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5004", "name": "Rent Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5005", "name": "Software Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5006", "name": "Utilities Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5007", "name": "Travel Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    {"code": "5008", "name": "Other Expense", "account_type": "Expense", "subtype": "Expense", "currency": "AED"},
    
    # EQUITY
    {"code": "3001", "name": "Owner Equity", "account_type": "Equity", "subtype": "Equity", "currency": "AED"},
]

# ==================== SETTLEMENT RULES ====================

SETTLEMENT_RULES = {
    "Tabby": {"type": "weekly", "day": "Monday"},  # Next Monday
    "Tamara": {"type": "days", "days": 7},  # T+7
    "Network": {"type": "days", "days": 1},  # T+1
}

# ==================== CURRENCY CONVERSION ====================

async def get_inr_to_aed_rate(api_key: str) -> float:
    """Fetch INR to AED exchange rate from API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://v6.exchangerate-api.com/v6/{api_key}/latest/INR",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("result") == "success":
                    return data["conversion_rates"].get("AED", 0.044)  # Default fallback
    except Exception as e:
        print(f"Exchange rate API error: {e}")
    return 0.044  # Fallback rate

def convert_to_aed(amount: float, currency: str, inr_rate: float = 0.044, usd_rate: float = 3.674) -> float:
    """Convert amount to AED base currency"""
    if currency == "AED":
        return amount
    elif currency == "INR":
        return amount * inr_rate
    elif currency in ["USDT", "USD"]:
        return amount * usd_rate
    return amount

# ==================== SETTLEMENT DATE CALCULATION ====================

def calculate_expected_settlement_date(sale_date: datetime, provider: str) -> datetime:
    """Calculate expected settlement date based on provider rules"""
    rules = SETTLEMENT_RULES.get(provider)
    if not rules:
        return sale_date + timedelta(days=1)
    
    if rules["type"] == "weekly":
        # Find next occurrence of the day
        target_day = rules["day"]
        days_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
        target_weekday = days_map.get(target_day, 0)
        
        days_ahead = target_weekday - sale_date.weekday()
        if days_ahead <= 0:  # Target day already happened this week or is today
            days_ahead += 7
        return sale_date + timedelta(days=days_ahead)
    
    elif rules["type"] == "days":
        return sale_date + timedelta(days=rules["days"])
    
    return sale_date + timedelta(days=1)

def is_settlement_overdue(expected_date: datetime, grace_days: int = 2) -> bool:
    """Check if settlement is overdue (past expected date + grace period)"""
    now = datetime.now(timezone.utc)
    overdue_date = expected_date + timedelta(days=grace_days)
    return now > overdue_date

# ==================== FINANCE AUDIT LOG ====================

def create_finance_audit_entry(
    user_id: str,
    user_name: str,
    entity_type: str,
    entity_id: str,
    action: str,
    before_state: dict = None,
    after_state: dict = None
) -> dict:
    """Create an immutable audit log entry for finance operations"""
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "before_json": before_state,
        "after_json": after_state,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==================== DEFAULT CONFIG ====================

DEFAULT_FINANCE_CONFIG = {
    "tabby_settlement_day": "Monday",
    "tamara_settlement_days": 7,
    "network_settlement_days": 1,
    "grace_period_days": 2,
    "large_fee_threshold": 1000,
    "overdue_alert_days": 2,
    "reconciliation_variance_threshold": 100,
}
