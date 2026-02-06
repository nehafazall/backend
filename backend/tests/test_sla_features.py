"""
Test suite for CLT Academy ERP - SLA Features and New Pages
Tests: Leads Pool, Customer Master, SLA Config, SLA Breaches
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "A@qib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for Super Admin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestSLAConfig:
    """Test SLA Configuration endpoint"""
    
    def test_get_sla_config(self, api_client):
        """Test GET /api/sla/config returns correct SLA values"""
        response = api_client.get(f"{BASE_URL}/api/sla/config")
        assert response.status_code == 200
        
        config = response.json()
        # Verify all SLA rules are present with correct values
        assert config["new_lead_contact_mins"] == 60, "New lead contact should be 60 mins"
        assert config["inactive_lead_days"] == 7, "Inactive lead days should be 7"
        assert config["inactive_warning_hours"] == 72, "Inactive warning should be 72 hours"
        assert config["inactive_reassign_hours"] == 72, "Inactive reassign should be 72 hours"
        assert config["cs_activation_mins"] == 15, "CS activation should be 15 mins"
        print("✓ SLA Config returns correct values")


class TestSLABreaches:
    """Test SLA Breaches endpoint"""
    
    def test_get_sla_breaches(self, api_client):
        """Test GET /api/sla/breaches returns breach data"""
        response = api_client.get(f"{BASE_URL}/api/sla/breaches")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "lead_breaches" in data
        assert "student_breaches" in data
        assert "total_lead_breaches" in data
        assert "total_lead_warnings" in data
        assert "total_student_breaches" in data
        
        # Verify types
        assert isinstance(data["lead_breaches"], list)
        assert isinstance(data["student_breaches"], list)
        assert isinstance(data["total_lead_breaches"], int)
        print("✓ SLA Breaches endpoint returns correct structure")


class TestLeadsPool:
    """Test Leads Pool (Agentic Pool) endpoints"""
    
    def test_get_leads_pool(self, api_client):
        """Test GET /api/leads/pool returns unassigned leads"""
        response = api_client.get(f"{BASE_URL}/api/leads/pool")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leads Pool returns {len(data)} leads")
    
    def test_create_lead_with_sla_fields(self, api_client):
        """Test creating a lead includes SLA tracking fields"""
        unique_phone = f"+971{uuid.uuid4().hex[:9]}"
        lead_data = {
            "full_name": "TEST_SLA_Lead",
            "phone": unique_phone,
            "email": f"test_sla_{uuid.uuid4().hex[:6]}@test.com",
            "country": "UAE",
            "lead_source": "Test",
            "course_of_interest": "Trading"
        }
        
        response = api_client.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert response.status_code == 200
        
        lead = response.json()
        # Verify SLA fields are present
        assert "assigned_at" in lead, "Lead should have assigned_at field"
        assert "first_contact_at" in lead, "Lead should have first_contact_at field"
        assert "sla_status" in lead, "Lead should have sla_status field"
        assert "sla_warning_level" in lead, "Lead should have sla_warning_level field"
        assert "sla_breach" in lead, "Lead should have sla_breach field"
        assert "in_pool" in lead, "Lead should have in_pool field"
        
        # Verify initial SLA status
        assert lead["sla_status"] == "ok", "New lead should have 'ok' SLA status"
        assert lead["sla_breach"] == False, "New lead should not be breached"
        
        print(f"✓ Lead created with SLA fields: {lead['id']}")
        return lead
    
    def test_lead_stage_update_resets_sla(self, api_client):
        """Test that updating lead stage resets SLA status"""
        # First create a lead
        unique_phone = f"+971{uuid.uuid4().hex[:9]}"
        lead_data = {
            "full_name": "TEST_SLA_Reset_Lead",
            "phone": unique_phone,
            "email": f"test_sla_reset_{uuid.uuid4().hex[:6]}@test.com",
            "country": "UAE"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert create_response.status_code == 200
        lead = create_response.json()
        lead_id = lead["id"]
        
        # Update stage from new_lead to call_back
        update_response = api_client.put(
            f"{BASE_URL}/api/leads/{lead_id}",
            json={"stage": "call_back"}
        )
        assert update_response.status_code == 200
        
        updated_lead = update_response.json()
        # Verify first_contact_at is set when stage changes from new_lead
        assert updated_lead.get("first_contact_at") is not None, "first_contact_at should be set"
        assert updated_lead["sla_status"] == "ok", "SLA status should be reset to ok"
        
        print(f"✓ Lead stage update resets SLA correctly")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/leads/{lead_id}")


class TestCustomerMaster:
    """Test Customer Master endpoints"""
    
    def test_get_customers(self, api_client):
        """Test GET /api/customers returns customer list"""
        response = api_client.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers endpoint returns {len(data)} customers")
    
    def test_get_customers_with_search(self, api_client):
        """Test GET /api/customers with search parameter"""
        response = api_client.get(f"{BASE_URL}/api/customers?search=test")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers search returns {len(data)} results")
    
    def test_customer_not_found(self, api_client):
        """Test GET /api/customers/{id} returns 404 for non-existent customer"""
        response = api_client.get(f"{BASE_URL}/api/customers/non-existent-id")
        assert response.status_code == 404
        print("✓ Customer not found returns 404")


class TestLeadsPoolAssignment:
    """Test lead assignment from pool"""
    
    def test_assign_lead_from_pool_round_robin(self, api_client):
        """Test assigning lead from pool using round-robin"""
        # First create a lead that goes to pool (if no agents available)
        unique_phone = f"+971{uuid.uuid4().hex[:9]}"
        lead_data = {
            "full_name": "TEST_Pool_Lead",
            "phone": unique_phone,
            "email": f"test_pool_{uuid.uuid4().hex[:6]}@test.com",
            "country": "UAE"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/leads", json=lead_data)
        assert create_response.status_code == 200
        lead = create_response.json()
        lead_id = lead["id"]
        
        # If lead is in pool, try to assign it
        if lead.get("in_pool") or not lead.get("assigned_to"):
            assign_response = api_client.post(f"{BASE_URL}/api/leads/pool/{lead_id}/assign")
            # May succeed or fail depending on available agents
            assert assign_response.status_code in [200, 400]
            print(f"✓ Pool assignment attempted: {assign_response.status_code}")
        else:
            print(f"✓ Lead was auto-assigned to: {lead.get('assigned_to_name')}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/leads/{lead_id}")


class TestSLACheck:
    """Test manual SLA check trigger"""
    
    def test_trigger_sla_check(self, api_client):
        """Test POST /api/sla/check triggers SLA processing"""
        response = api_client.post(f"{BASE_URL}/api/sla/check")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "leads_checked" in data
        assert "students_checked" in data
        print(f"✓ SLA check completed: {data['leads_checked']} leads, {data['students_checked']} students checked")


class TestExistingEndpoints:
    """Verify existing Sales CRM and CS endpoints still work"""
    
    def test_get_leads(self, api_client):
        """Test GET /api/leads still works"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ GET /api/leads works")
    
    def test_get_students(self, api_client):
        """Test GET /api/students still works"""
        response = api_client.get(f"{BASE_URL}/api/students")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ GET /api/students works")
    
    def test_get_payments(self, api_client):
        """Test GET /api/payments still works"""
        response = api_client.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ GET /api/payments works")
    
    def test_dashboard_stats(self, api_client):
        """Test GET /api/dashboard/stats still works"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        print("✓ GET /api/dashboard/stats works")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, api_client):
        """Remove TEST_ prefixed leads"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        if response.status_code == 200:
            leads = response.json()
            for lead in leads:
                if lead.get("full_name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/leads/{lead['id']}")
                    print(f"  Cleaned up lead: {lead['full_name']}")
        print("✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
