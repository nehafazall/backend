"""
Iteration 85 Backend Tests
Tests for:
1. 3CX Call Minutes API (daily-minutes, yearly-summary)
2. Student migration to new_student stage
3. Biocloud fetch-attendance endpoint (error handling)
4. Attendance template download with daily punch columns
5. Attendance import endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        # Auth uses 'access_token' field
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def cs_head_token(self):
        """Get CS head auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"CS head login failed: {response.text}"
        data = response.json()
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token


class Test3CXCallMinutesAPI(TestAuth):
    """Tests for 3CX Call Minutes tracking APIs"""
    
    def test_3cx_daily_minutes_returns_200(self, super_admin_token):
        """GET /api/3cx/daily-minutes returns 200 with monthly call data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/daily-minutes", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "month" in data, "Response should have 'month' field"
        assert "data" in data, "Response should have 'data' field"
        assert isinstance(data["data"], list), "'data' should be a list"
        
        # Data may be empty if no call logs with duration > 0 exist
        print(f"3CX daily-minutes: month={data['month']}, employees={len(data['data'])}")
    
    def test_3cx_daily_minutes_with_month_param(self, super_admin_token):
        """GET /api/3cx/daily-minutes?month=2026-01 returns data for specific month"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/daily-minutes?month=2026-01", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["month"] == "2026-01", f"Expected month 2026-01, got {data['month']}"
    
    def test_3cx_daily_minutes_invalid_month_format(self, super_admin_token):
        """GET /api/3cx/daily-minutes with invalid month format returns 400"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/daily-minutes?month=invalid", headers=headers)
        
        assert response.status_code == 400, f"Expected 400 for invalid month, got {response.status_code}"
    
    def test_3cx_yearly_summary_returns_200(self, super_admin_token):
        """GET /api/3cx/yearly-summary returns 200 with yearly call data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/yearly-summary", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "year" in data, "Response should have 'year' field"
        assert "data" in data, "Response should have 'data' field"
        assert isinstance(data["data"], list), "'data' should be a list"
        
        print(f"3CX yearly-summary: year={data['year']}, employees={len(data['data'])}")
    
    def test_3cx_yearly_summary_with_year_param(self, super_admin_token):
        """GET /api/3cx/yearly-summary?year=2026 returns data for specific year"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/3cx/yearly-summary?year=2026", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["year"] == 2026, f"Expected year 2026, got {data['year']}"


class TestStudentMigration(TestAuth):
    """Tests for CS Activation Flow - Student Migration"""
    
    def test_migrate_students_to_new_student_super_admin(self, super_admin_token):
        """POST /api/students/migrate-to-new-student works for super_admin"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/students/migrate-to-new-student", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should have 'message' field"
        assert "migrated_count" in data, "Response should have 'migrated_count' field"
        assert isinstance(data["migrated_count"], int), "'migrated_count' should be an integer"
        
        print(f"Migration result: {data['message']}, count={data['migrated_count']}")
    
    def test_migrate_students_to_new_student_cs_head(self, cs_head_token):
        """POST /api/students/migrate-to-new-student works for cs_head"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.post(f"{BASE_URL}/api/students/migrate-to-new-student", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "migrated_count" in data


class TestBiocloudAttendanceSync(TestAuth):
    """Tests for Biocloud attendance sync endpoint"""
    
    def test_biocloud_fetch_attendance_returns_proper_error(self, super_admin_token):
        """POST /api/hr/biocloud/fetch-attendance returns proper error (not 500 crash)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/hr/biocloud/fetch-attendance", headers=headers)
        
        # Should return either success (200) or a proper error (502 for connection issues)
        # but NOT a 500 internal server error crash
        assert response.status_code != 500, f"Should not return 500 crash, got: {response.text}"
        
        # Acceptable status codes: 200 (success), 502 (biocloud unreachable), 400 (bad request)
        assert response.status_code in [200, 400, 502], f"Unexpected status: {response.status_code}: {response.text}"
        
        print(f"Biocloud sync response: status={response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: synced={data.get('synced', 0)}, skipped={data.get('skipped', 0)}")
        else:
            print(f"  Error (expected): {response.text[:200]}")
    
    def test_biocloud_fetch_attendance_with_date(self, super_admin_token):
        """POST /api/hr/biocloud/fetch-attendance?date=2026-01-15 accepts date param"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/hr/biocloud/fetch-attendance?date=2026-01-15", headers=headers)
        
        # Should not crash with 500
        assert response.status_code != 500, f"Should not return 500 crash"


class TestAttendanceTemplateDownload(TestAuth):
    """Tests for HR Attendance Template Download with daily punch columns"""
    
    def test_attendance_template_download_returns_200(self, super_admin_token):
        """GET /api/hr/attendance/template/download?month=2026-03 returns 200 with xlsx"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/template/download?month=2026-03",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is xlsx
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, \
            f"Expected xlsx content type, got: {content_type}"
        
        # Verify content disposition has filename
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp.lower(), f"Expected attachment, got: {content_disp}"
        assert ".xlsx" in content_disp, f"Expected .xlsx filename, got: {content_disp}"
        
        # Verify file has content
        assert len(response.content) > 1000, f"File too small: {len(response.content)} bytes"
        
        print(f"Attendance template: size={len(response.content)} bytes, disposition={content_disp}")
    
    def test_attendance_template_download_different_months(self, super_admin_token):
        """GET /api/hr/attendance/template/download works for different months"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        for month in ["2026-01", "2026-02", "2026-03"]:
            response = requests.get(
                f"{BASE_URL}/api/hr/attendance/template/download?month={month}",
                headers=headers
            )
            assert response.status_code == 200, f"Failed for month {month}: {response.status_code}"
            print(f"  Month {month}: OK ({len(response.content)} bytes)")
    
    def test_attendance_template_download_invalid_month(self, super_admin_token):
        """GET /api/hr/attendance/template/download with invalid month returns 400"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/hr/attendance/template/download?month=invalid",
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid month, got {response.status_code}"


