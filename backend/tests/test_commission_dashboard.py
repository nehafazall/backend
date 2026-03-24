"""
Commission Dashboard API Tests
Tests for:
- GET /api/commissions/dashboard - Role-based commission data
- GET /api/commissions/scatter-data - 6 months trend data
- GET /api/commissions/ceo/drill - CEO drill-down by department
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
CS_HEAD = {"email": "falja@clt-academy.com", "password": "Falja@123"}
BD_AGENT = {"email": "rashidha@clt-academy.com", "password": "Rashida@123"}


def get_auth_token(email: str, password: str) -> str:
    """Get authentication token for a user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token"""
    token = get_auth_token(SUPER_ADMIN["email"], SUPER_ADMIN["password"])
    if not token:
        pytest.skip("Super admin authentication failed")
    return token


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS head token"""
    token = get_auth_token(CS_HEAD["email"], CS_HEAD["password"])
    if not token:
        pytest.skip("CS head authentication failed")
    return token


@pytest.fixture(scope="module")
def bd_agent_token():
    """Get BD agent token"""
    token = get_auth_token(BD_AGENT["email"], BD_AGENT["password"])
    if not token:
        pytest.skip("BD agent authentication failed")
    return token


class TestCommissionDashboardCEO:
    """Tests for CEO/super_admin commission dashboard view"""

    def test_dashboard_returns_200_for_super_admin(self, super_admin_token):
        """CEO dashboard endpoint returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: CEO dashboard returns 200")

    def test_dashboard_has_sales_commissions(self, super_admin_token):
        """CEO dashboard includes sales_commissions array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "sales_commissions" in data, f"Missing sales_commissions in response: {data.keys()}"
        assert isinstance(data["sales_commissions"], list), "sales_commissions should be a list"
        print(f"PASS: CEO dashboard has sales_commissions with {len(data['sales_commissions'])} agents")

    def test_dashboard_has_cs_commissions(self, super_admin_token):
        """CEO dashboard includes cs_commissions array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "cs_commissions" in data, f"Missing cs_commissions in response: {data.keys()}"
        assert isinstance(data["cs_commissions"], list), "cs_commissions should be a list"
        print(f"PASS: CEO dashboard has cs_commissions with {len(data['cs_commissions'])} agents")

    def test_dashboard_has_sm_bonus_pool(self, super_admin_token):
        """CEO dashboard includes sm_bonus_pool"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "sm_bonus_pool" in data, f"Missing sm_bonus_pool in response: {data.keys()}"
        print(f"PASS: CEO dashboard has sm_bonus_pool: {data['sm_bonus_pool']}")

    def test_dashboard_has_mentor_pool(self, super_admin_token):
        """CEO dashboard includes mentor_pool"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "mentor_pool" in data, f"Missing mentor_pool in response: {data.keys()}"
        print(f"PASS: CEO dashboard has mentor_pool: {data['mentor_pool']}")

    def test_dashboard_has_total_sales_earned(self, super_admin_token):
        """CEO dashboard includes total_sales_earned"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "total_sales_earned" in data, f"Missing total_sales_earned in response: {data.keys()}"
        print(f"PASS: CEO dashboard has total_sales_earned: {data['total_sales_earned']}")

    def test_dashboard_has_total_cs_earned(self, super_admin_token):
        """CEO dashboard includes total_cs_earned"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "total_cs_earned" in data, f"Missing total_cs_earned in response: {data.keys()}"
        print(f"PASS: CEO dashboard has total_cs_earned: {data['total_cs_earned']}")

    def test_dashboard_with_month_param(self, super_admin_token):
        """CEO dashboard accepts month parameter"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month=2025-01", headers=headers, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert data.get("month") == "2025-01", f"Month mismatch: {data.get('month')}"
        print("PASS: CEO dashboard accepts month parameter")


class TestCommissionDashboardCSHead:
    """Tests for CS Head commission dashboard view"""

    def test_dashboard_returns_200_for_cs_head(self, cs_head_token):
        """CS Head dashboard endpoint returns 200"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: CS Head dashboard returns 200")

    def test_cs_head_has_my_commission(self, cs_head_token):
        """CS Head dashboard includes my_commission"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "my_commission" in data, f"Missing my_commission in response: {data.keys()}"
        my_comm = data["my_commission"]
        assert "earned_commission" in my_comm, "my_commission missing earned_commission"
        assert "pending_commission" in my_comm, "my_commission missing pending_commission"
        print(f"PASS: CS Head has my_commission with earned={my_comm['earned_commission']}, pending={my_comm['pending_commission']}")

    def test_cs_head_has_team_commissions(self, cs_head_token):
        """CS Head dashboard includes team_commissions"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "team_commissions" in data, f"Missing team_commissions in response: {data.keys()}"
        assert isinstance(data["team_commissions"], list), "team_commissions should be a list"
        print(f"PASS: CS Head has team_commissions with {len(data['team_commissions'])} agents")

    def test_cs_head_has_total_cs_head_earned(self, cs_head_token):
        """CS Head dashboard includes total_cs_head_earned"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        assert "total_cs_head_earned" in data, f"Missing total_cs_head_earned in response: {data.keys()}"
        print(f"PASS: CS Head has total_cs_head_earned: {data['total_cs_head_earned']}")


