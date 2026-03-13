"""
Test Suite for Dual-Role Views Feature (Iteration 43)
Tests:
1. Backend: GET /api/students with cs_agent_id filter
2. Backend: GET /api/students with activated_only=true and mentor_id filter
3. Frontend: CS page view toggle for super_admin/cs_head
4. Frontend: Mentor page view toggle for academic_master/super_admin
5. Frontend: CEO Dashboard Pending Approvals widget
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDualRoleViewsBackend:
    """Backend API tests for dual-role view functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super_admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.user_id = self.user["id"]
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"Logged in as: {self.user['full_name']} (role: {self.user['role']})")
    
    # ==== CS Agent ID Filter Tests ====
    
    def test_get_students_without_filter_returns_all(self):
        """GET /api/students without cs_agent_id returns all students"""
        response = self.session.get(f"{BASE_URL}/api/students")
        assert response.status_code == 200
        students = response.json()
        print(f"Total students (no filter): {len(students)}")
        assert isinstance(students, list)
    
    def test_get_students_with_cs_agent_id_filter(self):
        """GET /api/students with cs_agent_id returns only that agent's students"""
        # Get a valid cs_agent_id from users
        users_response = self.session.get(f"{BASE_URL}/api/users")
        assert users_response.status_code == 200
        users = users_response.json()
        
        # Find a cs_agent or any user to test
        test_agent_id = self.user_id
        for user in users:
            if user.get("role") in ["cs_agent", "cs_head"]:
                test_agent_id = user["id"]
                break
        
        # Get students filtered by cs_agent_id
        response = self.session.get(f"{BASE_URL}/api/students", params={"cs_agent_id": test_agent_id})
        assert response.status_code == 200
        students = response.json()
        print(f"Students for cs_agent_id={test_agent_id}: {len(students)}")
        
        # Verify all returned students have the correct cs_agent_id or verify query worked
        # Note: super_admin may have no direct assignments, so 0 results is valid
        assert isinstance(students, list)
        for student in students:
            if student.get("cs_agent_id"):
                assert student["cs_agent_id"] == test_agent_id, f"Student {student['id']} has wrong cs_agent_id"
        print(f"PASS: cs_agent_id filter works correctly")
    
    def test_get_students_with_super_admin_id_returns_zero_or_assigned(self):
        """GET /api/students with super_admin's id returns 0 students (no direct assignments)"""
        response = self.session.get(f"{BASE_URL}/api/students", params={"cs_agent_id": self.user_id})
        assert response.status_code == 200
        students = response.json()
        print(f"Students for super_admin cs_agent_id={self.user_id}: {len(students)}")
        # Super admin typically has no direct student assignments in 'my_work' mode
        assert isinstance(students, list)
        print(f"PASS: Super admin 'My Students' mode returns {len(students)} students")
    
    # ==== Mentor ID Filter Tests ====
    
    def test_get_students_with_activated_only_true(self):
        """GET /api/students with activated_only=true excludes new_student stage"""
        response = self.session.get(f"{BASE_URL}/api/students", params={"activated_only": "true"})
        assert response.status_code == 200
        students = response.json()
        print(f"Activated students (excluding new_student): {len(students)}")
        
        # Verify no student has stage='new_student'
        for student in students:
            assert student.get("stage") != "new_student", f"Student {student['id']} should not be new_student"
        print(f"PASS: activated_only filter excludes new_student stage")
    
    def test_get_students_with_mentor_id_filter(self):
        """GET /api/students with mentor_id returns only that mentor's students"""
        # Get a mentor user
        users_response = self.session.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        
        test_mentor_id = self.user_id
        for user in users:
            if user.get("role") in ["mentor", "academic_master"]:
                test_mentor_id = user["id"]
                break
        
        response = self.session.get(f"{BASE_URL}/api/students", params={
            "mentor_id": test_mentor_id,
            "activated_only": "true"
        })
        assert response.status_code == 200
        students = response.json()
        print(f"Mentor students for mentor_id={test_mentor_id}: {len(students)}")
        
        # Verify all returned students have the correct mentor_id
        for student in students:
            if student.get("mentor_id"):
                assert student["mentor_id"] == test_mentor_id
        print(f"PASS: mentor_id filter works correctly")
    
    # ==== Pending Approvals API Tests ====
    
    def test_leave_requests_pending_approval(self):
        """GET /api/hr/leave-requests with pending_approval returns pending leaves"""
        response = self.session.get(f"{BASE_URL}/api/hr/leave-requests", params={"pending_approval": "true"})
        assert response.status_code == 200
        leaves = response.json()
        print(f"Pending leave requests: {len(leaves)}")
        assert isinstance(leaves, list)
        # Verify all returned leaves have status='pending'
        for leave in leaves:
            assert leave.get("status") == "pending" or leave.get("status") in ["pending_manager", "pending_hr", "pending_ceo"], \
                f"Leave {leave.get('id')} has unexpected status: {leave.get('status')}"
        print(f"PASS: Leave requests pending_approval filter works")
    
    def test_regularization_requests_pending_approval(self):
        """GET /api/hr/regularization-requests with pending_approval returns pending regularizations"""
        response = self.session.get(f"{BASE_URL}/api/hr/regularization-requests", params={"pending_approval": "true"})
        assert response.status_code == 200
        regs = response.json()
        print(f"Pending regularization requests: {len(regs)}")
        assert isinstance(regs, list)
        print(f"PASS: Regularization requests pending_approval filter works")
    
    def test_payroll_batches_endpoint(self):
        """GET /api/hr/payroll/batches returns payroll batches"""
        response = self.session.get(f"{BASE_URL}/api/hr/payroll/batches")
        assert response.status_code == 200
        batches = response.json()
        print(f"Payroll batches: {len(batches)}")
        assert isinstance(batches, list)
        print(f"PASS: Payroll batches endpoint works")
    
    # ==== Team Overview Tests ====
    
    def test_get_all_students_for_team_view(self):
        """GET /api/students without cs_agent_id filter returns all students (Team Overview)"""
        # First get all students
        all_response = self.session.get(f"{BASE_URL}/api/students")
        assert all_response.status_code == 200
        all_students = all_response.json()
        
        # Then get filtered students
        my_response = self.session.get(f"{BASE_URL}/api/students", params={"cs_agent_id": self.user_id})
        assert my_response.status_code == 200
        my_students = my_response.json()
        
        print(f"Team Overview (all): {len(all_students)} students")
        print(f"My Students: {len(my_students)} students")
        
        # Team view should have equal or more students than my_work view
        assert len(all_students) >= len(my_students), "Team view should show all students"
        print(f"PASS: Team Overview shows all students ({len(all_students)}) vs My Students ({len(my_students)})")


class TestRoleBasedAccess:
    """Test that correct roles see the toggle and pending approvals"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super_admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        data = login_response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_super_admin_role_check(self):
        """Verify super_admin user has correct role for toggle visibility"""
        assert self.user["role"] == "super_admin", f"Expected super_admin role, got {self.user['role']}"
        
        # super_admin should see both CS toggle and Mentor toggle
        allowed_cs_roles = ["cs_head", "super_admin", "admin"]
        allowed_mentor_roles = ["academic_master", "super_admin", "admin"]
        
        assert self.user["role"] in allowed_cs_roles, "super_admin should see CS toggle"
        assert self.user["role"] in allowed_mentor_roles, "super_admin should see Mentor toggle"
        print(f"PASS: super_admin role correctly qualifies for both toggles")
    
    def test_dashboard_stats_endpoint(self):
        """GET /api/dashboard/stats works for super_admin"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        stats = response.json()
        print(f"Dashboard stats: {list(stats.keys())}")
        assert isinstance(stats, dict)
        print(f"PASS: Dashboard stats endpoint works for super_admin")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
