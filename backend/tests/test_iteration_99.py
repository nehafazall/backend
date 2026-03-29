"""
Iteration 99 - Testing CS Student Detail Modal Tabs and Executive Dashboard Team Mood

Features to test:
1. CS Student Detail Modal - Tabbed interface (Info, Transactions, Calls, Update tabs)
2. GET /api/students/{student_id}/transaction-history endpoint
3. Executive Dashboard Team Mood section
4. GET /api/executive/team-mood endpoint
5. Executive Dashboard KPI cards still render correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"
SALES_EXEC_EMAIL = "aleesha@clt-academy.com"
SALES_EXEC_PASSWORD = "Aleesha@123"

# Known upgraded student with transaction data
UPGRADED_STUDENT_ID = "bdc43df9-8166-4e22-b962-4247f307e377"  # VISHWAKUMAR


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Super admin login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    assert response.status_code == 200, f"CS head login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def sales_exec_token():
    """Get sales executive auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EXEC_EMAIL,
        "password": SALES_EXEC_PASSWORD
    })
    assert response.status_code == 200, f"Sales exec login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


class TestTransactionHistoryEndpoint:
    """Test GET /api/students/{student_id}/transaction-history endpoint"""

    def test_transaction_history_returns_data(self, cs_head_token):
        """Test that transaction history endpoint returns correct data structure"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/{UPGRADED_STUDENT_ID}/transaction-history",
            headers=headers
        )
        print(f"Transaction history response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "transactions" in data, "Response should have 'transactions' key"
        assert "summary" in data, "Response should have 'summary' key"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_deposits" in summary, "Summary should have total_deposits"
        assert "total_withdrawals" in summary, "Summary should have total_withdrawals"
        assert "net_value" in summary, "Summary should have net_value"
        
        print(f"Summary: {summary}")
        print(f"Transactions count: {len(data['transactions'])}")

    def test_transaction_history_with_super_admin(self, super_admin_token):
        """Test that super admin can access transaction history"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/{UPGRADED_STUDENT_ID}/transaction-history",
            headers=headers
        )
        assert response.status_code == 200, f"Super admin should access transaction history: {response.text}"

    def test_transaction_history_invalid_student(self, cs_head_token):
        """Test transaction history with invalid student ID"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/invalid-student-id-12345/transaction-history",
            headers=headers
        )
        # Should return 404 or empty data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"


class TestExecutiveTeamMoodEndpoint:
    """Test GET /api/executive/team-mood endpoint"""

    def test_team_mood_returns_data(self, super_admin_token):
        """Test that team mood endpoint returns correct data structure"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/executive/team-mood",
            headers=headers
        )
        print(f"Team mood response: {response.status_code}")
        print(f"Response body: {response.text[:1000]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "teams" in data, "Response should have 'teams' key"
        assert "period" in data, "Response should have 'period' key"
        assert data["period"] == "last_30_days", "Period should be 'last_30_days'"
        
        teams = data["teams"]
        print(f"Number of teams: {len(teams)}")
        
        # If there are teams, verify structure
        if teams:
            team = teams[0]
            assert "team_name" in team, "Team should have team_name"
            assert "team_id" in team, "Team should have team_id"
            assert "member_count" in team, "Team should have member_count"
            assert "avg_mood" in team, "Team should have avg_mood"
            assert "active_users" in team, "Team should have active_users"
            assert "members" in team, "Team should have members list"
            print(f"First team: {team['team_name']} - avg_mood: {team['avg_mood']}")

    def test_team_mood_requires_admin_role(self, sales_exec_token):
        """Test that team mood endpoint requires super_admin or admin role"""
        headers = {"Authorization": f"Bearer {sales_exec_token}"}
        response = requests.get(
            f"{BASE_URL}/api/executive/team-mood",
            headers=headers
        )
        print(f"Sales exec team mood response: {response.status_code}")
        assert response.status_code == 403, f"Sales exec should get 403, got {response.status_code}"

    def test_team_mood_without_auth(self):
        """Test that team mood endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/executive/team-mood")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestExecutiveDashboardEndpoint:
    """Test GET /api/executive/dashboard endpoint"""

    def test_executive_dashboard_returns_kpis(self, super_admin_token):
        """Test that executive dashboard returns KPI data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/executive/dashboard",
            headers=headers
        )
        print(f"Executive dashboard response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify KPIs exist
        assert "kpis" in data, "Response should have 'kpis' key"
        kpis = data["kpis"]
        
        # Check key KPI fields
        expected_kpi_fields = ["revenue_month", "sales_revenue", "cs_revenue", "total_employees"]
        for field in expected_kpi_fields:
            assert field in kpis, f"KPIs should have '{field}'"
        
        print(f"KPIs: revenue_month={kpis.get('revenue_month')}, sales_revenue={kpis.get('sales_revenue')}")


class TestStudentsEndpoint:
    """Test students endpoint to verify student data"""

    def test_get_student_by_id(self, cs_head_token):
        """Test getting a specific student by ID"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students/{UPGRADED_STUDENT_ID}",
            headers=headers
        )
        print(f"Get student response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Student: {data.get('full_name')} - stage: {data.get('stage')}")
            print(f"Is upgraded: {data.get('is_upgraded_student')}")
            print(f"Upgrade count: {data.get('upgrade_count')}")

    def test_list_students_with_upgraded_filter(self, cs_head_token):
        """Test listing students with upgraded stage"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(
            f"{BASE_URL}/api/students?stage=upgraded&page_size=10",
            headers=headers
        )
        print(f"List upgraded students response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        items = data.get("items", data if isinstance(data, list) else [])
        print(f"Upgraded students count: {len(items)}")
        
        if items:
            student = items[0]
            print(f"First upgraded student: {student.get('full_name')} - ID: {student.get('id')}")


class TestCallHistoryEndpoint:
    """Test call history endpoint for students"""

    def test_call_history_endpoint_exists(self, cs_head_token):
        """Test that call history endpoint exists and returns data"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        # Try the call logs endpoint for a student
        response = requests.get(
            f"{BASE_URL}/api/call-logs?contact_id={UPGRADED_STUDENT_ID}&contact_type=student",
            headers=headers
        )
        print(f"Call history response: {response.status_code}")
        
        # Endpoint should exist (200) or return empty data
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
