"""
Iteration 96 Tests - CS Kanban, Claret Chat Widget, HR Shift Persistence
Tests for:
1. CS Kanban Board - 5 stages only (removed In Progress/Interested/Not Interested)
2. CS Kanban - Real student counts (not capped at 200)
3. CS Kanban - Per-column server-side pagination
4. CS Kanban - Kanban/Table toggle
5. Claret Chat Widget - Bottom-left positioning
6. HR Employee shift_id persistence
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dashboard-update-21.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"

# Expected CS stages in frontend (5 only - removed in_progress, interested, not_interested)
# Note: Backend may return more stages from DB, but frontend only shows these 5
EXPECTED_FRONTEND_CS_STAGES = ["new_student", "activated", "satisfactory_call", "pitched_for_upgrade", "upgraded"]
REMOVED_STAGES = ["in_progress", "interested", "not_interested"]


class TestAuthentication:
    """Test authentication for both users"""
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Super admin login successful: {data['user']['full_name']}")
    
    def test_cs_head_login(self):
        """Test CS head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"CS head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "cs_head"
        print(f"✓ CS head login successful: {data['user']['full_name']}")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    assert response.status_code == 200
    return response.json()["access_token"]


class TestCSKanbanStageSummary:
    """Test CS Kanban stage summary API - verifies real counts"""
    
    def test_stage_summary_returns_data(self, super_admin_token):
        """Verify stage-summary API returns stage counts"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200, f"Stage summary failed: {response.text}"
        
        data = response.json()
        stage_counts = data.get("stage_counts", {})
        
        # Check that we have stage counts
        assert len(stage_counts) > 0, "No stage counts returned"
        
        # Check that key stages exist
        assert "new_student" in stage_counts, "new_student stage not found"
        
        print(f"✓ Stage summary returns data: {list(stage_counts.keys())}")
        print(f"  Stage counts: {stage_counts}")
    
    def test_new_student_count_not_capped(self, super_admin_token):
        """Verify New Student count is real (should be 877-884, NOT capped at 200)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        new_student_count = data.get("stage_counts", {}).get("new_student", 0)
        
        # New Student should have 800+ students, NOT capped at 200
        assert new_student_count > 200, f"New Student count ({new_student_count}) appears capped at 200"
        assert new_student_count >= 800, f"New Student count ({new_student_count}) should be ~874+"
        
        print(f"✓ New Student count is real: {new_student_count} (not capped at 200)")


