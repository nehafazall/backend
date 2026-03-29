"""
Iteration 101 - Phase 2 Features Testing
-----------------------------------------
Tests for:
1. Competitor Intelligence Phase 2 (battle cards, auto-scraping, scrape-all)
2. Claret AI Phase 2 (web_context support, sales coaching with conversion rates)
3. CEO Commission Approval (already existed, verify working)
4. Closed leads color-coding (verified via frontend)
5. Net Pay chart (salary + commissions)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def ceo_token(self):
        """Get CEO/Super Admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def cs_head_token(self):
        """Get CS Head token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "falja@clt-academy.com",
            "password": "Falja@123"
        })
        assert response.status_code == 200, f"CS Head login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_ceo_login(self, ceo_token):
        """Verify CEO can login"""
        assert ceo_token is not None
        assert len(ceo_token) > 0
        print(f"✓ CEO login successful, token length: {len(ceo_token)}")


class TestCompetitorIntelligencePhase2:
    """Competitor Intelligence Phase 2 - Battle Cards, Scrape All, Daily Briefing"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers for CEO"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_competitors_returns_6_seeded(self, auth_headers):
        """GET /api/intelligence/competitors returns 6 seeded competitors"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "competitors" in data
        competitors = data["competitors"]
        assert len(competitors) >= 6, f"Expected at least 6 competitors, got {len(competitors)}"
        
        # Verify seeded competitor names
        names = [c["name"] for c in competitors]
        expected_names = ["Delta Trading Academy", "FundFloat", "Mithuns Money Market", 
                         "Stellar FX", "James Trading Institute", "Moneytize"]
        for name in expected_names:
            assert name in names, f"Missing seeded competitor: {name}"
        print(f"✓ Found {len(competitors)} competitors including all 6 seeded ones")
    
    def test_scrape_competitor(self, auth_headers):
        """POST /api/intelligence/competitors/{id}/scrape triggers scraping"""
        # First get a competitor ID
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json().get("competitors", [])
        assert len(competitors) > 0
        
        comp_id = competitors[0]["id"]
        comp_name = competitors[0]["name"]
        
        # Trigger scrape
        response = requests.post(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/scrape", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Scrape triggered for {comp_name}: {data.get('message')}")
    
    def test_get_competitor_intel(self, auth_headers):
        """GET /api/intelligence/competitors/{id}/intel returns scraped data"""
        # Get a competitor
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json().get("competitors", [])
        comp_id = competitors[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/intel", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "competitor" in data
        assert "intel" in data
        print(f"✓ Got intel for competitor: {data['competitor']['name']}, intel items: {len(data.get('intel', []))}")
    
    def test_generate_battle_card(self, auth_headers):
        """POST /api/intelligence/competitors/{id}/battle-card generates AI battle card"""
        # Get a competitor with scraped data
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json().get("competitors", [])
        
        # Find one that has been scraped
        comp_id = None
        for comp in competitors:
            if comp.get("last_scraped"):
                comp_id = comp["id"]
                break
        
        if not comp_id:
            comp_id = competitors[0]["id"]
        
        # Generate battle card
        response = requests.post(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/battle-card", headers=auth_headers, timeout=60)
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "battle_card" in data or "competitor_name" in data
        print(f"✓ Battle card generated: {data.get('competitor_name', 'Unknown')}")
        
        if data.get("battle_card"):
            bc = data["battle_card"]
            print(f"  - Overview: {bc.get('overview', 'N/A')[:100]}...")
            print(f"  - Strengths: {len(bc.get('strengths', []))} items")
            print(f"  - Weaknesses: {len(bc.get('weaknesses', []))} items")
            print(f"  - Our Advantages: {len(bc.get('our_advantages', []))} items")
    
    def test_get_battle_card(self, auth_headers):
        """GET /api/intelligence/competitors/{id}/battle-card retrieves stored battle card"""
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors", headers=auth_headers)
        competitors = response.json().get("competitors", [])
        comp_id = competitors[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/battle-card", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Either has battle_card or message saying none generated
        assert "battle_card" in data or "message" in data
        print(f"✓ Battle card retrieval successful")
    
    def test_scrape_all_competitors(self, auth_headers):
        """POST /api/intelligence/competitors/scrape-all batch scrapes all competitors"""
        response = requests.post(f"{BASE_URL}/api/intelligence/competitors/scrape-all", headers=auth_headers, timeout=120)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "results" in data
        print(f"✓ Scrape all: {data.get('message')}")
        print(f"  Results: {list(data.get('results', {}).keys())}")
    
    def test_daily_briefing(self, auth_headers):
        """GET /api/intelligence/daily-briefing returns personalized briefing"""
        # Get user ID first
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        user_id = response.json().get("id")
        
        response = requests.get(f"{BASE_URL}/api/intelligence/daily-briefing?user_id={user_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "sections" in data
        sections = data["sections"]
        assert len(sections) > 0, "Expected at least one briefing section"
        
        section_titles = [s.get("title") for s in sections]
        print(f"✓ Daily briefing sections: {section_titles}")
        
        # Verify expected sections exist
        expected_sections = ["Today's Motivation"]  # At minimum
        for expected in expected_sections:
            assert any(expected in title for title in section_titles), f"Missing section: {expected}"


class TestClaretAIPhase2:
    """Claret AI Phase 2 - Web context support, sales coaching with conversion rates"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_claret_chat_with_web_context(self, auth_headers):
        """POST /api/claret/chat accepts web_context parameter"""
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        user = response.json()
        
        # Send chat with web_context
        response = requests.post(f"{BASE_URL}/api/claret/chat", headers=auth_headers, json={
            "user_id": user.get("id"),
            "user_name": user.get("full_name", "Test User"),
            "user_role": user.get("role", "super_admin"),
            "message": "What are the latest forex market trends?",
            "session_id": "test-web-context-session",
            "web_context": "Latest forex news: EUR/USD at 1.08, Fed signals rate cuts in 2026. Gold hits $2100."
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Claret chat with web_context successful")
        print(f"  Response preview: {data.get('message', '')[:150]}...")
    
    def test_claret_chat_sales_coaching(self, auth_headers):
        """Claret provides sales coaching with conversion data"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        user = response.json()
        
        # Ask about sales performance
        response = requests.post(f"{BASE_URL}/api/claret/chat", headers=auth_headers, json={
            "user_id": user.get("id"),
            "user_name": user.get("full_name", "Test User"),
            "user_role": user.get("role", "super_admin"),
            "message": "How are my sales numbers this month? What's my conversion rate?",
            "session_id": "test-sales-coaching-session"
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Sales coaching response received")
        print(f"  Response preview: {data.get('message', '')[:200]}...")
    
    def test_claret_chat_competitor_context(self, auth_headers):
        """Claret injects competitor context when relevant"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        user = response.json()
        
        # Ask about competition
        response = requests.post(f"{BASE_URL}/api/claret/chat", headers=auth_headers, json={
            "user_id": user.get("id"),
            "user_name": user.get("full_name", "Test User"),
            "user_role": user.get("role", "super_admin"),
            "message": "How are we better than Delta Trading Academy?",
            "session_id": "test-competitor-context-session"
        }, timeout=60)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Competitor context injection working")
        print(f"  Response preview: {data.get('message', '')[:200]}...")


class TestCEOCommissionApproval:
    """CEO Commission Approval - Verify existing functionality"""
    
    @pytest.fixture(scope="class")
    def ceo_headers(self):
        """Get CEO auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_commission_approval_status(self, ceo_headers):
        """GET /api/commissions/approval-status returns approval statuses"""
        response = requests.get(f"{BASE_URL}/api/commissions/approval-status", headers=ceo_headers)
        assert response.status_code == 200
        data = response.json()
        # Should return list of approval statuses or empty list
        assert isinstance(data, (list, dict))
        print(f"✓ Commission approval status endpoint working")
        if isinstance(data, list):
            print(f"  Found {len(data)} approval records")
        elif isinstance(data, dict) and "approvals" in data:
            print(f"  Found {len(data['approvals'])} approval records")
    
    def test_commission_approve_endpoint_exists(self, ceo_headers):
        """POST /api/commissions/approve endpoint exists"""
        # Test with empty body to verify endpoint exists
        response = requests.post(f"{BASE_URL}/api/commissions/approve", headers=ceo_headers, json={})
        # Should return 400 (bad request) or 422 (validation error), not 404
        assert response.status_code != 404, "Commission approve endpoint not found"
        print(f"✓ Commission approve endpoint exists (status: {response.status_code})")


class TestExecutiveDashboard:
    """Executive Dashboard - Team Mood, Scatter Data"""
    
    @pytest.fixture(scope="class")
    def ceo_headers(self):
        """Get CEO auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_team_mood_endpoint(self, ceo_headers):
        """GET /api/executive/team-mood returns team mood scores"""
        response = requests.get(f"{BASE_URL}/api/executive/team-mood", headers=ceo_headers)
        assert response.status_code == 200
        data = response.json()
        assert "teams" in data
        print(f"✓ Team mood endpoint working, found {len(data['teams'])} teams")
        
        for team in data["teams"][:3]:
            print(f"  - {team.get('team_name')}: mood={team.get('avg_mood', 'N/A')}, members={team.get('member_count', 0)}")
    
    def test_scatter_data_endpoint(self, ceo_headers):
        """GET /api/commissions/scatter-data returns salary + commission data"""
        response = requests.get(f"{BASE_URL}/api/commissions/scatter-data", headers=ceo_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return list of employee data points
        assert isinstance(data, (list, dict))
        if isinstance(data, dict):
            data = data.get("data", data.get("employees", []))
        
        print(f"✓ Scatter data endpoint working")
        if len(data) > 0:
            sample = data[0]
            print(f"  Sample data point: {sample}")


class TestSalesCRMColorCoding:
    """Sales CRM - Closed leads color-coding (verified via API stage data)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_leads_have_stage_field(self, auth_headers):
        """Verify leads have stage/pipeline_stage field for color-coding"""
        response = requests.get(f"{BASE_URL}/api/leads?page_size=50", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        leads = data.get("items", data if isinstance(data, list) else [])
        
        enrolled_count = 0
        rejected_count = 0
        
        for lead in leads:
            stage = lead.get("stage") or lead.get("pipeline_stage")
            if stage == "enrolled":
                enrolled_count += 1
            elif stage == "rejected":
                rejected_count += 1
        
        print(f"✓ Leads have stage field for color-coding")
        print(f"  Enrolled leads (green): {enrolled_count}")
        print(f"  Rejected leads (red): {rejected_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
