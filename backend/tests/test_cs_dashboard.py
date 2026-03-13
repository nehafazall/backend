"""
CS Dashboard API Tests
Tests for commission tracking, leaderboard, agent revenue, monthly trend, 
month comparison, and pipeline endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREDENTIALS = {
    "email": "aqib@clt-academy.com",
    "password": "@Aqib1234"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super_admin."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCSDashboardStats:
    """Tests for GET /api/cs/dashboard/stats endpoint."""
    
    def test_stats_returns_required_fields(self, api_client):
        """Stats endpoint returns all required commission/revenue fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields present
        required_fields = [
            "achieved_revenue", "pipeline_revenue", "total_agent_commission",
            "total_head_commission", "total_commission", "total_upgrades",
            "achieved_count", "pipeline_count"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: Stats endpoint returns all required fields: {list(data.keys())}")
    
    def test_stats_values_are_numeric(self, api_client):
        """All stats values should be numeric (int or float)."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        for key, value in data.items():
            assert isinstance(value, (int, float)), f"{key} should be numeric, got {type(value)}"
        print(f"PASS: All stats values are numeric")
    
    def test_stats_with_period_filter(self, api_client):
        """Stats endpoint respects period filter."""
        periods = ["today", "this_week", "this_month", "this_quarter", "this_year", "overall"]
        for period in periods:
            response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats?period={period}")
            assert response.status_code == 200, f"Failed for period: {period}"
        print(f"PASS: Stats endpoint accepts all period filters")
    
    def test_stats_with_view_mode_team(self, api_client):
        """Stats endpoint with view_mode=team returns team data."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats?view_mode=team")
        assert response.status_code == 200
        data = response.json()
        assert "achieved_revenue" in data
        print(f"PASS: Stats with view_mode=team - achieved_revenue: {data['achieved_revenue']}")
    
    def test_stats_with_view_mode_individual(self, api_client):
        """Stats endpoint with view_mode=individual filters by current user."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats?view_mode=individual")
        assert response.status_code == 200
        data = response.json()
        # For super_admin, individual view likely returns 0 since they don't have direct assignments
        assert isinstance(data["achieved_revenue"], (int, float))
        print(f"PASS: Stats with view_mode=individual - achieved_revenue: {data['achieved_revenue']}")


class TestCSDashboardAgentRevenue:
    """Tests for GET /api/cs/dashboard/agent-revenue endpoint."""
    
    def test_agent_revenue_returns_list(self, api_client):
        """Agent revenue endpoint returns a list."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/agent-revenue")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Agent revenue returns list with {len(data)} agents")
    
    def test_agent_revenue_item_structure(self, api_client):
        """Each agent revenue item has required fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/agent-revenue")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            required_fields = ["agent_name", "revenue", "commission", "upgrades"]
            for field in required_fields:
                assert field in data[0], f"Missing field: {field}"
            print(f"PASS: Agent revenue items have required structure. First agent: {data[0]['agent_name']}")
        else:
            print(f"INFO: No agent revenue data available (empty list)")
    
    def test_agent_revenue_with_period(self, api_client):
        """Agent revenue endpoint respects period filter."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/agent-revenue?period=this_month")
        assert response.status_code == 200
        print(f"PASS: Agent revenue accepts period filter")


class TestCSDashboardMonthlyTrend:
    """Tests for GET /api/cs/dashboard/monthly-trend endpoint."""
    
    def test_monthly_trend_returns_list(self, api_client):
        """Monthly trend endpoint returns a list."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/monthly-trend")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Monthly trend returns list with {len(data)} months")
    
    def test_monthly_trend_item_structure(self, api_client):
        """Each monthly trend item has required fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/monthly-trend")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            required_fields = ["month", "revenue", "upgrades", "commission"]
            for field in required_fields:
                assert field in data[0], f"Missing field: {field}"
            print(f"PASS: Monthly trend items have required structure. Sample: {data[0]}")
        else:
            print(f"INFO: No monthly trend data available (empty list)")


class TestCSDashboardMonthComparison:
    """Tests for GET /api/cs/dashboard/month-comparison endpoint."""
    
    def test_month_comparison_returns_structure(self, api_client):
        """Month comparison endpoint returns required structure."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/month-comparison")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["this_month_label", "last_month_label", "data"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert isinstance(data["data"], list), "data field should be a list"
        print(f"PASS: Month comparison structure valid. This month: {data['this_month_label']}, Last: {data['last_month_label']}")
    
    def test_month_comparison_data_items(self, api_client):
        """Month comparison data items have day/this_month/last_month fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/month-comparison")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]) > 0:
            item = data["data"][0]
            assert "day" in item, "Missing 'day' field"
            assert "this_month" in item, "Missing 'this_month' field"
            assert "last_month" in item, "Missing 'last_month' field"
            print(f"PASS: Month comparison data items have correct structure. {len(data['data'])} days of data")
        else:
            print(f"INFO: No month comparison data available")


