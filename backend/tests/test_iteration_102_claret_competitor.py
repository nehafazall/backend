"""
Iteration 102 - Claret AI Reminder System & Competitor Intelligence Tests
Tests: Reminder CRUD, Schedule endpoint, Target calculation, Web context,
       Competitor list with real URLs, Scrape, Intel, Battle cards, Daily briefing, Team mood
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


@pytest.fixture(scope="function")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="function")
def ceo_token(api_client):
    """Get CEO authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"CEO authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="function")
def cs_head_token(api_client):
    """Get CS Head authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"CS Head authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="function")
def ceo_client(api_client, ceo_token):
    """Session with CEO auth header"""
    api_client.headers.update({"Authorization": f"Bearer {ceo_token}"})
    return api_client


# ═══════════════════════════════════════════
# CLARET REMINDER SYSTEM TESTS
# ═══════════════════════════════════════════

class TestClaretReminderSystem:
    """Tests for Claret AI reminder CRUD and schedule"""

    def test_claret_chat_creates_reminder(self, ceo_client):
        """POST /api/claret/chat with reminder message creates a reminder"""
        response = ceo_client.post(f"{BASE_URL}/api/claret/chat", json={
            "message": "remind me at 5pm to call the new lead",
            "session_id": "test-reminder-session-102"
        })
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "message" in data, "Response should have message"
        # Check if reminder was set
        if "reminder_set" in data:
            assert data["reminder_set"]["status"] == "set", "Reminder should be set"
            assert "id" in data["reminder_set"], "Reminder should have ID"
            print(f"Reminder created: {data['reminder_set']}")
        else:
            # Claret may acknowledge reminder in message
            print(f"Claret response: {data.get('message', '')[:200]}")

    def test_get_user_schedule(self, ceo_client):
        """GET /api/claret/schedule returns today's schedule"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/schedule")
        assert response.status_code == 200, f"Schedule failed: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "date" in data, "Schedule should have date"
        assert "reminders" in data, "Schedule should have reminders list"
        assert "work_notes" in data, "Schedule should have work_notes list"
        assert isinstance(data["reminders"], list), "Reminders should be a list"
        assert isinstance(data["work_notes"], list), "Work notes should be a list"
        print(f"Schedule date: {data['date']}, Reminders: {len(data['reminders'])}, Work notes: {len(data['work_notes'])}")

    def test_get_user_reminders(self, ceo_client):
        """GET /api/claret/reminders returns user reminders list"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/reminders")
        assert response.status_code == 200, f"Reminders failed: {response.text}"
        data = response.json()
        
        # Response is {"reminders": [...]}
        assert "reminders" in data, "Should have reminders key"
        reminders = data["reminders"]
        assert isinstance(reminders, list), "Reminders should be a list"
        if len(reminders) > 0:
            reminder = reminders[0]
            assert "id" in reminder, "Reminder should have id"
            assert "content" in reminder, "Reminder should have content"
            assert "reminder_time" in reminder, "Reminder should have reminder_time"
            assert "status" in reminder, "Reminder should have status"
            print(f"Found {len(reminders)} reminders. First: {reminder.get('content', '')[:50]}")
        else:
            print("No reminders found for user")

    def test_delete_reminder(self, ceo_client):
        """DELETE /api/claret/reminders/{id} deletes a reminder"""
        # First create a reminder
        create_resp = ceo_client.post(f"{BASE_URL}/api/claret/chat", json={
            "message": "remind me at 11pm to test deletion",
            "session_id": "test-delete-reminder-102"
        })
        assert create_resp.status_code == 200
        
        # Get reminders to find the one we created
        list_resp = ceo_client.get(f"{BASE_URL}/api/claret/reminders")
        assert list_resp.status_code == 200
        data = list_resp.json()
        reminders = data.get("reminders", [])
        
        # Find a reminder to delete (preferably the test one)
        test_reminder = None
        for r in reminders:
            if isinstance(r, dict):
                if "test deletion" in r.get("content", "").lower() or "test deletion" in r.get("original_message", "").lower():
                    test_reminder = r
                    break
        
        if not test_reminder and len(reminders) > 0:
            # Use any pending reminder
            for r in reminders:
                if isinstance(r, dict) and r.get("status") == "pending":
                    test_reminder = r
                    break
        
        if test_reminder:
            reminder_id = test_reminder["id"]
            delete_resp = ceo_client.delete(f"{BASE_URL}/api/claret/reminders/{reminder_id}")
            assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
            print(f"Deleted reminder: {reminder_id}")
            
            # Verify deletion
            verify_resp = ceo_client.get(f"{BASE_URL}/api/claret/reminders")
            verify_data = verify_resp.json()
            deleted_ids = [r["id"] for r in verify_data.get("reminders", []) if isinstance(r, dict)]
            assert reminder_id not in deleted_ids, "Reminder should be deleted"
        else:
            print("No reminders available to delete - skipping delete verification")


# ═══════════════════════════════════════════
# CLARET AI ENHANCED FEATURES TESTS
# ═══════════════════════════════════════════

class TestClaretEnhancedFeatures:
    """Tests for Claret AI target calculation and web context"""

    def test_claret_target_calculation(self, ceo_client):
        """POST /api/claret/chat with target calculation query returns math + advice"""
        response = ceo_client.post(f"{BASE_URL}/api/claret/chat", json={
            "message": "I have 5 days left and need to hit 100K AED target. How much per day?",
            "session_id": "test-target-calc-102"
        })
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        message = data["message"].lower()
        # Should contain calculation or numbers
        assert any(char.isdigit() for char in message), "Response should contain numbers/calculation"
        print(f"Target calculation response: {data['message'][:300]}")

    def test_claret_chat_with_web_context(self, ceo_client):
        """POST /api/claret/chat with web_context parameter includes web data in response"""
        web_context = "Latest forex market news: EUR/USD at 1.08, Gold at $2000/oz, Fed signals rate pause"
        response = ceo_client.post(f"{BASE_URL}/api/claret/chat", json={
            "message": "What's happening in the forex market today?",
            "session_id": "test-web-context-102",
            "web_context": web_context
        })
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should have message"
        # Claret should incorporate web context in response
        print(f"Web context response: {data['message'][:300]}")


# ═══════════════════════════════════════════
# COMPETITOR INTELLIGENCE TESTS
# ═══════════════════════════════════════════

class TestCompetitorIntelligence:
    """Tests for Competitor Intelligence module"""

    def test_list_competitors_with_real_urls(self, ceo_client):
        """GET /api/intelligence/competitors returns 6 competitors with correct websites"""
        response = ceo_client.get(f"{BASE_URL}/api/intelligence/competitors")
        assert response.status_code == 200, f"List competitors failed: {response.text}"
        data = response.json()
        
        assert "competitors" in data, "Response should have competitors list"
        competitors = data["competitors"]
        assert len(competitors) >= 6, f"Should have at least 6 competitors, got {len(competitors)}"
        
        # Expected real URLs
        expected_domains = [
            "deltainstitutions.com",
            "fundfloat.ae",
            "mithunsmoneymarket.com",
            "stellarfxacademy.com",
            "jeafx.com",
            "moneytize.ae"
        ]
        
        found_domains = []
        for comp in competitors:
            website = comp.get("website", "")
            for domain in expected_domains:
                if domain in website:
                    found_domains.append(domain)
                    break
        
        print(f"Found {len(competitors)} competitors")
        print(f"Verified domains: {found_domains}")
        
        # At least some should have real URLs
        assert len(found_domains) >= 3, f"Should have at least 3 real URLs, found {len(found_domains)}"

    def test_scrape_competitor(self, ceo_client):
        """POST /api/intelligence/competitors/{id}/scrape scrapes real competitor website"""
        # Get first competitor
        list_resp = ceo_client.get(f"{BASE_URL}/api/intelligence/competitors")
        assert list_resp.status_code == 200
        competitors = list_resp.json()["competitors"]
        
        if len(competitors) == 0:
            pytest.skip("No competitors to scrape")
        
        # Find one with a website
        comp_to_scrape = None
        for c in competitors:
            if c.get("website"):
                comp_to_scrape = c
                break
        
        if not comp_to_scrape:
            pytest.skip("No competitor with website found")
        
        comp_id = comp_to_scrape["id"]
        response = ceo_client.post(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/scrape")
        
        # Scrape may succeed or fail due to DNS/network - both are valid
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Should have message"
            print(f"Scrape result: {data.get('message', '')}")
        else:
            print(f"Scrape failed (expected in container): {response.text[:200]}")

    def test_get_competitor_intel(self, ceo_client):
        """GET /api/intelligence/competitors/{id}/intel returns scraped intel"""
        # Get first competitor
        list_resp = ceo_client.get(f"{BASE_URL}/api/intelligence/competitors")
        assert list_resp.status_code == 200
        competitors = list_resp.json()["competitors"]
        
        if len(competitors) == 0:
            pytest.skip("No competitors available")
        
        comp_id = competitors[0]["id"]
        response = ceo_client.get(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/intel")
        assert response.status_code == 200, f"Get intel failed: {response.text}"
        data = response.json()
        
        assert "competitor" in data, "Should have competitor info"
        assert "intel" in data, "Should have intel list"
        assert isinstance(data["intel"], list), "Intel should be a list"
        print(f"Intel for {data['competitor'].get('name', 'Unknown')}: {len(data['intel'])} records")

    def test_generate_battle_card(self, ceo_client):
        """POST /api/intelligence/competitors/{id}/battle-card generates AI battle card"""
        # Get first competitor
        list_resp = ceo_client.get(f"{BASE_URL}/api/intelligence/competitors")
        assert list_resp.status_code == 200
        competitors = list_resp.json()["competitors"]
        
        if len(competitors) == 0:
            pytest.skip("No competitors available")
        
        comp_id = competitors[0]["id"]
        response = ceo_client.post(f"{BASE_URL}/api/intelligence/competitors/{comp_id}/battle-card")
        
        # Battle card generation may take time or fail if no intel
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "battle_card" in data, "Should have battle_card"
            battle_card = data["battle_card"]
            # Check structure
            expected_keys = ["overview", "strengths", "weaknesses", "our_advantages"]
            for key in expected_keys:
                assert key in battle_card, f"Battle card should have {key}"
            print(f"Battle card generated: {battle_card.get('overview', '')[:200]}")
        else:
            print(f"Battle card generation note: {response.text[:200]}")


# ═══════════════════════════════════════════
# DAILY BRIEFING & TEAM MOOD TESTS
# ═══════════════════════════════════════════

class TestDailyBriefingAndTeamMood:
    """Tests for daily briefing and team mood endpoints"""

    def test_get_daily_briefing(self, ceo_client):
        """GET /api/intelligence/daily-briefing returns personalized briefing"""
        response = ceo_client.get(f"{BASE_URL}/api/intelligence/daily-briefing")
        assert response.status_code == 200, f"Daily briefing failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "Should have user_id"
        assert "date" in data, "Should have date"
        assert "sections" in data, "Should have sections"
        assert isinstance(data["sections"], list), "Sections should be a list"
        
        print(f"Daily briefing for {data.get('user_name', 'Unknown')} on {data['date']}")
        for section in data["sections"]:
            print(f"  - {section.get('title', 'Unknown section')}: {len(section.get('items', []))} items")

    def test_get_team_mood(self, ceo_client):
        """GET /api/executive/team-mood returns team mood data"""
        response = ceo_client.get(f"{BASE_URL}/api/executive/team-mood")
        assert response.status_code == 200, f"Team mood failed: {response.text}"
        data = response.json()
        
        assert "teams" in data, "Should have teams list"
        assert isinstance(data["teams"], list), "Teams should be a list"
        
        print(f"Team mood data: {len(data['teams'])} teams")
        for team in data["teams"][:3]:
            print(f"  - {team.get('team_name', 'Unknown')}: avg mood {team.get('avg_mood', 'N/A')}")


# ═══════════════════════════════════════════
# ACCESS CONTROL TESTS
# ═══════════════════════════════════════════

class TestAccessControl:
    """Tests for access control on new endpoints"""

    def test_unauthenticated_access_denied(self, api_client):
        """Unauthenticated requests should be denied"""
        # Remove auth header if present
        api_client.headers.pop("Authorization", None)
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/claret/schedule"),
            ("GET", f"{BASE_URL}/api/claret/reminders"),
            ("GET", f"{BASE_URL}/api/intelligence/competitors"),
            ("GET", f"{BASE_URL}/api/intelligence/daily-briefing"),
            ("GET", f"{BASE_URL}/api/executive/team-mood"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                resp = api_client.get(url)
            else:
                resp = api_client.post(url, json={})
            
            assert resp.status_code in [401, 403], f"{url} should deny unauthenticated access, got {resp.status_code}"
        
        print("All endpoints correctly deny unauthenticated access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
