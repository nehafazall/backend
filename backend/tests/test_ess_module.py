"""
ESS (Employee Self-Service) Module Tests
Testing: Leave requests, attendance regularization, leave balance, dashboard, leave types
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestESSModule:
    """Test ESS (Employee Self-Service) endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        
        token = login_res.json().get("access_token")
        self.user = login_res.json().get("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        print(f"✓ Logged in as {self.user.get('full_name')}")
    
    # ============ LEAVE TYPES ============
    
    def test_get_leave_types(self):
        """Test GET /api/ess/leave-types returns all leave types with configurations"""
        res = self.session.get(f"{BASE_URL}/api/ess/leave-types")
        assert res.status_code == 200, f"Failed to get leave types: {res.text}"
        
        leave_types = res.json()
        assert isinstance(leave_types, list), "Response should be a list"
        assert len(leave_types) >= 6, "Should have at least 6 leave types"
        
        # Verify structure of leave types
        expected_types = ["sick_leave", "annual_leave", "maternity_leave", "umrah_leave", "half_day", "unpaid_leave"]
        returned_ids = [lt["id"] for lt in leave_types]
        
        for expected in expected_types:
            assert expected in returned_ids, f"Missing leave type: {expected}"
        
        # Verify configuration values
        for lt in leave_types:
            assert "id" in lt, "Leave type should have id"
            assert "name" in lt, "Leave type should have name"
            assert "days_per_year" in lt, "Leave type should have days_per_year"
            assert "full_time_only" in lt, "Leave type should have full_time_only"
            assert "requires_document" in lt, "Leave type should have requires_document"
        
        # Check specific values
        annual = next((lt for lt in leave_types if lt["id"] == "annual_leave"), None)
        assert annual is not None, "Annual leave should exist"
        assert annual["days_per_year"] == 26, "Annual leave should be 26 days/year"
        
        sick = next((lt for lt in leave_types if lt["id"] == "sick_leave"), None)
        assert sick is not None, "Sick leave should exist"
        assert sick["days_per_year"] == 12, "Sick leave should be 12 days/year"
        assert sick["requires_document"] == True, "Sick leave should require document"
        
        maternity = next((lt for lt in leave_types if lt["id"] == "maternity_leave"), None)
        assert maternity is not None, "Maternity leave should exist"
        assert maternity["days_per_year"] == 45, "Maternity leave should be 45 days"
        
        umrah = next((lt for lt in leave_types if lt["id"] == "umrah_leave"), None)
        assert umrah is not None, "Umrah leave should exist"
        assert umrah["days_per_year"] == 8, "Umrah leave should be 8 days/year"
        
        print("✓ Leave types returned correctly with all configurations")
    
    # ============ DASHBOARD ============
    
    def test_get_dashboard_without_hr_record(self):
        """Test GET /api/ess/dashboard returns appropriate data when no HR record"""
        res = self.session.get(f"{BASE_URL}/api/ess/dashboard")
        assert res.status_code == 200, f"Failed to get dashboard: {res.text}"
        
        data = res.json()
        
        # Should always return user info
        assert "user" in data, "Dashboard should contain user info"
        assert data["user"]["email"] == "aqib@clt-academy.com", "User email should match"
        
        # Employee may or may not be linked
        # If not linked, employee should be None
        if data.get("employee") is None:
            print("✓ Dashboard correctly shows employee=None for user without HR record")
            # Should still return empty attendance, leave_balance etc.
            assert "attendance" in data, "Should have attendance section"
            assert "leave_balance" in data, "Should have leave_balance section"
            assert "pending_requests" in data, "Should have pending_requests section"
        else:
            print(f"✓ Dashboard returned employee data: {data['employee'].get('full_name')}")
            # If employee exists, verify structure
            assert "employee_id" in data["employee"], "Employee should have employee_id"
            assert "full_name" in data["employee"], "Employee should have full_name"
        
        print("✓ Dashboard endpoint returned valid structure")
    
    # ============ LEAVE BALANCE ============
    
    def test_get_leave_balance(self):
        """Test GET /api/ess/leave-balance returns leave balance"""
        res = self.session.get(f"{BASE_URL}/api/ess/leave-balance")
        
        # If user doesn't have HR record, should return 404
        if res.status_code == 404:
            data = res.json()
            assert "employee" in data.get("detail", "").lower() or "record" in data.get("detail", "").lower(), \
                "Should indicate no employee record found"
            print("✓ Leave balance correctly returns 404 for user without HR record")
            return
        
        assert res.status_code == 200, f"Failed to get leave balance: {res.text}"
        
        balance = res.json()
        assert isinstance(balance, list), "Leave balance should be a list"
        
        for item in balance:
            assert "leave_type" in item, "Should have leave_type"
            assert "leave_type_name" in item, "Should have leave_type_name"
            assert "total_days" in item, "Should have total_days"
            assert "used_days" in item, "Should have used_days"
            assert "remaining_days" in item, "Should have remaining_days"
        
        print(f"✓ Leave balance returned {len(balance)} leave types")
    
    # ============ LEAVE REQUESTS ============
    
    def test_get_leave_requests(self):
        """Test GET /api/ess/leave-requests returns user's leave requests"""
        res = self.session.get(f"{BASE_URL}/api/ess/leave-requests")
        assert res.status_code == 200, f"Failed to get leave requests: {res.text}"
        
        requests_list = res.json()
        assert isinstance(requests_list, list), "Leave requests should be a list"
        print(f"✓ Leave requests returned {len(requests_list)} requests")
    
    def test_create_leave_request(self):
        """Test POST /api/ess/leave-requests creates a new leave request"""
        # Calculate dates for next week
        start_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        
        leave_data = {
            "leave_type": "annual_leave",
            "start_date": start_date,
            "end_date": end_date,
            "reason": "TEST_ESS: Personal leave for testing purposes"
        }
        
        res = self.session.post(f"{BASE_URL}/api/ess/leave-requests", json=leave_data)
        
        # If user doesn't have HR record, should return 404
        if res.status_code == 404:
            data = res.json()
            assert "employee" in data.get("detail", "").lower() or "record" in data.get("detail", "").lower(), \
                "Should indicate no employee record found"
            print("✓ Leave request creation correctly returns 404 for user without HR record")
            return
        
        assert res.status_code == 200, f"Failed to create leave request: {res.text}"
        
        data = res.json()
        assert "id" in data, "Response should have request id"
        assert "message" in data, "Response should have success message"
        assert data.get("status") == "pending_manager", "Status should be pending_manager"
        
        print(f"✓ Leave request created with id: {data['id']}")
    
    # ============ ATTENDANCE REGULARIZATION ============
    
    def test_get_attendance_regularization(self):
        """Test GET /api/ess/attendance-regularization returns user's regularization requests"""
        res = self.session.get(f"{BASE_URL}/api/ess/attendance-regularization")
        assert res.status_code == 200, f"Failed to get regularization requests: {res.text}"
        
        requests_list = res.json()
        assert isinstance(requests_list, list), "Regularization requests should be a list"
        print(f"✓ Regularization requests returned {len(requests_list)} requests")
    
    def test_create_attendance_regularization(self):
        """Test POST /api/ess/attendance-regularization creates regularization request"""
        # Use yesterday's date
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        reg_data = {
            "date": yesterday,
            "requested_check_in": "09:00",
            "requested_check_out": "18:00",
            "reason": "TEST_ESS: Forgot to punch in - was in meeting"
        }
        
        res = self.session.post(f"{BASE_URL}/api/ess/attendance-regularization", json=reg_data)
        
        # If user doesn't have HR record, should return 404
        if res.status_code == 404:
            data = res.json()
            assert "employee" in data.get("detail", "").lower() or "record" in data.get("detail", "").lower(), \
                "Should indicate no employee record found"
            print("✓ Regularization creation correctly returns 404 for user without HR record")
            return
        
        assert res.status_code == 200, f"Failed to create regularization request: {res.text}"
        
        data = res.json()
        assert "id" in data, "Response should have request id"
        assert "message" in data, "Response should have message"
        assert data.get("status") == "pending_manager", "Status should be pending_manager"
        
        print(f"✓ Regularization request created with id: {data['id']}")
    
    # ============ MY ATTENDANCE ============
    
    def test_get_my_attendance(self):
        """Test GET /api/ess/my-attendance returns attendance records"""
        res = self.session.get(f"{BASE_URL}/api/ess/my-attendance")
        
        # If user doesn't have HR record, should return 404
        if res.status_code == 404:
            data = res.json()
            assert "employee" in data.get("detail", "").lower() or "record" in data.get("detail", "").lower(), \
                "Should indicate no employee record found"
            print("✓ My attendance correctly returns 404 for user without HR record")
            return
        
        assert res.status_code == 200, f"Failed to get my attendance: {res.text}"
        
        data = res.json()
        assert "month" in data, "Should have month"
        assert "employee_id" in data, "Should have employee_id"
        assert "records" in data, "Should have records"
        assert "summary" in data, "Should have summary"
        
        print(f"✓ My attendance returned for month: {data['month']}")
    
    # ============ MY PROFILE ============
    
    def test_get_my_ess_profile(self):
        """Test GET /api/ess/my-profile returns user profile"""
        res = self.session.get(f"{BASE_URL}/api/ess/my-profile")
        assert res.status_code == 200, f"Failed to get ESS profile: {res.text}"
        
        data = res.json()
        assert "user" in data, "Should have user info"
        assert "has_employee_record" in data, "Should have has_employee_record flag"
        
        assert data["user"]["email"] == "aqib@clt-academy.com", "User email should match"
        
        print(f"✓ ESS profile returned, has_employee_record: {data['has_employee_record']}")
    
    # ============ MY ASSETS ============
    
    def test_get_my_assets(self):
        """Test GET /api/ess/my-assets returns allocated assets"""
        res = self.session.get(f"{BASE_URL}/api/ess/my-assets")
        assert res.status_code == 200, f"Failed to get my assets: {res.text}"
        
        assets = res.json()
        assert isinstance(assets, list), "Assets should be a list"
        print(f"✓ My assets returned {len(assets)} assets")
    
    # ============ PENDING APPROVALS ============
    
    def test_get_pending_approvals(self):
        """Test GET /api/ess/pending-approvals returns pending items for approvers"""
        res = self.session.get(f"{BASE_URL}/api/ess/pending-approvals")
        assert res.status_code == 200, f"Failed to get pending approvals: {res.text}"
        
        data = res.json()
        assert "leave_requests" in data, "Should have leave_requests"
        assert "regularization_requests" in data, "Should have regularization_requests"
        
        print(f"✓ Pending approvals: {len(data['leave_requests'])} leave, {len(data['regularization_requests'])} regularization")


class TestESSValidation:
    """Test ESS validation and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        
        token = login_res.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_leave_request_invalid_type(self):
        """Test that invalid leave type is rejected"""
        leave_data = {
            "leave_type": "invalid_type",
            "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d"),
            "reason": "Testing invalid type"
        }
        
        res = self.session.post(f"{BASE_URL}/api/ess/leave-requests", json=leave_data)
        
        # Should fail with 400 or 404 (if no employee record)
        assert res.status_code in [400, 404], f"Should reject invalid leave type: {res.text}"
        
        if res.status_code == 400:
            assert "invalid" in res.json().get("detail", "").lower(), "Should mention invalid type"
            print("✓ Invalid leave type correctly rejected with 400")
        else:
            print("✓ Request rejected (no employee record)")
    
    def test_sick_leave_requires_document(self):
        """Test that sick leave without document is rejected (if user has HR record)"""
        leave_data = {
            "leave_type": "sick_leave",
            "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d"),
            "reason": "Sick leave test"
            # No document_url
        }
        
        res = self.session.post(f"{BASE_URL}/api/ess/leave-requests", json=leave_data)
        
        # If user doesn't have HR record, we get 404
        if res.status_code == 404:
            print("✓ No HR record - cannot test document requirement")
            return
        
        # Otherwise should fail with 400 (requires document)
        assert res.status_code == 400, f"Should reject sick leave without document: {res.text}"
        assert "document" in res.json().get("detail", "").lower(), "Should mention document required"
        print("✓ Sick leave without document correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
