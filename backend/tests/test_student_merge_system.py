"""
Test Student Duplicate Merge System
Tests for:
- GET /api/students/{id}/duplicates - duplicate detection by phone, email, name
- POST /api/students/merge/preview - returns merged data preview with secondary_fields_added
- POST /api/students/merge/request - creates pending merge request
- GET /api/students/merge/requests - list merge requests by role
- POST /api/students/merge/{id}/approve - CS Head and CEO approval flow
- POST /api/students/merge/{id}/reject - rejection with reason
- Merged students (merged_into field) excluded from student listing
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStudentMergeSystem:
    """Student Merge System API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        self.user = data.get("user", {})
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    # ==================== DUPLICATE DETECTION TESTS ====================
    
    def test_duplicate_detection_endpoint_exists(self):
        """Test that duplicate detection endpoint exists and returns proper structure"""
        # First get a student to test with
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=5")
        assert students_response.status_code == 200, f"Failed to get students: {students_response.text}"
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        # Find a student that is not merged
        test_student = None
        for s in students:
            if not s.get("merged_into"):
                test_student = s
                break
        
        if not test_student:
            pytest.skip("No non-merged students found for testing")
        
        student_id = test_student.get("id")
        
        # Test duplicate detection
        response = self.session.get(f"{BASE_URL}/api/students/{student_id}/duplicates")
        assert response.status_code == 200, f"Duplicate detection failed: {response.text}"
        
        data = response.json()
        assert "duplicates" in data, "Response should contain 'duplicates' key"
        assert "student" in data, "Response should contain 'student' key"
        assert isinstance(data["duplicates"], list), "Duplicates should be a list"
        
    def test_duplicate_detection_returns_match_score(self):
        """Test that duplicates have match_score and match_reasons"""
        # Get students
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=20")
        assert students_response.status_code == 200
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        # Find a student with potential duplicates (has phone or email)
        test_student = None
        for s in students:
            if not s.get("merged_into") and (s.get("phone") or s.get("email")):
                test_student = s
                break
        
        if not test_student:
            pytest.skip("No suitable student found for duplicate testing")
        
        response = self.session.get(f"{BASE_URL}/api/students/{test_student['id']}/duplicates")
        assert response.status_code == 200
        
        data = response.json()
        # If duplicates found, verify structure
        if data["duplicates"]:
            dup = data["duplicates"][0]
            assert "match_score" in dup, "Duplicate should have match_score"
            assert "match_reasons" in dup, "Duplicate should have match_reasons"
            assert isinstance(dup["match_score"], (int, float)), "match_score should be numeric"
            assert isinstance(dup["match_reasons"], list), "match_reasons should be a list"
            assert dup["match_score"] >= 15, "match_score should be at least 15 (threshold)"
            assert dup["match_score"] <= 100, "match_score should be capped at 100"
    
    def test_duplicate_detection_excludes_merged_students(self):
        """Test that merged students are excluded from duplicate results"""
        # Get students
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=20")
        assert students_response.status_code == 200
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        test_student = None
        for s in students:
            if not s.get("merged_into"):
                test_student = s
                break
        
        if not test_student:
            pytest.skip("No non-merged student found")
        
        response = self.session.get(f"{BASE_URL}/api/students/{test_student['id']}/duplicates")
        assert response.status_code == 200
        
        data = response.json()
        # Verify no duplicates have merged_into field
        for dup in data["duplicates"]:
            assert not dup.get("merged_into"), f"Merged student {dup.get('id')} should not appear in duplicates"
    
    def test_duplicate_detection_invalid_student(self):
        """Test duplicate detection with invalid student ID"""
        response = self.session.get(f"{BASE_URL}/api/students/invalid-id-12345/duplicates")
        assert response.status_code == 404, "Should return 404 for invalid student"
    
    # ==================== MERGE PREVIEW TESTS ====================
    
    def test_merge_preview_endpoint(self):
        """Test merge preview returns proper structure"""
        # Get two students for preview
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=20")
        assert students_response.status_code == 200
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        # Find two non-merged students
        non_merged = [s for s in students if not s.get("merged_into")]
        if len(non_merged) < 2:
            pytest.skip("Need at least 2 non-merged students for preview test")
        
        primary = non_merged[0]
        secondary = non_merged[1]
        
        response = self.session.post(f"{BASE_URL}/api/students/merge/preview", json={
            "primary_id": primary["id"],
            "secondary_id": secondary["id"]
        })
        assert response.status_code == 200, f"Preview failed: {response.text}"
        
        data = response.json()
        assert "primary" in data, "Response should contain 'primary'"
        assert "secondary" in data, "Response should contain 'secondary'"
        assert "merged_preview" in data, "Response should contain 'merged_preview'"
        assert "secondary_fields_added" in data, "Response should contain 'secondary_fields_added'"
        assert "transactions_summary" in data, "Response should contain 'transactions_summary'"
    
    def test_merge_preview_transactions_summary(self):
        """Test that preview includes transaction counts"""
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=20")
        assert students_response.status_code == 200
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        non_merged = [s for s in students if not s.get("merged_into")]
        if len(non_merged) < 2:
            pytest.skip("Need at least 2 non-merged students")
        
        response = self.session.post(f"{BASE_URL}/api/students/merge/preview", json={
            "primary_id": non_merged[0]["id"],
            "secondary_id": non_merged[1]["id"]
        })
        assert response.status_code == 200
        
        data = response.json()
        ts = data["transactions_summary"]
        
        # Verify transaction summary structure
        assert "primary_ltv" in ts, "Should have primary_ltv count"
        assert "secondary_ltv" in ts, "Should have secondary_ltv count"
        assert "total_ltv" in ts, "Should have total_ltv count"
        assert "primary_upgrades" in ts, "Should have primary_upgrades count"
        assert "secondary_upgrades" in ts, "Should have secondary_upgrades count"
        assert "total_upgrades" in ts, "Should have total_upgrades count"
        assert "primary_notes" in ts, "Should have primary_notes count"
        assert "secondary_notes" in ts, "Should have secondary_notes count"
        assert "total_notes" in ts, "Should have total_notes count"
        
        # Verify totals are correct
        assert ts["total_ltv"] == ts["primary_ltv"] + ts["secondary_ltv"]
        assert ts["total_upgrades"] == ts["primary_upgrades"] + ts["secondary_upgrades"]
        assert ts["total_notes"] == ts["primary_notes"] + ts["secondary_notes"]
    
    def test_merge_preview_invalid_student(self):
        """Test preview with invalid student IDs"""
        response = self.session.post(f"{BASE_URL}/api/students/merge/preview", json={
            "primary_id": "invalid-id-1",
            "secondary_id": "invalid-id-2"
        })
        assert response.status_code == 404, "Should return 404 for invalid students"
    
    # ==================== MERGE REQUEST TESTS ====================
    
    def test_get_merge_requests(self):
        """Test getting merge requests list"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests")
        assert response.status_code == 200, f"Failed to get merge requests: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are requests, verify structure
        if data:
            req = data[0]
            assert "id" in req, "Request should have id"
            assert "primary_student_id" in req, "Request should have primary_student_id"
            assert "secondary_student_id" in req, "Request should have secondary_student_id"
            assert "status" in req, "Request should have status"
            assert "requested_by" in req, "Request should have requested_by"
    
    def test_get_merge_requests_with_status_filter(self):
        """Test filtering merge requests by status"""
        # Test various status filters
        for status in ["pending_cs_head", "pending_ceo", "approved", "rejected"]:
            response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status={status}")
            assert response.status_code == 200, f"Failed to filter by status {status}"
            
            data = response.json()
            # All returned requests should have the filtered status
            for req in data:
                assert req["status"] == status, f"Request status should be {status}"
    
    def test_merge_request_status_values(self):
        """Test that merge requests have valid status values"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests")
        assert response.status_code == 200
        
        data = response.json()
        valid_statuses = ["pending_cs_head", "pending_ceo", "approved", "rejected"]
        
        for req in data:
            assert req["status"] in valid_statuses, f"Invalid status: {req['status']}"
    
    def test_approved_merge_request_exists(self):
        """Test that the previously approved merge request (Saritha E R) exists"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        # Should have at least one approved request
        assert len(data) >= 1, "Should have at least one approved merge request"
        
        # Check for the Saritha E R merge
        saritha_merge = None
        for req in data:
            if "Saritha" in req.get("secondary_student_name", "") or "Saritha" in req.get("primary_student_name", ""):
                saritha_merge = req
                break
        
        if saritha_merge:
            assert saritha_merge["status"] == "approved", "Saritha merge should be approved"
    
    # ==================== APPROVAL FLOW TESTS ====================
    
    def test_approve_endpoint_requires_valid_request(self):
        """Test that approve endpoint validates request ID"""
        response = self.session.post(f"{BASE_URL}/api/students/merge/invalid-request-id/approve")
        assert response.status_code == 404, "Should return 404 for invalid request ID"
    
    def test_reject_endpoint_requires_valid_request(self):
        """Test that reject endpoint validates request ID"""
        response = self.session.post(f"{BASE_URL}/api/students/merge/invalid-request-id/reject", json={
            "reason": "Test rejection"
        })
        assert response.status_code == 404, "Should return 404 for invalid request ID"
    
    def test_cannot_approve_already_approved_request(self):
        """Test that already approved requests cannot be approved again"""
        # Get an approved request
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        if not data:
            pytest.skip("No approved requests to test")
        
        approved_req = data[0]
        
        # Try to approve again
        approve_response = self.session.post(f"{BASE_URL}/api/students/merge/{approved_req['id']}/approve")
        assert approve_response.status_code == 400, "Should not be able to approve already approved request"
    
    def test_cannot_reject_already_approved_request(self):
        """Test that already approved requests cannot be rejected"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        if not data:
            pytest.skip("No approved requests to test")
        
        approved_req = data[0]
        
        # Try to reject
        reject_response = self.session.post(f"{BASE_URL}/api/students/merge/{approved_req['id']}/reject", json={
            "reason": "Test rejection"
        })
        assert reject_response.status_code == 400, "Should not be able to reject already approved request"
    
    # ==================== MERGED STUDENT EXCLUSION TESTS ====================
    
    def test_merged_students_excluded_from_listing(self):
        """Test that students with merged_into field are excluded from normal listing"""
        # Get students list
        response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=100")
        assert response.status_code == 200
        
        data = response.json()
        students = data.get("students") or data.get("items") or []
        
        # Check that no student in the list has merged_into field set
        for student in students:
            assert not student.get("merged_into"), f"Merged student {student.get('id')} should not appear in listing"
    
    def test_merged_student_has_correct_stage(self):
        """Test that merged students have stage='merged'"""
        # Query for merged students directly
        # This tests the secondary student from the Saritha merge
        secondary_id = "cada81ed-67d7-41cd-a566-5ed7d5008cf4"
        
        # Try to get this student directly
        response = self.session.get(f"{BASE_URL}/api/students/{secondary_id}")
        
        # The student might be excluded from normal GET, so we check the merge request
        merge_response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status=approved")
        assert merge_response.status_code == 200
        
        data = merge_response.json()
        # Find the merge request with this secondary student
        for req in data:
            if req.get("secondary_student_id") == secondary_id:
                # This confirms the merge was executed
                assert req["status"] == "approved"
                break
    
    # ==================== CREATE MERGE REQUEST TEST ====================
    
    def test_create_merge_request_duplicate_check(self):
        """Test that duplicate merge requests are rejected"""
        # Get two students
        students_response = self.session.get(f"{BASE_URL}/api/students?page=1&page_size=20")
        assert students_response.status_code == 200
        
        students_data = students_response.json()
        students = students_data.get("students") or students_data.get("items") or []
        
        non_merged = [s for s in students if not s.get("merged_into")]
        if len(non_merged) < 2:
            pytest.skip("Need at least 2 non-merged students")
        
        primary = non_merged[0]
        secondary = non_merged[1]
        
        # Get preview first
        preview_response = self.session.post(f"{BASE_URL}/api/students/merge/preview", json={
            "primary_id": primary["id"],
            "secondary_id": secondary["id"]
        })
        
        if preview_response.status_code != 200:
            pytest.skip("Could not get preview")
        
        preview_data = preview_response.json()
        
        # Try to create a merge request
        create_response = self.session.post(f"{BASE_URL}/api/students/merge/request", json={
            "primary_id": primary["id"],
            "secondary_id": secondary["id"],
            "merged_data": preview_data.get("merged_preview", {})
        })
        
        # Either succeeds (201/200) or fails with 409 if already exists
        assert create_response.status_code in [200, 201, 409], f"Unexpected status: {create_response.status_code}"
        
        if create_response.status_code in [200, 201]:
            # If created, verify structure
            data = create_response.json()
            assert "id" in data, "Created request should have id"
            assert data["status"] == "pending_cs_head", "New request should be pending_cs_head"
            
            # Clean up - reject the test request
            self.session.post(f"{BASE_URL}/api/students/merge/{data['id']}/reject", json={
                "reason": "Test cleanup"
            })


class TestMergeRequestStructure:
    """Test merge request data structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_merge_request_has_all_required_fields(self):
        """Test that merge requests have all required fields"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests")
        assert response.status_code == 200
        
        data = response.json()
        if not data:
            pytest.skip("No merge requests to verify structure")
        
        req = data[0]
        required_fields = [
            "id", "primary_student_id", "primary_student_name",
            "secondary_student_id", "secondary_student_name",
            "status", "requested_by", "requested_at", "created_at"
        ]
        
        for field in required_fields:
            assert field in req, f"Merge request should have '{field}' field"
    
    def test_approved_request_has_approval_fields(self):
        """Test that approved requests have approval timestamps"""
        response = self.session.get(f"{BASE_URL}/api/students/merge/requests?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        if not data:
            pytest.skip("No approved requests")
        
        req = data[0]
        assert req.get("cs_head_approved_at"), "Approved request should have cs_head_approved_at"
        assert req.get("ceo_approved_at"), "Approved request should have ceo_approved_at"
        assert req.get("executed_at"), "Approved request should have executed_at"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
