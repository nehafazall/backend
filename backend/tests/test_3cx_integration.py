"""
3CX Phone Integration Tests for CLT Academy ERP
Tests all 3CX endpoints: template, contact lookup, call history, click-to-call
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "A@qib1234"


class TestAuth:
    """Authentication tests to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "super_admin"


class Test3CXTemplate:
    """Tests for 3CX XML Template endpoint"""
    
    def test_get_3cx_template(self):
        """Test /api/3cx/template returns valid XML template"""
        response = requests.get(f"{BASE_URL}/api/3cx/template")
        assert response.status_code == 200
        
        data = response.json()
        assert "template" in data
        assert "instructions" in data
        assert "endpoints" in data
        
        # Verify XML template content
        template = data["template"]
        assert "<?xml version" in template
        assert "<Crm>" in template
        assert "CLT Academy ERP" in template
        assert "LookupContactByPhoneNumber" in template
        assert "SearchContacts" in template
        assert "CreateContactFromUnknownNumber" in template
        assert "ReportCall" in template
        
        # Verify endpoints are listed
        endpoints = data["endpoints"]
        assert "contact_lookup" in endpoints
        assert "contact_search" in endpoints
        assert "contact_create" in endpoints
        assert "call_journal" in endpoints
        assert "call_history" in endpoints
        assert "click_to_call" in endpoints
        
        print("✓ 3CX template endpoint returns valid XML with all scenarios")


class Test3CXContactLookup:
    """Tests for 3CX Contact Lookup endpoint"""
    
    def test_contact_lookup_not_found(self):
        """Test contact lookup with non-existent phone number"""
        response = requests.get(f"{BASE_URL}/api/3cx/contact-lookup", params={
            "phone_number": "+999999999999"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["found"] == False
        print("✓ Contact lookup returns found=false for non-existent number")
    
    def test_contact_lookup_with_existing_lead(self):
        """Test contact lookup with a phone number that might exist"""
        # Test with a sample phone number
        response = requests.get(f"{BASE_URL}/api/3cx/contact-lookup", params={
            "phone_number": "+971501234567"
        })
        assert response.status_code == 200
        
        data = response.json()
        # Either found or not found is valid
        assert "found" in data
        if data["found"]:
            assert "contact_id" in data
            assert "first_name" in data
            print(f"✓ Contact lookup found: {data.get('first_name')} {data.get('last_name')}")
        else:
            print("✓ Contact lookup returns valid response for unknown number")


class Test3CXContactSearch:
    """Tests for 3CX Contact Search endpoint"""
    
    def test_contact_search_empty(self):
        """Test contact search with no results"""
        response = requests.get(f"{BASE_URL}/api/3cx/contact-search", params={
            "search_text": "xyznonexistent12345"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "contacts" in data
        assert "total" in data
        print(f"✓ Contact search returns {data['total']} results for non-existent search")
    
    def test_contact_search_with_results(self):
        """Test contact search with potential results"""
        response = requests.get(f"{BASE_URL}/api/3cx/contact-search", params={
            "search_text": "test",
            "limit": 10
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "contacts" in data
        assert "total" in data
        assert isinstance(data["contacts"], list)
        print(f"✓ Contact search returns {data['total']} results for 'test'")


class Test3CXCallHistory:
    """Tests for 3CX Call History endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_call_history_invalid_contact(self, auth_token):
        """Test call history with invalid contact ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/call-history/invalid-uuid-12345", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "calls" in data
        assert isinstance(data["calls"], list)
        print("✓ Call history returns empty list for invalid contact")
    
    def test_call_history_valid_format(self, auth_token):
        """Test call history returns proper format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/call-history/00000000-0000-0000-0000-000000000000", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "calls" in data
        assert "total" in data
        print("✓ Call history returns proper response format")


class Test3CXRecentCalls:
    """Tests for 3CX Recent Calls endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_recent_calls(self, auth_token):
        """Test recent calls endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/recent-calls", params={
            "limit": 10
        }, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "calls" in data
        assert "total" in data
        assert isinstance(data["calls"], list)
        print(f"✓ Recent calls returns {data['total']} calls")


class Test3CXClickToCall:
    """Tests for 3CX Click-to-Call endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_click_to_call_authenticated(self, auth_token):
        """Test click-to-call with authentication"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/3cx/click-to-call",
            headers=headers,
            params={
                "phone_number": "+971501234567",
                "contact_id": None
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        print("✓ Click-to-call returns success for authenticated user")
    
    def test_click_to_call_unauthenticated(self):
        """Test click-to-call without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/3cx/click-to-call",
            params={"phone_number": "+971501234567"}
        )
        # Should return 403 Forbidden without auth
        assert response.status_code == 403
        print("✓ Click-to-call requires authentication")


class Test3CXCallJournal:
    """Tests for 3CX Call Journal endpoint"""
    
    def test_call_journal_inbound(self):
        """Test logging an inbound call"""
        response = requests.post(
            f"{BASE_URL}/api/3cx/call-journal",
            json={
                "call_type": "Inbound",
                "phone_number": "+971501234567",
                "call_direction": "Inbound",
                "name": "Test Caller",
                "call_duration": 120,
                "timestamp": "2026-01-15T10:30:00Z",
                "agent_extension": "101"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "call_id" in data
        print(f"✓ Call journal logged inbound call: {data['call_id']}")
    
    def test_call_journal_outbound(self):
        """Test logging an outbound call"""
        response = requests.post(
            f"{BASE_URL}/api/3cx/call-journal",
            json={
                "call_type": "Outbound",
                "phone_number": "+971509876543",
                "call_direction": "Outbound",
                "name": "Test Lead",
                "call_duration": 300,
                "timestamp": "2026-01-15T11:00:00Z",
                "agent_extension": "102"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        print("✓ Call journal logged outbound call")
    
    def test_call_journal_missed(self):
        """Test logging a missed call"""
        response = requests.post(
            f"{BASE_URL}/api/3cx/call-journal",
            json={
                "call_type": "Missed",
                "phone_number": "+971505555555",
                "call_direction": "Inbound",
                "call_duration": 0
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        print("✓ Call journal logged missed call")


class Test3CXContactCreate:
    """Tests for 3CX Contact Create endpoint"""
    
    def test_contact_create_new(self):
        """Test creating a new contact from unknown number"""
        import uuid
        unique_phone = f"+971{uuid.uuid4().hex[:9]}"
        
        response = requests.post(
            f"{BASE_URL}/api/3cx/contact-create",
            json={
                "phone_number": unique_phone,
                "first_name": "Test",
                "last_name": "3CX Contact"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "contact_id" in data
        print(f"✓ Contact created: {data['contact_id']}")
    
    def test_contact_create_duplicate(self):
        """Test creating contact with existing phone"""
        # First create a contact
        import uuid
        unique_phone = f"+971{uuid.uuid4().hex[:9]}"
        
        response1 = requests.post(
            f"{BASE_URL}/api/3cx/contact-create",
            json={
                "phone_number": unique_phone,
                "first_name": "First",
                "last_name": "Contact"
            }
        )
        assert response1.status_code == 200
        
        # Try to create again with same phone
        response2 = requests.post(
            f"{BASE_URL}/api/3cx/contact-create",
            json={
                "phone_number": unique_phone,
                "first_name": "Second",
                "last_name": "Contact"
            }
        )
        # Should return existing contact
        assert response2.status_code == 200
        data = response2.json()
        assert "contact_id" in data
        print("✓ Duplicate contact creation returns existing contact")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
