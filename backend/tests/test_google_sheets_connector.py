"""
Google Sheets Lead Connector API Tests
Tests for:
- GET /api/connectors/config - Returns google_sheets_configured status
- GET /api/connectors/google-sheets - Returns list of connectors
- GET /api/connectors/agents - Returns list of agents available for assignment
- POST /api/connectors/google-sheets - Creates a connector with validation
- PUT /api/connectors/google-sheets/:id - Updates connector settings
- DELETE /api/connectors/google-sheets/:id - Deletes connector
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://net-pay-scatter.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"

# Global token storage
auth_token = None
created_connector_id = None


class TestGoogleSheetsConnectorAuth:
    """Authentication and setup tests"""
    
    def test_login_success(self):
        """Test login to get auth token"""
        global auth_token
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        
        auth_token = data["access_token"]
        print(f"Login successful for user: {data['user'].get('full_name', 'Unknown')}")


class TestConnectorsConfig:
    """Test GET /api/connectors/config endpoint"""
    
    def test_get_connectors_config_requires_auth(self):
        """Test that /connectors/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/connectors/config")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_get_connectors_config(self):
        """Test GET /api/connectors/config - returns configuration status"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/connectors/config", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "google_sheets_configured" in data, "Missing google_sheets_configured field"
        assert isinstance(data["google_sheets_configured"], bool), "google_sheets_configured should be boolean"
        
        # Since OAuth is not configured, should be false
        print(f"Google Sheets configured: {data['google_sheets_configured']}")
        print(f"OAuth URL: {data.get('google_sheets_oauth_url', 'N/A')}")


class TestConnectorsList:
    """Test GET /api/connectors/google-sheets endpoint"""
    
    def test_get_connectors_requires_auth(self):
        """Test that /connectors/google-sheets requires authentication"""
        response = requests.get(f"{BASE_URL}/api/connectors/google-sheets")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth"
    
    def test_get_connectors_list(self):
        """Test GET /api/connectors/google-sheets - returns list of connectors"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/connectors/google-sheets", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} existing connectors")
        
        # If connectors exist, verify structure
        if data:
            connector = data[0]
            expected_fields = ["id", "name", "sheet_url", "sheet_id", "sheet_name", 
                            "assigned_agent_ids", "is_connected"]
            for field in expected_fields:
                assert field in connector, f"Missing field: {field}"


