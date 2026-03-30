"""
Iteration 105 - BD/Mentor CRM Tabbed Modals + Ad Intelligence Feature Tests
Tests:
1. BD CRM modal tabbed layout (Info, Transactions, Calls, Update tabs)
2. Mentor CRM modal tabbed layout (Info, Transactions, Calls, Update tabs)
3. Color tag picker in both modals
4. Ad Intelligence APIs (search, saved searches, token status)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestAuth:
    """Authentication for testing"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Auth returns 'access_token' not 'token'
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestAdIntelligenceAPIs(TestAuth):
    """Test Ad Intelligence backend APIs"""
    
    def test_meta_ad_token_status(self, auth_headers):
        """GET /api/settings/meta-ad-token-status should return configured status"""
        response = requests.get(f"{BASE_URL}/api/settings/meta-ad-token-status", headers=auth_headers)
        assert response.status_code == 200, f"Token status failed: {response.text}"
        data = response.json()
        assert "configured" in data, f"Missing 'configured' field: {data}"
        # Should be False since no token is configured
        print(f"Meta Ad Token Status: configured={data.get('configured')}")
    
    def test_ad_library_search(self, auth_headers):
        """POST /api/intelligence/ad-library/search should accept search_terms and return results"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/ad-library/search",
            headers=auth_headers,
            json={"search_terms": "forex trading", "country": "AE", "limit": 10}
        )
        assert response.status_code == 200, f"Ad search failed: {response.text}"
        data = response.json()
        assert "search_terms" in data, f"Missing search_terms: {data}"
        assert "ads_count" in data or "ads" in data, f"Missing ads data: {data}"
        assert "source" in data, f"Missing source field: {data}"
        print(f"Ad Search Result: {data.get('ads_count', 0)} ads found, source={data.get('source')}")
    
    def test_ad_library_search_empty_terms_fails(self, auth_headers):
        """POST /api/intelligence/ad-library/search with empty terms should fail"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/ad-library/search",
            headers=auth_headers,
            json={"search_terms": "", "country": "AE"}
        )
        assert response.status_code == 400, f"Expected 400 for empty search: {response.status_code}"
    
    def test_get_saved_ad_searches(self, auth_headers):
        """GET /api/intelligence/ad-library/searches should return saved searches"""
        response = requests.get(f"{BASE_URL}/api/intelligence/ad-library/searches", headers=auth_headers)
        assert response.status_code == 200, f"Get searches failed: {response.text}"
        data = response.json()
        assert "searches" in data, f"Missing 'searches' field: {data}"
        print(f"Saved Searches: {len(data.get('searches', []))} searches found")
    
    def test_ad_library_analyze(self, auth_headers):
        """POST /api/intelligence/ad-library/analyze should analyze ads"""
        # First do a search to have data
        requests.post(
            f"{BASE_URL}/api/intelligence/ad-library/search",
            headers=auth_headers,
            json={"search_terms": "trading academy", "country": "AE", "limit": 5}
        )
        
        # Then analyze
        response = requests.post(
            f"{BASE_URL}/api/intelligence/ad-library/analyze",
            headers=auth_headers,
            json={"search_terms": "trading academy"}
        )
        # May return 200 with error if no ads found, or 200 with analysis
        assert response.status_code == 200, f"Analyze failed: {response.text}"
        data = response.json()
        # Should have either analysis or error
        assert "analysis" in data or "error" in data or "analyzed_at" in data, f"Unexpected response: {data}"
        print(f"Ad Analysis: {data.keys()}")


