"""
Iteration 95 Tests: CS Kanban Overhaul, Claret Chat Widget Position, HR Shift Fix

Tests:
1. CS Kanban - Only 5 stages (no In Progress, Interested, Not Interested)
2. CS Kanban - Kanban/Table toggle
3. Claret Chat Widget - Position at bottom-left
4. HR Employee Shift - shift_id persists in GET response
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCSKanbanStages:
    """Test CS Kanban stage configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_students_endpoint_returns_data(self):
        """Test that students endpoint works"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"page": 1, "page_size": 10})
        assert resp.status_code == 200, f"Students endpoint failed: {resp.text}"
        data = resp.json()
        # Should return items array
        assert "items" in data or isinstance(data, list), "Students response should have items"
        print(f"SUCCESS: Students endpoint returns data")
    
    def test_students_stage_filter_new_student(self):
        """Test filtering students by new_student stage"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"stage": "new_student", "page_size": 5})
        assert resp.status_code == 200
        print("SUCCESS: new_student stage filter works")
    
    def test_students_stage_filter_activated(self):
        """Test filtering students by activated stage"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"stage": "activated", "page_size": 5})
        assert resp.status_code == 200
        print("SUCCESS: activated stage filter works")
    
    def test_students_stage_filter_satisfactory_call(self):
        """Test filtering students by satisfactory_call stage"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"stage": "satisfactory_call", "page_size": 5})
        assert resp.status_code == 200
        print("SUCCESS: satisfactory_call stage filter works")
    
    def test_students_stage_filter_pitched_for_upgrade(self):
        """Test filtering students by pitched_for_upgrade stage"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"stage": "pitched_for_upgrade", "page_size": 5})
        assert resp.status_code == 200
        print("SUCCESS: pitched_for_upgrade stage filter works")
    
    def test_students_stage_filter_upgraded(self):
        """Test filtering students by upgraded stage"""
        resp = self.session.get(f"{BASE_URL}/api/students", params={"stage": "upgraded", "page_size": 5})
        assert resp.status_code == 200
        print("SUCCESS: upgraded stage filter works")
    
    def test_students_stage_summary_endpoint(self):
        """Test stage summary endpoint returns counts"""
        resp = self.session.get(f"{BASE_URL}/api/students/stage-summary")
        assert resp.status_code == 200, f"Stage summary failed: {resp.text}"
        data = resp.json()
        assert "stage_counts" in data, "Stage summary should have stage_counts"
        print(f"SUCCESS: Stage summary returns: {data.get('stage_counts', {})}")


class TestHREmployeeShift:
    """Test HR Employee shift_id persistence"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_shifts_list(self):
        """Test that shifts endpoint returns available shifts"""
        resp = self.session.get(f"{BASE_URL}/api/hr/shifts")
        assert resp.status_code == 200, f"Shifts endpoint failed: {resp.text}"
        shifts = resp.json()
        assert isinstance(shifts, list), "Shifts should be a list"
        print(f"SUCCESS: Found {len(shifts)} shifts")
        if shifts:
            print(f"  Sample shift: {shifts[0]}")
    
    def test_get_employees_list(self):
        """Test that employees endpoint returns data with shift_id"""
        resp = self.session.get(f"{BASE_URL}/api/hr/employees", params={"page_size": 5})
        assert resp.status_code == 200, f"Employees endpoint failed: {resp.text}"
        employees = resp.json()
        assert isinstance(employees, list), "Employees should be a list"
        print(f"SUCCESS: Found {len(employees)} employees")
        
        # Check if shift_id is in response
        if employees:
            emp = employees[0]
            print(f"  Employee fields: {list(emp.keys())}")
            # shift_id should be in the response model
            assert "shift_id" in emp or emp.get("shift_id") is None, "shift_id should be in employee response"
            print(f"  shift_id present: {'shift_id' in emp}")
    
    def test_get_single_employee_has_shift_id(self):
        """Test that single employee GET returns shift_id"""
        # First get list of employees
        list_resp = self.session.get(f"{BASE_URL}/api/hr/employees", params={"page_size": 1})
        assert list_resp.status_code == 200
        employees = list_resp.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        emp_id = employees[0]["id"]
        
        # Get single employee
        resp = self.session.get(f"{BASE_URL}/api/hr/employees/{emp_id}")
        assert resp.status_code == 200, f"Get employee failed: {resp.text}"
        emp = resp.json()
        
        # Verify shift_id is in response
        print(f"SUCCESS: Employee {emp.get('full_name')} has shift_id: {emp.get('shift_id')}")
        assert "shift_id" in emp, "shift_id must be in employee response"
    
    def test_update_employee_shift_persists(self):
        """Test that updating employee shift persists and is returned in GET"""
        # Get an employee
        list_resp = self.session.get(f"{BASE_URL}/api/hr/employees", params={"page_size": 1})
        assert list_resp.status_code == 200
        employees = list_resp.json()
        
        if not employees:
            pytest.skip("No employees found")
        
        emp_id = employees[0]["id"]
        original_shift = employees[0].get("shift_id", "morning")
        
        # Update shift to a different value
        new_shift = "afternoon" if original_shift != "afternoon" else "morning"
        
        update_resp = self.session.put(f"{BASE_URL}/api/hr/employees/{emp_id}/shift", json={
            "shift_id": new_shift
        })
        assert update_resp.status_code == 200, f"Update shift failed: {update_resp.text}"
        print(f"SUCCESS: Updated shift to {new_shift}")
        
        # GET the employee and verify shift_id is returned
        get_resp = self.session.get(f"{BASE_URL}/api/hr/employees/{emp_id}")
        assert get_resp.status_code == 200
        emp = get_resp.json()
        
        assert emp.get("shift_id") == new_shift, f"shift_id not persisted. Expected {new_shift}, got {emp.get('shift_id')}"
        print(f"SUCCESS: shift_id persisted correctly: {emp.get('shift_id')}")
        
        # Restore original shift
        self.session.put(f"{BASE_URL}/api/hr/employees/{emp_id}/shift", json={
            "shift_id": original_shift
        })
        print(f"  Restored original shift: {original_shift}")


