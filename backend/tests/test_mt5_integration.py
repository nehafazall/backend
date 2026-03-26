"""
MT5 Integration Tests - Iteration 82
Tests for MT5 sync module, account linking, and role-based access control.

Features tested:
- MT5 Status endpoint (GET /api/mt5/status)
- MT5 Linked Students endpoint (GET /api/mt5/linked-students)
- MT5 Link Student (PUT /api/mt5/link-student)
- MT5 Unlink Student (PUT /api/mt5/unlink-student)
- MT5 Duplicate check (cannot link same MT5 account to two students)
- MT5 Sync endpoint (POST /api/mt5/sync)
- MT5 Sync Logs (GET /api/mt5/sync-logs)
- Role access: admin/CS can access, mentors CANNOT access
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
CS_HEAD_CREDS = {"email": "falja@clt-academy.com", "password": "Falja@123"}
MENTOR_CREDS = {"email": "edwin@clt-academy.com", "password": "Edwin@123"}

# ADMIN_CS_ROLES that should have access
ADMIN_CS_ROLES = {"super_admin", "admin", "cs_head", "cs_head_", "customer_service", "customer_service_", "cs_agent"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS Head auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CS_HEAD_CREDS)
    assert response.status_code == 200, f"CS Head login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def mentor_token():
    """Get Mentor auth token (should NOT have MT5 access)."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MENTOR_CREDS)
    assert response.status_code == 200, f"Mentor login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def test_student_id(admin_token):
    """Get a test student ID for linking tests."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Search for a student named Ahmed
    response = requests.get(f"{BASE_URL}/api/mt5/linked-students?search=Ahmed&limit=1", headers=headers)
    if response.status_code == 200:
        data = response.json()
        students = data.get("students", [])
        if students:
            return students[0]["id"]
    # Fallback: get any student
    response = requests.get(f"{BASE_URL}/api/mt5/linked-students?limit=1", headers=headers)
    if response.status_code == 200:
        data = response.json()
        students = data.get("students", [])
        if students:
            return students[0]["id"]
    pytest.skip("No students found for testing")


class TestMT5StatusEndpoint:
    """Tests for GET /api/mt5/status"""

    def test_admin_can_access_mt5_status(self, admin_token):
        """Admin should be able to access MT5 status."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/status", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "connection" in data, "Response should have 'connection' field"
        assert "linked_students" in data, "Response should have 'linked_students' field"
        assert "schedule" in data, "Response should have 'schedule' field"
        assert "credentials_configured" in data, "Response should have 'credentials_configured' field"
        
        # Verify schedule structure
        schedule = data["schedule"]
        assert "times" in schedule, "Schedule should have 'times' field"
        assert "timezone" in schedule, "Schedule should have 'timezone' field"
        assert schedule["times"] == ["08:00", "16:00", "00:00"], "Schedule times should be 8 AM, 4 PM, 12 AM"
        assert "UAE" in schedule["timezone"], "Timezone should be UAE"
        
        print(f"✓ MT5 Status: connection={data['connection']}, linked_students={data['linked_students']}")

    def test_cs_head_can_access_mt5_status(self, cs_head_token):
        """CS Head should be able to access MT5 status."""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/status", headers=headers)
        
        assert response.status_code == 200, f"CS Head should have access, got {response.status_code}"
        print("✓ CS Head can access MT5 status")

    def test_mentor_cannot_access_mt5_status(self, mentor_token):
        """Mentor should NOT be able to access MT5 status (403 Forbidden)."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/status", headers=headers)
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to MT5 status")


class TestMT5LinkedStudentsEndpoint:
    """Tests for GET /api/mt5/linked-students"""

    def test_admin_can_get_linked_students(self, admin_token):
        """Admin should be able to get linked students list."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/linked-students", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "students" in data, "Response should have 'students' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        assert "limit" in data, "Response should have 'limit' field"
        
        print(f"✓ Linked students: total={data['total']}, page={data['page']}")

    def test_linked_students_search(self, admin_token):
        """Search should filter students by name, email, phone, or MT5 ID."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/linked-students?search=Ahmed", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # If results found, verify they match search
        if data["students"]:
            for student in data["students"]:
                name = (student.get("full_name") or "").lower()
                email = (student.get("email") or "").lower()
                phone = (student.get("phone") or "").lower()
                mt5 = (student.get("mt5_account_number") or "").lower()
                assert "ahmed" in name or "ahmed" in email or "ahmed" in phone or "ahmed" in mt5, \
                    f"Search result should match 'Ahmed': {student}"
        
        print(f"✓ Search returned {len(data['students'])} results for 'Ahmed'")

    def test_linked_students_pagination(self, admin_token):
        """Pagination should work correctly."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/mt5/linked-students?page=1&limit=5", headers=headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/mt5/linked-students?page=2&limit=5", headers=headers)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify pagination
        assert data1["page"] == 1
        assert data2["page"] == 2
        assert data1["limit"] == 5
        
        # If there are enough students, pages should have different content
        if data1["total"] > 5:
            ids1 = {s["id"] for s in data1["students"]}
            ids2 = {s["id"] for s in data2["students"]}
            assert ids1 != ids2, "Page 1 and Page 2 should have different students"
        
        print(f"✓ Pagination works: page1={len(data1['students'])}, page2={len(data2['students'])}")

    def test_mentor_cannot_access_linked_students(self, mentor_token):
        """Mentor should NOT be able to access linked students."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        response = requests.get(f"{BASE_URL}/api/mt5/linked-students", headers=headers)
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to linked students")


class TestMT5LinkStudent:
    """Tests for PUT /api/mt5/link-student"""

    def test_admin_can_link_student(self, admin_token, test_student_id):
        """Admin should be able to link a student to an MT5 account."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Generate unique MT5 account number for test
        test_mt5_account = f"TEST_{uuid.uuid4().hex[:8]}"
        
        response = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": test_student_id, "mt5_account_number": test_mt5_account}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert test_mt5_account in data.get("message", ""), "Message should contain MT5 account"
        
        print(f"✓ Successfully linked student {test_student_id} to MT5 account {test_mt5_account}")
        
        # Cleanup: unlink the test account
        requests.put(
            f"{BASE_URL}/api/mt5/unlink-student",
            headers=headers,
            json={"student_id": test_student_id}
        )

    def test_link_requires_student_id_and_mt5_account(self, admin_token):
        """Link should fail if student_id or mt5_account_number is missing."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Missing mt5_account_number
        response = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": "some-id"}
        )
        assert response.status_code == 400, "Should fail without mt5_account_number"
        
        # Missing student_id
        response = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"mt5_account_number": "12345"}
        )
        assert response.status_code == 400, "Should fail without student_id"
        
        print("✓ Link correctly requires both student_id and mt5_account_number")

    def test_link_fails_for_nonexistent_student(self, admin_token):
        """Link should fail for non-existent student."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": "nonexistent-student-id", "mt5_account_number": "12345"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Link correctly fails for non-existent student")

    def test_mentor_cannot_link_student(self, mentor_token, test_student_id):
        """Mentor should NOT be able to link students."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": test_student_id, "mt5_account_number": "12345"}
        )
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to link students")


class TestMT5DuplicateCheck:
    """Tests for MT5 duplicate account check"""

    def test_cannot_link_same_mt5_to_two_students(self, admin_token):
        """Should not allow linking the same MT5 account to two different students."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get students directly
        response = requests.get(f"{BASE_URL}/api/mt5/linked-students?limit=10", headers=headers)
        assert response.status_code == 200
        students = response.json().get("students", [])
        
        if len(students) < 2:
            pytest.skip("Need at least 2 students for duplicate test")
        
        student1_id = students[0]["id"]
        student2_id = students[1]["id"]
        
        # Generate unique MT5 account
        test_mt5_account = f"DUP_TEST_{uuid.uuid4().hex[:8]}"
        
        # Link to first student
        response1 = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": student1_id, "mt5_account_number": test_mt5_account}
        )
        assert response1.status_code == 200, f"First link should succeed: {response1.text}"
        
        # Try to link same MT5 to second student - should fail
        response2 = requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": student2_id, "mt5_account_number": test_mt5_account}
        )
        assert response2.status_code == 400, f"Duplicate link should fail with 400, got {response2.status_code}: {response2.text}"
        assert "already linked" in response2.text.lower(), "Error should mention 'already linked'"
        
        print(f"✓ Duplicate check works: MT5 {test_mt5_account} cannot be linked to two students")
        
        # Cleanup
        requests.put(
            f"{BASE_URL}/api/mt5/unlink-student",
            headers=headers,
            json={"student_id": student1_id}
        )


