"""
Meta Ads Integration Service
Handles OAuth, lead retrieval, and campaign analytics
"""

import os
import httpx
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# Meta API Configuration
META_GRAPH_API_VERSION = "v19.0"
META_GRAPH_BASE_URL = f"https://graph.facebook.com/{META_GRAPH_API_VERSION}"

class MetaAdsService:
    """Service for interacting with Meta (Facebook) Ads API"""
    
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = META_GRAPH_BASE_URL
    
    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Generate OAuth URL for Meta login"""
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "leads_retrieval,pages_manage_ads,pages_read_engagement,ads_read,read_insights,business_management",
            "response_type": "code"
        }
        return f"https://www.facebook.com/{META_GRAPH_API_VERSION}/dialog/oauth?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        """Exchange OAuth code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_long_lived_token(self, short_lived_token: str) -> Dict:
        """Exchange short-lived token for long-lived token (60 days)"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_lived_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_info(self, access_token: str) -> Dict:
        """Get user info from access token"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/me",
                params={
                    "fields": "id,name,email",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_user_pages(self, access_token: str) -> List[Dict]:
        """Get pages the user manages"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/me/accounts",
                params={
                    "fields": "id,name,access_token,category",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_ad_accounts(self, access_token: str) -> List[Dict]:
        """Get ad accounts the user has access to"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/me/adaccounts",
                params={
                    "fields": "id,name,account_status,currency,timezone_name,business",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_campaigns(self, ad_account_id: str, access_token: str) -> List[Dict]:
        """Get campaigns for an ad account"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{ad_account_id}/campaigns",
                params={
                    "fields": "id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget",
                    "access_token": access_token,
                    "limit": 100
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_campaign_insights(
        self, 
        campaign_id: str, 
        access_token: str,
        date_preset: str = "last_30d"
    ) -> Dict:
        """Get insights/analytics for a campaign"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{campaign_id}/insights",
                params={
                    "fields": "spend,impressions,clicks,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type",
                    "date_preset": date_preset,
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [{}])[0] if data.get("data") else {}
    
    async def get_ad_account_insights(
        self,
        ad_account_id: str,
        access_token: str,
        date_preset: str = "last_30d"
    ) -> Dict:
        """Get aggregated insights for an ad account"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{ad_account_id}/insights",
                params={
                    "fields": "spend,impressions,clicks,cpm,cpc,ctr,reach,frequency,actions,cost_per_action_type",
                    "date_preset": date_preset,
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [{}])[0] if data.get("data") else {}
    
    async def get_leadgen_forms(self, page_id: str, access_token: str) -> List[Dict]:
        """Get lead gen forms for a page"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{page_id}/leadgen_forms",
                params={
                    "fields": "id,name,status,created_time,questions",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_form_leads(
        self, 
        form_id: str, 
        access_token: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get leads from a lead gen form"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{form_id}/leads",
                params={
                    "fields": "id,created_time,ad_id,form_id,field_data,campaign_id,adset_id",
                    "access_token": access_token,
                    "limit": limit
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
    
    async def get_lead_details(self, lead_id: str, access_token: str) -> Dict:
        """Get details for a specific lead"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{lead_id}",
                params={
                    "fields": "id,created_time,ad_id,form_id,field_data,campaign_id,adset_id,ad_name,campaign_name,adset_name",
                    "access_token": access_token
                }
            )
            response.raise_for_status()
            return response.json()
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature from Meta"""
        if not signature:
            return False
        
        expected_sig = "sha256=" + hmac.new(
            self.app_secret.encode('utf-8'),
            msg=payload,
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_sig, signature)
    
    def parse_lead_field_data(self, field_data: List[Dict]) -> Dict:
        """Parse lead field data into a dictionary"""
        result = {}
        for field in field_data:
            name = field.get("name", "").lower().replace(" ", "_")
            values = field.get("values", [])
            result[name] = values[0] if len(values) == 1 else values
        return result


# Google Sheets Service
class GoogleSheetsService:
    """Service for Google Sheets integration"""
    
    def __init__(self, credentials):
        self.credentials = credentials
    
    async def get_sheet_data(self, spreadsheet_id: str, range_name: str) -> List[List]:
        """Get data from a Google Sheet"""
        from googleapiclient.discovery import build
        
        service = build('sheets', 'v4', credentials=self.credentials)
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()
        return result.get('values', [])
    
    @staticmethod
    def extract_spreadsheet_id(url: str) -> Optional[str]:
        """Extract spreadsheet ID from Google Sheets URL"""
        import re
        patterns = [
            r'/spreadsheets/d/([a-zA-Z0-9-_]+)',
            r'id=([a-zA-Z0-9-_]+)',
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