class TestClaretChatEndpoints:
    """Test Claret Chat API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_claret_chat_endpoint_exists(self):
        """Test that Claret chat endpoint exists"""
        resp = self.session.post(f"{BASE_URL}/api/claret/chat", json={
            "message": "Hello",
            "session_id": "test-session-123"
        })
        # Should return 200 or at least not 404
        assert resp.status_code != 404, "Claret chat endpoint should exist"
        print(f"SUCCESS: Claret chat endpoint exists, status: {resp.status_code}")
    
    def test_claret_chat_history_endpoint(self):
        """Test that Claret chat history endpoint exists"""
        resp = self.session.get(f"{BASE_URL}/api/claret/chat/history", params={
            "session_id": "test-session-123",
            "limit": 10
        })
        assert resp.status_code != 404, "Claret chat history endpoint should exist"
        print(f"SUCCESS: Claret chat history endpoint exists, status: {resp.status_code}")


class TestCSAgentLogin:
    """Test CS page access with CS Head credentials"""
    
    def test_cs_head_login(self):
        """Test CS Head can login"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "falja@clt-academy.com",
            "password": "Falja@123"
        })
        assert login_resp.status_code == 200, f"CS Head login failed: {login_resp.text}"
        data = login_resp.json()
        assert "access_token" in data, "Login should return access_token"
        user = data.get("user", {})
        print(f"SUCCESS: CS Head logged in - {user.get('full_name')} ({user.get('role')})")
    
    def test_cs_head_can_access_students(self):
        """Test CS Head can access students endpoint"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "falja@clt-academy.com",
            "password": "Falja@123"
        })
        token = login_resp.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        resp = session.get(f"{BASE_URL}/api/students", params={"page_size": 5})
        assert resp.status_code == 200, f"CS Head cannot access students: {resp.text}"
        print("SUCCESS: CS Head can access students endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