class TestAttendanceImport(TestAuth):
    """Tests for HR Attendance Import endpoint"""
    
    def test_attendance_import_endpoint_exists(self, super_admin_token):
        """POST /api/hr/attendance/import endpoint exists and requires file"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Send request without file - should return 422 (validation error) not 404
        response = requests.post(
            f"{BASE_URL}/api/hr/attendance/import",
            headers=headers,
            data={"month": "2026-03"}
        )
        
        # Should return 422 (missing file) or 400, not 404 (endpoint not found)
        assert response.status_code != 404, "Attendance import endpoint should exist"
        assert response.status_code in [400, 422], f"Expected 400/422 for missing file, got {response.status_code}"
        
        print(f"Attendance import endpoint exists, returns {response.status_code} without file")


class TestActivationQuestionnaireDefaults:
    """Tests for Activation Questionnaire default values"""
    
    def test_broker_name_default_in_code(self):
        """Verify broker_name defaults to 'MILES CAPITALS' in frontend code"""
        # This is a code review test - we verify the default is set in the component
        # The actual default is set in ActivationQuestionnaireModal.jsx INITIAL_STATE
        # broker_name: 'MILES CAPITALS'
        
        # Read the component file and verify the default
        component_path = "/app/frontend/src/components/ActivationQuestionnaireModal.jsx"
        with open(component_path, 'r') as f:
            content = f.read()
        
        assert "broker_name: 'MILES CAPITALS'" in content, \
            "broker_name should default to 'MILES CAPITALS' in INITIAL_STATE"
        
        print("Verified: broker_name defaults to 'MILES CAPITALS'")


class TestEmployeeCurrencySelector(TestAuth):
    """Tests for Employee Details Currency Selector"""
    
    def test_employee_salary_update_with_currency(self, super_admin_token):
        """PUT /api/hr/employees/{id}/salary accepts currency field"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get an employee
        response = requests.get(f"{BASE_URL}/api/hr/employees?page_size=1", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Handle both list and dict responses
        if isinstance(data, list):
            employees = data
        else:
            employees = data.get("items") or data.get("employees") or []
        
        if not employees:
            pytest.skip("No employees found to test currency update")
        
        emp_id = employees[0].get("id")
        
        # Update salary with currency
        salary_data = {
            "basic_salary": 5000,
            "housing_allowance": 1000,
            "transport_allowance": 500,
            "telephone_allowance": 200,
            "other_allowances": 300,
            "currency": "AED"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{emp_id}/salary",
            headers=headers,
            json=salary_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Employee salary update with currency: OK")
    
    def test_employee_salary_supports_inr_currency(self, super_admin_token):
        """PUT /api/hr/employees/{id}/salary accepts INR currency"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get an employee
        response = requests.get(f"{BASE_URL}/api/hr/employees?page_size=1", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch employees")
        
        data = response.json()
        # Handle both list and dict responses
        if isinstance(data, list):
            employees = data
        else:
            employees = data.get("items") or data.get("employees") or []
        
        if not employees:
            pytest.skip("No employees found")
        
        emp_id = employees[0].get("id")
        
        # Update with INR currency
        salary_data = {
            "basic_salary": 50000,
            "currency": "INR"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{emp_id}/salary",
            headers=headers,
            json=salary_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify currency was saved
        response = requests.get(f"{BASE_URL}/api/hr/employees/{emp_id}", headers=headers)
        assert response.status_code == 200
        emp_data = response.json()
        
        saved_currency = emp_data.get("salary_structure", {}).get("currency")
        assert saved_currency == "INR", f"Expected INR currency, got {saved_currency}"
        
        print(f"Employee INR currency support: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