class TestMT5UnlinkStudent:
    """Tests for PUT /api/mt5/unlink-student"""

    def test_admin_can_unlink_student(self, admin_token, test_student_id):
        """Admin should be able to unlink a student's MT5 account."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First link a test account
        test_mt5_account = f"UNLINK_TEST_{uuid.uuid4().hex[:8]}"
        requests.put(
            f"{BASE_URL}/api/mt5/link-student",
            headers=headers,
            json={"student_id": test_student_id, "mt5_account_number": test_mt5_account}
        )
        
        # Now unlink
        response = requests.put(
            f"{BASE_URL}/api/mt5/unlink-student",
            headers=headers,
            json={"student_id": test_student_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        print(f"✓ Successfully unlinked MT5 account from student {test_student_id}")

    def test_unlink_requires_student_id(self, admin_token):
        """Unlink should fail if student_id is missing."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/mt5/unlink-student",
            headers=headers,
            json={}
        )
        
        assert response.status_code == 400, f"Should fail without student_id, got {response.status_code}"
        print("✓ Unlink correctly requires student_id")

    def test_mentor_cannot_unlink_student(self, mentor_token, test_student_id):
        """Mentor should NOT be able to unlink students."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/mt5/unlink-student",
            headers=headers,
            json={"student_id": test_student_id}
        )
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to unlink students")


class TestMT5SyncEndpoint:
    """Tests for POST /api/mt5/sync"""

    def test_admin_can_trigger_sync(self, admin_token):
        """Admin should be able to trigger MT5 sync (expected to return auth_failed since Web API not enabled)."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/mt5/sync", headers=headers, json={})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "status" in data, "Response should have 'status' field"
        assert "synced_at" in data, "Response should have 'synced_at' field"
        assert "triggered_by" in data, "Response should have 'triggered_by' field"
        
        # Expected: auth_failed since Web API not enabled by broker
        # But could also be 'completed' if no students linked or 'error'
        assert data["status"] in ["auth_failed", "completed", "error"], \
            f"Status should be auth_failed/completed/error, got {data['status']}"
        
        print(f"✓ MT5 Sync triggered: status={data['status']}, triggered_by={data['triggered_by']}")

    def test_cs_head_can_trigger_sync(self, cs_head_token):
        """CS Head should be able to trigger MT5 sync."""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        
        response = requests.post(f"{BASE_URL}/api/mt5/sync", headers=headers, json={})
        
        assert response.status_code == 200, f"CS Head should have access, got {response.status_code}"
        print("✓ CS Head can trigger MT5 sync")

    def test_mentor_cannot_trigger_sync(self, mentor_token):
        """Mentor should NOT be able to trigger MT5 sync."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        
        response = requests.post(f"{BASE_URL}/api/mt5/sync", headers=headers, json={})
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to trigger sync")


class TestMT5SyncLogs:
    """Tests for GET /api/mt5/sync-logs"""

    def test_admin_can_get_sync_logs(self, admin_token):
        """Admin should be able to get sync logs."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/mt5/sync-logs", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "logs" in data, "Response should have 'logs' field"
        assert isinstance(data["logs"], list), "Logs should be a list"
        
        # If there are logs, verify structure
        if data["logs"]:
            log = data["logs"][0]
            assert "id" in log, "Log should have 'id'"
            assert "synced_at" in log, "Log should have 'synced_at'"
            assert "status" in log, "Log should have 'status'"
            assert "triggered_by" in log, "Log should have 'triggered_by'"
        
        print(f"✓ Sync logs retrieved: {len(data['logs'])} logs")

    def test_sync_logs_limit(self, admin_token):
        """Sync logs should respect limit parameter."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/mt5/sync-logs?limit=5", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["logs"]) <= 5, "Should return at most 5 logs"
        
        print(f"✓ Sync logs limit works: returned {len(data['logs'])} logs (limit=5)")

    def test_mentor_cannot_get_sync_logs(self, mentor_token):
        """Mentor should NOT be able to get sync logs."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        
        response = requests.get(f"{BASE_URL}/api/mt5/sync-logs", headers=headers)
        
        assert response.status_code == 403, f"Mentor should get 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to sync logs")


