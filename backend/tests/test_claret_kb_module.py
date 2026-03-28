"""
Test Suite for Claret AI + Knowledge Base Module
Tests: KB CRUD, Claret Chat, Mood Scoring, Settings
"""
import pytest
import requests
import os
import time
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"CEO login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS Head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"CS Head login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture
def ceo_client(ceo_token):
    """Session with CEO auth"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {ceo_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture
def cs_head_client(cs_head_token):
    """Session with CS Head auth"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {cs_head_token}",
        "Content-Type": "application/json"
    })
    return session


class TestKnowledgeBase:
    """Knowledge Base CRUD tests"""
    
    uploaded_doc_id = None
    
    def test_kb_list_empty_or_existing(self, ceo_client):
        """Test KB list endpoint returns documents array"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/knowledge-base")
        assert response.status_code == 200, f"KB list failed: {response.text}"
        data = response.json()
        assert "documents" in data
        assert "categories" in data
        assert isinstance(data["documents"], list)
        print(f"KB list: {len(data['documents'])} documents, categories: {data['categories']}")
    
    def test_kb_upload_document(self, ceo_token):
        """Test KB upload with multipart form data"""
        # Create a test file
        test_content = b"This is a test document for CLT Synapse Knowledge Base testing."
        files = {
            'file': ('test_document.txt', io.BytesIO(test_content), 'text/plain')
        }
        data = {
            'category': 'sop',
            'title': 'TEST_KB_Document',
            'description': 'Test document for automated testing'
        }
        headers = {"Authorization": f"Bearer {ceo_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/claret/knowledge-base/upload",
            files=files,
            data=data,
            headers=headers
        )
        assert response.status_code == 200, f"KB upload failed: {response.text}"
        doc = response.json()
        assert "id" in doc
        assert doc["title"] == "TEST_KB_Document"
        assert doc["category"] == "sop"
        TestKnowledgeBase.uploaded_doc_id = doc["id"]
        print(f"Uploaded KB doc: {doc['id']}")
    
    def test_kb_get_document(self, ceo_client):
        """Test getting a specific KB document"""
        if not TestKnowledgeBase.uploaded_doc_id:
            pytest.skip("No uploaded doc to test")
        
        response = ceo_client.get(f"{BASE_URL}/api/claret/knowledge-base/{TestKnowledgeBase.uploaded_doc_id}")
        assert response.status_code == 200, f"KB get failed: {response.text}"
        doc = response.json()
        assert doc["id"] == TestKnowledgeBase.uploaded_doc_id
        assert doc["title"] == "TEST_KB_Document"
        print(f"Got KB doc: {doc['title']}")
    
    def test_kb_download_document(self, ceo_client):
        """Test KB download endpoint"""
        if not TestKnowledgeBase.uploaded_doc_id:
            pytest.skip("No uploaded doc to test")
        
        response = ceo_client.get(
            f"{BASE_URL}/api/claret/knowledge-base/{TestKnowledgeBase.uploaded_doc_id}/download",
            allow_redirects=True
        )
        assert response.status_code == 200, f"KB download failed: {response.status_code}"
        print(f"Downloaded KB doc, content length: {len(response.content)}")
    
    def test_kb_filter_by_category(self, ceo_client):
        """Test KB filtering by category"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/knowledge-base?category=sop")
        assert response.status_code == 200
        data = response.json()
        # All returned docs should be in 'sop' category
        for doc in data["documents"]:
            assert doc["category"] == "sop", f"Expected sop, got {doc['category']}"
        print(f"Filtered KB docs by sop: {len(data['documents'])} docs")
    
    def test_kb_delete_document(self, ceo_client):
        """Test KB delete endpoint"""
        if not TestKnowledgeBase.uploaded_doc_id:
            pytest.skip("No uploaded doc to delete")
        
        response = ceo_client.delete(f"{BASE_URL}/api/claret/knowledge-base/{TestKnowledgeBase.uploaded_doc_id}")
        assert response.status_code == 200, f"KB delete failed: {response.text}"
        
        # Verify deletion
        verify = ceo_client.get(f"{BASE_URL}/api/claret/knowledge-base/{TestKnowledgeBase.uploaded_doc_id}")
        assert verify.status_code == 404, "Document should be deleted"
        print(f"Deleted KB doc: {TestKnowledgeBase.uploaded_doc_id}")