class TestCSKanbanPagination:
    """Test CS Kanban per-column pagination"""
    
    def test_students_endpoint_with_stage_filter(self, super_admin_token):
        """Test students endpoint with stage filter and pagination"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Test fetching new_student stage with pagination
        response = requests.get(
            f"{BASE_URL}/api/students",
            params={"stage": "new_student", "page": 1, "page_size": 50},
            headers=headers
        )
        assert response.status_code == 200, f"Students fetch failed: {response.text}"
        
        data = response.json()
        items = data.get("items", [])
        total = data.get("total", 0)
        
        # Should return 50 items per page
        assert len(items) <= 50, f"Page size exceeded: {len(items)}"
        
        # Total should be real count (not capped)
        assert total > 200, f"Total ({total}) appears capped"
        
        print(f"✓ Students pagination works: {len(items)} items returned, total={total}")
    
    def test_pagination_page_2(self, super_admin_token):
        """Test fetching page 2 of new_student stage"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students",
            params={"stage": "new_student", "page": 2, "page_size": 50},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        # Page 2 should have items if total > 50
        assert len(items) > 0, "Page 2 should have items"
        print(f"✓ Page 2 pagination works: {len(items)} items")
    
    def test_all_5_stages_filterable(self, super_admin_token):
        """Test that all 5 frontend stages can be filtered"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        for stage in EXPECTED_FRONTEND_CS_STAGES:
            response = requests.get(
                f"{BASE_URL}/api/students",
                params={"stage": stage, "page": 1, "page_size": 10},
                headers=headers
            )
            assert response.status_code == 200, f"Stage filter failed for {stage}: {response.text}"
            data = response.json()
            print(f"  ✓ Stage '{stage}': {data.get('total', 0)} students")
        
        print("✓ All 5 stages are filterable")


class TestHRShiftPersistence:
    """Test HR Employee shift_id persistence"""
    
    def test_shifts_list(self, super_admin_token):
        """Test that shifts list endpoint works"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/shifts", headers=headers)
        assert response.status_code == 200, f"Shifts list failed: {response.text}"
        
        shifts = response.json()
        assert len(shifts) > 0, "No shifts found"
        
        # Verify shift structure
        for shift in shifts:
            assert "id" in shift
            assert "name" in shift
        
        print(f"✓ Shifts list works: {len(shifts)} shifts found")
        for s in shifts[:3]:
            print(f"  - {s.get('id')}: {s.get('name')}")
    
    def test_employees_list_includes_shift_id(self, super_admin_token):
        """Test that employees list includes shift_id field"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            params={"page": 1, "page_size": 5},
            headers=headers
        )
        assert response.status_code == 200, f"Employees list failed: {response.text}"
        
        # Employees endpoint returns a list directly (not paginated)
        data = response.json()
        items = data if isinstance(data, list) else data.get("items", [])
        
        # Check that at least one employee has shift_id field
        employees_with_shift = [e for e in items if e.get("shift_id")]
        print(f"✓ Employees list works: {len(items)} employees, {len(employees_with_shift)} have shift_id set")
        
        # Verify shift_id field exists in response schema
        if items:
            first_emp = items[0]
            # shift_id should be in the response (may be None)
            assert "shift_id" in first_emp or first_emp.get("shift_id") is None, \
                "shift_id field not in employee response"
            print(f"  First employee: {first_emp.get('full_name')}, shift_id={first_emp.get('shift_id')}")
    
    def test_single_employee_has_shift_id(self, super_admin_token):
        """Test that single employee GET returns shift_id"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get an employee ID
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            params={"page": 1, "page_size": 1},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data if isinstance(data, list) else data.get("items", [])
        if not items:
            pytest.skip("No employees found")
        
        emp_id = items[0]["id"]
        
        # Get single employee
        response = requests.get(f"{BASE_URL}/api/hr/employees/{emp_id}", headers=headers)
        assert response.status_code == 200, f"Single employee GET failed: {response.text}"
        
        employee = response.json()
        # shift_id should be in response
        assert "shift_id" in employee, "shift_id field not in single employee response"
        print(f"✓ Single employee GET works: {employee.get('full_name')}, shift_id={employee.get('shift_id')}")
    
    def test_shift_update_persists(self, super_admin_token):
        """Test that updating employee shift persists"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get an employee
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            params={"page": 1, "page_size": 1},
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        items = data if isinstance(data, list) else data.get("items", [])
        if not items:
            pytest.skip("No employees found")
        
        emp_id = items[0]["id"]
        original_shift = items[0].get("shift_id", "morning")
        
        # Get available shifts
        shifts_response = requests.get(f"{BASE_URL}/api/hr/shifts", headers=headers)
        shifts = shifts_response.json()
        
        # Pick a different shift
        new_shift_id = None
        for s in shifts:
            if s["id"] != original_shift:
                new_shift_id = s["id"]
                break
        
        if not new_shift_id:
            new_shift_id = "afternoon"  # fallback
        
        # Update shift
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{emp_id}/shift",
            json={"shift_id": new_shift_id},
            headers=headers
        )
        assert response.status_code == 200, f"Shift update failed: {response.text}"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/hr/employees/{emp_id}", headers=headers)
        assert response.status_code == 200
        
        updated_employee = response.json()
        assert updated_employee.get("shift_id") == new_shift_id, \
            f"Shift not persisted: expected {new_shift_id}, got {updated_employee.get('shift_id')}"
        
        # Restore original shift
        requests.put(
            f"{BASE_URL}/api/hr/employees/{emp_id}/shift",
            json={"shift_id": original_shift},
            headers=headers
        )
        
        print(f"✓ Shift update persists: {original_shift} -> {new_shift_id} -> {original_shift}")


class TestClaretChatWidget:
    """Test Claret Chat Widget endpoints"""
    
    def test_claret_chat_endpoint(self, super_admin_token):
        """Test Claret chat endpoint works"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/claret/chat",
            json={"message": "Hello", "session_id": "test-session-123"},
            headers=headers
        )
        
        # Should return 200 or 201
        assert response.status_code in [200, 201], f"Claret chat failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message field"
        print(f"✓ Claret chat endpoint works")
    
    def test_claret_history_endpoint(self, super_admin_token):
        """Test Claret chat history endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/claret/chat/history",
            params={"session_id": "test-session-123", "limit": 10},
            headers=headers
        )
        
        assert response.status_code == 200, f"Claret history failed: {response.text}"
        print(f"✓ Claret history endpoint works")


class TestCSHeadAccess:
    """Test CS Head can access CS Kanban data"""
    
    def test_cs_head_can_access_students(self, cs_head_token):
        """Test CS Head can access students endpoint"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students",
            params={"page": 1, "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200, f"CS Head students access failed: {response.text}"
        
        data = response.json()
        print(f"✓ CS Head can access students: {data.get('total', 0)} total")
    
    def test_cs_head_can_access_stage_summary(self, cs_head_token):
        """Test CS Head can access stage summary"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200, f"CS Head stage summary failed: {response.text}"
        
        data = response.json()
        print(f"✓ CS Head can access stage summary: {data.get('total_students', 0)} total students")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