class TestCommissionScatterData:
    """Tests for scatter data endpoint (XY chart)"""

    def test_scatter_data_returns_200(self, super_admin_token):
        """Scatter data endpoint returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/scatter-data?months=6", headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Scatter data returns 200")

    def test_scatter_data_has_6_months(self, super_admin_token):
        """Scatter data returns 6 months of data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/scatter-data?months=6", headers=headers, timeout=30)
        data = response.json()
        assert "data" in data, f"Missing data in response: {data.keys()}"
        assert len(data["data"]) == 6, f"Expected 6 data points, got {len(data['data'])}"
        print(f"PASS: Scatter data has 6 months of data")

    def test_scatter_data_has_commission_and_net_pay(self, super_admin_token):
        """Scatter data points have commission and net_pay"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/scatter-data?months=6", headers=headers, timeout=30)
        data = response.json()
        for point in data["data"]:
            assert "commission" in point, f"Missing commission in data point: {point}"
            assert "net_pay" in point, f"Missing net_pay in data point: {point}"
            assert "label" in point, f"Missing label in data point: {point}"
        print("PASS: Scatter data points have commission and net_pay")

    def test_scatter_data_has_agent_name(self, super_admin_token):
        """Scatter data includes agent_name"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/scatter-data?months=6", headers=headers, timeout=30)
        data = response.json()
        assert "agent_name" in data, f"Missing agent_name in response: {data.keys()}"
        print(f"PASS: Scatter data has agent_name: {data['agent_name']}")


class TestCEODrillDown:
    """Tests for CEO drill-down endpoint"""

    def test_drill_sales_returns_200(self, super_admin_token):
        """CEO drill-down for sales returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=sales", headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: CEO drill-down for sales returns 200")

    def test_drill_sales_has_rows(self, super_admin_token):
        """CEO drill-down for sales has rows array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=sales", headers=headers, timeout=30)
        data = response.json()
        assert "rows" in data, f"Missing rows in response: {data.keys()}"
        assert isinstance(data["rows"], list), "rows should be a list"
        print(f"PASS: CEO drill-down for sales has {len(data['rows'])} rows")

    def test_drill_sales_row_structure(self, super_admin_token):
        """CEO drill-down sales rows have correct structure"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=sales", headers=headers, timeout=30)
        data = response.json()
        if data["rows"]:
            row = data["rows"][0]
            required_fields = ["sr", "name", "role", "achieved", "earned_commission", "pending_commission", "benchmark_crossed", "tl_commission", "sm_pool"]
            for field in required_fields:
                assert field in row, f"Missing {field} in sales row: {row.keys()}"
            print(f"PASS: Sales drill-down row has all required fields")
        else:
            print("SKIP: No sales rows to verify structure")

    def test_drill_cs_returns_200(self, super_admin_token):
        """CEO drill-down for CS returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=cs", headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: CEO drill-down for CS returns 200")

    def test_drill_cs_has_rows(self, super_admin_token):
        """CEO drill-down for CS has rows array"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=cs", headers=headers, timeout=30)
        data = response.json()
        assert "rows" in data, f"Missing rows in response: {data.keys()}"
        assert isinstance(data["rows"], list), "rows should be a list"
        print(f"PASS: CEO drill-down for CS has {len(data['rows'])} rows")

    def test_drill_cs_row_structure(self, super_admin_token):
        """CEO drill-down CS rows have correct structure"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=cs", headers=headers, timeout=30)
        data = response.json()
        if data["rows"]:
            row = data["rows"][0]
            required_fields = ["sr", "name", "role", "upgrades", "earned_commission", "pending_commission", "cs_head_commission", "mentor_commission"]
            for field in required_fields:
                assert field in row, f"Missing {field} in CS row: {row.keys()}"
            print(f"PASS: CS drill-down row has all required fields")
        else:
            print("SKIP: No CS rows to verify structure")

    def test_drill_requires_super_admin(self, cs_head_token):
        """CEO drill-down requires super_admin role"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=sales", headers=headers, timeout=30)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: CEO drill-down requires super_admin role")


class TestSalesExecutiveView:
    """Tests for sales executive commission view (using BD agent as proxy)"""

    def test_dashboard_returns_200_for_sales_role(self, bd_agent_token):
        """Dashboard returns 200 for sales-like role"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        # BD agent may not be sales_executive, so just check it returns something
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Dashboard returns 200 for BD agent")


class TestBenchmarkLogic:
    """Tests for 18K benchmark logic in sales commissions"""

    def test_sales_commission_has_benchmark_field(self, super_admin_token):
        """Sales commission data includes benchmark field"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        if data.get("sales_commissions"):
            agent = data["sales_commissions"][0]
            assert "benchmark" in agent, f"Missing benchmark in sales agent data: {agent.keys()}"
            assert "benchmark_crossed" in agent, f"Missing benchmark_crossed in sales agent data: {agent.keys()}"
            assert agent["benchmark"] == 18000, f"Benchmark should be 18000, got {agent['benchmark']}"
            print(f"PASS: Sales commission has benchmark=18000 and benchmark_crossed field")
        else:
            print("SKIP: No sales commissions to verify benchmark")

    def test_earned_vs_pending_based_on_benchmark(self, super_admin_token):
        """Earned commission is 0 if benchmark not crossed"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard", headers=headers, timeout=30)
        data = response.json()
        for agent in data.get("sales_commissions", []):
            if not agent.get("benchmark_crossed"):
                # If benchmark not crossed, earned should be 0
                assert agent.get("earned_commission", 0) == 0, f"Agent {agent.get('agent_name')} has earned_commission but benchmark not crossed"
        print("PASS: Earned commission logic respects benchmark")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
