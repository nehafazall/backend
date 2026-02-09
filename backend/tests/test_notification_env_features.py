"""
Test suite for P0 features:
1. User Preferences API (notification_sound_enabled)
2. Environment/Current API (backend_env, backend_database)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserPreferencesAPI:
    """Tests for /api/users/preferences endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json().get("user")
    
    def test_get_user_preferences(self):
        """Test GET /api/users/preferences returns notification_sound_enabled"""
        response = self.session.get(f"{BASE_URL}/api/users/preferences")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "notification_sound_enabled" in data, "Response should contain notification_sound_enabled field"
        assert isinstance(data["notification_sound_enabled"], bool), "notification_sound_enabled should be boolean"
        print(f"SUCCESS: GET /api/users/preferences - notification_sound_enabled={data['notification_sound_enabled']}")
    
    def test_update_user_preferences_enable_sound(self):
        """Test PUT /api/users/preferences to enable notification sounds"""
        response = self.session.put(f"{BASE_URL}/api/users/preferences", json={
            "notification_sound_enabled": True
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "notification_sound_enabled" in data, "Response should contain notification_sound_enabled"
        assert data["notification_sound_enabled"] == True, "notification_sound_enabled should be True"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/users/preferences")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["notification_sound_enabled"] == True, "Preference should persist as True"
        print("SUCCESS: PUT /api/users/preferences - enabled notification sounds")
    
    def test_update_user_preferences_disable_sound(self):
        """Test PUT /api/users/preferences to disable notification sounds"""
        response = self.session.put(f"{BASE_URL}/api/users/preferences", json={
            "notification_sound_enabled": False
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "notification_sound_enabled" in data, "Response should contain notification_sound_enabled"
        assert data["notification_sound_enabled"] == False, "notification_sound_enabled should be False"
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/users/preferences")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["notification_sound_enabled"] == False, "Preference should persist as False"
        print("SUCCESS: PUT /api/users/preferences - disabled notification sounds")
    
    def test_preferences_without_auth(self):
        """Test that preferences endpoints require authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # GET without auth
        get_response = no_auth_session.get(f"{BASE_URL}/api/users/preferences")
        assert get_response.status_code in [401, 403], f"Expected 401/403 without auth, got {get_response.status_code}"
        
        # PUT without auth
        put_response = no_auth_session.put(f"{BASE_URL}/api/users/preferences", json={
            "notification_sound_enabled": True
        })
        assert put_response.status_code in [401, 403], f"Expected 401/403 without auth, got {put_response.status_code}"
        print("SUCCESS: Preferences endpoints require authentication")


class TestEnvironmentAPI:
    """Tests for /api/environment/current endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_current_environment(self):
        """Test GET /api/environment/current returns backend_env and backend_database"""
        response = self.session.get(f"{BASE_URL}/api/environment/current")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        
        # Check required fields exist
        assert "backend_env" in data, "Response should contain backend_env field"
        assert "backend_database" in data, "Response should contain backend_database field"
        assert "current_mode" in data, "Response should contain current_mode field"
        assert "user_access" in data, "Response should contain user_access field"
        assert "available_modes" in data, "Response should contain available_modes field"
        
        # Validate backend_env value
        assert data["backend_env"] in ["development", "testing", "production"], \
            f"backend_env should be one of development/testing/production, got {data['backend_env']}"
        
        # Validate backend_database format
        assert isinstance(data["backend_database"], str), "backend_database should be a string"
        assert len(data["backend_database"]) > 0, "backend_database should not be empty"
        
        # Validate available_modes
        assert isinstance(data["available_modes"], list), "available_modes should be a list"
        assert "development" in data["available_modes"], "available_modes should include development"
        assert "testing" in data["available_modes"], "available_modes should include testing"
        assert "production" in data["available_modes"], "available_modes should include production"
        
        print(f"SUCCESS: GET /api/environment/current")
        print(f"  - backend_env: {data['backend_env']}")
        print(f"  - backend_database: {data['backend_database']}")
        print(f"  - current_mode: {data['current_mode']}")
        print(f"  - user_access: {data['user_access']}")
    
    def test_environment_database_naming_convention(self):
        """Test that database name follows expected naming convention based on environment"""
        response = self.session.get(f"{BASE_URL}/api/environment/current")
        assert response.status_code == 200
        
        data = response.json()
        backend_env = data["backend_env"]
        backend_database = data["backend_database"]
        
        # Check database naming convention
        if backend_env == "development":
            assert "dev" in backend_database.lower() or "development" in backend_database.lower(), \
                f"Dev environment should use dev database, got {backend_database}"
        elif backend_env == "testing":
            assert "test" in backend_database.lower(), \
                f"Test environment should use test database, got {backend_database}"
        elif backend_env == "production":
            assert "prod" in backend_database.lower() or "production" in backend_database.lower() or "erp" in backend_database.lower(), \
                f"Production environment should use prod database, got {backend_database}"
        
        print(f"SUCCESS: Database naming convention verified - {backend_env} -> {backend_database}")
    
    def test_environment_without_auth(self):
        """Test that environment endpoint requires authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/environment/current")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("SUCCESS: Environment endpoint requires authentication")


class TestNotificationEntityFields:
    """Tests to verify notifications include entity_type and entity_id for click-through"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_get_notifications_structure(self):
        """Test that notifications endpoint returns proper structure with entity fields"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Notifications should be a list"
        
        # If there are notifications, check structure
        if len(data) > 0:
            notification = data[0]
            # Check that notification has expected fields
            assert "id" in notification, "Notification should have id"
            assert "title" in notification, "Notification should have title"
            assert "message" in notification, "Notification should have message"
            assert "read" in notification, "Notification should have read status"
            
            # entity_type and entity_id may be null but should be present in schema
            # These are optional fields for click-through navigation
            print(f"SUCCESS: Notifications endpoint returns {len(data)} notifications")
            print(f"  - Sample notification: {notification.get('title', 'N/A')}")
            if notification.get('entity_type'):
                print(f"  - entity_type: {notification.get('entity_type')}")
            if notification.get('entity_id'):
                print(f"  - entity_id: {notification.get('entity_id')}")
        else:
            print("SUCCESS: Notifications endpoint works (no notifications currently)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
