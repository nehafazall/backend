"""
Test SLA Management Feature - Iteration 48
Tests for GET/POST/PUT/PATCH/DELETE /api/sla/rules endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSLAManagement:
    """SLA Management API Tests"""
    
    token = None
    created_rule_id = None
    
    @classmethod
    def setup_class(cls):
        """Login and get token"""
        login_data = {
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.token = response.json()["access_token"]
    
    def get_headers(self):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # === GET /api/sla/rules - List all SLA rules ===
    def test_get_sla_rules_all(self):
        """Test getting all SLA rules"""
        response = requests.get(f"{BASE_URL}/api/sla/rules", headers=self.get_headers())
        assert response.status_code == 200, f"Failed to get rules: {response.text}"
        rules = response.json()
        assert isinstance(rules, list), "Response should be a list"
        # Should have seeded 6 default rules
        assert len(rules) >= 6, f"Expected at least 6 seeded rules, got {len(rules)}"
        print(f"✅ GET /api/sla/rules - Found {len(rules)} rules")
    
    def test_get_sla_rules_verify_structure(self):
        """Test that SLA rules have correct structure"""
        response = requests.get(f"{BASE_URL}/api/sla/rules", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        assert len(rules) > 0, "No rules found"
        
        # Check structure of first rule
        rule = rules[0]
        required_fields = ["id", "name", "department", "applies_to", "is_active", "levels"]
        for field in required_fields:
            assert field in rule, f"Missing required field: {field}"
        
        # Verify levels structure
        if rule.get("levels"):
            level = rule["levels"][0]
            level_fields = ["level", "name", "time_threshold_hours", "action"]
            for field in level_fields:
                assert field in level, f"Missing level field: {field}"
        
        print(f"✅ SLA rule structure verified: {rule['name']}")
    
    def test_get_sla_rules_filter_by_department_sales(self):
        """Test filtering rules by Sales department"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Sales", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        # All returned rules should be Sales department
        for rule in rules:
            assert rule["department"] == "Sales", f"Expected Sales, got {rule['department']}"
        print(f"✅ GET /api/sla/rules?department=Sales - Found {len(rules)} Sales rules")
    
    def test_get_sla_rules_filter_by_department_cs(self):
        """Test filtering rules by Customer Service department"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Customer Service", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        for rule in rules:
            assert rule["department"] == "Customer Service"
        print(f"✅ GET /api/sla/rules?department=Customer Service - Found {len(rules)} CS rules")
    
    def test_get_sla_rules_filter_by_department_hr(self):
        """Test filtering rules by HR department"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=HR", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        for rule in rules:
            assert rule["department"] == "HR"
        print(f"✅ GET /api/sla/rules?department=HR - Found {len(rules)} HR rules")
    
    # === POST /api/sla/rules - Create new SLA rule ===
    def test_create_sla_rule(self):
        """Test creating a new SLA rule"""
        new_rule = {
            "name": "TEST_Finance Invoice SLA",
            "department": "Finance",
            "description": "Test SLA rule for invoice processing",
            "applies_to": "custom",
            "trigger_condition": "pending_approval",
            "is_active": True,
            "levels": [
                {
                    "level": 1,
                    "name": "Warning",
                    "time_threshold_hours": 24,
                    "action": "warning",
                    "notify_in_app": True,
                    "notify_email": False,
                    "notify_roles": ["finance"]
                },
                {
                    "level": 2,
                    "name": "Escalate to Manager",
                    "time_threshold_hours": 48,
                    "action": "notify_manager",
                    "notify_in_app": True,
                    "notify_email": True,
                    "notify_roles": ["finance", "admin"]
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/sla/rules", json=new_rule, headers=self.get_headers())
        assert response.status_code == 200, f"Failed to create rule: {response.text}"
        created = response.json()
        
        # Verify response structure
        assert "id" in created, "Created rule should have an id"
        assert created["name"] == new_rule["name"]
        assert created["department"] == new_rule["department"]
        assert created["is_active"] == True
        assert len(created["levels"]) == 2
        
        # Store for later tests
        TestSLAManagement.created_rule_id = created["id"]
        print(f"✅ POST /api/sla/rules - Created rule: {created['name']} (id: {created['id']})")
    
    def test_create_sla_rule_verify_persistence(self):
        """Verify created rule persisted in database"""
        assert TestSLAManagement.created_rule_id, "No rule ID from previous test"
        
        # Get all rules and find the created one
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Finance", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        found = None
        for rule in rules:
            if rule["id"] == TestSLAManagement.created_rule_id:
                found = rule
                break
        
        assert found, f"Created rule {TestSLAManagement.created_rule_id} not found in Finance rules"
        assert found["name"] == "TEST_Finance Invoice SLA"
        print(f"✅ Verified rule persisted: {found['name']}")
    
    # === PUT /api/sla/rules/{id} - Update SLA rule ===
    def test_update_sla_rule(self):
        """Test updating an SLA rule"""
        assert TestSLAManagement.created_rule_id, "No rule ID to update"
        
        update_data = {
            "name": "TEST_Finance Invoice SLA (Updated)",
            "description": "Updated description for testing",
            "is_active": True,
            "levels": [
                {
                    "level": 1,
                    "name": "Urgent Warning",
                    "time_threshold_hours": 12,
                    "action": "warning",
                    "notify_in_app": True,
                    "notify_email": True,
                    "notify_roles": ["finance"]
                },
                {
                    "level": 2,
                    "name": "Escalate to COO",
                    "time_threshold_hours": 24,
                    "action": "notify_coo",
                    "notify_in_app": True,
                    "notify_email": True,
                    "notify_roles": ["finance", "admin", "super_admin"]
                }
            ]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/sla/rules/{TestSLAManagement.created_rule_id}",
            json=update_data,
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to update rule: {response.text}"
        updated = response.json()
        
        assert updated["name"] == "TEST_Finance Invoice SLA (Updated)"
        assert updated["levels"][0]["time_threshold_hours"] == 12
        assert updated["levels"][1]["action"] == "notify_coo"
        print(f"✅ PUT /api/sla/rules/{TestSLAManagement.created_rule_id} - Rule updated")
    
    def test_update_sla_rule_verify_persistence(self):
        """Verify update persisted"""
        assert TestSLAManagement.created_rule_id, "No rule ID"
        
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Finance", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        found = None
        for rule in rules:
            if rule["id"] == TestSLAManagement.created_rule_id:
                found = rule
                break
        
        assert found, "Updated rule not found"
        assert found["name"] == "TEST_Finance Invoice SLA (Updated)"
        assert found["levels"][0]["time_threshold_hours"] == 12
        print(f"✅ Update verified: {found['name']}")
    
    # === PATCH /api/sla/rules/{id}/toggle - Toggle active/inactive ===
    def test_toggle_sla_rule_to_inactive(self):
        """Test toggling SLA rule to inactive"""
        assert TestSLAManagement.created_rule_id, "No rule ID"
        
        response = requests.patch(
            f"{BASE_URL}/api/sla/rules/{TestSLAManagement.created_rule_id}/toggle",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to toggle: {response.text}"
        result = response.json()
        
        assert result["id"] == TestSLAManagement.created_rule_id
        assert result["is_active"] == False  # Should be toggled to inactive
        print(f"✅ PATCH /api/sla/rules/{TestSLAManagement.created_rule_id}/toggle - Toggled to inactive")
    
    def test_toggle_sla_rule_to_active(self):
        """Test toggling SLA rule back to active"""
        assert TestSLAManagement.created_rule_id, "No rule ID"
        
        response = requests.patch(
            f"{BASE_URL}/api/sla/rules/{TestSLAManagement.created_rule_id}/toggle",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["is_active"] == True  # Should be toggled back to active
        print(f"✅ Toggle back to active: is_active={result['is_active']}")
    
    # === DELETE /api/sla/rules/{id} - Delete SLA rule ===
    def test_delete_sla_rule(self):
        """Test deleting an SLA rule"""
        assert TestSLAManagement.created_rule_id, "No rule ID to delete"
        
        response = requests.delete(
            f"{BASE_URL}/api/sla/rules/{TestSLAManagement.created_rule_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        result = response.json()
        assert result.get("message") == "SLA rule deleted"
        print(f"✅ DELETE /api/sla/rules/{TestSLAManagement.created_rule_id} - Rule deleted")
    
    def test_delete_sla_rule_verify_removal(self):
        """Verify deleted rule no longer exists"""
        assert TestSLAManagement.created_rule_id, "No rule ID"
        
        response = requests.get(f"{BASE_URL}/api/sla/rules", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        found = any(r["id"] == TestSLAManagement.created_rule_id for r in rules)
        assert not found, "Deleted rule should not exist"
        print(f"✅ Verified rule {TestSLAManagement.created_rule_id} is deleted")
    
    # === Error handling tests ===
    def test_update_nonexistent_rule(self):
        """Test updating a non-existent rule returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/sla/rules/nonexistent-id-12345",
            json={"name": "Test"},
            headers=self.get_headers()
        )
        assert response.status_code == 404
        print("✅ PUT non-existent rule returns 404")
    
    def test_toggle_nonexistent_rule(self):
        """Test toggling a non-existent rule returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/sla/rules/nonexistent-id-12345/toggle",
            headers=self.get_headers()
        )
        assert response.status_code == 404
        print("✅ PATCH toggle non-existent rule returns 404")
    
    def test_delete_nonexistent_rule(self):
        """Test deleting a non-existent rule returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/sla/rules/nonexistent-id-12345",
            headers=self.get_headers()
        )
        assert response.status_code == 404
        print("✅ DELETE non-existent rule returns 404")
    
    # === Verify seeded data ===
    def test_seeded_rules_sales(self):
        """Verify seeded Sales rules exist"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Sales", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        rule_names = [r["name"] for r in rules]
        expected_sales = ["New Lead First Contact", "Inactive Lead Warning", "Pipeline Stale Lead"]
        for expected in expected_sales:
            assert expected in rule_names, f"Missing seeded rule: {expected}"
        print(f"✅ Seeded Sales rules verified: {expected_sales}")
    
    def test_seeded_rules_cs(self):
        """Verify seeded Customer Service rules exist"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=Customer Service", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        rule_names = [r["name"] for r in rules]
        assert "CS Activation Call" in rule_names, "Missing seeded CS rule"
        print(f"✅ Seeded CS rules verified: CS Activation Call")
    
    def test_seeded_rules_hr(self):
        """Verify seeded HR rules exist"""
        response = requests.get(f"{BASE_URL}/api/sla/rules?department=HR", headers=self.get_headers())
        assert response.status_code == 200
        rules = response.json()
        
        rule_names = [r["name"] for r in rules]
        expected_hr = ["HR Leave Approval", "HR Regularization Approval"]
        for expected in expected_hr:
            assert expected in rule_names, f"Missing seeded rule: {expected}"
        print(f"✅ Seeded HR rules verified: {expected_hr}")
    
    # === Authentication tests ===
    def test_get_rules_without_auth(self):
        """Test that endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/sla/rules")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ GET /api/sla/rules requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
