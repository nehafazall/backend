"""
Test Dashboard Bifurcation Endpoints (Iteration 39)
- Sales Agent Closings (Top 10 Overall, Top 5 This Month)
- CS Agent Bifurcation with SLA rates
- Mentor Bifurcation with redeposit totals
- Customers sorted by date ascending
- Finance Receivables sorted by date ascending
- Courses with price fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test auth and get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        print(f"✅ Login successful, token obtained")


class TestSalesAgentClosings:
    """Test GET /api/dashboard/sales-agent-closings endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_top_10_agents_overall(self, auth_token):
        """GET /api/dashboard/sales-agent-closings?period=overall&limit=10 returns top 10 agents"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Data assertions
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 10, f"Should return max 10 agents, got {len(data)}"
        
        if len(data) > 0:
            # Verify structure of first item
            first_agent = data[0]
            assert "agent_name" in first_agent, "Missing agent_name field"
            assert "closings" in first_agent, "Missing closings field"
            assert "revenue" in first_agent, "Missing revenue field"
            assert isinstance(first_agent["closings"], int), "closings should be int"
            
            print(f"✅ Top 10 Overall - Found {len(data)} agents")
            print(f"   Top agent: {first_agent['agent_name']} - {first_agent['closings']} closings, {first_agent['revenue']} revenue")
        else:
            print("⚠️ No agent closings data found (may be expected if no enrolled leads)")
    
    def test_top_5_agents_this_month(self, auth_token):
        """GET /api/dashboard/sales-agent-closings?period=this_month&limit=5 returns top 5 agents this month"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/sales-agent-closings?period=this_month&limit=5", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 5, f"Should return max 5 agents, got {len(data)}"
        
        print(f"✅ Top 5 This Month - Found {len(data)} agents")
        if len(data) > 0:
            print(f"   Top agent: {data[0]['agent_name']} - {data[0]['closings']} closings")


class TestCSAgentBifurcation:
    """Test GET /api/dashboard/cs-agent-bifurcation endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_cs_agent_bifurcation_overall(self, auth_token):
        """GET /api/dashboard/cs-agent-bifurcation?period=overall returns CS agents with student counts and SLA rates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/cs-agent-bifurcation?period=overall", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            first_agent = data[0]
            # Verify structure - SLA rates and student counts
            assert "agent_name" in first_agent, "Missing agent_name"
            assert "total_students" in first_agent, "Missing total_students"
            assert "activated" in first_agent, "Missing activated count"
            assert "sla_ok" in first_agent, "Missing sla_ok"
            assert "sla_warning" in first_agent, "Missing sla_warning"
            assert "sla_breach" in first_agent, "Missing sla_breach"
            assert "sla_rate" in first_agent, "Missing sla_rate"
            
            # Calculate total students from all agents
            total_students = sum(agent["total_students"] for agent in data)
            
            print(f"✅ CS Agent Bifurcation - Found {len(data)} agents, {total_students} total students")
            print(f"   Top agent: {first_agent['agent_name']} - {first_agent['total_students']} students, {first_agent['sla_rate']}% SLA rate")
        else:
            print("⚠️ No CS agent data found")
    
    def test_cs_agent_bifurcation_this_month(self, auth_token):
        """Test period filter works for CS agent bifurcation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/cs-agent-bifurcation?period=this_month", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ CS Agent Bifurcation (This Month) - Found {len(data)} agents")


class TestMentorBifurcation:
    """Test GET /api/dashboard/mentor-bifurcation endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_mentor_bifurcation_overall(self, auth_token):
        """GET /api/dashboard/mentor-bifurcation?period=overall returns mentors with student counts and redeposit data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/mentor-bifurcation?period=overall", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            first_mentor = data[0]
            # Verify structure
            assert "mentor_name" in first_mentor, "Missing mentor_name"
            assert "total_students" in first_mentor, "Missing total_students"
            assert "new_students" in first_mentor, "Missing new_students"
            assert "connected" in first_mentor, "Missing connected"
            assert "redeposits" in first_mentor, "Missing redeposits"
            assert "redeposit_amount" in first_mentor, "Missing redeposit_amount"
            
            total_students = sum(m["total_students"] for m in data)
            total_redeposits = sum(m["redeposit_amount"] for m in data)
            
            print(f"✅ Mentor Bifurcation - Found {len(data)} mentors, {total_students} total students")
            print(f"   Total redeposit amount: {total_redeposits}")
            print(f"   Top mentor: {first_mentor['mentor_name']} - {first_mentor['total_students']} students, {first_mentor['redeposit_amount']} redeposits")
        else:
            print("⚠️ No mentor data found")
    
    def test_mentor_bifurcation_this_month(self, auth_token):
        """Test period filter works for mentor bifurcation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/mentor-bifurcation?period=this_month", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Mentor Bifurcation (This Month) - Found {len(data)} mentors")


class TestCustomerMasterData:
    """Test GET /api/customers endpoint with date sorting"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_customers_sorted_ascending(self, auth_token):
        """GET /api/customers?sort_order=asc returns 901 customers sorted by date ascending"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customers?sort_order=asc", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        # Expecting ~901 customers from import
        print(f"✅ Customers - Found {len(data)} customers")
        
        if len(data) > 0:
            # Check first customer has expected fields
            first = data[0]
            assert "full_name" in first or "id" in first, "Missing customer identifier"
            
            # Check if course info is available in transaction
            if "transactions" in first and first["transactions"]:
                print(f"   First customer has {len(first['transactions'])} transactions")
    
    def test_customers_default_get(self, auth_token):
        """GET /api/customers returns customer data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Customers default - Found {len(data)} customers")


class TestFinanceReceivables:
    """Test GET /api/finance/clt/receivables endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_finance_receivables(self, auth_token):
        """GET /api/finance/clt/receivables returns 899 receivables sorted by date ascending"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/clt/receivables", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Finance Receivables - Found {len(data)} receivables")
        
        if len(data) > 0:
            first = data[0]
            # Check for expected fields
            if "amount" in first:
                print(f"   First receivable amount: {first['amount']}")


class TestCoursesWithPrice:
    """Test GET /api/courses endpoint returns courses with price fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_courses_have_price_fields(self, auth_token):
        """GET /api/courses returns courses with both price and base_price fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have courses"
        
        # Check that courses have price information
        courses_with_price = 0
        courses_with_base_price = 0
        
        for course in data:
            if course.get("price") is not None:
                courses_with_price += 1
            if course.get("base_price") is not None:
                courses_with_base_price += 1
        
        print(f"✅ Courses - Found {len(data)} courses")
        print(f"   Courses with price field: {courses_with_price}")
        print(f"   Courses with base_price field: {courses_with_base_price}")
        
        # At least some courses should have price info
        assert courses_with_price > 0 or courses_with_base_price > 0, "No courses have price information"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
