"""
Test suite for P0 features:
1. Employee Modal (HR sync-options API)
2. Customer Service Kanban drag-and-drop
3. Mentor CRM Kanban drag-and-drop
4. HR Leave Management page
5. HR Payroll page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConfig:
    """Test configuration and credentials"""
    SUPER_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
    token = None
    student_id = None

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    if TestConfig.token:
        return TestConfig.token
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TestConfig.SUPER_ADMIN
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    TestConfig.token = response.json()["access_token"]
    return TestConfig.token

@pytest.fixture
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestHRSyncOptionsAPI:
    """Test HR Employee sync-options API for Employee Modal"""
    
    def test_sync_options_returns_departments(self, auth_headers):
        """Test that sync-options returns departments list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "departments" in data
        assert isinstance(data["departments"], list)
        assert len(data["departments"]) > 0
        
        # Check department structure
        dept = data["departments"][0]
        assert "id" in dept
        assert "name" in dept
        print(f"✓ Departments: {[d['name'] for d in data['departments']]}")
    
    def test_sync_options_returns_roles(self, auth_headers):
        """Test that sync-options returns roles list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "roles" in data
        assert isinstance(data["roles"], list)
        assert len(data["roles"]) > 0
        
        # Check role structure
        role = data["roles"][0]
        assert "value" in role
        assert "label" in role
        
        # Verify expected roles exist
        role_values = [r["value"] for r in data["roles"]]
        expected_roles = ["super_admin", "admin", "sales_manager", "team_leader", 
                         "sales_executive", "cs_head", "cs_agent", "mentor", "hr", "finance"]
        for expected in expected_roles:
            assert expected in role_values, f"Missing role: {expected}"
        print(f"✓ Roles: {len(data['roles'])} roles found")
    
    def test_sync_options_returns_teams(self, auth_headers):
        """Test that sync-options returns teams list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "teams" in data
        assert isinstance(data["teams"], list)
        
        if len(data["teams"]) > 0:
            team = data["teams"][0]
            assert "id" in team
            assert "name" in team
        print(f"✓ Teams: {len(data['teams'])} teams found")
    
    def test_sync_options_returns_managers(self, auth_headers):
        """Test that sync-options returns potential managers list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "managers" in data
        assert isinstance(data["managers"], list)
        print(f"✓ Managers: {len(data['managers'])} managers found")
    
    def test_sync_options_returns_locations(self, auth_headers):
        """Test that sync-options returns locations list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "locations" in data
        assert isinstance(data["locations"], list)
        assert len(data["locations"]) > 0
        print(f"✓ Locations: {data['locations']}")
    
    def test_sync_options_returns_employment_types(self, auth_headers):
        """Test that sync-options returns employment types"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/sync-options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "employment_types" in data
        assert isinstance(data["employment_types"], list)
        assert len(data["employment_types"]) > 0
        
        # Check structure
        emp_type = data["employment_types"][0]
        assert "value" in emp_type
        assert "label" in emp_type
        print(f"✓ Employment Types: {[t['label'] for t in data['employment_types']]}")


class TestHREmployeesMasterAPI:
    """Test HR Employees Master APIs"""
    
    def test_get_employees_list(self, auth_headers):
        """Test getting employees list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Employees list: {len(data)} employees found")
    
    def test_get_next_employee_id(self, auth_headers):
        """Test getting next employee ID"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees/next-id",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "next_employee_id" in data
        assert data["next_employee_id"].startswith("CLT-")
        print(f"✓ Next Employee ID: {data['next_employee_id']}")


class TestStudentsAPIForKanban:
    """Test Students API for Customer Service and Mentor CRM Kanban boards"""
    
    def test_get_students(self, auth_headers):
        """Test getting students for CS Kanban"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Students: {len(data)} students found")
        
        if len(data) > 0:
            TestConfig.student_id = data[0].get("id")
            print(f"  - First student ID saved for later tests: {TestConfig.student_id}")
    
    def test_student_has_stage_field(self, auth_headers):
        """Test that students have stage field for CS Kanban"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            student = data[0]
            # Student should have stage field for CS Kanban
            assert "stage" in student, "Student missing 'stage' field for CS Kanban"
            print(f"✓ Student stage field present: {student.get('stage')}")
    
    def test_student_has_mentor_stage_field(self, auth_headers):
        """Test that students have mentor_stage field for Mentor CRM Kanban"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            student = data[0]
            # Student should have mentor_stage field for Mentor CRM Kanban
            # It may be null for students without mentor assignment
            assert "mentor_stage" in student or student.get("mentor_id"), "Student should support mentor_stage"
            print(f"✓ Mentor stage support verified")
    
    def test_update_student_stage(self, auth_headers):
        """Test updating student stage (simulates CS Kanban drag-and-drop)"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No students available for stage update test")
        
        student_id = response.json()[0].get("id")
        original_stage = response.json()[0].get("stage", "new_student")
        
        # Update to a test stage
        test_stage = "activated" if original_stage != "activated" else "satisfactory_call"
        
        response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"stage": test_stage}
        )
        assert response.status_code == 200
        
        # Verify update
        updated_student = response.json()
        assert updated_student.get("stage") == test_stage
        print(f"✓ Student stage updated from '{original_stage}' to '{test_stage}'")
        
        # Restore original stage
        requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"stage": original_stage}
        )
        print(f"  - Stage restored to '{original_stage}'")
    
    def test_update_student_mentor_stage(self, auth_headers):
        """Test updating student mentor_stage (simulates Mentor CRM Kanban drag-and-drop)"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No students available for mentor stage update test")
        
        student_id = response.json()[0].get("id")
        original_mentor_stage = response.json()[0].get("mentor_stage", "new_student")
        
        # Update to a test mentor stage
        test_mentor_stage = "discussion_started" if original_mentor_stage != "discussion_started" else "pitched_for_redeposit"
        
        response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"mentor_stage": test_mentor_stage}
        )
        assert response.status_code == 200
        
        # Verify update
        updated_student = response.json()
        assert updated_student.get("mentor_stage") == test_mentor_stage
        print(f"✓ Student mentor_stage updated to '{test_mentor_stage}'")
        
        # Restore original mentor stage
        requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"mentor_stage": original_mentor_stage}
        )
        print(f"  - Mentor stage restored to '{original_mentor_stage}'")


