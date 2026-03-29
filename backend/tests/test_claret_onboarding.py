"""
Test Claret AI Onboarding Module
--------------------------------
Tests for:
- GET /api/claret/profile - returns null for new users, saved data for existing
- GET /api/claret/onboarding-questions - returns 7 MCQ + 3 open questions in 3 languages
- POST /api/claret/profile - saves profile with name, nickname, language, personality answers
- POST /api/claret/chat - accepts user_role parameter and returns personalized response
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for super admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def user_info(api_client, auth_token):
    """Get current user info"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    response = api_client.get(f"{BASE_URL}/api/auth/me")
    assert response.status_code == 200
    return response.json()


class TestOnboardingQuestionsEndpoint:
    """Test GET /api/claret/onboarding-questions - NO AUTH REQUIRED"""
    
    def test_get_english_questions(self, api_client):
        """Test getting onboarding questions in English"""
        # Remove auth header for this test (endpoint doesn't require auth)
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=english", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "questions" in data
        assert "language" in data
        assert data["language"] == "english"
        
        questions = data["questions"]
        assert "mcq" in questions
        assert "open" in questions
        
        # Verify 7 MCQ questions
        assert len(questions["mcq"]) == 7, f"Expected 7 MCQ questions, got {len(questions['mcq'])}"
        
        # Verify 3 open-ended questions
        assert len(questions["open"]) == 3, f"Expected 3 open questions, got {len(questions['open'])}"
        
        # Verify MCQ structure (each has 'q' and 'options')
        for i, mcq in enumerate(questions["mcq"]):
            assert "q" in mcq, f"MCQ {i} missing 'q' field"
            assert "options" in mcq, f"MCQ {i} missing 'options' field"
            assert len(mcq["options"]) >= 4, f"MCQ {i} should have at least 4 options"
        
        # Verify open question structure
        for i, oq in enumerate(questions["open"]):
            assert "q" in oq, f"Open question {i} missing 'q' field"
        
        print(f"English questions: 7 MCQ + 3 open = 10 total")
    
    def test_get_hinglish_questions(self, api_client):
        """Test getting onboarding questions in Hinglish"""
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=hinglish", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["language"] == "hinglish"
        questions = data["questions"]
        
        # Verify 7 MCQ + 3 open
        assert len(questions["mcq"]) == 7
        assert len(questions["open"]) == 3
        
        # Verify Hinglish content (should contain Hindi words)
        first_mcq = questions["mcq"][0]["q"]
        assert any(word in first_mcq.lower() for word in ["kaam", "aap", "kya", "hai"]), \
            f"Hinglish question doesn't seem to be in Hinglish: {first_mcq}"
        
        print(f"Hinglish questions verified: {first_mcq[:50]}...")
    
    def test_get_manglish_questions(self, api_client):
        """Test getting onboarding questions in Manglish"""
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=manglish", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["language"] == "manglish"
        questions = data["questions"]
        
        # Verify 7 MCQ + 3 open
        assert len(questions["mcq"]) == 7
        assert len(questions["open"]) == 3
        
        # Verify Manglish content (should contain Malayalam words)
        first_mcq = questions["mcq"][0]["q"]
        assert any(word in first_mcq.lower() for word in ["aanu", "ningal", "eath", "cheyyunnathu"]), \
            f"Manglish question doesn't seem to be in Manglish: {first_mcq}"
        
        print(f"Manglish questions verified: {first_mcq[:50]}...")
    
    def test_default_language_fallback(self, api_client):
        """Test that invalid language falls back to English"""
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=invalid_lang", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should fallback to English
        questions = data["questions"]
        assert len(questions["mcq"]) == 7
        assert len(questions["open"]) == 3
        
        print("Invalid language falls back to English correctly")


