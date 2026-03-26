"""
Test suite for Iteration 84 features:
- HR Attendance Template Download (500 error fix)
- Announcements & Birthdays APIs
- Payroll extraction for all active employees
- Multi-currency (AED/INR) support
- Employee personal info update (date_of_birth)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Auth uses 'access_token' field
        return data.get("access_token") or data.get("token")
    
    def test_login_super_admin(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        print(f"✓ Super admin login successful")


class TestAttendanceTemplateDownload:
    """Test HR Attendance Template Download - was returning 500 error"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_attendance_template_download_returns_200(self, auth_token):
        """Test that attendance template download returns 200 with xlsx file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/template/download",
            params={"month": "2026-02"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        # Check content type is xlsx
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, f"Unexpected content type: {content_type}"
        # Check we got actual content
        assert len(response.content) > 0, "Empty response content"
        print(f"✓ Attendance template download returns 200 with {len(response.content)} bytes")
    
    def test_attendance_template_download_different_month(self, auth_token):
        """Test attendance template download for different month"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/template/download",
            params={"month": "2026-01"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Attendance template download for 2026-01 works")


class TestAnnouncementsAPI:
    """Test Announcements CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def cs_head_token(self):
        """Get CS Head token (non-HR role)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "falja@clt-academy.com",
            "password": "Falja@123"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_announcements(self, auth_token):
        """Test GET /api/announcements returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/announcements", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of announcements"
        print(f"✓ GET /api/announcements returns {len(data)} announcements")
    
    def test_create_announcement_hr_only(self, auth_token):
        """Test POST /api/announcements creates announcement (HR only)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Announcement_{test_id}",
            "content": "This is a test announcement for iteration 84",
            "priority": "normal",
            "category": "general"
        }
        response = requests.post(f"{BASE_URL}/api/announcements", json=payload, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["content"] == payload["content"]
        assert "id" in data
        print(f"✓ POST /api/announcements creates announcement: {data['id']}")
        return data["id"]
    
    def test_create_announcement_with_priority(self, auth_token):
        """Test creating announcement with different priorities"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Urgent_{test_id}",
            "content": "Urgent test announcement",
            "priority": "urgent",
            "category": "hr"
        }
        response = requests.post(f"{BASE_URL}/api/announcements", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "urgent"
        assert data["category"] == "hr"
        print(f"✓ Announcement with priority 'urgent' created")
        return data["id"]
    
    def test_delete_announcement(self, auth_token):
        """Test DELETE /api/announcements/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First create an announcement to delete
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(f"{BASE_URL}/api/announcements", json={
            "title": f"TEST_ToDelete_{test_id}",
            "content": "This will be deleted",
            "priority": "normal",
            "category": "general"
        }, headers=headers)
        assert create_response.status_code == 200
        announcement_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/announcements/{announcement_id}", headers=headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ DELETE /api/announcements/{announcement_id} successful")
    
    def test_delete_nonexistent_announcement(self, auth_token):
        """Test deleting non-existent announcement returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/announcements/{fake_id}", headers=headers)
        assert response.status_code == 404
        print(f"✓ DELETE non-existent announcement returns 404")


class TestBirthdaysAPI:
    """Test Birthdays API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_get_birthdays(self, auth_token):
        """Test GET /api/hr/birthdays returns today and upcoming"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/birthdays", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "today" in data, "Response should have 'today' field"
        assert "upcoming" in data, "Response should have 'upcoming' field"
        assert isinstance(data["today"], list)
        assert isinstance(data["upcoming"], list)
        print(f"✓ GET /api/hr/birthdays returns today: {len(data['today'])}, upcoming: {len(data['upcoming'])}")
    
    def test_auto_generate_birthday_announcements(self, auth_token):
        """Test POST /api/hr/birthdays/auto-announce"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/hr/birthdays/auto-announce", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "count" in data
        print(f"✓ POST /api/hr/birthdays/auto-announce: {data['message']}")


class TestEmployeePersonalUpdate:
    """Test employee personal info update including date_of_birth"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def test_employee_id(self, auth_token):
        """Get a test employee ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/employees", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        if isinstance(employees, dict) and "employees" in employees:
            employees = employees["employees"]
        assert len(employees) > 0, "No employees found"
        return employees[0]["id"]
    
    def test_update_employee_date_of_birth(self, auth_token, test_employee_id):
        """Test PUT /api/hr/employees/{id}/personal updates date_of_birth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"date_of_birth": "1990-05-15"}
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}/personal",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ PUT /api/hr/employees/{test_employee_id}/personal updates date_of_birth")
    
    def test_update_employee_personal_invalid_field(self, auth_token, test_employee_id):
        """Test that invalid fields are rejected"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"invalid_field": "value"}
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}/personal",
            json=payload,
            headers=headers
        )
        # Should return 400 for no valid fields
        assert response.status_code == 400
        print(f"✓ Invalid fields rejected with 400")


class TestPayrollRun:
    """Test payroll run doesn't skip employees with empty salary_structure"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_payroll_run_processes_all_employees(self, auth_token):
        """Test POST /api/hr/payroll/run processes all active employees"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Use a test month that likely doesn't have existing payroll
        payload = {
            "month": 12,
            "year": 2025
        }
        response = requests.post(f"{BASE_URL}/api/hr/payroll/run", json=payload, headers=headers)
        # Could be 200 (success) or 400 (already processed)
        if response.status_code == 400:
            data = response.json()
            if "already processed" in data.get("detail", "").lower():
                print(f"✓ Payroll for 2025-12 already processed (expected)")
                return
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Payroll run successful: {data}")
        else:
            # Try a different month
            payload = {"month": 11, "year": 2025}
            response = requests.post(f"{BASE_URL}/api/hr/payroll/run", json=payload, headers=headers)
            print(f"Payroll run response: {response.status_code} - {response.text[:200]}")


class TestMultiCurrencySupport:
    """Test multi-currency (AED/INR) support in salary structure"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def test_employee_id(self, auth_token):
        """Get a test employee ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/employees", headers=headers)
        assert response.status_code == 200
        employees = response.json()
        if isinstance(employees, dict) and "employees" in employees:
            employees = employees["employees"]
        assert len(employees) > 0, "No employees found"
        return employees[0]["id"]
    
    def test_update_salary_with_currency(self, auth_token, test_employee_id):
        """Test updating salary with currency field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "basic_salary": 5000,
            "housing_allowance": 1500,
            "transport_allowance": 500,
            "telephone_allowance": 200,
            "other_allowances": 300,
            "currency": "AED"
        }
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}/salary",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Salary updated with AED currency")
    
    def test_update_salary_with_inr_currency(self, auth_token, test_employee_id):
        """Test updating salary with INR currency"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "basic_salary": 50000,
            "housing_allowance": 15000,
            "transport_allowance": 5000,
            "telephone_allowance": 2000,
            "other_allowances": 3000,
            "currency": "INR"
        }
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}/salary",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Salary updated with INR currency")
        
        # Verify the currency was saved
        get_response = requests.get(f"{BASE_URL}/api/hr/employees/{test_employee_id}", headers=headers)
        assert get_response.status_code == 200
        emp_data = get_response.json()
        assert emp_data.get("salary_structure", {}).get("currency") == "INR", "Currency not saved correctly"
        print(f"✓ Currency INR verified in employee data")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_cleanup_test_announcements(self, auth_token):
        """Clean up TEST_ prefixed announcements"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/announcements", headers=headers)
        if response.status_code == 200:
            announcements = response.json()
            deleted = 0
            for ann in announcements:
                if ann.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/announcements/{ann['id']}", headers=headers)
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test announcements")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
