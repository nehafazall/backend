"""
Test CS Kanban UI Overhaul Features:
- GET /api/students/stage-summary - Summary status bar
- GET /api/students/upgrade-shadows - Shadow cards from cs_upgrades
- PATCH /api/students/{id}/color-tag - Color tag API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
CS_HEAD_CREDS = {"email": "falja@clt-academy.com", "password": "Falja@123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS Head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CS_HEAD_CREDS)
    assert response.status_code == 200, f"CS Head login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_student_id(admin_token):
    """Get a test student ID for color tag testing"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/api/students?page_size=1&stage=new_student", headers=headers)
    if response.status_code == 200:
        data = response.json()
        items = data.get("items", data if isinstance(data, list) else [])
        if items:
            return items[0]["id"]
    # Fallback: get any student
    response = requests.get(f"{BASE_URL}/api/students?page_size=1", headers=headers)
    if response.status_code == 200:
        data = response.json()
        items = data.get("items", data if isinstance(data, list) else [])
        if items:
            return items[0]["id"]
    pytest.skip("No students available for testing")


class TestStageSummaryEndpoint:
    """Tests for GET /api/students/stage-summary"""
    
    def test_stage_summary_returns_200(self, admin_token):
        """Stage summary endpoint returns 200 OK"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_stage_summary_response_structure(self, admin_token):
        """Stage summary returns expected fields: stage_counts, total_students, period_upgrades, period_revenue"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "stage_counts" in data, "Missing stage_counts field"
        assert "total_students" in data, "Missing total_students field"
        assert "period_upgrades" in data, "Missing period_upgrades field"
        assert "period_revenue" in data, "Missing period_revenue field"
        
        # Verify types
        assert isinstance(data["stage_counts"], dict), "stage_counts should be a dict"
        assert isinstance(data["total_students"], int), "total_students should be an int"
        assert isinstance(data["period_upgrades"], int), "period_upgrades should be an int"
        assert isinstance(data["period_revenue"], (int, float)), "period_revenue should be numeric"
    
    def test_stage_summary_with_date_filter(self, admin_token):
        """Stage summary accepts date_from and date_to parameters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/stage-summary?date_from=2026-03-01&date_to=2026-03-31",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period_revenue" in data
    
    def test_stage_summary_with_cs_agent_filter(self, admin_token):
        """Stage summary accepts cs_agent_id parameter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # First get a CS agent ID
        users_response = requests.get(f"{BASE_URL}/api/users?department=Customer%20Service", headers=headers)
        if users_response.status_code == 200 and users_response.json():
            cs_agent_id = users_response.json()[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/students/stage-summary?cs_agent_id={cs_agent_id}",
                headers=headers
            )
            assert response.status_code == 200
    
    def test_stage_summary_cs_head_access(self, cs_head_token):
        """CS Head can access stage summary"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/students/stage-summary", headers=headers)
        assert response.status_code == 200


class TestUpgradeShadowsEndpoint:
    """Tests for GET /api/students/upgrade-shadows"""
    
    def test_upgrade_shadows_returns_200(self, admin_token):
        """Upgrade shadows endpoint returns 200 OK"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_upgrade_shadows_response_structure(self, admin_token):
        """Upgrade shadows returns paginated response with shadow card items"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows?page_size=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination fields
        assert "items" in data, "Missing items field"
        assert "total" in data, "Missing total field"
        assert "page" in data, "Missing page field"
        assert "page_size" in data, "Missing page_size field"
        assert "total_pages" in data, "Missing total_pages field"
        
        # Verify items is a list
        assert isinstance(data["items"], list), "items should be a list"
    
    def test_upgrade_shadows_item_structure(self, admin_token):
        """Shadow card items have expected fields including is_shadow=true"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows?page_size=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["items"]:
            item = data["items"][0]
            # Verify shadow card fields
            assert "id" in item, "Shadow card missing id"
            assert item["id"].startswith("shadow_"), "Shadow card id should start with 'shadow_'"
            assert "is_shadow" in item, "Shadow card missing is_shadow field"
            assert item["is_shadow"] == True, "is_shadow should be True"
            assert "full_name" in item, "Shadow card missing full_name"
            assert "amount" in item, "Shadow card missing amount"
            assert "stage" in item, "Shadow card missing stage"
            assert item["stage"] == "upgraded", "Shadow card stage should be 'upgraded'"
    
    def test_upgrade_shadows_with_date_filter(self, admin_token):
        """Upgrade shadows accepts date_from and date_to parameters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/upgrade-shadows?date_from=2026-03-01&date_to=2026-03-31&page_size=100",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
    
    def test_upgrade_shadows_pagination(self, admin_token):
        """Upgrade shadows pagination works correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows?page=1&page_size=5", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert len(data["items"]) <= 5
    
    def test_upgrade_shadows_cs_head_access(self, cs_head_token):
        """CS Head can access upgrade shadows"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows", headers=headers)
        assert response.status_code == 200


class TestColorTagEndpoint:
    """Tests for PATCH /api/students/{id}/color-tag"""
    
    def test_set_color_tag_handle_with_care(self, admin_token, test_student_id):
        """Can set color_tag to handle_with_care"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "handle_with_care"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["color_tag"] == "handle_with_care"
    
    def test_set_color_tag_do_not_disturb(self, admin_token, test_student_id):
        """Can set color_tag to do_not_disturb"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "do_not_disturb"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color_tag"] == "do_not_disturb"
    
    def test_set_color_tag_vip(self, admin_token, test_student_id):
        """Can set color_tag to vip"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "vip"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color_tag"] == "vip"
    
    def test_set_color_tag_priority(self, admin_token, test_student_id):
        """Can set color_tag to priority"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "priority"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color_tag"] == "priority"
    
    def test_set_color_tag_follow_up(self, admin_token, test_student_id):
        """Can set color_tag to follow_up"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "follow_up"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color_tag"] == "follow_up"
    
    def test_clear_color_tag(self, admin_token, test_student_id):
        """Can clear color_tag by setting to null"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": None},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["color_tag"] is None
    
    def test_invalid_color_tag_rejected(self, admin_token, test_student_id):
        """Invalid color_tag values are rejected with 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "invalid_tag"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid tag, got {response.status_code}"
    
    def test_color_tag_nonexistent_student(self, admin_token):
        """Setting color_tag on nonexistent student returns 404"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/nonexistent-student-id-12345/color-tag",
            json={"color_tag": "vip"},
            headers=headers
        )
        assert response.status_code == 404
    
    def test_color_tag_cs_head_access(self, cs_head_token, test_student_id):
        """CS Head can set color tags"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "priority"},
            headers=headers
        )
        assert response.status_code == 200