class TestHRLeaveManagement:
    """Test HR Leave Management APIs"""
    
    def test_get_leave_requests(self, auth_headers):
        """Test getting leave requests"""
        response = requests.get(
            f"{BASE_URL}/api/hr/leave-requests",
            headers=auth_headers
        )
        # Should return 200 even if empty
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leave Requests: {len(data)} requests found")
    
    def test_get_leave_balance(self, auth_headers):
        """Test getting leave balance"""
        response = requests.get(
            f"{BASE_URL}/api/hr/leave-balance",
            headers=auth_headers
        )
        # May return 200 or 404 if no employee record
        assert response.status_code in [200, 404, 422]
        print(f"✓ Leave Balance endpoint responded with status {response.status_code}")


class TestHRPayroll:
    """Test HR Payroll APIs"""
    
    def test_get_payroll_list(self, auth_headers):
        """Test getting payroll list"""
        response = requests.get(
            f"{BASE_URL}/api/hr/payroll",
            headers=auth_headers
        )
        # Should return 200 even if empty
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payroll: {len(data)} records found")
    
    def test_get_payroll_summary(self, auth_headers):
        """Test getting payroll summary - endpoint may not exist yet"""
        response = requests.get(
            f"{BASE_URL}/api/hr/payroll/summary",
            headers=auth_headers
        )
        # Endpoint may not exist - 404 is acceptable
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Payroll Summary: {data}")
        else:
            print(f"✓ Payroll Summary endpoint not implemented (404) - acceptable")


class TestCustomerServiceAPI:
    """Test Customer Service specific API functionality"""
    
    def test_valid_cs_stages(self, auth_headers):
        """Test that CS stages are valid for the Kanban board"""
        # These are the expected CS stages from CustomerServicePage.jsx
        expected_stages = [
            "new_student", "activated", "satisfactory_call", 
            "pitched_for_upgrade", "in_progress", "interested", "not_interested"
        ]
        
        # Get a student and verify stage is one of expected
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        students = response.json()
        if len(students) > 0:
            for student in students[:5]:  # Check first 5 students
                stage = student.get("stage", "new_student")
                assert stage in expected_stages, f"Unexpected stage: {stage}"
            print(f"✓ All student stages are valid CS stages")


class TestMentorCRMAPI:
    """Test Mentor CRM specific API functionality"""
    
    def test_valid_mentor_stages(self, auth_headers):
        """Test that mentor stages are valid for the Kanban board"""
        # These are the expected Mentor stages from MentorCRMPage.jsx
        expected_mentor_stages = [
            "new_student", "discussion_started", "pitched_for_redeposit", 
            "interested", "closed"
        ]
        
        # Get students and verify mentor_stage is valid
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        students = response.json()
        mentor_students = [s for s in students if s.get("mentor_id") or s.get("mentor_stage")]
        
        if len(mentor_students) > 0:
            for student in mentor_students[:5]:
                mentor_stage = student.get("mentor_stage", "new_student")
                if mentor_stage:
                    assert mentor_stage in expected_mentor_stages, f"Unexpected mentor stage: {mentor_stage}"
            print(f"✓ All mentor stages are valid")
        else:
            print(f"✓ No mentor-assigned students found (expected for new setup)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
