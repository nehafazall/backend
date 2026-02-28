"""
Marketing Module API Tests
Tests for Meta Ads Integration endpoints including:
- Configuration status
- Accounts management
- Dashboard metrics
- Leads management
- Webhook verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


class TestMarketingConfig:
    """Marketing configuration endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_marketing_config(self):
        """GET /api/marketing/config - Returns configuration status"""
        response = requests.get(f"{BASE_URL}/api/marketing/config", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "meta_configured" in data
        assert "webhook_configured" in data
        assert "webhook_url" in data
        
        # Since META_APP_ID and META_APP_SECRET are empty, meta should not be configured
        # webhook_configured should be True since verify token exists
        assert isinstance(data["meta_configured"], bool)
        assert isinstance(data["webhook_configured"], bool)
        
        print(f"Config status: meta_configured={data['meta_configured']}, webhook_configured={data['webhook_configured']}")
        print(f"Webhook URL: {data.get('webhook_url')}")


class TestMarketingAccounts:
    """Marketing accounts endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_meta_accounts_empty(self):
        """GET /api/marketing/accounts - Returns empty list when no accounts connected"""
        response = requests.get(f"{BASE_URL}/api/marketing/accounts", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list (possibly empty)
        assert isinstance(data, list)
        print(f"Connected accounts: {len(data)}")


class TestMarketingDashboard:
    """Marketing dashboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_marketing_dashboard(self):
        """GET /api/marketing/dashboard - Returns dashboard metrics (all zeros when no data)"""
        response = requests.get(f"{BASE_URL}/api/marketing/dashboard", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert "accounts" in data
        assert "summary" in data
        assert "campaigns" in data
        
        # Verify summary structure with all expected metrics
        summary = data["summary"]
        assert "total_spend" in summary
        assert "total_impressions" in summary
        assert "total_clicks" in summary
        assert "total_reach" in summary
        assert "total_leads" in summary
        assert "cpl" in summary  # Cost per lead
        assert "cpm" in summary  # Cost per mille
        assert "cpc" in summary  # Cost per click
        assert "ctr" in summary  # Click-through rate
        assert "frequency" in summary
        
        # All values should be 0 when no accounts connected
        assert summary["total_spend"] >= 0
        assert summary["total_impressions"] >= 0
        assert summary["total_clicks"] >= 0
        
        print(f"Dashboard summary: {summary}")
    
    def test_get_marketing_dashboard_with_date_preset(self):
        """GET /api/marketing/dashboard with date_preset parameter"""
        date_presets = ["last_7d", "last_14d", "last_30d"]
        
        for preset in date_presets:
            response = requests.get(
                f"{BASE_URL}/api/marketing/dashboard",
                params={"date_preset": preset},
                headers=self.headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["period"] == preset
            print(f"Date preset {preset}: OK")


class TestMarketingLeads:
    """Marketing leads endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_marketing_leads(self):
        """GET /api/marketing/leads - Returns paginated leads list"""
        response = requests.get(f"{BASE_URL}/api/marketing/leads", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "leads" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        
        assert isinstance(data["leads"], list)
        assert isinstance(data["total"], int)
        assert data["total"] >= 0
        
        print(f"Total leads: {data['total']}, returned: {len(data['leads'])}")
    
    def test_get_marketing_leads_with_filters(self):
        """GET /api/marketing/leads with filters"""
        # Test with synced_to_crm filter
        response = requests.get(
            f"{BASE_URL}/api/marketing/leads",
            params={"synced_to_crm": "false"},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        
        # Test with pagination
        response = requests.get(
            f"{BASE_URL}/api/marketing/leads",
            params={"skip": 0, "limit": 10},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        print("Leads filter test: OK")


class TestMarketingCampaigns:
    """Marketing campaigns endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_marketing_campaigns(self):
        """GET /api/marketing/campaigns - Returns campaigns list"""
        response = requests.get(f"{BASE_URL}/api/marketing/campaigns", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        print(f"Campaigns found: {len(data)}")


class TestMarketingWebhook:
    """Marketing webhook endpoint tests"""
    
    def test_webhook_verification_success(self):
        """GET /api/marketing/webhook - Webhook verification with correct token"""
        # The webhook verify token from .env
        verify_token = "clt_synapse_meta_webhook_2024"
        # Meta sends numeric challenge strings
        challenge = "12345678"
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/webhook",
            params={
                "hub_mode": "subscribe",
                "hub_challenge": challenge,
                "hub_verify_token": verify_token
            }
        )
        
        assert response.status_code == 200
        # Meta expects the challenge to be returned as integer
        assert str(response.json()) == challenge or response.text == challenge
        print("Webhook verification: OK")
    
    def test_webhook_verification_failure(self):
        """GET /api/marketing/webhook - Webhook verification with wrong token fails"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/webhook",
            params={
                "hub_mode": "subscribe",
                "hub_challenge": "12345",
                "hub_verify_token": "wrong_token"
            }
        )
        
        # Should fail with 403
        assert response.status_code == 403
        print("Webhook verification with wrong token correctly rejected")
    
    def test_webhook_verification_missing_params(self):
        """GET /api/marketing/webhook - Webhook verification with missing params"""
        response = requests.get(f"{BASE_URL}/api/marketing/webhook")
        
        # Should fail without proper params
        assert response.status_code == 403
        print("Webhook verification with missing params correctly rejected")


class TestMarketingOAuthStart:
    """Marketing OAuth start endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_oauth_start_without_credentials(self):
        """POST /api/marketing/oauth/start - Returns error when Meta not configured"""
        response = requests.post(f"{BASE_URL}/api/marketing/oauth/start", headers=self.headers)
        
        # Since META_APP_ID and META_APP_SECRET are empty, should return 400
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not configured" in data["detail"].lower() or "META_APP_ID" in data["detail"]
        print(f"OAuth start correctly fails when Meta not configured: {data['detail']}")


class TestMarketingAuthorizationAccess:
    """Test authorization for marketing endpoints"""
    
    def test_marketing_endpoints_require_auth(self):
        """Marketing endpoints require authentication"""
        endpoints = [
            ("GET", "/api/marketing/config"),
            ("GET", "/api/marketing/accounts"),
            ("GET", "/api/marketing/dashboard"),
            ("GET", "/api/marketing/leads"),
            ("GET", "/api/marketing/campaigns"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                response = requests.post(f"{BASE_URL}{endpoint}")
            
            # Should require auth (401 or 403)
            assert response.status_code in [401, 403], f"{endpoint} should require auth, got {response.status_code}"
            print(f"{method} {endpoint}: Requires auth (401/403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
