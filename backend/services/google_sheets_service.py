"""
Google Sheets Lead Connector Service
Handles OAuth, sheet-to-agent mapping, and auto-sync every 5 minutes
"""
import os
import logging
import asyncio
import hashlib
import base64
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
import requests as http_requests

from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

logger = logging.getLogger(__name__)

# Google OAuth Config
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_SHEETS_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_SHEETS_CLIENT_SECRET', '')
BACKEND_URL = os.environ.get('BACKEND_URL', '')
REDIRECT_URI = f"{BACKEND_URL}/api/connectors/google-sheets/callback"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
]

# Column mapping for the specific Google Sheet
# N = Full Name, O = City, P = Primary Number, Q = Secondary Number, B = Lead Captured Time
DEFAULT_COLUMN_MAPPING = {
    "full_name": "N",      # Column N
    "city": "O",           # Column O
    "phone": "P",          # Column P (Primary)
    "secondary_phone": "Q", # Column Q (Secondary)
    "captured_time": "B"   # Column B
}


def get_column_index(col_letter: str) -> int:
    """Convert column letter (A, B, ... Z, AA, AB) to 0-indexed column number"""
    result = 0
    for char in col_letter.upper():
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def extract_sheet_id(url: str) -> Optional[str]:
    """Extract Google Sheet ID from URL"""
    import re
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    return None


def extract_gid(url: str) -> Optional[str]:
    """Extract gid (sheet tab ID) from URL"""
    import re
    match = re.search(r'gid=(\d+)', url)
    if match:
        return match.group(1)
    return None


def generate_code_verifier() -> str:
    """Generate a code verifier for PKCE (43-128 chars)"""
    return secrets.token_urlsafe(64)[:96]


def generate_code_challenge(verifier: str) -> str:
    """Generate a code challenge from verifier for PKCE (S256 method)"""
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')


