"""
Test cases for Historical Leads Import, Mentor Redeposits Import, and CS Upgraded Stage features
Features tested:
1. Historical leads import - GET /api/import/templates/historical_leads
2. Mentor redeposits import - GET /api/import/templates/mentor_redeposits
3. POST /api/import/historical-leads validation
4. POST /api/import/mentor-redeposits validation  
5. GET /api/mentor/redeposits/summary returns current month data
6. CS kanban 'upgraded' stage presence
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestImportTemplates:
    """Test import template endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_historical_leads_template_exists(self):
        """Test GET /api/import/templates/historical_leads returns correct template"""
        response = requests.get(
            f"{BASE_URL}/api/import/templates/historical_leads",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "fields" in data, "Response missing 'fields'"
        assert "required" in data["fields"], "Fields missing 'required'"
        
        required_fields = data["fields"]["required"]
        expected_required = ["full_name", "phone", "course_enrolled", "agent_employee_id", "team_name"]
        for field in expected_required:
            assert field in required_fields, f"Missing required field: {field}"
        
        # Verify optional fields
        optional_fields = data["fields"].get("optional", [])
        expected_optional = ["additional_numbers", "email", "country", "city"]
        for field in expected_optional:
            assert field in optional_fields, f"Missing optional field: {field}"
        
        # Verify template string exists
        assert "template" in data, "Response missing 'template'"
        assert "instructions" in data, "Response missing 'instructions'"
        print(f"✓ Historical leads template verified with fields: {required_fields}")
    
    def test_mentor_redeposits_template_exists(self):
        """Test GET /api/import/templates/mentor_redeposits returns correct template"""
        response = requests.get(
            f"{BASE_URL}/api/import/templates/mentor_redeposits",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "fields" in data, "Response missing 'fields'"
        assert "required" in data["fields"], "Fields missing 'required'"
        
        required_fields = data["fields"]["required"]
        expected_required = ["month", "date", "mentor_name", "mentor_employee_id", "student_email", "redeposit_amount"]
        for field in expected_required:
            assert field in required_fields, f"Missing required field: {field}"
        
        # Verify instructions
        assert "instructions" in data, "Response missing 'instructions'"
        assert "mentor_employee_id MUST match" in data["instructions"], "Instructions should mention employee_id matching"
        assert "student_email MUST match" in data["instructions"], "Instructions should mention student_email matching"
        
        print(f"✓ Mentor redeposits template verified with fields: {required_fields}")


class TestImportEndpoints:
    """Test import data endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_historical_leads_endpoint_exists(self):
        """Test POST /api/import/historical-leads exists and validates required fields"""
        # Send empty data to check endpoint exists and validates
        response = requests.post(
            f"{BASE_URL}/api/import/historical-leads",
            headers=self.headers,
            json=[]
        )
        # Should return 200 with 0 success (empty data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' count"
        assert data["success"] == 0, "Empty data should result in 0 success"
        print(f"✓ Historical leads endpoint exists and returns: {data}")
    
    def test_historical_leads_validates_required_fields(self):
        """Test POST /api/import/historical-leads validates required fields"""
        # Send data with missing required fields
        invalid_data = [{"full_name": "Test Lead"}]  # Missing phone, course_enrolled, etc.
        
        response = requests.post(
            f"{BASE_URL}/api/import/historical-leads",
            headers=self.headers,
            json=invalid_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "failed" in data, "Response missing 'failed' count"
        assert data["failed"] > 0, "Should have failures for missing required fields"
        assert "errors" in data, "Response missing 'errors'"
        assert len(data["errors"]) > 0, "Should have error messages"
        assert "Missing required fields" in data["errors"][0], "Error should mention missing required fields"
        print(f"✓ Historical leads endpoint validates fields: {data['errors'][:1]}")
    
    def test_mentor_redeposits_endpoint_exists(self):
        """Test POST /api/import/mentor-redeposits exists and validates required fields"""
        # Send empty data to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/import/mentor-redeposits",
            headers=self.headers,
            json=[]
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' count"
        assert data["success"] == 0, "Empty data should result in 0 success"
        print(f"✓ Mentor redeposits endpoint exists and returns: {data}")
    
    def test_mentor_redeposits_validates_required_fields(self):
        """Test POST /api/import/mentor-redeposits validates required fields"""
        # Send data with missing required fields
        invalid_data = [{"month": "2026-03"}]  # Missing most required fields
        
        response = requests.post(
            f"{BASE_URL}/api/import/mentor-redeposits",
            headers=self.headers,
            json=invalid_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "failed" in data, "Response missing 'failed' count"
        assert data["failed"] > 0, "Should have failures for missing required fields"
        assert "errors" in data, "Response missing 'errors'"
        print(f"✓ Mentor redeposits endpoint validates fields: {data['errors'][:1]}")


class TestMentorRedepositsSummary:
    """Test mentor redeposits summary endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_redeposits_summary_returns_current_month(self):
        """Test GET /api/mentor/redeposits/summary returns current month data"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/redeposits/summary",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "month" in data, "Response missing 'month'"
        assert "totals" in data, "Response missing 'totals'"
        
        # Month should be current month
        current_month = datetime.now().strftime("%Y-%m")
        assert data["month"] == current_month, f"Expected month {current_month}, got {data['month']}"
        
        # Verify totals structure
        totals = data["totals"]
        assert "grand_total" in totals, "Totals missing 'grand_total'"
        assert "total_redeposits" in totals, "Totals missing 'total_redeposits'"
        assert "unique_students" in totals, "Totals missing 'unique_students'"
        
        print(f"✓ Redeposits summary returns current month ({current_month}): {totals}")
    
    def test_redeposits_summary_with_custom_month(self):
        """Test GET /api/mentor/redeposits/summary with custom month parameter"""
        test_month = "2026-01"
        response = requests.get(
            f"{BASE_URL}/api/mentor/redeposits/summary",
            headers=self.headers,
            params={"month": test_month}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["month"] == test_month, f"Expected month {test_month}, got {data['month']}"
        print(f"✓ Redeposits summary accepts custom month parameter: {test_month}")


class TestCSUpgradedStage:
    """Test CS kanban includes 'upgraded' stage"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_student_can_be_updated_to_upgraded_stage(self):
        """Test that students can be updated to 'upgraded' stage"""
        # Get a student first
        students_response = requests.get(
            f"{BASE_URL}/api/students",
            headers=self.headers,
            params={"limit": 1}
        )
        assert students_response.status_code == 200, f"Failed to get students: {students_response.text}"
        
        students = students_response.json()
        if not students:
            pytest.skip("No students available for testing")
        
        student_id = students[0]["id"]
        original_stage = students[0].get("stage", "new_student")
        
        # Try to update to 'upgraded' stage  
        update_response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=self.headers,
            json={"stage": "upgraded"}
        )
        
        # Should succeed (200) as 'upgraded' is a valid stage
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify the student was updated
        verify_response = requests.get(
            f"{BASE_URL}/api/students/{student_id}",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        updated_student = verify_response.json()
        assert updated_student["stage"] == "upgraded", f"Stage not updated to 'upgraded', got {updated_student['stage']}"
        
        # Restore original stage
        requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=self.headers,
            json={"stage": original_stage}
        )
        
        print(f"✓ Student successfully updated to 'upgraded' stage")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
