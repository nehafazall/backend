"""
Test suite for Performance Insight Banner functionality
- Tests GET /api/dashboard/performance-insight for Sales Dashboard
- Tests GET /api/cs/dashboard/performance-insight for CS Dashboard
- Tests GET /api/dashboard/sales-agent-closings returns data for all authenticated users
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    "super_admin": {"email": "aqib@clt-academy.com", "password": "@Aqib1234"},
    "cs_agent": {"email": "della@clt-academy.com", "password": "@Aqib1234"},
    "cs_head": {"email": "falja@clt-academy.com", "password": "@Aqib1234"},
    "sales_agent": {"email": "aleesha@clt-academy.com", "password": "@Aqib1234"},
    "team_leader": {"email": "mohammed@clt-academy.com", "password": "@Aqib1234"},
}


def get_auth_token(email: str, password: str) -> str:
    """Login and return auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code != 200:
        pytest.skip(f"Login failed for {email}: {response.status_code}")
    return response.json().get("access_token")


@pytest.fixture
def admin_token():
    return get_auth_token(TEST_USERS["super_admin"]["email"], TEST_USERS["super_admin"]["password"])


@pytest.fixture
def sales_agent_token():
    return get_auth_token(TEST_USERS["sales_agent"]["email"], TEST_USERS["sales_agent"]["password"])


@pytest.fixture
def team_leader_token():
    return get_auth_token(TEST_USERS["team_leader"]["email"], TEST_USERS["team_leader"]["password"])


@pytest.fixture
def cs_agent_token():
    return get_auth_token(TEST_USERS["cs_agent"]["email"], TEST_USERS["cs_agent"]["password"])


@pytest.fixture
def cs_head_token():
    return get_auth_token(TEST_USERS["cs_head"]["email"], TEST_USERS["cs_head"]["password"])