class TestColorTagPersistence:
    """Tests to verify color tags persist and appear in student data"""
    
    def test_color_tag_persists_in_student_data(self, admin_token, test_student_id):
        """Color tag set via PATCH appears in GET student response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Set a color tag
        set_response = requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": "vip"},
            headers=headers
        )
        assert set_response.status_code == 200
        
        # Verify it appears in student list
        get_response = requests.get(
            f"{BASE_URL}/api/students?page_size=100",
            headers=headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        items = data.get("items", data if isinstance(data, list) else [])
        
        # Find our test student
        test_student = next((s for s in items if s["id"] == test_student_id), None)
        if test_student:
            assert test_student.get("color_tag") == "vip", f"Expected color_tag='vip', got {test_student.get('color_tag')}"
        
        # Clean up - clear the tag
        requests.patch(
            f"{BASE_URL}/api/students/{test_student_id}/color-tag",
            json={"color_tag": None},
            headers=headers
        )


class TestAuthenticationRequired:
    """Tests to verify endpoints require authentication"""
    
    def test_stage_summary_requires_auth(self):
        """Stage summary endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/students/stage-summary")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_upgrade_shadows_requires_auth(self):
        """Upgrade shadows endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/students/upgrade-shadows")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_color_tag_requires_auth(self):
        """Color tag endpoint requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/students/some-id/color-tag",
            json={"color_tag": "vip"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