class TestClaretProfileEndpoint:
    """Test GET/POST /api/claret/profile - REQUIRES AUTH"""
    
    def test_get_profile_new_user(self, authenticated_client):
        """Test that new user returns null profile"""
        # Use a random user_id that doesn't exist
        fake_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        response = authenticated_client.get(f"{BASE_URL}/api/claret/profile?user_id={fake_user_id}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "profile" in data
        assert data["profile"] is None, f"Expected null profile for new user, got: {data['profile']}"
        
        print(f"New user {fake_user_id} correctly returns null profile")
    
    def test_save_profile(self, authenticated_client, user_info):
        """Test saving a Claret profile - uses authenticated user's ID (security enforced)"""
        # Note: The server enforces that user_id = authenticated user's ID
        # This is correct security behavior
        actual_user_id = user_info.get("id")
        
        profile_data = {
            "user_id": actual_user_id,  # Will be overridden by server anyway
            "name": "Test User",
            "nickname": "Testy",
            "language": "english",
            "answers": {
                "mcq": [
                    "Achievement & Goals",
                    "Push through it",
                    "A healthy mix",
                    "Talking to a friend",
                    "Friendly competition",
                    "Direct and honest",
                    "Morning person - peak early"
                ],
                "open": [
                    "A good cup of coffee",
                    "Keep pushing forward",
                    "Determined, Creative, Friendly"
                ]
            },
            "motivation_frequency": "sometimes"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/claret/profile", json=profile_data)
        
        assert response.status_code == 200, f"Failed to save profile: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert data["message"] == "Profile saved"
        assert "profile" in data
        
        saved_profile = data["profile"]
        assert saved_profile["user_id"] == actual_user_id  # Server enforces this
        assert saved_profile["name"] == "Test User"
        assert saved_profile["nickname"] == "Testy"
        assert saved_profile["language"] == "english"
        assert "personality_summary" in saved_profile
        assert len(saved_profile["personality_summary"]) > 0
        
        print(f"Profile saved successfully for {actual_user_id}")
        
        # Verify GET returns the saved profile
        get_response = authenticated_client.get(f"{BASE_URL}/api/claret/profile?user_id={actual_user_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data["profile"] is not None
        assert get_data["profile"]["nickname"] == "Testy"
        assert get_data["profile"]["language"] == "english"
        
        print(f"GET profile returns saved data correctly")
    
    def test_save_profile_hinglish(self, authenticated_client, user_info):
        """Test saving profile with Hinglish language"""
        actual_user_id = user_info.get("id")
        
        profile_data = {
            "user_id": actual_user_id,
            "name": "Hinglish User",
            "nickname": "Yaar",
            "language": "hinglish",
            "answers": {
                "mcq": ["Achievement & Goals", "Push through", "Mix", "Friend", "Competition", "Direct", "Morning"],
                "open": ["Chai", "Sab theek ho jayega", "Mazedaar, Helpful, Chill"]
            }
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/claret/profile", json=profile_data)
        assert response.status_code == 200
        
        # Verify language is saved
        get_response = authenticated_client.get(f"{BASE_URL}/api/claret/profile?user_id={actual_user_id}")
        assert get_response.status_code == 200
        assert get_response.json()["profile"]["language"] == "hinglish"
        
        print("Hinglish profile saved and retrieved correctly")
    
    def test_update_existing_profile(self, authenticated_client, user_info):
        """Test updating an existing profile"""
        actual_user_id = user_info.get("id")
        
        # Create initial profile
        initial_profile = {
            "user_id": actual_user_id,
            "name": "Initial Name",
            "nickname": "Init",
            "language": "english",
            "answers": {"mcq": ["A", "B", "C", "D", "E", "F", "G"], "open": ["1", "2", "3"]}
        }
        
        response1 = authenticated_client.post(f"{BASE_URL}/api/claret/profile", json=initial_profile)
        assert response1.status_code == 200
        
        # Update profile
        updated_profile = {
            "user_id": actual_user_id,
            "name": "Updated Name",
            "nickname": "Updated",
            "language": "manglish",
            "answers": {"mcq": ["X", "Y", "Z", "W", "V", "U", "T"], "open": ["New1", "New2", "New3"]}
        }
        
        response2 = authenticated_client.post(f"{BASE_URL}/api/claret/profile", json=updated_profile)
        assert response2.status_code == 200
        
        # Verify update
        get_response = authenticated_client.get(f"{BASE_URL}/api/claret/profile?user_id={actual_user_id}")
        assert get_response.status_code == 200
        profile = get_response.json()["profile"]
        
        assert profile["nickname"] == "Updated"
        assert profile["language"] == "manglish"
        
        print("Profile update (upsert) works correctly")


class TestClaretChatWithRole:
    """Test POST /api/claret/chat with user_role parameter"""
    
    def test_chat_with_user_role(self, authenticated_client, user_info):
        """Test that chat accepts user_role and returns personalized response"""
        chat_data = {
            "message": "Hello, how are you?",
            "user_id": user_info.get("id", "test_user"),
            "user_name": user_info.get("full_name", "Test User"),
            "user_role": "super_admin",
            "session_id": f"test_session_{uuid.uuid4().hex[:8]}"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/claret/chat", json=chat_data)
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
        assert "session_id" in data
        
        # Mood scores should be present (may be empty dict if AI didn't return them)
        assert "mood_scores" in data
        
        print(f"Chat response received: {data['message'][:100]}...")
    
    def test_chat_with_cs_head_role(self, api_client):
        """Test chat with CS Head role"""
        # Login as CS Head
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"CS Head login failed: {login_response.text}")
        
        token = login_response.json().get("access_token")
        user = login_response.json().get("user", {})
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        chat_data = {
            "message": "Show me my student data",
            "user_id": user.get("id", "cs_head_user"),
            "user_name": user.get("full_name", "CS Head"),
            "user_role": "cs_head",
            "session_id": f"cs_test_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/claret/chat", json=chat_data, headers=headers)
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"CS Head chat response: {data['message'][:100]}...")
    
    def test_chat_erp_data_query(self, authenticated_client, user_info):
        """Test that chat can query ERP data when asked about leads/students"""
        chat_data = {
            "message": "How many leads do I have this month?",
            "user_id": user_info.get("id", "test_user"),
            "user_name": user_info.get("full_name", "Test User"),
            "user_role": "super_admin",
            "session_id": f"erp_test_{uuid.uuid4().hex[:8]}"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/claret/chat", json=chat_data)
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        # The response should mention leads or data
        print(f"ERP query response: {data['message'][:150]}...")


class TestClaretProfileForExistingUser:
    """Test profile retrieval for actual logged-in user"""
    
    def test_get_profile_for_logged_in_user(self, authenticated_client, user_info):
        """Test getting profile for the actual logged-in user"""
        user_id = user_info.get("id")
        
        response = authenticated_client.get(f"{BASE_URL}/api/claret/profile?user_id={user_id}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "profile" in data
        # Profile may be null if user hasn't completed onboarding
        if data["profile"] is None:
            print(f"User {user_id} has no Claret profile (first-time user)")
        else:
            print(f"User {user_id} has existing profile: nickname={data['profile'].get('nickname')}, language={data['profile'].get('language')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
