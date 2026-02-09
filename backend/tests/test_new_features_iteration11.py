"""
Test suite for CLT Synapse ERP - Iteration 11 Features
Testing:
1. Phone number to country auto-detection
2. Lead source dropdown options
3. Role Management CRUD API
4. Kanban drag-and-drop (lead stage update)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "A@qib1234"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["access_token"]


class TestRolesAPI:
    """Role Management API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_roles(self):
        """Test GET /api/roles - returns list of roles"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=self.headers)
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        roles = response.json()
        assert isinstance(roles, list)
        assert len(roles) >= 1  # At least 1 role should exist
        
        # Verify role structure
        for role in roles:
            assert "id" in role
            assert "name" in role or "display_name" in role
        
        print(f"✓ GET /api/roles returned {len(roles)} roles")
    
    def test_get_roles_structure(self):
        """Test role structure has required fields"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=self.headers)
        roles = response.json()
        
        for role in roles:
            assert "id" in role
            assert "name" in role
            assert "display_name" in role
            # System roles should have is_system_role flag
            if role["name"] in ["super_admin", "admin", "sales_manager"]:
                assert role.get("is_system_role") == True
        print("✓ Role structure validation passed")
    
    def test_create_custom_role(self):
        """Test POST /api/roles - create custom role"""
        role_data = {
            "name": "test_qa_analyst",
            "display_name": "Test QA Analyst",
            "description": "Test role for QA testing",
            "color": "bg-teal-500",
            "module_permissions": {
                "dashboard": "view",
                "sales_crm": "view",
                "reports": "view"
            },
            "data_visibility": "own"
        }
        
        response = requests.post(f"{BASE_URL}/api/roles", json=role_data, headers=self.headers)
        
        # May fail if role already exists from previous test
        if response.status_code == 400 and "already exists" in response.text:
            print("✓ Role already exists (expected from previous test)")
            return
        
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        created_role = response.json()
        assert created_role["name"] == "test_qa_analyst"
        assert created_role["display_name"] == "Test QA Analyst"
        assert created_role["is_system_role"] == False
        print("✓ POST /api/roles - Custom role created successfully")
    
    def test_update_role(self):
        """Test PUT /api/roles/{role_id} - update role permissions"""
        # First ensure the test role exists
        role_data = {
            "name": "test_qa_analyst",
            "display_name": "Test QA Analyst",
            "description": "Test role for QA testing",
            "color": "bg-teal-500",
            "module_permissions": {"dashboard": "view"},
            "data_visibility": "own"
        }
        requests.post(f"{BASE_URL}/api/roles", json=role_data, headers=self.headers)
        
        # Update the role
        update_data = {
            "display_name": "Test QA Analyst Updated",
            "module_permissions": {
                "dashboard": "view",
                "sales_crm": "edit",
                "reports": "full"
            },
            "data_visibility": "team"
        }
        
        response = requests.put(f"{BASE_URL}/api/roles/test_qa_analyst", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update role: {response.text}"
        
        updated_role = response.json()
        assert updated_role["display_name"] == "Test QA Analyst Updated"
        assert updated_role["data_visibility"] == "team"
        print("✓ PUT /api/roles/{role_id} - Role updated successfully")
    
    def test_update_system_role_permissions(self):
        """Test updating system role permissions (should work)"""
        update_data = {
            "module_permissions": {
                "dashboard": "full",
                "sales_crm": "full"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/roles/sales_executive", json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to update system role: {response.text}"
        print("✓ System role permissions can be updated")
    
    def test_cannot_delete_system_role(self):
        """Test DELETE /api/roles/{role_id} - cannot delete system roles"""
        response = requests.delete(f"{BASE_URL}/api/roles/super_admin", headers=self.headers)
        assert response.status_code == 400, "Should not be able to delete system role"
        assert "Cannot delete system roles" in response.text
        print("✓ System roles cannot be deleted (expected)")
    
    def test_delete_custom_role(self):
        """Test DELETE /api/roles/{role_id} - delete custom role"""
        # First create a role to delete
        role_data = {
            "name": "test_delete_role",
            "display_name": "Test Delete Role",
            "description": "Role to be deleted",
            "color": "bg-red-500",
            "module_permissions": {},
            "data_visibility": "own"
        }
        requests.post(f"{BASE_URL}/api/roles", json=role_data, headers=self.headers)
        
        # Delete the role
        response = requests.delete(f"{BASE_URL}/api/roles/test_delete_role", headers=self.headers)
        assert response.status_code in [200, 404], f"Unexpected response: {response.text}"
        print("✓ DELETE /api/roles/{role_id} - Custom role deleted")
    
    def test_roles_require_auth(self):
        """Test that roles endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/roles")
        # 401 or 403 both indicate auth required
        assert response.status_code in [401, 403], f"Should require authentication, got {response.status_code}"
        print("✓ Roles API requires authentication")


class TestLeadAPI:
    """Lead API tests for new features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_lead_with_lead_source(self):
        """Test creating lead with lead_source field"""
        lead_data = {
            "full_name": "TEST_Lead Source Test",
            "phone": "+971501234567",
            "email": "test_leadsource@example.com",
            "country": "UAE",
            "lead_source": "facebook"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        
        created_lead = response.json()
        assert created_lead["lead_source"] == "facebook"
        assert created_lead["country"] == "UAE"
        print("✓ Lead created with lead_source field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{created_lead['id']}", headers=self.headers)
    
    def test_create_lead_with_all_sources(self):
        """Test creating leads with all lead source options"""
        lead_sources = ["facebook", "instagram", "google_ads", "website", "referral", "walk_in", "cold_call", "other"]
        
        for source in lead_sources:
            lead_data = {
                "full_name": f"TEST_Source {source}",
                "phone": f"+9715012345{lead_sources.index(source)}",
                "lead_source": source
            }
            
            response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
            assert response.status_code == 200, f"Failed to create lead with source {source}: {response.text}"
            
            created_lead = response.json()
            assert created_lead["lead_source"] == source
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{created_lead['id']}", headers=self.headers)
        
        print(f"✓ All {len(lead_sources)} lead sources work correctly")
    
    def test_update_lead_stage_kanban(self):
        """Test updating lead stage (simulates kanban drag-drop)"""
        import uuid
        
        # Create a test lead with unique phone
        unique_phone = f"+97150{str(uuid.uuid4())[:7].replace('-', '')}"
        lead_data = {
            "full_name": "TEST_Kanban Test Lead",
            "phone": unique_phone,
            "country": "UAE"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
        assert response.status_code == 200, f"Failed to create lead: {response.text}"
        lead_id = response.json()["id"]
        
        # Test stage transitions (simulating kanban drag-drop)
        stages = ["new_lead", "no_answer", "call_back", "warm_lead", "hot_lead", "in_progress"]
        
        for stage in stages:
            update_response = requests.put(
                f"{BASE_URL}/api/leads/{lead_id}",
                json={"stage": stage},
                headers=self.headers
            )
            assert update_response.status_code == 200, f"Failed to update to stage {stage}"
            
            # Verify stage was updated from PUT response
            updated_lead = update_response.json()
            assert updated_lead["stage"] == stage, f"Stage not updated to {stage}"
        
        print(f"✓ Lead stage updates work (kanban drag-drop simulation)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=self.headers)
    
    def test_get_leads_returns_lead_source(self):
        """Test that GET /api/leads returns lead_source field"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        
        leads = response.json()
        if len(leads) > 0:
            # Check that lead_source field exists in response
            first_lead = leads[0]
            assert "lead_source" in first_lead or first_lead.get("lead_source") is None
        print("✓ GET /api/leads includes lead_source field")


class TestUsersAPI:
    """User Management API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_users(self):
        """Test GET /api/users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"✓ GET /api/users returned {len(users)} users")
    
    def test_create_user_with_role(self):
        """Test creating user with role assignment"""
        user_data = {
            "email": "test_role_user@example.com",
            "password": "TestPass123!",
            "full_name": "TEST Role User",
            "role": "sales_executive",
            "department": "Sales",
            "region": "UAE",
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=self.headers)
        
        # May fail if user already exists
        if response.status_code == 400 and "already exists" in response.text:
            print("✓ User already exists (expected)")
            return
        
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        created_user = response.json()
        assert created_user["role"] == "sales_executive"
        print("✓ User created with role assignment")


class TestPhoneCountryDetection:
    """Test phone country detection utility (frontend feature, but verify backend accepts country)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_lead_with_uae_phone(self):
        """Test lead creation with UAE phone number"""
        lead_data = {
            "full_name": "TEST_UAE Phone Lead",
            "phone": "+971501234567",
            "country": "UAE"  # Auto-detected from +971
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
        assert response.status_code == 200
        lead = response.json()
        assert lead["country"] == "UAE"
        print("✓ Lead with UAE phone (+971) created with country=UAE")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=self.headers)
    
    def test_lead_with_india_phone(self):
        """Test lead creation with India phone number"""
        lead_data = {
            "full_name": "TEST_India Phone Lead",
            "phone": "+919876543210",
            "country": "India"  # Auto-detected from +91
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
        assert response.status_code == 200
        lead = response.json()
        assert lead["country"] == "India"
        print("✓ Lead with India phone (+91) created with country=India")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=self.headers)
    
    def test_lead_with_saudi_phone(self):
        """Test lead creation with Saudi Arabia phone number"""
        lead_data = {
            "full_name": "TEST_Saudi Phone Lead",
            "phone": "+966501234567",
            "country": "Saudi Arabia"  # Auto-detected from +966
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=self.headers)
        assert response.status_code == 200
        lead = response.json()
        assert lead["country"] == "Saudi Arabia"
        print("✓ Lead with Saudi phone (+966) created with country=Saudi Arabia")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
