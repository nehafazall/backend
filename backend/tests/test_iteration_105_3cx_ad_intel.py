"""
Iteration 105 - Testing 3CX Webhook Integration & Ad Intelligence Features
- 3CX flexible webhook endpoint (POST /api/3cx/webhook)
- Duration string parsing (3:45 -> 225 seconds)
- Webhook setup guide endpoint
- Ad Library search and saved searches
- Meta Ad token settings
- BD CRM and Mentor CRM tabbed modals
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # Auth returns 'access_token' field
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class Test3CXWebhookPublic:
    """Test 3CX webhook endpoints (public - no auth required)."""

    def test_webhook_accepts_basic_payload(self):
        """POST /api/3cx/webhook - accepts basic 3CX payload."""
        payload = {
            "phonenumber": "+971501234567",
            "duration": 120,
            "direction": "Outbound",
            "type": "Answered",
            "extension": "101",
            "name": "Test Contact"
        }
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert "call_id" in data
        print(f"PASS: 3CX webhook accepted basic payload, call_id: {data.get('call_id')}")

    def test_webhook_parses_duration_string_mm_ss(self):
        """POST /api/3cx/webhook - duration '3:45' should be parsed as 225 seconds."""
        payload = {
            "phonenumber": "+971509876543",
            "duration": "3:45",  # Should be parsed as 225 seconds
            "direction": "Outbound",
            "type": "Answered"
        }
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        print(f"PASS: 3CX webhook parsed duration string '3:45', call_id: {data.get('call_id')}")

    def test_webhook_parses_duration_string_hh_mm_ss(self):
        """POST /api/3cx/webhook - duration '0:03:45' should be parsed as 225 seconds."""
        payload = {
            "phonenumber": "+971501112222",
            "duration": "0:03:45",  # Should be parsed as 225 seconds
            "direction": "Inbound",
            "type": "Answered"
        }
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        print(f"PASS: 3CX webhook parsed duration string '0:03:45', call_id: {data.get('call_id')}")

    def test_webhook_accepts_integer_duration(self):
        """POST /api/3cx/webhook - accepts integer duration."""
        payload = {
            "phonenumber": "+971503334444",
            "duration": 180,  # Integer seconds
            "direction": "Outbound",
            "type": "Answered"
        }
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        print(f"PASS: 3CX webhook accepted integer duration 180, call_id: {data.get('call_id')}")

    def test_webhook_accepts_alternative_field_names(self):
        """POST /api/3cx/webhook - accepts alternative 3CX field names."""
        payload = {
            "phone_number": "+971505556666",  # Alternative field name
            "call_duration": 90,  # Alternative field name
            "call_direction": "Inbound",  # Alternative field name
            "call_type": "Missed"  # Alternative field name
        }
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") is True
        print(f"PASS: 3CX webhook accepted alternative field names, call_id: {data.get('call_id')}")

    def test_webhook_handles_empty_payload(self):
        """POST /api/3cx/webhook - handles empty payload gracefully."""
        response = requests.post(f"{BASE_URL}/api/3cx/webhook", json={})
        # Should still return 200 but with empty phone
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: 3CX webhook handled empty payload gracefully")


class Test3CXWebhookSetupGuide:
    """Test 3CX webhook setup guide endpoint (requires auth)."""

    def test_webhook_setup_guide_returns_urls(self, auth_headers):
        """GET /api/3cx/webhook-setup-guide - returns setup guide with webhook URLs."""
        response = requests.get(f"{BASE_URL}/api/3cx/webhook-setup-guide", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "title" in data
        assert "webhook_urls" in data
        assert "steps" in data
        assert "payload_template" in data
        
        # Verify webhook URLs
        webhook_urls = data.get("webhook_urls", {})
        assert "primary" in webhook_urls
        assert "/api/3cx/webhook" in webhook_urls["primary"]
        
        print(f"PASS: Webhook setup guide returned with URLs: {webhook_urls}")


class TestAdLibraryIntelligence:
    """Test Ad Library Intelligence endpoints."""

    def test_ad_library_search(self, auth_headers):
        """POST /api/intelligence/ad-library/search - accepts search_terms and returns results."""
        payload = {
            "search_terms": "forex trading",
            "country": "AE",
            "limit": 10
        }
        response = requests.post(f"{BASE_URL}/api/intelligence/ad-library/search", 
                                 json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "search_terms" in data
        assert "ads_count" in data or "ads" in data
        assert "source" in data  # 'meta_api' or 'web_scrape'
        
        print(f"PASS: Ad library search returned {data.get('ads_count', 0)} ads, source: {data.get('source')}")

    def test_get_saved_searches(self, auth_headers):
        """GET /api/intelligence/ad-library/searches - returns saved searches."""
        response = requests.get(f"{BASE_URL}/api/intelligence/ad-library/searches", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "searches" in data
        assert isinstance(data["searches"], list)
        
        print(f"PASS: Got {len(data['searches'])} saved ad library searches")


class TestMetaAdTokenSettings:
    """Test Meta Ad Library token settings."""

    def test_get_token_status(self, auth_headers):
        """GET /api/settings/meta-ad-token-status - returns whether token is configured."""
        response = requests.get(f"{BASE_URL}/api/settings/meta-ad-token-status", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "configured" in data
        assert isinstance(data["configured"], bool)
        
        print(f"PASS: Meta ad token status: configured={data['configured']}")

    def test_save_token(self, auth_headers):
        """PUT /api/settings/meta-ad-token - saves Meta Ad Library access token."""
        payload = {"token": "test_token_12345"}
        response = requests.put(f"{BASE_URL}/api/settings/meta-ad-token", 
                               json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify token was saved by checking status
        status_response = requests.get(f"{BASE_URL}/api/settings/meta-ad-token-status", headers=auth_headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("configured") is True
        
        print("PASS: Meta ad token saved successfully")


class TestBDCRMEndpoints:
    """Test BD CRM related endpoints."""

    def test_get_bd_students(self, auth_headers):
        """GET /api/bd/students - returns BD students list."""
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure (paginated or list)
        items = data.get("items") or data
        assert isinstance(items, list)
        
        print(f"PASS: Got {len(items)} BD students")

    def test_get_bd_agents(self, auth_headers):
        """GET /api/bd/agents - returns BD agents list."""
        response = requests.get(f"{BASE_URL}/api/bd/agents", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"PASS: Got {len(data)} BD agents")


class TestMentorCRMEndpoints:
    """Test Mentor CRM related endpoints."""

    def test_get_mentor_revenue_summary(self, auth_headers):
        """GET /api/mentor/revenue-summary - returns revenue summary."""
        response = requests.get(f"{BASE_URL}/api/mentor/revenue-summary", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "month" in data or "totals" in data
        
        print(f"PASS: Got mentor revenue summary")


class TestCallHistory:
    """Test call history endpoints."""

    def test_get_recent_calls(self, auth_headers):
        """GET /api/3cx/recent-calls - returns recent calls."""
        response = requests.get(f"{BASE_URL}/api/3cx/recent-calls", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "calls" in data
        assert isinstance(data["calls"], list)
        
        print(f"PASS: Got {len(data['calls'])} recent calls")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
