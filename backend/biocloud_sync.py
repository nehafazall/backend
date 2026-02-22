"""
BioCloud Attendance Sync Module
Fetches attendance data from ZK BioCloud and syncs with CLT Synapse
"""

import asyncio
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
import os

# BioCloud Configuration
BIOCLOUD_URL = os.environ.get("BIOCLOUD_URL", "https://56.biocloud.me:8085")
BIOCLOUD_USERNAME = os.environ.get("BIOCLOUD_USERNAME", "Admin")
BIOCLOUD_PASSWORD = os.environ.get("BIOCLOUD_PASSWORD", "1")

class BioCloudClient:
    """Client for interacting with ZK BioCloud API and web interface"""
    
    def __init__(self, base_url: str = BIOCLOUD_URL, username: str = BIOCLOUD_USERNAME, password: str = BIOCLOUD_PASSWORD):
        self.base_url = base_url.rstrip('/')
        self.username = username
        self.password = password
        self.token = None
        self.client = httpx.AsyncClient(verify=False, timeout=30.0)
    
    async def authenticate(self) -> bool:
        """Get JWT token from BioCloud"""
        try:
            response = await self.client.post(
                f"{self.base_url}/jwt-api-token-auth/",
                json={"username": self.username, "password": self.password},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                return True
            return False
        except Exception as e:
            print(f"BioCloud auth error: {e}")
            return False
    
    def _get_headers(self) -> dict:
        """Get headers with JWT token"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"JWT {self.token}"
        }
    
    async def get_employees(self, page: int = 1, page_size: int = 100) -> Dict:
        """Fetch employees from BioCloud"""
        if not self.token:
            await self.authenticate()
        
        response = await self.client.get(
            f"{self.base_url}/personnel/api/employees/",
            params={"page": page, "page_size": page_size},
            headers=self._get_headers()
        )
        
        if response.status_code == 200:
            return response.json()
        return {"count": 0, "data": []}
    
    async def get_all_employees(self) -> List[Dict]:
        """Fetch all employees from BioCloud"""
        all_employees = []
        page = 1
        page_size = 100
        
        while True:
            result = await self.get_employees(page=page, page_size=page_size)
            employees = result.get("data", [])
            all_employees.extend(employees)
            
            if len(employees) < page_size:
                break
            page += 1
        
        return all_employees
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


async def sync_biocloud_employees(db) -> Dict:
    """
    Sync employees from BioCloud to CLT Synapse
    Creates a mapping between BioCloud emp_code and CLT Synapse employee records
    """
    client = BioCloudClient()
    
    try:
        if not await client.authenticate():
            return {"success": False, "error": "Failed to authenticate with BioCloud"}
        
        # Fetch all BioCloud employees
        bc_employees = await client.get_all_employees()
        
        # Get existing CLT Synapse employees
        clt_employees = await db.hr_employees.find({}, {"_id": 0}).to_list(1000)
        
        # Create mapping by email or name
        synced = 0
        created = 0
        skipped = 0
        
        for bc_emp in bc_employees:
            emp_code = bc_emp.get("emp_code")
            first_name = bc_emp.get("first_name", "")
            last_name = bc_emp.get("last_name", "")
            full_name = f"{first_name} {last_name}".strip()
            department = bc_emp.get("department", {}).get("dept_name", "")
            position = bc_emp.get("position_name", "")
            
            # Try to find matching CLT employee
            matching_emp = None
            for clt_emp in clt_employees:
                clt_name = clt_emp.get("full_name", "").lower()
                if full_name.lower() in clt_name or clt_name in full_name.lower():
                    matching_emp = clt_emp
                    break
            
            if matching_emp:
                # Update the CLT employee with BioCloud emp_code
                await db.hr_employees.update_one(
                    {"id": matching_emp["id"]},
                    {"$set": {
                        "biocloud_emp_code": emp_code,
                        "biocloud_id": bc_emp.get("id"),
                        "biocloud_synced_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                synced += 1
            else:
                skipped += 1
        
        return {
            "success": True,
            "biocloud_total": len(bc_employees),
            "synced": synced,
            "skipped": skipped,
            "message": f"Synced {synced} employees, skipped {skipped} (no match found)"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        await client.close()


async def get_biocloud_employees_for_mapping(db) -> Dict:
    """
    Get BioCloud employees for UI mapping
    Returns both BioCloud and CLT employees for manual mapping
    """
    client = BioCloudClient()
    
    try:
        if not await client.authenticate():
            return {"success": False, "error": "Failed to authenticate with BioCloud"}
        
        bc_employees = await client.get_all_employees()
        clt_employees = await db.hr_employees.find({}, {"_id": 0}).to_list(1000)
        
        # Format BioCloud employees
        biocloud_list = []
        for bc_emp in bc_employees:
            biocloud_list.append({
                "id": bc_emp.get("id"),
                "emp_code": bc_emp.get("emp_code"),
                "name": f"{bc_emp.get('first_name', '')} {bc_emp.get('last_name', '')}".strip(),
                "department": bc_emp.get("department", {}).get("dept_name", ""),
                "position": bc_emp.get("position_name", ""),
                "mapped_to": None
            })
        
        # Check existing mappings
        for bc in biocloud_list:
            for clt in clt_employees:
                if clt.get("biocloud_emp_code") == bc["emp_code"]:
                    bc["mapped_to"] = {
                        "id": clt["id"],
                        "employee_id": clt.get("employee_id"),
                        "name": clt.get("full_name")
                    }
                    break
        
        return {
            "success": True,
            "biocloud_employees": biocloud_list,
            "clt_employees": [
                {
                    "id": emp["id"],
                    "employee_id": emp.get("employee_id"),
                    "name": emp.get("full_name"),
                    "department": emp.get("department"),
                    "has_mapping": emp.get("biocloud_emp_code") is not None
                }
                for emp in clt_employees
            ]
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        await client.close()


async def save_employee_mapping(db, mappings: List[Dict]) -> Dict:
    """
    Save manual employee mappings between BioCloud and CLT Synapse
    mappings: [{"biocloud_emp_code": "xxx", "clt_employee_id": "yyy"}, ...]
    """
    try:
        updated = 0
        for mapping in mappings:
            result = await db.hr_employees.update_one(
                {"id": mapping["clt_employee_id"]},
                {"$set": {
                    "biocloud_emp_code": mapping["biocloud_emp_code"],
                    "biocloud_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            if result.modified_count > 0:
                updated += 1
        
        return {
            "success": True,
            "updated": updated,
            "message": f"Updated {updated} employee mappings"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