class GoogleSheetsService:
    """Service for Google Sheets integration"""
    
    def __init__(self, db):
        self.db = db
        self.is_configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    
    async def get_auth_url(self, state: str) -> tuple:
        """Get Google OAuth authorization URL with PKCE. Returns (url, code_verifier)"""
        # Generate PKCE code verifier and challenge
        code_verifier = generate_code_verifier()
        code_challenge = generate_code_challenge(code_verifier)
        
        # Build authorization URL manually
        from urllib.parse import urlencode
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }
        
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        url = f"{base_url}?{urlencode(params)}"
        
        return url, code_verifier
    
    async def exchange_code(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens with PKCE"""
        # Prepare token request
        token_data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI
        }
        
        # Exchange code for tokens
        response = http_requests.post(
            "https://oauth2.googleapis.com/token",
            data=token_data,
            timeout=30
        )
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error_description', error_data.get('error', 'Unknown error'))
            logger.error(f"Token exchange failed: {error_data}")
            raise ValueError(f"Token exchange failed: {error_msg}")
        
        token_response = response.json()
        
        # Calculate expiry
        expires_in = token_response.get("expires_in", 3600)
        expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        return {
            "access_token": token_response["access_token"],
            "refresh_token": token_response.get("refresh_token"),
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "expires_at": expiry.isoformat()
        }
    
    async def get_credentials(self, token_data: Dict) -> Credentials:
        """Get credentials from stored token data, refresh if needed"""
        creds = Credentials(
            token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=token_data.get("client_id", GOOGLE_CLIENT_ID),
            client_secret=token_data.get("client_secret", GOOGLE_CLIENT_SECRET)
        )
        
        # Check if expired
        expires_at_str = token_data.get("expires_at")
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if datetime.now(timezone.utc) >= expires_at:
                # Refresh token
                creds.refresh(GoogleRequest())
                return creds
        
        return creds
    
    async def read_sheet(self, token_data: Dict, spreadsheet_id: str, range_name: str = "A:Z") -> List[List[str]]:
        """Read data from a Google Sheet"""
        creds = await self.get_credentials(token_data)
        
        def _read():
            service = build('sheets', 'v4', credentials=creds)
            result = service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            return result.get('values', [])
        
        return await asyncio.to_thread(_read)
    
    async def get_sheet_metadata(self, token_data: Dict, spreadsheet_id: str) -> Dict:
        """Get spreadsheet metadata including sheet names"""
        creds = await self.get_credentials(token_data)
        
        def _get_metadata():
            service = build('sheets', 'v4', credentials=creds)
            result = service.spreadsheets().get(
                spreadsheetId=spreadsheet_id,
                fields="properties.title,sheets.properties"
            ).execute()
            return result
        
        return await asyncio.to_thread(_get_metadata)
    
    def parse_row(self, row: List[str], column_mapping: Dict[str, str]) -> Dict[str, str]:
        """Parse a row using column mapping"""
        result = {}
        
        for field, col_letter in column_mapping.items():
            col_idx = get_column_index(col_letter)
            if col_idx < len(row):
                result[field] = row[col_idx].strip() if row[col_idx] else ""
            else:
                result[field] = ""
        
        return result
    
    async def sync_sheet_leads(
        self,
        connector_id: str,
        token_data: Dict,
        spreadsheet_id: str,
        sheet_name: str,
        column_mapping: Dict[str, str],
        assigned_agents: List[str],
        skip_header: bool = True
    ) -> Dict[str, Any]:
        """
        Sync leads from a Google Sheet to the leads collection.
        """
        stats = {
            "total_rows": 0,
            "new_leads": 0,
            "duplicates_skipped": 0,
            "errors": 0,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            # Read sheet data
            range_name = f"'{sheet_name}'!A:Z"
            rows = await self.read_sheet(token_data, spreadsheet_id, range_name)
            
            if skip_header and rows:
                rows = rows[1:]
            
            stats["total_rows"] = len(rows)
            
            # Get assigned agents data
            agents = []
            if assigned_agents:
                async for agent in self.db.users.find({"id": {"$in": assigned_agents}, "is_active": True}):
                    agents.append({"id": agent["id"], "full_name": agent.get("full_name", "")})
            
            agent_idx = 0  # For round-robin
            
            for row in rows:
                try:
                    if not row or all(cell.strip() == "" for cell in row):
                        continue
                    
                    # Parse row
                    parsed = self.parse_row(row, column_mapping)
                    
                    phone = parsed.get("phone", "").strip()
                    secondary_phone = parsed.get("secondary_phone", "").strip()
                    
                    if not phone and not secondary_phone:
                        stats["errors"] += 1
                        continue
                    
                    # Check for duplicates
                    phones_to_check = [p for p in [phone, secondary_phone] if p]
                    existing = await self.db.leads.find_one({
                        "$or": [{"phone": {"$in": phones_to_check}}]
                    })
                    
                    if existing:
                        stats["duplicates_skipped"] += 1
                        continue
                    
                    # Determine agent assignment
                    assigned_agent = None
                    if agents:
                        if len(agents) == 1:
                            assigned_agent = agents[0]
                        else:
                            # Round-robin
                            assigned_agent = agents[agent_idx % len(agents)]
                            agent_idx += 1
                    
                    # Create lead
                    now = datetime.now(timezone.utc).isoformat()
                    lead_doc = {
                        "id": str(__import__('uuid').uuid4()),
                        "full_name": parsed.get("full_name", "").strip() or "Google Sheet Lead",
                        "phone": phone or secondary_phone,
                        "city": parsed.get("city", "").strip(),
                        "lead_source": "google_sheets",
                        "source_connector_id": connector_id,
                        "notes": f"Secondary Phone: {secondary_phone}" if secondary_phone and phone else "",
                        "stage": "new_lead",
                        "assigned_to": assigned_agent["id"] if assigned_agent else None,
                        "assigned_to_name": assigned_agent["full_name"] if assigned_agent else None,
                        "assigned_at": now if assigned_agent else None,
                        "in_pool": not bool(assigned_agent),
                        "created_at": now,
                        "updated_at": now,
                        "last_activity": now,
                        "external_captured_time": parsed.get("captured_time", "")
                    }
                    
                    await self.db.leads.insert_one(lead_doc)
                    stats["new_leads"] += 1
                    
                    # Notify assigned agent
                    if assigned_agent:
                        await self.db.notifications.insert_one({
                            "id": str(__import__('uuid').uuid4()),
                            "user_id": assigned_agent["id"],
                            "title": "New Lead Assigned",
                            "message": f"New lead from Google Sheets: {lead_doc['full_name']}",
                            "type": "info",
                            "entity_type": "lead",
                            "entity_id": lead_doc["id"],
                            "read": False,
                            "created_at": now
                        })
                
                except Exception as e:
                    logger.error(f"Error processing row: {e}")
                    stats["errors"] += 1
            
            # Update connector with sync stats
            await self.db.sheet_connectors.update_one(
                {"id": connector_id},
                {"$set": {"last_sync": stats, "last_synced_at": stats["synced_at"]}}
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error syncing sheet: {e}")
            stats["errors"] += 1
            stats["error_message"] = str(e)
            return stats


# Singleton instance (initialized in server.py)
sheets_service: Optional[GoogleSheetsService] = None
