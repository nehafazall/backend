"""
Google Sheets Lead Connector Service
Handles OAuth, sheet-to-agent mapping, and auto-sync every 5 minutes
"""
import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
import warnings

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials

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
    # Handle URLs like https://docs.google.com/spreadsheets/d/{sheet_id}/edit...
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


class GoogleSheetsService:
    """Service for Google Sheets integration"""
    
    def __init__(self, db):
        self.db = db
        self.is_configured = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    
    def get_oauth_flow(self) -> Flow:
        """Create OAuth flow"""
        return Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
            },
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
    
    def get_auth_url(self, state: str) -> str:
        """Get Google OAuth authorization URL"""
        flow = self.get_oauth_flow()
        url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            state=state
        )
        return url
    
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        flow = self.get_oauth_flow()
        
        # Suppress OAuth scope warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)
        
        creds = flow.credentials
        
        # Validate required scopes
        required_scopes = {"https://www.googleapis.com/auth/spreadsheets.readonly"}
        granted_scopes = set(creds.scopes or [])
        if not required_scopes.issubset(granted_scopes):
            missing = required_scopes - granted_scopes
            raise ValueError(f"Missing required scopes: {', '.join(missing)}")
        
        # Calculate expiry
        expiry = datetime.now(timezone.utc) + timedelta(seconds=3600)
        if creds.expiry:
            if creds.expiry.tzinfo is None:
                expiry = creds.expiry.replace(tzinfo=timezone.utc)
            else:
                expiry = creds.expiry
        
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
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
                # Return refreshed token info
                return creds
        
        return creds
    
    async def read_sheet(self, token_data: Dict, spreadsheet_id: str, range_name: str = "A:Z") -> List[List[str]]:
        """Read data from a Google Sheet"""
        creds = await self.get_credentials(token_data)
        
        # Use asyncio.to_thread for blocking I/O
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
        
        Args:
            connector_id: ID of the sheet connector config
            token_data: Google OAuth tokens
            spreadsheet_id: Google Sheet ID
            sheet_name: Name of the sheet tab
            column_mapping: Map of lead fields to column letters
            assigned_agents: List of agent IDs to assign leads to (round-robin if multiple)
            skip_header: Skip the first row (header)
        
        Returns:
            Sync statistics
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
                        # Store captured time from sheet if available
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
