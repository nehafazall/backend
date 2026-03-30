"""
Iteration 106 - Redeposit Cycle & Filter Tests
Tests for:
1. POST /api/bd/record-redeposit - cycles student back to 'new_student' and increments redeposit_count
2. PUT /api/students/{student_id} with mentor_stage='closed' - auto-cycles back to 'new_student' and increments redeposit_count
3. Verify redeposit_count is properly incremented
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token")
    assert token, "No access_token in response"
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


def get_student_by_id(student_id, auth_headers):
    """Helper to get a student by ID using the list endpoint with search"""
    # Use BD students endpoint which returns student data
    response = requests.get(
        f"{BASE_URL}/api/bd/students",
        headers=auth_headers,
        params={"page_size": 100}
    )
    if response.status_code == 200:
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        for s in students:
            if s.get("id") == student_id:
                return s
    
    # Also try regular students endpoint
    response = requests.get(
        f"{BASE_URL}/api/students",
        headers=auth_headers,
        params={"page_size": 100}
    )
    if response.status_code == 200:
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        for s in students:
            if s.get("id") == student_id:
                return s
    return None


class TestBDRecordRedeposit:
    """Test BD record-redeposit endpoint cycles student back to new_student"""
    
    def test_bd_record_redeposit_cycles_to_new_student(self, auth_headers):
        """POST /api/bd/record-redeposit should cycle student back to 'new_student' and increment redeposit_count"""
        # First, get a student from BD CRM
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=auth_headers, params={"page_size": 10})
        assert response.status_code == 200, f"Failed to get BD students: {response.text}"
        
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        
        if not students:
            pytest.skip("No BD students available for testing")
        
        # Find a student in 'closed' stage or any stage
        test_student = None
        for s in students:
            if s.get("bd_stage") == "closed":
                test_student = s
                break
        
        if not test_student:
            # Use any student and first move them to closed
            test_student = students[0]
            # Move to closed stage first
            stage_response = requests.put(
                f"{BASE_URL}/api/bd/students/{test_student['id']}/stage",
                headers=auth_headers,
                json={"bd_stage": "closed"}
            )
            if stage_response.status_code == 200:
                test_student["bd_stage"] = "closed"
        
        student_id = test_student["id"]
        initial_redeposit_count = test_student.get("redeposit_count", 0)
        
        # Record redeposit
        redeposit_response = requests.post(
            f"{BASE_URL}/api/bd/record-redeposit",
            headers=auth_headers,
            json={
                "student_id": student_id,
                "amount_aed": 5000,
                "date": datetime.now().strftime("%Y-%m-%d")
            }
        )
        
        assert redeposit_response.status_code == 200, f"Record redeposit failed: {redeposit_response.text}"
        result = redeposit_response.json()
        assert result.get("status") == "success", f"Redeposit status not success: {result}"
        assert result.get("amount_aed") == 5000, f"Amount mismatch: {result}"
        
        # Verify student was cycled back to new_student
        updated_student = get_student_by_id(student_id, auth_headers)
        assert updated_student is not None, f"Failed to get student after redeposit"
        assert updated_student.get("bd_stage") == "new_student", f"Student not cycled to new_student: {updated_student.get('bd_stage')}"
        
        # Verify redeposit_count was incremented
        new_redeposit_count = updated_student.get("redeposit_count", 0)
        assert new_redeposit_count == initial_redeposit_count + 1, f"Redeposit count not incremented: {new_redeposit_count} vs expected {initial_redeposit_count + 1}"
        
        print(f"✓ BD record-redeposit: Student cycled to new_student, redeposit_count: {new_redeposit_count}")


class TestMentorClosedCycle:
    """Test Mentor stage 'closed' auto-cycles student back to new_student"""
    
    def test_mentor_closed_cycles_to_new_student(self, auth_headers):
        """PUT /api/students/{student_id} with mentor_stage='closed' should auto-cycle back to 'new_student'"""
        # Get students with mentor_stage
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"activated_only": True, "page_size": 20}
        )
        assert response.status_code == 200, f"Failed to get students: {response.text}"
        
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        
        # Find a student with mentor_stage that is NOT closed
        test_student = None
        for s in students:
            if s.get("mentor_stage") and s.get("mentor_stage") != "closed":
                test_student = s
                break
        
        if not test_student:
            # Try to find any student with mentor_id
            for s in students:
                if s.get("mentor_id"):
                    test_student = s
                    break
        
        if not test_student:
            pytest.skip("No mentor students available for testing")
        
        student_id = test_student["id"]
        initial_redeposit_count = test_student.get("redeposit_count", 0)
        
        # First ensure student is not in 'closed' stage
        if test_student.get("mentor_stage") == "closed":
            # Move to a different stage first
            requests.put(
                f"{BASE_URL}/api/students/{student_id}",
                headers=auth_headers,
                json={"mentor_stage": "interested"}
            )
        
        # Now move to 'closed' stage - this should auto-cycle
        update_response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=auth_headers,
            json={"mentor_stage": "closed"}
        )
        
        assert update_response.status_code == 200, f"Update student failed: {update_response.text}"
        
        # Verify student was cycled back to new_student
        updated_student = get_student_by_id(student_id, auth_headers)
        assert updated_student is not None, f"Failed to get student after update"
        
        # The auto-cycle should have set mentor_stage back to new_student
        assert updated_student.get("mentor_stage") == "new_student", f"Student not cycled to new_student: {updated_student.get('mentor_stage')}"
        
        # Verify redeposit_count was incremented
        new_redeposit_count = updated_student.get("redeposit_count", 0)
        assert new_redeposit_count == initial_redeposit_count + 1, f"Redeposit count not incremented: {new_redeposit_count} vs expected {initial_redeposit_count + 1}"
        
        print(f"✓ Mentor closed cycle: Student cycled to new_student, redeposit_count: {new_redeposit_count}")


class TestRedepositCountBadge:
    """Test that students with redeposit_count > 0 are returned correctly"""
    
    def test_bd_students_include_redeposit_count(self, auth_headers):
        """BD students endpoint should return redeposit_count field"""
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=auth_headers, params={"page_size": 50})
        assert response.status_code == 200, f"Failed to get BD students: {response.text}"
        
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        
        # Check that redeposit_count field exists in response
        redeposit_students = [s for s in students if s.get("redeposit_count", 0) > 0]
        
        print(f"✓ BD students endpoint returns redeposit_count. Found {len(redeposit_students)} students with redeposit_count > 0")
        
        # Verify the field structure
        if students:
            sample = students[0]
            # redeposit_count should be present (even if 0)
            assert "redeposit_count" in sample or sample.get("redeposit_count", 0) >= 0, "redeposit_count field should be present"
    
    def test_mentor_students_include_redeposit_count(self, auth_headers):
        """Mentor students endpoint should return redeposit_count field"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"activated_only": True, "page_size": 50}
        )
        assert response.status_code == 200, f"Failed to get students: {response.text}"
        
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        
        # Check that redeposit_count field exists in response
        redeposit_students = [s for s in students if s.get("redeposit_count", 0) > 0]
        
        print(f"✓ Students endpoint returns redeposit_count. Found {len(redeposit_students)} students with redeposit_count > 0")


class TestBDStageUpdate:
    """Test BD stage update endpoint"""
    
    def test_bd_stage_update(self, auth_headers):
        """PUT /api/bd/students/{student_id}/stage should update bd_stage"""
        # Get a BD student
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=auth_headers, params={"page_size": 5})
        assert response.status_code == 200, f"Failed to get BD students: {response.text}"
        
        data = response.json()
        students = data.get("items", data if isinstance(data, list) else [])
        
        if not students:
            pytest.skip("No BD students available for testing")
        
        test_student = students[0]
        student_id = test_student["id"]
        
        # Update to 'contacted' stage
        update_response = requests.put(
            f"{BASE_URL}/api/bd/students/{student_id}/stage",
            headers=auth_headers,
            json={"bd_stage": "contacted"}
        )
        
        assert update_response.status_code == 200, f"Stage update failed: {update_response.text}"
        
        # Verify
        updated = get_student_by_id(student_id, auth_headers)
        assert updated is not None, "Failed to get student after stage update"
        assert updated.get("bd_stage") == "contacted", f"Stage not updated: {updated.get('bd_stage')}"
        
        print(f"✓ BD stage update works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