class TestBDCRMAPIs(TestAuth):
    """Test BD CRM APIs for modal data"""
    
    def test_bd_students_list(self, auth_headers):
        """GET /api/bd/students should return students"""
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=auth_headers)
        assert response.status_code == 200, f"BD students failed: {response.text}"
        data = response.json()
        # Should have items or be a list
        items = data.get("items") if isinstance(data, dict) else data
        print(f"BD Students: {len(items) if items else 0} students found")
    
    def test_bd_agents_list(self, auth_headers):
        """GET /api/bd/agents should return BD agents"""
        response = requests.get(f"{BASE_URL}/api/bd/agents", headers=auth_headers)
        assert response.status_code == 200, f"BD agents failed: {response.text}"
        data = response.json()
        print(f"BD Agents: {len(data) if isinstance(data, list) else 'N/A'}")
    
    def test_bd_dashboard(self, auth_headers):
        """GET /api/bd/dashboard should return dashboard data"""
        response = requests.get(f"{BASE_URL}/api/bd/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"BD dashboard failed: {response.text}"
        data = response.json()
        print(f"BD Dashboard: {data.keys()}")


class TestMentorCRMAPIs(TestAuth):
    """Test Mentor CRM APIs for modal data"""
    
    def test_mentor_students_list(self, auth_headers):
        """GET /api/students should return students with mentor data"""
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"activated_only": True, "page": 1, "page_size": 10}
        )
        assert response.status_code == 200, f"Students failed: {response.text}"
        data = response.json()
        items = data.get("items") if isinstance(data, dict) else data
        print(f"Mentor Students: {len(items) if items else 0} students found")
    
    def test_mentor_revenue_summary(self, auth_headers):
        """GET /api/mentor/revenue-summary should return revenue data"""
        response = requests.get(f"{BASE_URL}/api/mentor/revenue-summary", headers=auth_headers)
        assert response.status_code == 200, f"Revenue summary failed: {response.text}"
        data = response.json()
        print(f"Mentor Revenue Summary: {data.keys()}")


class TestColorTagAPI(TestAuth):
    """Test color tag update API"""
    
    def test_color_tag_update(self, auth_headers):
        """PATCH /api/students/{id}/color-tag should update color tag"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        items = data.get("items") if isinstance(data, dict) else data
        
        if items and len(items) > 0:
            student_id = items[0].get("id")
            # Update color tag
            response = requests.patch(
                f"{BASE_URL}/api/students/{student_id}/color-tag",
                headers=auth_headers,
                json={"color_tag": "vip"}
            )
            # Should succeed or return 200
            assert response.status_code in [200, 201], f"Color tag update failed: {response.text}"
            print(f"Color tag updated for student {student_id}")
            
            # Clear the tag
            requests.patch(
                f"{BASE_URL}/api/students/{student_id}/color-tag",
                headers=auth_headers,
                json={"color_tag": None}
            )
        else:
            pytest.skip("No students found to test color tag")


class TestTransactionHistoryAPI(TestAuth):
    """Test transaction history API used in modals"""
    
    def test_student_transactions(self, auth_headers):
        """GET /api/students/{id}/transactions should return transactions"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        items = data.get("items") if isinstance(data, dict) else data
        
        if items and len(items) > 0:
            student_id = items[0].get("id")
            response = requests.get(
                f"{BASE_URL}/api/students/{student_id}/transactions",
                headers=auth_headers
            )
            # Should return 200 even if empty
            assert response.status_code == 200, f"Transactions failed: {response.text}"
            print(f"Transactions for student {student_id}: {response.json()}")
        else:
            pytest.skip("No students found to test transactions")


class TestStudentNotesAPI(TestAuth):
    """Test student notes API used in Calls tab"""
    
    def test_student_notes(self, auth_headers):
        """GET /api/students/{id}/notes should return notes"""
        # First get a student
        response = requests.get(
            f"{BASE_URL}/api/students",
            headers=auth_headers,
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        data = response.json()
        items = data.get("items") if isinstance(data, dict) else data
        
        if items and len(items) > 0:
            student_id = items[0].get("id")
            response = requests.get(
                f"{BASE_URL}/api/students/{student_id}/notes",
                headers=auth_headers
            )
            # Should return 200 even if empty
            assert response.status_code == 200, f"Notes failed: {response.text}"
            print(f"Notes for student {student_id}: {type(response.json())}")
        else:
            pytest.skip("No students found to test notes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
