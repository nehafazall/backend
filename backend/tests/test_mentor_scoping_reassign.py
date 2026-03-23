"""
Test Mentor CRM Scoping and Student Reassignment Features
- Mentor revenue scoping: /api/mentor/revenue-summary with mentor_id param
- Mentor closings scoping: /api/mentor/monthly-closings with mentor_id param
- Student reassign API: POST /api/students/{student_id}/reassign-mentor
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"

# Edwin's user ID (master_of_academics role)
EDWIN_USER_ID = "31ba3269-0de2-4b8a-b207-7913879c38f4"

# Mentor IDs from context
MENTOR_IDS = {
    "ashwin": "0e8a261c",
    "sriram": "63cb17e1",
    "rahim": "d0c51464",
    "amal": "29197bce",
    "nihal": "aafb51ec",
}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(super_admin_token):
    """Auth headers for super admin"""
    return {"Authorization": f"Bearer {super_admin_token}"}


class TestMentorRevenueSummaryScoping:
    """Test /api/mentor/revenue-summary with mentor_id filtering"""
    
    def test_revenue_summary_without_filter_returns_all(self, auth_headers):
        """Super admin without filter should see all mentors' data"""
        response = requests.get(f"{BASE_URL}/api/mentor/revenue-summary", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have month and totals
        assert "month" in data
        assert "totals" in data
        assert "grand_redeposits" in data["totals"] or "grand_total" in data["totals"]
        print(f"Revenue summary (all): month={data['month']}, totals={data['totals']}")
    
    def test_revenue_summary_with_mentor_filter(self, auth_headers):
        """Super admin with mentor_id filter should see only that mentor's data"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/revenue-summary?mentor_id={EDWIN_USER_ID}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "month" in data
        assert "totals" in data
        print(f"Revenue summary (Edwin): month={data['month']}, totals={data['totals']}")
        
        # If there are mentor_summaries, they should only be for Edwin
        if "mentor_summaries" in data:
            for summary in data["mentor_summaries"]:
                assert summary.get("mentor_id") == EDWIN_USER_ID, \
                    f"Expected only Edwin's data, got mentor_id={summary.get('mentor_id')}"


class TestMentorMonthlyClosingsScoping:
    """Test /api/mentor/monthly-closings with mentor_id filtering"""
    
    def test_monthly_closings_without_filter_returns_all(self, auth_headers):
        """Super admin without filter should see all mentors' closings"""
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "month" in data
        assert "students" in data
        assert "totals" in data
        
        total_students = len(data["students"])
        total_deposits = data["totals"]["deposits"]
        total_withdrawals = data["totals"]["withdrawals"]
        net_revenue = data["totals"]["net_revenue"]
        
        print(f"Monthly closings (all): month={data['month']}, students={total_students}, "
              f"deposits={total_deposits}, withdrawals={total_withdrawals}, net={net_revenue}")
        
        # Based on context: ~23 students, ~113,828 AED
        # Allow some variance since data may change
        assert total_students > 0, "Expected some students in closings"
    
    def test_monthly_closings_with_mentor_filter(self, auth_headers):
        """Super admin with mentor_id filter should see only that mentor's closings"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/monthly-closings?mentor_id={EDWIN_USER_ID}", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "month" in data
        assert "students" in data
        assert "totals" in data
        
        total_students = len(data["students"])
        total_deposits = data["totals"]["deposits"]
        
        print(f"Monthly closings (Edwin): month={data['month']}, students={total_students}, "
              f"deposits={total_deposits}")
        
        # Based on context: Edwin should have ~7 students, ~53,567 AED
        # This is a scoped view, so should be less than total
    
    def test_monthly_closings_comparison(self, auth_headers):
        """Compare filtered vs unfiltered to verify scoping works"""
        # Get all
        all_response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=auth_headers)
        assert all_response.status_code == 200
        all_data = all_response.json()
        
        # Get Edwin's only
        edwin_response = requests.get(
            f"{BASE_URL}/api/mentor/monthly-closings?mentor_id={EDWIN_USER_ID}", 
            headers=auth_headers
        )
        assert edwin_response.status_code == 200
        edwin_data = edwin_response.json()
        
        all_students = len(all_data["students"])
        edwin_students = len(edwin_data["students"])
        all_deposits = all_data["totals"]["deposits"]
        edwin_deposits = edwin_data["totals"]["deposits"]
        
        print(f"Comparison: All={all_students} students, ${all_deposits} | "
              f"Edwin={edwin_students} students, ${edwin_deposits}")
        
        # Edwin's data should be a subset (less than or equal to all)
        assert edwin_students <= all_students, \
            f"Edwin's students ({edwin_students}) should be <= all students ({all_students})"
        assert edwin_deposits <= all_deposits, \
            f"Edwin's deposits ({edwin_deposits}) should be <= all deposits ({all_deposits})"


class TestStudentReassignAPI:
    """Test POST /api/students/{student_id}/reassign-mentor endpoint"""
    
    def test_reassign_requires_auth(self):
        """Reassign endpoint should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/students/test-id/reassign-mentor?new_mentor_id=test"
        )
        assert response.status_code == 403 or response.status_code == 401, \
            f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_reassign_requires_admin_role(self, auth_headers):
        """Only super_admin and admin can reassign"""
        # This test verifies the endpoint exists and accepts the right roles
        # We'll test with a non-existent student to avoid modifying real data
        response = requests.post(
            f"{BASE_URL}/api/students/non-existent-id/reassign-mentor?new_mentor_id=test",
            headers=auth_headers
        )
        # Should get 404 (student not found) not 403 (forbidden)
        assert response.status_code == 404, \
            f"Expected 404 for non-existent student, got {response.status_code}: {response.text}"
    
    def test_reassign_validates_mentor_exists(self, auth_headers):
        """Reassign should validate that new mentor exists"""
        # First get a real student with a mentor
        students_response = requests.get(
            f"{BASE_URL}/api/students?mentor_id={EDWIN_USER_ID}&limit=1",
            headers=auth_headers
        )
        
        if students_response.status_code != 200 or not students_response.json():
            pytest.skip("No students found for Edwin to test reassignment")
        
        students = students_response.json()
        if not students:
            pytest.skip("No students found for Edwin")
        
        student_id = students[0]["id"]
        
        # Try to reassign to non-existent mentor
        response = requests.post(
            f"{BASE_URL}/api/students/{student_id}/reassign-mentor?new_mentor_id=non-existent-mentor",
            headers=auth_headers
        )
        assert response.status_code == 404, \
            f"Expected 404 for non-existent mentor, got {response.status_code}: {response.text}"
        assert "Mentor not found" in response.text or "not found" in response.text.lower()
    
    def test_get_mentors_for_reassign(self, auth_headers):
        """Get list of mentors available for reassignment"""
        response = requests.get(f"{BASE_URL}/api/users?role=mentor", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get mentors: {response.text}"
        
        mentors = response.json()
        print(f"Found {len(mentors)} mentors for reassignment")
        
        # Print mentor names and IDs for reference
        for m in mentors[:5]:
            print(f"  - {m.get('full_name')} (id={m.get('id')[:8]}..., role={m.get('role')})")
        
        assert len(mentors) > 0, "Expected at least one mentor"


class TestStudentReassignEndToEnd:
    """End-to-end test of student reassignment"""
    
    def test_reassign_student_and_verify(self, auth_headers):
        """Test full reassignment flow: reassign and verify mentor_name updates"""
        # Step 1: Get a student with a mentor
        students_response = requests.get(
            f"{BASE_URL}/api/students?activated_only=true&limit=50",
            headers=auth_headers
        )
        assert students_response.status_code == 200
        
        students = students_response.json()
        # Find a student with a mentor_id
        test_student = None
        for s in students:
            if s.get("mentor_id"):
                test_student = s
                break
        
        if not test_student:
            pytest.skip("No students with mentors found for reassignment test")
        
        original_mentor_id = test_student.get("mentor_id")
        original_mentor_name = test_student.get("mentor_name")
        student_id = test_student["id"]
        student_name = test_student.get("full_name")
        
        print(f"Test student: {student_name} (id={student_id[:8]}...)")
        print(f"Original mentor: {original_mentor_name} (id={original_mentor_id[:8] if original_mentor_id else 'None'}...)")
        
        # Step 2: Get a different mentor to reassign to
        mentors_response = requests.get(f"{BASE_URL}/api/users?role=mentor", headers=auth_headers)
        assert mentors_response.status_code == 200
        
        mentors = mentors_response.json()
        new_mentor = None
        for m in mentors:
            if m.get("id") != original_mentor_id and m.get("is_active", True):
                new_mentor = m
                break
        
        if not new_mentor:
            pytest.skip("No other active mentor found for reassignment")
        
        new_mentor_id = new_mentor["id"]
        new_mentor_name = new_mentor.get("full_name")
        print(f"New mentor: {new_mentor_name} (id={new_mentor_id[:8]}...)")
        
        # Step 3: Perform reassignment
        reassign_response = requests.post(
            f"{BASE_URL}/api/students/{student_id}/reassign-mentor?new_mentor_id={new_mentor_id}",
            headers=auth_headers
        )
        assert reassign_response.status_code == 200, \
            f"Reassignment failed: {reassign_response.text}"
        
        updated_student = reassign_response.json()
        
        # Step 4: Verify mentor_id and mentor_name updated
        assert updated_student.get("mentor_id") == new_mentor_id, \
            f"mentor_id not updated: expected {new_mentor_id}, got {updated_student.get('mentor_id')}"
        assert updated_student.get("mentor_name") == new_mentor_name, \
            f"mentor_name not updated: expected {new_mentor_name}, got {updated_student.get('mentor_name')}"
        
        print(f"SUCCESS: Student reassigned from {original_mentor_name} to {new_mentor_name}")
        
        # Step 5: Verify by fetching student from list endpoint
        verify_response = requests.get(
            f"{BASE_URL}/api/students?search={student_name[:10]}",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        verified_students = verify_response.json()
        verified_student = next((s for s in verified_students if s["id"] == student_id), None)
        
        if verified_student:
            assert verified_student.get("mentor_id") == new_mentor_id
            assert verified_student.get("mentor_name") == new_mentor_name
            print(f"VERIFIED: Student now has mentor {verified_student.get('mentor_name')}")
        
        # Step 6: Reassign back to original mentor (cleanup)
        if original_mentor_id:
            cleanup_response = requests.post(
                f"{BASE_URL}/api/students/{student_id}/reassign-mentor?new_mentor_id={original_mentor_id}",
                headers=auth_headers
            )
            if cleanup_response.status_code == 200:
                print(f"CLEANUP: Student reassigned back to {original_mentor_name}")
            else:
                print(f"CLEANUP WARNING: Could not reassign back: {cleanup_response.text}")


class TestMentorRoleValidation:
    """Test that reassignment works with different mentor roles"""
    
    def test_get_all_mentor_roles(self, auth_headers):
        """Check what roles are considered 'mentors' in the system"""
        # Get users with mentor-related roles
        mentor_roles = ["mentor", "master_of_academics", "academic_master"]
        
        for role in mentor_roles:
            response = requests.get(f"{BASE_URL}/api/users?role={role}", headers=auth_headers)
            if response.status_code == 200:
                users = response.json()
                print(f"Role '{role}': {len(users)} users")
                for u in users[:3]:
                    print(f"  - {u.get('full_name')} (id={u.get('id')[:8]}...)")
    
    def test_reassign_to_master_of_academics(self, auth_headers):
        """Test if we can reassign to a master_of_academics user (Edwin)"""
        # Get a student
        students_response = requests.get(
            f"{BASE_URL}/api/students?activated_only=true&limit=10",
            headers=auth_headers
        )
        assert students_response.status_code == 200
        
        students = students_response.json()
        test_student = None
        for s in students:
            if s.get("mentor_id") and s.get("mentor_id") != EDWIN_USER_ID:
                test_student = s
                break
        
        if not test_student:
            pytest.skip("No suitable student found for master_of_academics reassignment test")
        
        student_id = test_student["id"]
        original_mentor_id = test_student.get("mentor_id")
        
        # Try to reassign to Edwin (master_of_academics)
        response = requests.post(
            f"{BASE_URL}/api/students/{student_id}/reassign-mentor?new_mentor_id={EDWIN_USER_ID}",
            headers=auth_headers
        )
        
        # This might fail if the endpoint only looks for role="mentor"
        if response.status_code == 404 and "Mentor not found" in response.text:
            print(f"BUG FOUND: Cannot reassign to master_of_academics role (Edwin)")
            print(f"The endpoint only looks for role='mentor', not 'master_of_academics'")
            pytest.fail("Reassign endpoint doesn't support master_of_academics role")
        
        assert response.status_code == 200, f"Reassignment failed: {response.text}"
        
        # Cleanup - reassign back
        if original_mentor_id:
            requests.post(
                f"{BASE_URL}/api/students/{student_id}/reassign-mentor?new_mentor_id={original_mentor_id}",
                headers=auth_headers
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
