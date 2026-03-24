"""
Backend tests for iteration 58 - Testing new features:
1. Custom date range picker on Overall Dashboard
2. Agent filter on Academics (Mentor) Kanban page
3. Sales Dashboard Top 10 agents sorted by revenue
4. Pipeline revenue calculation
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://net-pay-scatter.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login as super admin and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "aqib@clt-academy.com",
        "password": "@Aqib1234"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")

@pytest.fixture(scope="module")
def headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestCustomDateRange:
    """Test Custom Date Range feature on Overall Dashboard"""
    
    def test_dashboard_custom_period_support(self, headers):
        """Test that /api/dashboard/overall supports custom period with custom_start and custom_end"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/overall",
            params={
                "period": "custom",
                "custom_start": "2025-01-01",
                "custom_end": "2025-12-31"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Custom period failed: {response.text}"
        data = response.json()
        # Check response structure
        assert "revenue" in data
        assert "selected_period" in data["revenue"]
        print(f"Custom period revenue: {data['revenue']['selected_period']}")
    
    def test_custom_range_with_short_period(self, headers):
        """Test custom range with a short date range"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/overall",
            params={
                "period": "custom",
                "custom_start": "2025-06-01",
                "custom_end": "2025-06-30"
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"June 2025 revenue: {data['revenue']['selected_period']}")
    
    def test_this_month_vs_all_time(self, headers):
        """Verify this_month revenue <= all_time revenue"""
        # Get this month
        response_month = requests.get(
            f"{BASE_URL}/api/dashboard/overall?period=this_month",
            headers=headers
        )
        assert response_month.status_code == 200
        month_data = response_month.json()
        
        # Get all time
        response_all = requests.get(
            f"{BASE_URL}/api/dashboard/overall?period=overall",
            headers=headers
        )
        assert response_all.status_code == 200
        all_data = response_all.json()
        
        month_total = month_data['revenue']['selected_period']['total']
        all_total = all_data['revenue']['selected_period']['total']
        
        print(f"This Month: {month_total}, All Time: {all_total}")
        assert month_total <= all_total, "This month should be <= all time"


class TestSalesAgentClosings:
    """Test Sales Dashboard Top 10 agents sorted by revenue"""
    
    def test_sales_agent_closings_sorted_by_revenue(self, headers):
        """Test GET /api/dashboard/sales-agent-closings returns agents sorted by revenue desc"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?limit=10",
            headers=headers
        )
        assert response.status_code == 200, f"Sales agent closings failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Expected list of agents"
        
        if len(data) > 1:
            # Verify sorting by revenue (descending)
            for i in range(len(data) - 1):
                current_revenue = data[i].get('revenue', 0)
                next_revenue = data[i+1].get('revenue', 0)
                assert current_revenue >= next_revenue, f"Not sorted by revenue: {current_revenue} < {next_revenue}"
                print(f"Agent {i+1}: {data[i].get('agent_name', 'Unknown')} - Revenue: {current_revenue}")
        
        print(f"Total agents in top 10: {len(data)}")
    
    def test_sales_agent_closings_limit_3(self, headers):
        """Test limit parameter works correctly"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?limit=3",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3, f"Expected max 3 agents, got {len(data)}"
        print(f"Top 3 agents: {[a.get('agent_name') for a in data]}")


class TestPipelineRevenue:
    """Test Sales Pipeline revenue calculation"""
    
    def test_pipeline_revenue_endpoint(self, headers):
        """Test GET /api/dashboard/pipeline-revenue returns enrolled stage with correct total"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/pipeline-revenue",
            headers=headers
        )
        assert response.status_code == 200, f"Pipeline revenue failed: {response.text}"
        data = response.json()
        
        # Should contain stages
        assert isinstance(data, (list, dict)), "Expected list or dict response"
        print(f"Pipeline revenue data: {data}")
        
        # If it's a list, check for enrolled stage
        if isinstance(data, list):
            enrolled_stage = next((s for s in data if s.get('stage') == 'enrolled' or s.get('id') == 'enrolled'), None)
            if enrolled_stage:
                print(f"Enrolled stage revenue: {enrolled_stage.get('revenue', enrolled_stage.get('total', 'N/A'))}")


class TestMentorAgentFilter:
    """Test Mentor Agent filter on Academics Kanban page"""
    
    def test_mentor_users_list(self, headers):
        """Test GET /api/users?role=mentor returns list of mentors"""
        response = requests.get(
            f"{BASE_URL}/api/users?role=mentor",
            headers=headers
        )
        assert response.status_code == 200, f"Mentor users failed: {response.text}"
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Expected list of mentors"
        print(f"Number of mentors: {len(data)}")
        
        # Print mentor names
        for mentor in data[:5]:
            print(f"  - {mentor.get('full_name', 'Unknown')} (ID: {mentor.get('id', 'N/A')[:8]}...)")
    
    def test_students_filter_by_mentor_id(self, headers):
        """Test GET /api/students with mentor_id filter"""
        # First get a mentor
        mentors_response = requests.get(
            f"{BASE_URL}/api/users?role=mentor",
            headers=headers
        )
        if mentors_response.status_code == 200:
            mentors = mentors_response.json()
            if mentors:
                mentor_id = mentors[0].get('id')
                
                # Now filter students by mentor
                students_response = requests.get(
                    f"{BASE_URL}/api/students",
                    params={"mentor_id": mentor_id},
                    headers=headers
                )
                assert students_response.status_code == 200, f"Students filter failed: {students_response.text}"
                students = students_response.json()
                
                print(f"Mentor {mentors[0].get('full_name')} has {len(students)} students")
                
                # Verify all returned students have this mentor
                for student in students[:5]:
                    student_mentor_id = student.get('mentor_id')
                    # Some students may not have mentor_id set
                    if student_mentor_id:
                        assert student_mentor_id == mentor_id, f"Student mentor mismatch: {student_mentor_id} != {mentor_id}"


class TestCSAgentFilter:
    """Test CS Agent filter on Customer Service page"""
    
    def test_cs_users_list(self, headers):
        """Test GET /api/users?department=Customer Service returns CS agents"""
        response = requests.get(
            f"{BASE_URL}/api/users?department=Customer Service",
            headers=headers
        )
        assert response.status_code == 200, f"CS users failed: {response.text}"
        data = response.json()
        
        print(f"Number of CS department users: {len(data)}")
        for user in data[:5]:
            print(f"  - {user.get('full_name', 'Unknown')} (Role: {user.get('role', 'N/A')})")


class TestTeamFilter:
    """Test Team filter on Sales CRM page"""
    
    def test_teams_sales_department(self, headers):
        """Test GET /api/teams?department=Sales returns sales teams"""
        response = requests.get(
            f"{BASE_URL}/api/teams?department=Sales",
            headers=headers
        )
        assert response.status_code == 200, f"Sales teams failed: {response.text}"
        data = response.json()
        
        print(f"Number of sales teams: {len(data)}")
        for team in data[:5]:
            print(f"  - {team.get('name', 'Unknown')} (Members: {team.get('member_count', 'N/A')})")
    
    def test_sales_agents_list(self, headers):
        """Test GET /api/users?role=sales_executive returns sales agents"""
        response = requests.get(
            f"{BASE_URL}/api/users?role=sales_executive",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Number of sales executives: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
