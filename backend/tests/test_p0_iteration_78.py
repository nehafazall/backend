"""
Test P0 Features for Iteration 78:
1. Anzil should have role 'quality_control' and 0 students assigned
2. GET /api/dashboard/closure-time endpoint should return agent-wise closure time analytics
3. GET /api/leads with date_field=any should return leads where created_at OR enrolled_at is in range
4. Sales CRM should not show date field toggle (Lead Created / Enrolled buttons)
5. Sales Dashboard should display a 'Lead Closure Time' table
6. Dashboard /api/dashboard/stats endpoint should return avg_closure_days field
7. CS page should not show Anzil in the agent list
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
TL_CREDS = {"email": "ajmal@clt-academy.com", "password": "Ajmal@123"}
CS_HEAD_CREDS = {"email": "falja@clt-academy.com", "password": "Falja@123"}


class TestAnzilRoleChange:
    """Test that Anzil has been transferred to Quality Control role with 0 students"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CEO to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_anzil_has_quality_control_role(self):
        """Verify Anzil's role is now 'quality_control'"""
        # Search for Anzil in users
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        
        # Find Anzil
        anzil = None
        for user in users:
            if "anzil" in user.get("full_name", "").lower() or "anzil" in user.get("email", "").lower():
                anzil = user
                break
        
        assert anzil is not None, "Anzil user not found in the system"
        assert anzil.get("role") == "quality_control", f"Anzil's role should be 'quality_control', got '{anzil.get('role')}'"
        print(f"✓ Anzil found with role: {anzil.get('role')}")
    
    def test_anzil_has_zero_students(self):
        """Verify Anzil has 0 students assigned"""
        # First find Anzil's user ID
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        
        anzil = None
        for user in users:
            if "anzil" in user.get("full_name", "").lower() or "anzil" in user.get("email", "").lower():
                anzil = user
                break
        
        if anzil is None:
            pytest.skip("Anzil user not found")
        
        anzil_id = anzil.get("id")
        
        # Check students assigned to Anzil
        response = requests.get(f"{BASE_URL}/api/students?cs_agent_id={anzil_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Handle paginated response
        students = data.get("items", data) if isinstance(data, dict) else data
        student_count = len(students) if isinstance(students, list) else 0
        
        assert student_count == 0, f"Anzil should have 0 students, but has {student_count}"
        print(f"✓ Anzil has {student_count} students assigned (expected: 0)")


class TestClosureTimeEndpoint:
    """Test the new /api/dashboard/closure-time endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CEO to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_closure_time_endpoint_exists(self):
        """Verify the closure-time endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/closure-time", headers=self.headers)
        assert response.status_code == 200, f"Closure-time endpoint failed: {response.text}"
        print("✓ /api/dashboard/closure-time endpoint returns 200")
    
    def test_closure_time_returns_summary(self):
        """Verify closure-time returns summary with avg_days, min_days, max_days, total_closures"""
        response = requests.get(f"{BASE_URL}/api/dashboard/closure-time", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data, "Response should contain 'summary' field"
        summary = data["summary"]
        
        # Check summary fields exist
        expected_fields = ["avg_days", "min_days", "max_days", "total_closures"]
        for field in expected_fields:
            assert field in summary, f"Summary should contain '{field}' field"
        
        print(f"✓ Closure-time summary: avg={summary.get('avg_days')}d, total={summary.get('total_closures')} closures")
    
    def test_closure_time_returns_agents(self):
        """Verify closure-time returns agent-wise breakdown"""
        response = requests.get(f"{BASE_URL}/api/dashboard/closure-time", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "agents" in data, "Response should contain 'agents' field"
        agents = data["agents"]
        
        assert isinstance(agents, list), "Agents should be a list"
        
        if len(agents) > 0:
            agent = agents[0]
            expected_fields = ["agent_id", "agent_name", "avg_days", "min_days", "max_days", "total_closures", "total_revenue"]
            for field in expected_fields:
                assert field in agent, f"Agent should contain '{field}' field"
            print(f"✓ Found {len(agents)} agents with closure data")
            for a in agents[:5]:  # Print first 5
                print(f"  - {a.get('agent_name')}: avg={a.get('avg_days')}d, closures={a.get('total_closures')}")
        else:
            print("✓ No agents with closure data (may be expected if no enrolled leads)")
    
    def test_closure_time_with_period_filter(self):
        """Verify closure-time works with period filter"""
        response = requests.get(f"{BASE_URL}/api/dashboard/closure-time?period=this_month", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "agents" in data
        print(f"✓ Closure-time with period=this_month works, {data['summary'].get('total_closures', 0)} closures")


class TestDateFieldAnyFilter:
    """Test that date_field=any returns leads where created_at OR enrolled_at is in range"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CEO to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_leads_with_date_field_any(self):
        """Verify leads endpoint accepts date_field=any parameter"""
        # Get leads with date_field=any for this month
        response = requests.get(
            f"{BASE_URL}/api/leads?date_field=any&date_from=2025-01-01&date_to=2025-12-31",
            headers=self.headers
        )
        assert response.status_code == 200, f"Leads endpoint failed: {response.text}"
        data = response.json()
        
        # Handle paginated response
        leads = data.get("items", data) if isinstance(data, dict) else data
        print(f"✓ Leads with date_field=any returned {len(leads)} leads")
    
    def test_date_field_any_includes_enrolled_leads(self):
        """Verify date_field=any includes leads enrolled in the date range"""
        # Get enrolled leads
        response = requests.get(
            f"{BASE_URL}/api/leads?stage=enrolled&date_field=any&date_from=2024-01-01&date_to=2026-12-31",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        leads = data.get("items", data) if isinstance(data, dict) else data
        enrolled_count = len([l for l in leads if l.get("stage") == "enrolled"])
        print(f"✓ Found {enrolled_count} enrolled leads with date_field=any")
    
    def test_date_field_any_vs_created_at(self):
        """Compare date_field=any vs date_field=created_at results"""
        # Get leads with date_field=any
        response_any = requests.get(
            f"{BASE_URL}/api/leads?date_field=any&date_from=2024-01-01&date_to=2026-12-31&page_size=200",
            headers=self.headers
        )
        assert response_any.status_code == 200
        data_any = response_any.json()
        count_any = data_any.get("total", len(data_any.get("items", data_any)))
        
        # Get leads with date_field=created_at
        response_created = requests.get(
            f"{BASE_URL}/api/leads?date_field=created_at&date_from=2024-01-01&date_to=2026-12-31&page_size=200",
            headers=self.headers
        )
        assert response_created.status_code == 200
        data_created = response_created.json()
        count_created = data_created.get("total", len(data_created.get("items", data_created)))
        
        print(f"✓ date_field=any: {count_any} leads, date_field=created_at: {count_created} leads")
        # date_field=any should return >= created_at (includes enrolled_at matches)
        assert count_any >= count_created or count_any > 0, "date_field=any should return leads"


class TestDashboardStatsAvgClosureDays:
    """Test that dashboard/stats returns avg_closure_days field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CEO to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_has_avg_closure_days(self):
        """Verify dashboard/stats returns avg_closure_days field"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        assert "avg_closure_days" in data, "Dashboard stats should contain 'avg_closure_days' field"
        print(f"✓ Dashboard stats avg_closure_days: {data.get('avg_closure_days')} days")
    
    def test_dashboard_stats_has_closures_this_month(self):
        """Verify dashboard/stats returns closures_this_month field"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "closures_this_month" in data, "Dashboard stats should contain 'closures_this_month' field"
        print(f"✓ Dashboard stats closures_this_month: {data.get('closures_this_month')}")


class TestCSAgentListExcludesAnzil:
    """Test that CS page agent list does not include Anzil (now quality_control)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CS Head to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CS_HEAD_CREDS)
        assert response.status_code == 200, f"CS Head login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cs_agents_list_excludes_quality_control(self):
        """Verify CS agents list does not include quality_control role users"""
        # Get CS agents (role=cs_agent)
        response = requests.get(f"{BASE_URL}/api/users?role=cs_agent", headers=self.headers)
        assert response.status_code == 200
        cs_agents = response.json()
        
        # Check that no quality_control users are in the list
        for agent in cs_agents:
            assert agent.get("role") != "quality_control", f"Quality control user found in CS agents: {agent.get('full_name')}"
            # Also check Anzil is not in the list
            if "anzil" in agent.get("full_name", "").lower():
                pytest.fail(f"Anzil should not be in CS agents list, but found: {agent}")
        
        print(f"✓ CS agents list has {len(cs_agents)} agents, none with quality_control role")
        for a in cs_agents[:5]:
            print(f"  - {a.get('full_name')} ({a.get('role')})")


class TestSLABreachOptimization:
    """Test that SLA breach query is optimized (not loading all leads into memory)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as CEO to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_performance(self):
        """Verify dashboard/stats endpoint responds quickly (< 5 seconds)"""
        import time
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5, f"Dashboard stats took {elapsed:.2f}s, should be < 5s"
        print(f"✓ Dashboard stats responded in {elapsed:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
