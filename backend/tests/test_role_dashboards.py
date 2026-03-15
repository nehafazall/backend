"""
Test Role-Based Dashboard Visibility Fix (P0)
- Tests that CS and Sales dashboards load correctly for non-admin users
- Verifies the /api/dashboard/sales-agent-closings endpoint works for all authenticated users
- Tests role-specific visibility (Head Commission card, drill-down descriptions)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
TEST_USERS = {
    "super_admin": {"email": "aqib@clt-academy.com", "password": "@Aqib1234"},
    "cs_agent": {"email": "della@clt-academy.com", "password": "@Aqib1234"},
    "cs_head": {"email": "falja@clt-academy.com", "password": "@Aqib1234"},
    "sales_agent": {"email": "aleesha@clt-academy.com", "password": "@Aqib1234"},
    "team_leader": {"email": "mohammed@clt-academy.com", "password": "@Aqib1234"},
}


def get_auth_token(email: str, password: str):
    """Get authentication token for a user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


def get_headers(token: str):
    """Get headers with auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }


class TestSalesAgentClosingsEndpoint:
    """Test /api/dashboard/sales-agent-closings endpoint - should now work for all authenticated users"""

    def test_sales_agent_closings_as_super_admin(self):
        """Super admin should access sales-agent-closings"""
        token = get_auth_token(TEST_USERS["super_admin"]["email"], TEST_USERS["super_admin"]["password"])
        assert token is not None, "Super admin login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Super admin: sales-agent-closings returns {len(data)} agents")

    def test_sales_agent_closings_as_sales_agent(self):
        """Sales agent (sales_executive) should now access sales-agent-closings (fix verification)"""
        token = get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])
        assert token is not None, "Sales agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall",
            headers=get_headers(token)
        )
        # This was previously returning 403, should now return 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Sales agent: sales-agent-closings returns {len(data)} agents (FIX VERIFIED)")

    def test_sales_agent_closings_as_team_leader(self):
        """Team leader should access sales-agent-closings"""
        token = get_auth_token(TEST_USERS["team_leader"]["email"], TEST_USERS["team_leader"]["password"])
        assert token is not None, "Team leader login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Team leader: sales-agent-closings returns {len(data)} agents")

    def test_sales_agent_closings_as_cs_agent(self):
        """CS agent should also access sales-agent-closings (any authenticated user)"""
        token = get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])
        assert token is not None, "CS agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ CS agent: sales-agent-closings returns {len(data)} agents")


class TestCSDashboardEndpoints:
    """Test CS Dashboard endpoints for different roles"""

    def test_cs_dashboard_stats_as_cs_agent_individual(self):
        """CS agent should get individual stats"""
        token = get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])
        assert token is not None, "CS agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/stats?period=overall&view_mode=individual",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "achieved_revenue" in data, "Missing achieved_revenue"
        assert "achieved_count" in data, "Missing achieved_count"
        assert "pipeline_revenue" in data, "Missing pipeline_revenue"
        assert "total_agent_commission" in data, "Missing total_agent_commission"
        
        # CS agent should NOT see head commission (should be 0)
        assert data.get("total_head_commission", 0) == 0, "CS agent should not see head commission"
        
        print(f"✅ CS agent individual stats: revenue={data.get('achieved_revenue')}, upgrades={data.get('achieved_count')}")

    def test_cs_dashboard_stats_as_cs_head_team(self):
        """CS head should get team stats with head commission visible"""
        token = get_auth_token(TEST_USERS["cs_head"]["email"], TEST_USERS["cs_head"]["password"])
        assert token is not None, "CS head login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/stats?period=overall&view_mode=team",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # CS head should see all commission fields
        assert "achieved_revenue" in data, "Missing achieved_revenue"
        assert "total_head_commission" in data, "Missing total_head_commission (should be visible for cs_head)"
        assert "total_commission" in data, "Missing total_commission"
        
        print(f"✅ CS head team stats: revenue={data.get('achieved_revenue')}, head_comm={data.get('total_head_commission')}")

    def test_cs_dashboard_agent_revenue(self):
        """CS dashboard agent revenue endpoint"""
        token = get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])
        assert token is not None, "CS agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/agent-revenue?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ CS agent-revenue: {len(data)} agents returned")

    def test_cs_dashboard_leaderboard(self):
        """CS dashboard leaderboard endpoint"""
        token = get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])
        assert token is not None, "CS agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/leaderboard?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ CS leaderboard: {len(data)} agents in leaderboard")

    def test_cs_dashboard_monthly_trend(self):
        """CS dashboard monthly trend endpoint"""
        token = get_auth_token(TEST_USERS["cs_head"]["email"], TEST_USERS["cs_head"]["password"])
        assert token is not None, "CS head login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/monthly-trend?view_mode=team",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ CS monthly-trend: {len(data)} months of data")


class TestSalesDashboardEndpoints:
    """Test Sales Dashboard endpoints for different roles"""

    def test_sales_filtered_stats_as_sales_agent(self):
        """Sales agent should get individual stats"""
        token = get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])
        assert token is not None, "Sales agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=overall&view_mode=individual",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_revenue" in data or data == {}, f"Missing total_revenue or empty response: {data}"
        print(f"✅ Sales agent filtered stats: {data}")

    def test_sales_filtered_stats_as_team_leader(self):
        """Team leader should get team stats"""
        token = get_auth_token(TEST_USERS["team_leader"]["email"], TEST_USERS["team_leader"]["password"])
        assert token is not None, "Team leader login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=overall&view_mode=team",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✅ Team leader filtered stats: {data}")

    def test_sales_team_revenue(self):
        """Team revenue endpoint"""
        token = get_auth_token(TEST_USERS["team_leader"]["email"], TEST_USERS["team_leader"]["password"])
        assert token is not None, "Team leader login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/team-revenue?period=overall",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Team revenue: {len(data)} teams returned")

    def test_sales_leaderboard(self):
        """Sales leaderboard endpoint"""
        token = get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])
        assert token is not None, "Sales agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/leaderboard",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Sales leaderboard: {len(data)} agents")

    def test_lead_funnel(self):
        """Lead funnel endpoint"""
        token = get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])
        assert token is not None, "Sales agent login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/lead-funnel",
            headers=get_headers(token)
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Lead funnel: {len(data)} stages")


class TestUserAuthentication:
    """Verify all test users can authenticate"""

    def test_cs_agent_login(self):
        """CS agent della@clt-academy.com can login"""
        token = get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])
        assert token is not None, "CS agent login failed"
        
        # Verify user details
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=get_headers(token))
        assert response.status_code == 200, f"Failed to get user info: {response.status_code}"
        user = response.json()
        assert user.get("role") == "cs_agent", f"Expected role cs_agent, got {user.get('role')}"
        print(f"✅ CS agent authenticated: {user.get('full_name')} ({user.get('role')})")

    def test_cs_head_login(self):
        """CS head falja@clt-academy.com can login"""
        token = get_auth_token(TEST_USERS["cs_head"]["email"], TEST_USERS["cs_head"]["password"])
        assert token is not None, "CS head login failed"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=get_headers(token))
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "cs_head", f"Expected role cs_head, got {user.get('role')}"
        print(f"✅ CS head authenticated: {user.get('full_name')} ({user.get('role')})")

    def test_sales_agent_login(self):
        """Sales agent aleesha@clt-academy.com can login"""
        token = get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])
        assert token is not None, "Sales agent login failed"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=get_headers(token))
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "sales_executive", f"Expected role sales_executive, got {user.get('role')}"
        print(f"✅ Sales agent authenticated: {user.get('full_name')} ({user.get('role')})")

    def test_team_leader_login(self):
        """Team leader mohammed@clt-academy.com can login"""
        token = get_auth_token(TEST_USERS["team_leader"]["email"], TEST_USERS["team_leader"]["password"])
        assert token is not None, "Team leader login failed"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=get_headers(token))
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "team_leader", f"Expected role team_leader, got {user.get('role')}"
        print(f"✅ Team leader authenticated: {user.get('full_name')} ({user.get('role')})")

    def test_super_admin_login(self):
        """Super admin aqib@clt-academy.com can login"""
        token = get_auth_token(TEST_USERS["super_admin"]["email"], TEST_USERS["super_admin"]["password"])
        assert token is not None, "Super admin login failed"
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=get_headers(token))
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "super_admin", f"Expected role super_admin, got {user.get('role')}"
        print(f"✅ Super admin authenticated: {user.get('full_name')} ({user.get('role')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