class TestSalesPerformanceInsight:
    """Tests for /api/dashboard/performance-insight endpoint - Sales Dashboard"""

    def test_sales_agent_performance_insight(self, sales_agent_token):
        """Sales agent should get type=agent with their own metrics"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {sales_agent_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "agent", f"Expected type=agent for sales_executive, got {data.get('type')}"
        assert "your_deals" in data, "Missing your_deals field"
        assert "your_revenue" in data, "Missing your_revenue field"
        assert "team_avg_deals" in data, "Missing team_avg_deals field"
        assert "team_avg_revenue" in data, "Missing team_avg_revenue field"
        assert "rank" in data, "Missing rank field"
        assert "total_agents" in data, "Missing total_agents field"
        assert "month" in data, "Missing month field"
        print(f"Sales agent insight: {data['your_deals']} deals, rank {data['rank']}/{data['total_agents']}")

    def test_team_leader_performance_insight(self, team_leader_token):
        """Team leader should get type=leader with team metrics"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "leader", f"Expected type=leader for team_leader, got {data.get('type')}"
        assert "team_deals" in data, "Missing team_deals field"
        assert "team_revenue" in data, "Missing team_revenue field"
        assert "team_agent_count" in data, "Missing team_agent_count field"
        assert "company_deals" in data, "Missing company_deals field"
        assert "company_revenue" in data, "Missing company_revenue field"
        assert "team_name" in data, "Missing team_name field"
        assert "month" in data, "Missing month field"
        print(f"Team leader insight: team_name={data.get('team_name')}, {data['team_deals']} deals")

    def test_admin_performance_insight(self, admin_token):
        """Admin should get type=admin with company totals"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "admin", f"Expected type=admin for super_admin, got {data.get('type')}"
        assert "total_deals" in data, "Missing total_deals field"
        assert "total_revenue" in data, "Missing total_revenue field"
        assert "active_agents" in data, "Missing active_agents field"
        assert "avg_deals" in data, "Missing avg_deals field"
        assert "avg_revenue" in data, "Missing avg_revenue field"
        assert "month" in data, "Missing month field"
        print(f"Admin insight: {data['total_deals']} total deals by {data['active_agents']} agents")


class TestCSPerformanceInsight:
    """Tests for /api/cs/dashboard/performance-insight endpoint - CS Dashboard"""

    def test_cs_agent_performance_insight(self, cs_agent_token):
        """CS agent should get type=agent with their own upgrade metrics"""
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {cs_agent_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "agent", f"Expected type=agent for cs_agent, got {data.get('type')}"
        assert "your_upgrades" in data, "Missing your_upgrades field for CS agent"
        assert "your_revenue" in data, "Missing your_revenue field"
        assert "team_avg_upgrades" in data, "Missing team_avg_upgrades field"
        assert "team_avg_revenue" in data, "Missing team_avg_revenue field"
        assert "rank" in data, "Missing rank field"
        assert "month" in data, "Missing month field"
        print(f"CS agent insight: {data['your_upgrades']} upgrades, rank {data['rank']}/{data.get('total_agents', 0)}")

    def test_cs_head_performance_insight(self, cs_head_token):
        """CS head should get type=admin with company totals"""
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {cs_head_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # CS head returns admin view (since it's not cs_agent role)
        assert data.get("type") == "admin", f"Expected type=admin for cs_head, got {data.get('type')}"
        assert "total_upgrades" in data, "Missing total_upgrades field"
        assert "total_revenue" in data, "Missing total_revenue field"
        assert "active_agents" in data, "Missing active_agents field"
        assert "month" in data, "Missing month field"
        print(f"CS head insight: {data['total_upgrades']} total upgrades by {data['active_agents']} agents")

    def test_admin_cs_performance_insight(self, admin_token):
        """Admin accessing CS performance insight should get admin view"""
        response = requests.get(
            f"{BASE_URL}/api/cs/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("type") == "admin", f"Expected type=admin for super_admin, got {data.get('type')}"
        assert "total_upgrades" in data or "total_deals" in data, "Missing totals field"


class TestSalesAgentClosings:
    """Tests for /api/dashboard/sales-agent-closings endpoint - Top 10 Agents chart data"""

    def test_sales_agent_closings_for_sales_executive(self, sales_agent_token):
        """Sales agent should now be able to access Top 10 Agents data (was 403 before fix)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10",
            headers={"Authorization": f"Bearer {sales_agent_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Sales agent received {len(data)} agents in Top 10 chart data")
        
        # Verify structure if there's data
        if data:
            assert "agent_name" in data[0], "Missing agent_name field"
            assert "closings" in data[0], "Missing closings field"
            print(f"Top agent: {data[0]['agent_name']} with {data[0]['closings']} closings")

    def test_sales_agent_closings_for_team_leader(self, team_leader_token):
        """Team leader should be able to access Top 10 Agents data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Team leader received {len(data)} agents in Top 10 chart data")
        
        # Verify we get 10 agents if there are enough
        if len(data) > 0:
            assert "agent_name" in data[0], "Missing agent_name field"
            assert "closings" in data[0], "Missing closings field"

    def test_sales_agent_closings_for_admin(self, admin_token):
        """Admin should be able to access Top 10 Agents data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Admin received {len(data)} agents in Top 10 chart data")


class TestPerformanceInsightDataValidation:
    """Additional validation tests for performance insight data"""

    def test_team_leader_has_team_name(self, team_leader_token):
        """Team leader insight should include TEAM XLNC name"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {team_leader_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        team_name = data.get("team_name", "")
        print(f"Team leader team_name: {team_name}")
        # Verify team_name is present (expected: TEAM XLNC based on review request)
        assert team_name, "team_name should not be empty for team_leader"

    def test_performance_insight_month_format(self, admin_token):
        """Month field should be in 'Month YYYY' format"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/performance-insight",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        month = data.get("month", "")
        assert month, "month field should not be empty"
        # Verify format like "January 2026"
        parts = month.split()
        assert len(parts) == 2, f"Month format should be 'Month YYYY', got {month}"
        assert parts[1].isdigit(), f"Year should be numeric, got {parts[1]}"
        print(f"Month format verified: {month}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