class TestAgentsList:
    """Test GET /api/connectors/agents endpoint"""
    
    def test_get_agents_requires_auth(self):
        """Test that /connectors/agents requires authentication"""
        response = requests.get(f"{BASE_URL}/api/connectors/agents")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth"
    
    def test_get_available_agents(self):
        """Test GET /api/connectors/agents - returns list of agents for assignment"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/connectors/agents", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} available agents")
        
        # Verify agents have proper structure
        if data:
            agent = data[0]
            assert "id" in agent, "Agent should have id"
            assert "full_name" in agent, "Agent should have full_name"
            assert "role" in agent, "Agent should have role"
            
            # Verify only sales roles are returned
            for a in data:
                assert a["role"] in ["sales_executive", "team_leader", "sales_manager"], \
                    f"Unexpected role: {a['role']}"


class TestConnectorCRUD:
    """Test connector create, update, delete operations"""
    
    def test_create_connector_validation(self):
        """Test POST /api/connectors/google-sheets - validates required fields"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with empty data
        response = requests.post(f"{BASE_URL}/api/connectors/google-sheets", 
                                 headers=headers, 
                                 json={})
        assert response.status_code == 422, f"Expected 422 for empty data, got {response.status_code}"
        
        # Test with invalid sheet URL
        response = requests.post(f"{BASE_URL}/api/connectors/google-sheets", 
                                 headers=headers, 
                                 json={
                                     "name": "Test Connector",
                                     "sheet_url": "https://invalid-url.com",
                                     "assigned_agent_ids": ["test-agent"]
                                 })
        # Should fail with 400 for invalid URL or 400 for google sheets not configured
        assert response.status_code in [400, 422], f"Expected 400/422 for invalid URL, got {response.status_code}"
        
        print(f"Validation test passed: {response.json()}")
    
    def test_create_connector_without_oauth(self):
        """Test creating a connector when OAuth is not configured"""
        global auth_token, created_connector_id
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First, get list of agents
        agents_response = requests.get(f"{BASE_URL}/api/connectors/agents", headers=headers)
        agents = agents_response.json()
        
        if not agents:
            pytest.skip("No agents available for assignment")
        
        agent_ids = [agents[0]["id"]]
        
        # Create with valid Google Sheet URL
        test_sheet_url = f"https://docs.google.com/spreadsheets/d/TEST_SHEET_{uuid.uuid4().hex[:8]}/edit"
        
        response = requests.post(f"{BASE_URL}/api/connectors/google-sheets", 
                                 headers=headers, 
                                 json={
                                     "name": f"TEST_Connector_{uuid.uuid4().hex[:6]}",
                                     "sheet_url": test_sheet_url,
                                     "sheet_name": "Sheet1",
                                     "assigned_agent_ids": agent_ids,
                                     "auto_sync_enabled": True,
                                     "sync_interval_minutes": 5
                                 })
        
        # Should fail with 400 because Google Sheets is not configured
        # OR succeed with 201 and return connector with is_connected=false
        if response.status_code == 400:
            data = response.json()
            assert "not configured" in data.get("detail", "").lower() or "GOOGLE_SHEETS" in data.get("detail", ""), \
                f"Expected Google Sheets not configured error, got: {data}"
            print("Create connector correctly rejected - Google Sheets not configured")
        elif response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data, "Created connector should have id"
            assert data.get("is_connected") == False, "New connector should not be connected (no OAuth)"
            created_connector_id = data["id"]
            print(f"Connector created: {data['id']} (not connected - awaiting OAuth)")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_update_connector(self):
        """Test PUT /api/connectors/google-sheets/:id - updates connector"""
        global auth_token, created_connector_id
        assert auth_token, "Auth token not set"
        
        if not created_connector_id:
            pytest.skip("No connector created to update")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update connector name and settings
        response = requests.put(
            f"{BASE_URL}/api/connectors/google-sheets/{created_connector_id}",
            headers=headers,
            json={
                "name": "TEST_Updated_Connector",
                "auto_sync_enabled": False,
                "sync_interval_minutes": 10
            }
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data.get("name") == "TEST_Updated_Connector", "Name not updated"
        assert data.get("auto_sync_enabled") == False, "auto_sync_enabled not updated"
        print(f"Connector updated successfully")
    
    def test_update_nonexistent_connector(self):
        """Test updating a connector that doesn't exist"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/connectors/google-sheets/nonexistent-id-12345",
            headers=headers,
            json={"name": "Test"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_delete_connector(self):
        """Test DELETE /api/connectors/google-sheets/:id - deletes connector"""
        global auth_token, created_connector_id
        assert auth_token, "Auth token not set"
        
        if not created_connector_id:
            pytest.skip("No connector created to delete")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/connectors/google-sheets/{created_connector_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert "deleted" in data.get("message", "").lower(), f"Expected deletion message, got: {data}"
        
        print(f"Connector deleted successfully")
        created_connector_id = None
    
    def test_delete_nonexistent_connector(self):
        """Test deleting a connector that doesn't exist"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/connectors/google-sheets/nonexistent-id-12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestOAuthFlow:
    """Test OAuth-related endpoints (limited testing since OAuth not configured)"""
    
    def test_oauth_start_requires_auth(self):
        """Test that OAuth start requires authentication"""
        response = requests.get(f"{BASE_URL}/api/connectors/google-sheets/test-id/oauth")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth"
    
    def test_oauth_start_without_config(self):
        """Test OAuth start when Google Sheets is not configured"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Try to start OAuth for a random connector ID
        response = requests.get(
            f"{BASE_URL}/api/connectors/google-sheets/test-connector-id/oauth",
            headers=headers
        )
        
        # Should fail with 400 (not configured) or 404 (connector not found)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print(f"OAuth start correctly handled: {response.json()}")


class TestSyncAndPreview:
    """Test sync and preview endpoints (limited testing since no connected sheets)"""
    
    def test_sync_requires_connected_sheet(self):
        """Test that sync fails for non-connected sheets"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/connectors/google-sheets/nonexistent-id/sync",
            headers=headers
        )
        
        # Should fail with 400 (not connected) or 404 (not found)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
    
    def test_preview_requires_connected_sheet(self):
        """Test that preview fails for non-connected sheets"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/connectors/google-sheets/nonexistent-id/preview",
            headers=headers
        )
        
        # Should fail with 400 (not connected) or 404 (not found)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"


class TestLeadsPool:
    """Test that Leads Pool page exists and works"""
    
    def test_leads_pool_endpoint(self):
        """Test GET /api/leads/pool - Leads pool should still work"""
        global auth_token
        assert auth_token, "Auth token not set"
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test the leads endpoint with in_pool filter
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers=headers,
            params={"in_pool": True}
        )
        
        assert response.status_code == 200, f"Leads pool failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} leads in pool")


# Cleanup any test data
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test connectors after all tests"""
    yield
    
    global auth_token, created_connector_id
    if created_connector_id and auth_token:
        headers = {"Authorization": f"Bearer {auth_token}"}
        try:
            requests.delete(
                f"{BASE_URL}/api/connectors/google-sheets/{created_connector_id}",
                headers=headers
            )
            print(f"Cleaned up test connector: {created_connector_id}")
        except:
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
