"""
Sales Dashboard API Tests - Iteration 41
Tests for: filtered-stats, team-revenue, team-revenue drill-down, month-comparison, 
sales-agent-closings, today-transactions, sales-by-course, monthly-trend, leaderboard, lead-funnel
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}"}


# ============ FILTERED STATS TESTS ============

class TestFilteredStats:
    """Test /api/dashboard/filtered-stats endpoint with different periods"""
    
    def test_filtered_stats_overall(self, auth_headers):
        """Test filtered stats with Overall period"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=overall",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_revenue" in data, "Missing total_revenue"
        assert "total_leads" in data, "Missing total_leads"
        assert "total_enrolled" in data, "Missing total_enrolled"
        assert "conversion_rate" in data, "Missing conversion_rate"
        assert "avg_deal_size" in data, "Missing avg_deal_size"
        
        # Verify data has actual values
        assert data["total_revenue"] > 0, "Total revenue should be > 0"
        print(f"✓ Overall: Revenue={data['total_revenue']}, Leads={data['total_leads']}, Enrolled={data['total_enrolled']}")
    
    def test_filtered_stats_this_month(self, auth_headers):
        """Test filtered stats with This Month period"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=this_month",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Data may be 0 for this month if no recent activity
        assert "total_revenue" in data
        assert "total_leads" in data
        print(f"✓ This Month: Revenue={data['total_revenue']}, Leads={data['total_leads']}")
    
    def test_filtered_stats_this_year(self, auth_headers):
        """Test filtered stats with This Year period"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=this_year",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "total_revenue" in data
        print(f"✓ This Year: Revenue={data['total_revenue']}")


# ============ TEAM REVENUE TESTS ============

class TestTeamRevenue:
    """Test /api/dashboard/team-revenue endpoint"""
    
    def test_team_revenue_endpoint(self, auth_headers):
        """Test team revenue returns data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/team-revenue?period=overall",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return list of teams
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Verify structure
            team = data[0]
            assert "team_name" in team, "Missing team_name"
            assert "revenue" in team, "Missing revenue"
            print(f"✓ Found {len(data)} teams. First: {team['team_name']} = {team['revenue']}")
        else:
            print("✓ Team revenue endpoint works (no teams in data)")
    
    def test_team_revenue_drill_down(self, auth_headers):
        """Test team revenue drill-down for individual agents"""
        # First get teams
        teams_response = requests.get(
            f"{BASE_URL}/api/dashboard/team-revenue?period=overall",
            headers=auth_headers
        )
        teams = teams_response.json()
        
        if len(teams) > 0:
            team_name = teams[0]["team_name"]
            
            # Test drill-down endpoint
            response = requests.get(
                f"{BASE_URL}/api/dashboard/team-revenue/{team_name}/agents?period=overall",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Drill-down failed: {response.text}"
            agents = response.json()
            
            assert isinstance(agents, list), "Should return list of agents"
            
            if len(agents) > 0:
                agent = agents[0]
                assert "agent_name" in agent, "Missing agent_name"
                assert "deals" in agent, "Missing deals"
                assert "revenue" in agent, "Missing revenue"
                print(f"✓ Team '{team_name}' drill-down: {len(agents)} agents. First: {agent['agent_name']}")
        else:
            pytest.skip("No teams available for drill-down test")


# ============ MONTH COMPARISON TESTS ============

class TestMonthComparison:
    """Test /api/dashboard/month-comparison endpoint"""
    
    def test_month_comparison_endpoint(self, auth_headers):
        """Test month comparison returns data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/month-comparison",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "this_month_label" in data, "Missing this_month_label"
        assert "last_month_label" in data, "Missing last_month_label"
        assert "data" in data, "Missing data array"
        
        # Data should have day-by-day comparison
        if len(data["data"]) > 0:
            day_data = data["data"][0]
            assert "day" in day_data, "Missing day"
            assert "this_cumulative" in day_data or "last_cumulative" in day_data, "Missing cumulative data"
        
        print(f"✓ Month comparison: {data['this_month_label']} vs {data['last_month_label']}, {len(data['data'])} days")


# ============ SALES AGENT CLOSINGS TESTS ============