class TestClaretChat:
    """Claret AI Chat tests"""
    
    session_id = None
    
    def test_claret_chat_send_message(self, ceo_client):
        """Test sending a message to Claret AI - waits for Claude response"""
        payload = {
            "message": "Hello Claret! How are you today?",
            "session_id": ""
        }
        response = ceo_client.post(f"{BASE_URL}/api/claret/chat", json=payload)
        assert response.status_code == 200, f"Claret chat failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should have message"
        assert "session_id" in data, "Response should have session_id"
        assert len(data["message"]) > 0, "Message should not be empty"
        
        TestClaretChat.session_id = data["session_id"]
        print(f"Claret response: {data['message'][:100]}...")
        print(f"Session ID: {data['session_id']}")
        print(f"Mood scores: {data.get('mood_scores', {})}")
    
    def test_claret_chat_with_session(self, ceo_client):
        """Test continuing a chat session"""
        if not TestClaretChat.session_id:
            pytest.skip("No session to continue")
        
        payload = {
            "message": "Tell me about CLT Synapse ERP features",
            "session_id": TestClaretChat.session_id
        }
        response = ceo_client.post(f"{BASE_URL}/api/claret/chat", json=payload)
        assert response.status_code == 200, f"Claret chat failed: {response.text}"
        data = response.json()
        assert data["session_id"] == TestClaretChat.session_id
        print(f"Continued chat: {data['message'][:100]}...")
    
    def test_claret_chat_history(self, ceo_client):
        """Test getting chat history"""
        if not TestClaretChat.session_id:
            pytest.skip("No session to get history for")
        
        response = ceo_client.get(f"{BASE_URL}/api/claret/chat/history?session_id={TestClaretChat.session_id}")
        assert response.status_code == 200, f"Chat history failed: {response.text}"
        data = response.json()
        assert "chats" in data
        assert len(data["chats"]) >= 2, "Should have at least 2 messages (user + assistant)"
        print(f"Chat history: {len(data['chats'])} messages")
    
    def test_claret_chat_sessions(self, ceo_client):
        """Test getting chat sessions list"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/chat/sessions")
        assert response.status_code == 200, f"Chat sessions failed: {response.text}"
        data = response.json()
        assert "sessions" in data
        print(f"Chat sessions: {len(data['sessions'])} sessions")


class TestMoodScoring:
    """Mood scoring and analytics tests"""
    
    def test_my_mood_scores(self, ceo_client):
        """Test getting own mood scores"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/mood/my-scores?days=30")
        assert response.status_code == 200, f"My mood scores failed: {response.text}"
        data = response.json()
        assert "scores" in data
        print(f"My mood scores: {len(data['scores'])} entries")
    
    def test_team_mood_overview_ceo(self, ceo_client):
        """Test team mood overview - CEO only"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/mood/team-overview")
        assert response.status_code == 200, f"Team mood overview failed: {response.text}"
        data = response.json()
        assert "team_moods" in data
        print(f"Team moods: {len(data['team_moods'])} users")
    
    def test_mood_analytics_ceo(self, ceo_client):
        """Test mood analytics - CEO only"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/mood/analytics?days=30")
        assert response.status_code == 200, f"Mood analytics failed: {response.text}"
        data = response.json()
        assert "avg_mood" in data
        assert "mood_distribution" in data
        assert "daily_trend" in data
        print(f"Mood analytics: avg={data['avg_mood']}, interactions={data.get('total_interactions', 0)}")
    
    def test_team_mood_forbidden_for_cs_head(self, cs_head_client):
        """Test that CS Head cannot access team mood overview"""
        response = cs_head_client.get(f"{BASE_URL}/api/claret/mood/team-overview")
        # Should be 403 Forbidden or 401
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("CS Head correctly denied access to team mood overview")


class TestClaretSettings:
    """Claret dashboard settings tests"""
    
    def test_get_settings(self, ceo_client):
        """Test getting Claret settings"""
        response = ceo_client.get(f"{BASE_URL}/api/claret/settings")
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        # Should have default or saved settings
        assert "theme_color" in data or "user_id" in data
        print(f"Settings: {data}")
    
    def test_update_settings(self, ceo_client):
        """Test updating Claret settings"""
        payload = {
            "theme_color": "#6366f1",
            "accent_color": "#f59e0b",
            "bg_gradient": "from-indigo-500/10 to-purple-500/10"
        }
        response = ceo_client.put(f"{BASE_URL}/api/claret/settings", json=payload)
        assert response.status_code == 200, f"Update settings failed: {response.text}"
        
        # Verify update
        verify = ceo_client.get(f"{BASE_URL}/api/claret/settings")
        assert verify.status_code == 200
        data = verify.json()
        assert data.get("theme_color") == "#6366f1"
        print("Settings updated successfully")


class TestOrganizationMap:
    """Organization Map tests"""
    
    def test_org_map_loads(self, ceo_client):
        """Test organization map endpoint"""
        response = ceo_client.get(f"{BASE_URL}/api/organization/map")
        assert response.status_code == 200, f"Org map failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "departments" in data
        assert "stats" in data
        assert "ceo" in data
        assert "approval_matrix" in data
        
        print(f"Org map: {data['stats']['total_employees']} employees, {data['stats']['total_departments']} depts")
        print(f"CEO: {data['ceo']['name'] if data['ceo'] else 'None'}")
    
    def test_org_map_has_departments(self, ceo_client):
        """Test org map has department structure"""
        response = ceo_client.get(f"{BASE_URL}/api/organization/map")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["departments"]) > 0, "Should have at least one department"
        
        # Check department structure
        dept = data["departments"][0]
        assert "name" in dept
        assert "count" in dept
        print(f"First department: {dept['name']} with {dept['count']} members")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
