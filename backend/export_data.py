#!/usr/bin/env python3
"""
CLT Synapse - Data Export Script
Exports all MongoDB collections to JSON files for migration
"""

import requests
import json
import os
from datetime import datetime

# Configuration
API_URL = "https://commission-debug-2.preview.emergentagent.com"
EMAIL = "aqib@clt-academy.com"
PASSWORD = "@Aqib1234"
OUTPUT_DIR = "./exported_data"

# All data endpoints to export
ENDPOINTS = {
    # Core Data
    "users": "/api/users",
    "departments": "/api/departments",
    "teams": "/api/teams",
    "leads": "/api/leads",
    "students": "/api/students",
    "customers": "/api/customers",
    "payments": "/api/payments",
    "courses": "/api/courses",
    "roles": "/api/roles",
    
    # Commission & Approvals
    "commission_rules": "/api/commission-rules",
    "commissions": "/api/commissions",
    "commission_settlements": "/api/commission-settlements",
    "approval_requests": "/api/approval-requests",
    
    # HR Data
    "employees": "/api/hr/employees",
    "leave_requests": "/api/hr/leave-requests",
    "attendance": "/api/hr/attendance",
    "payroll": "/api/hr/payroll",
    "payroll_batches": "/api/hr/payroll/batches",
    "assets": "/api/hr/assets",
    "asset_requests": "/api/hr/assets/requests",
    "kpis": "/api/hr/kpis",
    "kpi_scores": "/api/hr/kpi-scores",
    "performance_reviews": "/api/hr/performance-reviews",
    "regularization_requests": "/api/hr/regularization-requests",
    "expiry_alerts": "/api/hr/expiry-alerts",
    
    # Accounting/Finance Data
    "accounts": "/api/accounting/accounts",
    "journal_entries": "/api/accounting/journal-entries",
    "settlements": "/api/accounting/settlements",
    "expenses": "/api/accounting/expenses",
    "transfers": "/api/accounting/transfers",
    "bank_statements": "/api/accounting/bank-statements",
    "accounting_config": "/api/accounting/config",
    "accounting_audit_logs": "/api/accounting/audit-logs",
    
    # System Data
    "notifications": "/api/notifications",
    "activity_logs": "/api/activity-logs",
    "audit_logs": "/api/audit-logs",
    
    # 3CX Integration
    "threecx_recent_calls": "/api/3cx/recent-calls",
    "threecx_qc_queue": "/api/3cx/calls/qc-queue",
}


def authenticate():
    """Authenticate and get access token"""
    print(f"🔐 Authenticating as {EMAIL}...")
    
    response = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Authentication successful!")
        return token
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        print(response.text)
        return None


def export_endpoint(token, name, endpoint):
    """Export a single endpoint to JSON file"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_URL}{endpoint}", headers=headers, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            
            # Handle different response formats
            if isinstance(data, dict):
                # Some endpoints return {"data": [...]} or similar
                if "data" in data:
                    records = data["data"]
                elif "items" in data:
                    records = data["items"]
                else:
                    records = data
            else:
                records = data
            
            # Count records
            count = len(records) if isinstance(records, list) else 1
            
            # Save to file
            filename = f"{OUTPUT_DIR}/{name}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, default=str)
            
            print(f"  ✅ {name}: {count} records exported")
            return count
        else:
            print(f"  ⚠️  {name}: HTTP {response.status_code} - Skipped")
            return 0
            
    except requests.exceptions.Timeout:
        print(f"  ⚠️  {name}: Timeout - Skipped")
        return 0
    except Exception as e:
        print(f"  ❌ {name}: Error - {str(e)}")
        return 0


def export_all_data():
    """Main export function"""
    print("=" * 60)
    print("🚀 CLT Synapse Data Export Tool")
    print("=" * 60)
    print(f"📡 API URL: {API_URL}")
    print(f"📁 Output Directory: {OUTPUT_DIR}")
    print("=" * 60)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Authenticate
    token = authenticate()
    if not token:
        print("❌ Export aborted due to authentication failure")
        return
    
    print("\n" + "=" * 60)
    print("📦 Exporting Collections...")
    print("=" * 60)
    
    # Export each endpoint
    total_records = 0
    successful_exports = 0
    failed_exports = 0
    
    for name, endpoint in ENDPOINTS.items():
        count = export_endpoint(token, name, endpoint)
        if count > 0:
            total_records += count
            successful_exports += 1
        else:
            failed_exports += 1
    
    # Create metadata file
    metadata = {
        "export_date": datetime.now().isoformat(),
        "api_url": API_URL,
        "total_collections": len(ENDPOINTS),
        "successful_exports": successful_exports,
        "failed_exports": failed_exports,
        "total_records": total_records,
        "collections": list(ENDPOINTS.keys())
    }
    
    with open(f"{OUTPUT_DIR}/_export_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Export Summary")
    print("=" * 60)
    print(f"✅ Successful exports: {successful_exports}/{len(ENDPOINTS)}")
    print(f"❌ Failed exports: {failed_exports}/{len(ENDPOINTS)}")
    print(f"📝 Total records exported: {total_records}")
    print(f"📁 Files saved to: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)
    print("🎉 Export complete!")


if __name__ == "__main__":
    export_all_data()