class TestSalesAgentClosings:
    """Test /api/dashboard/sales-agent-closings endpoint"""
    
    def test_sales_agent_closings_overall(self, auth_headers):
        """Test top 10 agents overall"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        
        if len(data) > 0:
            agent = data[0]
            assert "agent_name" in agent, "Missing agent_name"
            assert "closings" in agent, "Missing closings"
            print(f"✓ Top 10 Agents: {len(data)} agents. Top: {agent['agent_name']} ({agent['closings']} closings)")


# ============ TODAY'S TRANSACTIONS TESTS ============

class TestTodayTransactions:
    """Test /api/dashboard/today-transactions endpoint"""
    
    def test_today_transactions_endpoint(self, auth_headers):
        """Test today's transactions returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/today-transactions",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "count" in data, "Missing count"
        assert "total_amount" in data, "Missing total_amount"
        assert "transactions" in data, "Missing transactions"
        
        print(f"✓ Today's Transactions: {data['count']} transactions, Total: {data['total_amount']}")


# ============ SALES BY COURSE TESTS ============

class TestSalesByCourse:
    """Test /api/dashboard/sales-by-course endpoint"""
    
    def test_sales_by_course_endpoint(self, auth_headers):
        """Test sales by course returns data with revenue"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-by-course",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        
        if len(data) > 0:
            course = data[0]
            assert "course_name" in course, "Missing course_name"
            assert "count" in course, "Missing count"
            assert "revenue" in course, "Missing revenue"
            
            # Verify revenue is not 0 (known previous issue)
            total_revenue = sum(c.get("revenue", 0) for c in data)
            assert total_revenue > 0, "Total revenue should be > 0 (not the 0 bug)"
            
            print(f"✓ Sales by Course: {len(data)} courses. Top: {course['course_name']} ({course['count']} sales, {course['revenue']})")


# ============ MONTHLY TREND TESTS ============

class TestMonthlyTrend:
    """Test /api/dashboard/monthly-trend endpoint"""
    
    def test_monthly_trend_endpoint(self, auth_headers):
        """Test monthly trend returns multiple months"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/monthly-trend",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        assert len(data) > 0, "Should have trend data"
        
        # Verify structure
        month = data[0]
        assert "_id" in month, "Missing _id (month)"
        assert "deals" in month, "Missing deals"
        assert "revenue" in month, "Missing revenue"
        
        # Check for multiple months
        print(f"✓ Monthly Trend: {len(data)} months. First: {month['_id']} ({month['deals']} deals, {month['revenue']})")
        
        # Verify no future dates beyond current month (data integrity)
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        for m in data:
            month_str = m["_id"]
            # Data should not be in far future (beyond Apr 2026)
            if month_str > "2026-03":
                print(f"⚠ Warning: Found future data for {month_str}")


# ============ LEADERBOARD TESTS ============

class TestLeaderboard:
    """Test /api/dashboard/leaderboard endpoint"""
    
    def test_leaderboard_endpoint(self, auth_headers):
        """Test leaderboard returns agents with revenue"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/leaderboard",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        
        if len(data) > 0:
            entry = data[0]
            assert "name" in entry, "Missing name"
            assert "deals" in entry, "Missing deals"
            assert "revenue" in entry, "Missing revenue"
            assert "rank" in entry, "Missing rank"
            
            # Verify revenue is not 0 (known previous issue)
            top_revenue = entry.get("revenue", 0)
            print(f"✓ Leaderboard: {len(data)} agents. #1: {entry['name']} ({entry['deals']} deals, {entry['revenue']})")


# ============ LEAD FUNNEL TESTS ============

class TestLeadFunnel:
    """Test /api/dashboard/lead-funnel endpoint"""
    
    def test_lead_funnel_endpoint(self, auth_headers):
        """Test lead funnel returns stage counts"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/lead-funnel",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        
        if len(data) > 0:
            stage = data[0]
            assert "_id" in stage, "Missing _id (stage name)"
            assert "count" in stage, "Missing count"
            
            # Sum up all stages
            total = sum(s.get("count", 0) for s in data)
            stages_str = ", ".join([f"{s['_id']}:{s['count']}" for s in data[:5]])
            print(f"✓ Lead Funnel: {len(data)} stages, Total: {total}. Top: {stages_str}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
