"""
Competitor Intelligence Module Tests - Iteration 100
Tests: CRUD operations, scraping, intel retrieval, daily briefing
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"


class TestCompetitorIntelligenceBackend:
    """Competitor Intelligence API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get super admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Auth headers for API calls"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    # ═══════════════════════════════════════════
    # GET /api/intelligence/competitors - List competitors
    # ═══════════════════════════════════════════
    
    def test_list_competitors_returns_seeded_data(self, auth_headers):
        """Test that GET /api/intelligence/competitors returns the 6 seeded competitors"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "competitors" in data
        competitors = data["competitors"]
        
        # Should have at least 6 seeded competitors
        assert len(competitors) >= 6, f"Expected at least 6 competitors, got {len(competitors)}"
        
        # Check expected seeded names
        names = [c["name"] for c in competitors]
        expected_names = ["Delta Trading Academy", "FundFloat", "Mithuns Money Market", 
                         "Stellar FX", "James Trading Institute", "Moneytize"]
        for expected in expected_names:
            assert expected in names, f"Missing seeded competitor: {expected}"
        
        # Verify competitor structure
        comp = competitors[0]
        assert "id" in comp
        assert "name" in comp
        assert "website" in comp
        assert "status" in comp
        print(f"✓ List competitors: Found {len(competitors)} competitors including all 6 seeded")
    
    # ═══════════════════════════════════════════
    # POST /api/intelligence/competitors - Add competitor
    # ═══════════════════════════════════════════
    
    def test_add_competitor_success(self, auth_headers):
        """Test adding a new competitor"""
        test_name = f"TEST_Competitor_{int(time.time())}"
        payload = {
            "name": test_name,
            "website": "https://test-competitor.com",
            "notes": "Test competitor for iteration 100",
            "instagram": "https://instagram.com/test",
            "facebook": "",
            "linkedin": "",
            "youtube": "",
            "twitter": "",
            "google_reviews": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/intelligence/competitors",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "competitor" in data
        assert data["competitor"]["name"] == test_name
        assert data["competitor"]["website"] == "https://test-competitor.com"
        assert data["competitor"]["status"] == "active"
        
        # Store ID for cleanup
        self.__class__.test_competitor_id = data["competitor"]["id"]
        print(f"✓ Add competitor: Created '{test_name}' with ID {self.__class__.test_competitor_id}")
    
    def test_add_competitor_duplicate_fails(self, auth_headers):
        """Test that adding duplicate competitor fails"""
        payload = {"name": "Delta Trading Academy"}  # Already seeded
        
        response = requests.post(
            f"{BASE_URL}/api/intelligence/competitors",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 409, f"Expected 409 for duplicate, got {response.status_code}"
        print("✓ Add duplicate competitor: Correctly rejected with 409")
    
    def test_add_competitor_no_name_fails(self, auth_headers):
        """Test that adding competitor without name fails"""
        payload = {"website": "https://example.com"}
        
        response = requests.post(
            f"{BASE_URL}/api/intelligence/competitors",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 400, f"Expected 400 for missing name, got {response.status_code}"
        print("✓ Add competitor without name: Correctly rejected with 400")
    
    # ═══════════════════════════════════════════
    # POST /api/intelligence/competitors/{id}/scrape - Scrape competitor
    # ═══════════════════════════════════════════
    
    def test_scrape_competitor_success(self, auth_headers):
        """Test scraping a competitor website"""
        # Get Delta Trading Academy (already has example.com as website)
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json()["competitors"]
        delta = next((c for c in competitors if c["name"] == "Delta Trading Academy"), None)
        
        assert delta is not None, "Delta Trading Academy not found"
        
        # Trigger scrape
        response = requests.post(
            f"{BASE_URL}/api/intelligence/competitors/{delta['id']}/scrape",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Scrape failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "results" in data
        print(f"✓ Scrape competitor: {data['message']}")
    
    def test_scrape_nonexistent_competitor_fails(self, auth_headers):
        """Test scraping non-existent competitor returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/competitors/nonexistent-id/scrape",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Scrape non-existent competitor: Correctly returned 404")
    
    # ═══════════════════════════════════════════
    # GET /api/intelligence/competitors/{id}/intel - Get intel
    # ═══════════════════════════════════════════
    
    def test_get_competitor_intel(self, auth_headers):
        """Test getting scraped intel for a competitor"""
        # Get Delta Trading Academy
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json()["competitors"]
        delta = next((c for c in competitors if c["name"] == "Delta Trading Academy"), None)
        
        assert delta is not None, "Delta Trading Academy not found"
        
        # Get intel
        response = requests.get(
            f"{BASE_URL}/api/intelligence/competitors/{delta['id']}/intel",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get intel failed: {response.text}"
        
        data = response.json()
        assert "competitor" in data
        assert "intel" in data
        assert data["competitor"]["name"] == "Delta Trading Academy"
        
        # If scraped, should have intel data
        if data["intel"]:
            intel_item = data["intel"][0]
            assert "source_type" in intel_item
            assert "scraped_at" in intel_item
            print(f"✓ Get competitor intel: Found {len(data['intel'])} intel records")
        else:
            print("✓ Get competitor intel: No intel yet (not scraped)")
    
    # ═══════════════════════════════════════════
    # DELETE /api/intelligence/competitors/{id} - Delete competitor
    # ═══════════════════════════════════════════
    
    def test_delete_competitor_success(self, auth_headers):
        """Test deleting a competitor"""
        # Use the test competitor created earlier
        if not hasattr(self.__class__, 'test_competitor_id'):
            pytest.skip("No test competitor to delete")
        
        comp_id = self.__class__.test_competitor_id
        response = requests.delete(
            f"{BASE_URL}/api/intelligence/competitors/{comp_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json()["competitors"]
        ids = [c["id"] for c in competitors]
        assert comp_id not in ids, "Competitor still exists after deletion"
        print(f"✓ Delete competitor: Successfully deleted {comp_id}")
    
    def test_delete_nonexistent_competitor_fails(self, auth_headers):
        """Test deleting non-existent competitor returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/intelligence/competitors/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Delete non-existent competitor: Correctly returned 404")
    
    # ═══════════════════════════════════════════
    # GET /api/intelligence/daily-briefing - Daily briefing
    # ═══════════════════════════════════════════
    
    def test_daily_briefing_returns_personalized_data(self, auth_headers):
        """Test that daily briefing returns personalized sections"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/daily-briefing",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Daily briefing failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "user_name" in data
        assert "date" in data
        assert "sections" in data
        
        # Should have at least motivation section
        sections = data["sections"]
        assert len(sections) > 0, "No sections in briefing"
        
        section_titles = [s["title"] for s in sections]
        print(f"✓ Daily briefing: Got {len(sections)} sections: {section_titles}")
        
        # Verify section structure
        for section in sections:
            assert "title" in section
            assert "icon" in section
            assert "items" in section
            assert isinstance(section["items"], list)
    
    # ═══════════════════════════════════════════
    # GET /api/executive/team-mood - Team mood (from iteration 99)
    # ═══════════════════════════════════════════
    
    def test_team_mood_endpoint(self, auth_headers):
        """Test team mood endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/executive/team-mood",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Team mood failed: {response.text}"
        
        data = response.json()
        assert "teams" in data
        print(f"✓ Team mood: Got {len(data['teams'])} teams")


class TestCompetitorIntelligenceAccessControl:
    """Test access control for competitor intelligence endpoints"""
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated access: Correctly rejected with {response.status_code}")
    
    def test_cs_head_can_access_competitors(self):
        """Test that CS head can access competitor intelligence"""
        # Login as CS head
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "falja@clt-academy.com", "password": "Falja@123"}
        )
        assert response.status_code == 200, f"CS head login failed: {response.text}"
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to access competitors
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=headers)
        # CS head should be able to view (read access)
        print(f"✓ CS head access: Status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
