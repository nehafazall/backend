"""
Tests for Customer Service Upgrade Workflow
- Tests upgrade modal endpoint: POST /api/students/{id}/initiate-upgrade
- Tests upgrade history endpoint: GET /api/students/{id}/upgrade-history
- Verifies student moves back to 'new_student' stage
- Verifies is_upgraded_student flag
- Verifies upgrade_count increment
- Verifies MT5 account history tracking
- Verifies wallet transfer confirmation

Test Course: 66599d5f-37f3-4da0-83b8-1dc58e6eba71 (Advanced Trading Mastery - 15000 AED)
Test Student: 68f7d663-2d5a-45e8-9b1b-88edeaef1ae2
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://cs-upgrade.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"

# Test data
TEST_STUDENT_ID = "68f7d663-2d5a-45e8-9b1b-88edeaef1ae2"
TEST_COURSE_ID = "66599d5f-37f3-4da0-83b8-1dc58e6eba71"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestUpgradeWorkflowBackend:
    """Tests for Customer Service Upgrade Workflow Backend APIs"""
    
    def test_01_auth_login(self):
        """Test authentication login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Auth login successful - role: {data['user']['role']}")

    def test_02_get_courses_with_prices(self, auth_headers):
        """Test that courses endpoint returns courses with prices"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get courses: {response.text}"
        courses = response.json()
        assert len(courses) >= 1, "No courses found"
        
        # Find test course
        test_course = next((c for c in courses if c["id"] == TEST_COURSE_ID), None)
        assert test_course is not None, f"Test course {TEST_COURSE_ID} not found"
        assert test_course.get("price") or test_course.get("base_price"), "Course has no price"
        print(f"✓ Courses fetched - found {len(courses)} courses, test course: {test_course['name']}")

    def test_03_ensure_student_in_activated_stage(self, auth_headers):
        """Ensure test student is in activated stage for upgrade testing"""
        # First update student to activated stage
        response = requests.put(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}",
            headers=auth_headers,
            json={"stage": "activated"}
        )
        assert response.status_code == 200, f"Failed to update student stage: {response.text}"
        
        # Verify student is in activated stage - get from list
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get students: {response.text}"
        students = response.json()
        student = next((s for s in students if s["id"] == TEST_STUDENT_ID), None)
        assert student is not None, f"Test student not found"
        assert student["stage"] == "activated", f"Student not in activated stage: {student['stage']}"
        print(f"✓ Student {student['full_name']} is in activated stage")

    def test_04_initiate_upgrade_basic(self, auth_headers):
        """Test basic upgrade initiation - POST /api/students/{id}/initiate-upgrade"""
        params = {
            "upgrade_course_id": TEST_COURSE_ID,
            "mt5_account_changed": False,
            "wallet_transfer_confirmed": True,
            "notes": "Test upgrade from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/initiate-upgrade",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to initiate upgrade: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "student" in data
        assert "upgrade_record" in data
        
        student = data["student"]
        upgrade_record = data["upgrade_record"]
        
        # Verify student moved back to new_student stage
        assert student["stage"] == "new_student", f"Expected stage new_student, got {student['stage']}"
        
        # Verify is_upgraded_student flag is True
        assert student["is_upgraded_student"] == True, "is_upgraded_student should be True"
        
        # Verify upgrade_count incremented
        assert student["upgrade_count"] >= 1, "upgrade_count should be >= 1"
        
        # Verify upgrade record
        assert upgrade_record["to_course_id"] == TEST_COURSE_ID
        assert upgrade_record["wallet_transfer_confirmed"] == True
        assert upgrade_record["status"] == "pending_activation"
        
        print(f"✓ Upgrade initiated successfully:")
        print(f"  - Student stage: {student['stage']}")
        print(f"  - is_upgraded_student: {student['is_upgraded_student']}")
        print(f"  - upgrade_count: {student['upgrade_count']}")
        print(f"  - Upgrade to: {upgrade_record['to_course_name']}")

    def test_05_get_upgrade_history(self, auth_headers):
        """Test get upgrade history - GET /api/students/{id}/upgrade-history"""
        response = requests.get(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/upgrade-history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get upgrade history: {response.text}"
        
        data = response.json()
        assert data["student_id"] == TEST_STUDENT_ID
        assert data["is_upgraded_student"] == True
        assert data["upgrade_count"] >= 1
        assert "upgrade_history" in data
        assert len(data["upgrade_history"]) >= 1, "No upgrade history records"
        
        # Verify latest upgrade record
        latest = data["upgrade_history"][-1]
        assert latest["to_course_id"] == TEST_COURSE_ID
        
        print(f"✓ Upgrade history retrieved:")
        print(f"  - upgrade_count: {data['upgrade_count']}")
        print(f"  - total_spent: {data['total_spent']}")
        print(f"  - history records: {len(data['upgrade_history'])}")

    def test_06_verify_student_state_after_upgrade(self, auth_headers):
        """Verify complete student state after upgrade"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        students = response.json()
        student = next((s for s in students if s["id"] == TEST_STUDENT_ID), None)
        assert student is not None, "Test student not found"
        
        # Critical assertions
        assert student["stage"] == "new_student", "Student should be in new_student stage"
        assert student["is_upgraded_student"] == True, "is_upgraded_student should be True"
        assert student["upgrade_count"] >= 1, "upgrade_count should be >= 1"
        assert student.get("upgrade_to_course_id") == TEST_COURSE_ID, "upgrade_to_course_id not set"
        assert student.get("upgrade_to_course_name") is not None, "upgrade_to_course_name not set"
        assert student.get("wallet_transfer_confirmed") == True, "wallet_transfer_confirmed not set"
        assert student.get("upgrade_history") is not None, "upgrade_history should exist"
        
        print(f"✓ Student state verified after upgrade:")
        print(f"  - Stage: {student['stage']}")
        print(f"  - is_upgraded_student: {student['is_upgraded_student']}")
        print(f"  - upgrade_count: {student['upgrade_count']}")
        print(f"  - upgrade_to_course_name: {student.get('upgrade_to_course_name')}")

    def test_07_initiate_upgrade_with_mt5_change(self, auth_headers):
        """Test upgrade with MT5 account change"""
        # First move back to activated
        requests.put(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}",
            headers=auth_headers,
            json={"stage": "activated"}
        )
        
        new_mt5 = f"MT5_{uuid.uuid4().hex[:8].upper()}"
        params = {
            "upgrade_course_id": TEST_COURSE_ID,
            "mt5_account_changed": True,
            "new_mt5_account": new_mt5,
            "wallet_transfer_confirmed": False,
            "notes": "Test upgrade with MT5 change"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/initiate-upgrade",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to initiate upgrade with MT5: {response.text}"
        
        data = response.json()
        student = data["student"]
        upgrade_record = data["upgrade_record"]
        
        # Verify MT5 account updated
        assert student["mt5_account_number"] == new_mt5, f"MT5 not updated: {student.get('mt5_account_number')}"
        
        # Verify MT5 history
        mt5_history = student.get("mt5_account_history", [])
        assert len(mt5_history) >= 1, "MT5 history should have at least 1 entry"
        
        # Verify upgrade record captured MT5 change
        assert upgrade_record["mt5_account_changed"] == True
        assert upgrade_record["new_mt5_account"] == new_mt5
        
        print(f"✓ Upgrade with MT5 change successful:")
        print(f"  - New MT5 account: {new_mt5}")
        print(f"  - MT5 history count: {len(mt5_history)}")

    def test_08_upgrade_requires_course_selection(self, auth_headers):
        """Test that upgrade fails without course selection"""
        # Move to activated
        requests.put(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}",
            headers=auth_headers,
            json={"stage": "activated"}
        )
        
        # Try upgrade without course
        response = requests.post(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/initiate-upgrade",
            headers=auth_headers,
            params={"mt5_account_changed": False, "wallet_transfer_confirmed": True}
        )
        # Should fail - course is mandatory
        assert response.status_code in [400, 422], f"Expected 400/422 without course, got {response.status_code}"
        print(f"✓ Upgrade correctly requires course selection (status: {response.status_code})")

    def test_09_upgrade_invalid_course(self, auth_headers):
        """Test upgrade with invalid course ID"""
        # Move to activated
        requests.put(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}",
            headers=auth_headers,
            json={"stage": "activated"}
        )
        
        response = requests.post(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}/initiate-upgrade",
            headers=auth_headers,
            params={
                "upgrade_course_id": "invalid-course-id",
                "mt5_account_changed": False,
                "wallet_transfer_confirmed": True
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid course, got {response.status_code}"
        print(f"✓ Upgrade correctly fails with invalid course (404)")

    def test_10_upgrade_invalid_student(self, auth_headers):
        """Test upgrade with invalid student ID"""
        response = requests.post(
            f"{BASE_URL}/api/students/invalid-student-id/initiate-upgrade",
            headers=auth_headers,
            params={
                "upgrade_course_id": TEST_COURSE_ID,
                "mt5_account_changed": False,
                "wallet_transfer_confirmed": True
            }
        )
        assert response.status_code == 404, f"Expected 404 for invalid student, got {response.status_code}"
        print(f"✓ Upgrade correctly fails with invalid student (404)")

    def test_11_get_students_api_returns_upgrade_data(self, auth_headers):
        """Test that students API returns upgrade-related fields"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers
        )
        assert response.status_code == 200
        students = response.json()
        
        # Find our test student
        test_student = next((s for s in students if s["id"] == TEST_STUDENT_ID), None)
        assert test_student is not None, "Test student not found in list"
        
        # Check upgrade fields are included
        assert "is_upgraded_student" in test_student, "is_upgraded_student field missing"
        assert "upgrade_count" in test_student, "upgrade_count field missing"
        
        print(f"✓ Students API returns upgrade data:")
        print(f"  - is_upgraded_student: {test_student.get('is_upgraded_student')}")
        print(f"  - upgrade_count: {test_student.get('upgrade_count')}")

    def test_12_cleanup_reset_student_to_activated(self, auth_headers):
        """Cleanup: Reset test student to activated stage for future tests"""
        response = requests.put(
            f"{BASE_URL}/api/students/{TEST_STUDENT_ID}",
            headers=auth_headers,
            json={"stage": "activated"}
        )
        assert response.status_code == 200
        print(f"✓ Test student reset to activated stage for future testing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