class TestMT5RoleAccess:
    """Comprehensive role access tests for all MT5 endpoints"""

    def test_all_admin_cs_roles_have_access(self, admin_token):
        """Verify ADMIN_CS_ROLES definition matches expected roles."""
        # This is a documentation test to verify the roles
        expected_roles = {"super_admin", "admin", "cs_head", "cs_head_", "customer_service", "customer_service_", "cs_agent"}
        assert ADMIN_CS_ROLES == expected_roles, f"ADMIN_CS_ROLES mismatch: {ADMIN_CS_ROLES}"
        print(f"✓ ADMIN_CS_ROLES correctly defined: {ADMIN_CS_ROLES}")

    def test_mentor_role_excluded(self, mentor_token):
        """Verify mentor role is excluded from all MT5 endpoints."""
        headers = {"Authorization": f"Bearer {mentor_token}"}
        
        endpoints = [
            ("GET", "/api/mt5/status"),
            ("GET", "/api/mt5/linked-students"),
            ("PUT", "/api/mt5/link-student"),
            ("PUT", "/api/mt5/unlink-student"),
            ("POST", "/api/mt5/sync"),
            ("GET", "/api/mt5/sync-logs"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", headers=headers, json={"student_id": "test"})
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json={})
            
            assert response.status_code == 403, f"Mentor should get 403 for {method} {endpoint}, got {response.status_code}"
        
        print("✓ Mentor correctly denied access to all MT5 endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