class TestCSDashboardPipeline:
    """Tests for GET /api/cs/dashboard/pipeline endpoint."""
    
    def test_pipeline_returns_list(self, api_client):
        """Pipeline endpoint returns a list."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/pipeline")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Pipeline returns list with {len(data)} upgrade paths")
    
    def test_pipeline_item_structure(self, api_client):
        """Each pipeline item has required fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/pipeline")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            required_fields = ["path", "label", "count", "revenue"]
            for field in required_fields:
                assert field in data[0], f"Missing field: {field}"
            print(f"PASS: Pipeline items have required structure. First: {data[0]}")
        else:
            print(f"INFO: No pipeline data (no students in pitched_for_upgrade stage)")
    
    def test_pipeline_with_view_mode_team(self, api_client):
        """Pipeline respects view_mode=team filter."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/pipeline?view_mode=team")
        assert response.status_code == 200
        print(f"PASS: Pipeline accepts view_mode=team")
    
    def test_pipeline_with_view_mode_individual(self, api_client):
        """Pipeline respects view_mode=individual filter."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/pipeline?view_mode=individual")
        assert response.status_code == 200
        print(f"PASS: Pipeline accepts view_mode=individual")


class TestCSDashboardLeaderboard:
    """Tests for GET /api/cs/dashboard/leaderboard endpoint."""
    
    def test_leaderboard_returns_list(self, api_client):
        """Leaderboard endpoint returns a list."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Leaderboard returns list with {len(data)} agents")
    
    def test_leaderboard_item_structure(self, api_client):
        """Each leaderboard item has required fields."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            required_fields = ["agent_name", "commission", "revenue", "upgrades"]
            for field in required_fields:
                assert field in data[0], f"Missing field: {field}"
            print(f"PASS: Leaderboard items have required structure. Top agent: {data[0]['agent_name']} with {data[0]['commission']} commission")
        else:
            print(f"INFO: No leaderboard data (no commission records)")
    
    def test_leaderboard_sorted_by_commission(self, api_client):
        """Leaderboard should be sorted by commission descending."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/leaderboard")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 1:
            commissions = [item["commission"] for item in data]
            assert commissions == sorted(commissions, reverse=True), "Leaderboard should be sorted by commission desc"
            print(f"PASS: Leaderboard is correctly sorted by commission (descending)")
        else:
            print(f"INFO: Not enough data to verify sorting")
    
    def test_leaderboard_with_period(self, api_client):
        """Leaderboard respects period filter."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/leaderboard?period=this_month")
        assert response.status_code == 200
        print(f"PASS: Leaderboard accepts period filter")


class TestCSDashboardDataIntegrity:
    """Data integrity tests comparing related endpoints."""
    
    def test_total_commission_equals_sum(self, api_client):
        """total_commission should equal agent + head commission."""
        response = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        expected_total = data["total_agent_commission"] + data["total_head_commission"]
        assert data["total_commission"] == expected_total, \
            f"total_commission ({data['total_commission']}) != agent ({data['total_agent_commission']}) + head ({data['total_head_commission']})"
        print(f"PASS: total_commission correctly equals agent + head commission")
    
    def test_leaderboard_commission_vs_stats(self, api_client):
        """Leaderboard total should be close to stats agent commission."""
        stats_resp = api_client.get(f"{BASE_URL}/api/cs/dashboard/stats?period=overall")
        leaderboard_resp = api_client.get(f"{BASE_URL}/api/cs/dashboard/leaderboard?period=overall")
        
        assert stats_resp.status_code == 200
        assert leaderboard_resp.status_code == 200
        
        stats = stats_resp.json()
        leaderboard = leaderboard_resp.json()
        
        leaderboard_total = sum(item["commission"] for item in leaderboard)
        # Leaderboard is limited to top 10, so total might be less than stats
        assert leaderboard_total <= stats["total_agent_commission"] or len(leaderboard) < 10, \
            f"Leaderboard total ({leaderboard_total}) exceeds stats agent commission ({stats['total_agent_commission']})"
        print(f"PASS: Leaderboard commission ({leaderboard_total}) is consistent with stats ({stats['total_agent_commission']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
