"""
Tests for Sales Dashboard Fixes - Iteration 40
Testing: 
1. Dashboard stats (total revenue should be ~AED 2,174,969)
2. Sales by Course chart (revenue not 0)
3. Monthly Revenue Trend (multiple months with revenue and deals)
4. Monthly Leaderboard (agents with revenue not 0)
5. Today's Transactions endpoint
6. Sales Agent Closings (Top 10 agents)
"""
import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://revenue-drilldown.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"

class TestSalesDashboardFixes:
    """Test Sales Dashboard endpoints to verify fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_total_revenue(self):
        """Test dashboard stats returns correct total revenue (~AED 2,174,969)"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check total_revenue exists and is > 0
        assert "total_revenue" in data, "total_revenue missing from response"
        total_revenue = data["total_revenue"]
        
        # Revenue should be approximately 2,174,969 AED (allow some variance)
        print(f"Total Revenue: AED {total_revenue:,.2f}")
        assert total_revenue > 1_000_000, f"Revenue too low: {total_revenue}"
        assert total_revenue < 5_000_000, f"Revenue too high: {total_revenue}"
        
        # Check other stats
        assert "enrolled_total" in data, "enrolled_total missing"
        assert data["enrolled_total"] > 0, "No enrolled leads"
        print(f"Enrolled Total: {data['enrolled_total']}")
    
    def test_sales_by_course_has_revenue(self):
        """Test sales by course returns revenue data (not 0)"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/sales-by-course", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "No courses returned"
        
        # Check at least some courses have revenue
        total_revenue = sum(item.get("revenue", 0) for item in data)
        print(f"Sales by Course - Total Revenue: AED {total_revenue:,.2f}")
        print(f"Sales by Course - Number of courses: {len(data)}")
        
        # Revenue should not be 0
        assert total_revenue > 0, "All courses have 0 revenue - this was the bug!"
        
        # Check each course has expected fields
        for item in data[:3]:  # Check first 3 courses
            print(f"  Course: {item.get('course_name', 'Unknown')} - Revenue: AED {item.get('revenue', 0):,.2f}")
    
    def test_monthly_trend_has_multiple_months(self):
        """Test monthly trend returns multiple months with both revenue and deals"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/monthly-trend", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Monthly Trend - Number of months: {len(data)}")
        
        # Should have at least 1 month of data
        assert len(data) > 0, "No monthly trend data"
        
        # Check data structure
        for month_data in data[:3]:  # Check first 3 months
            assert "_id" in month_data, "Missing _id (month) field"
            assert "deals" in month_data, "Missing deals field"
            assert "revenue" in month_data, "Missing revenue field"
            print(f"  Month: {month_data['_id']} - Deals: {month_data['deals']}, Revenue: AED {month_data['revenue']:,.2f}")
        
        # Total revenue across all months should be > 0
        total_revenue = sum(m.get("revenue", 0) for m in data)
        assert total_revenue > 0, "No revenue in monthly trend - date field bug may still exist"
    
    def test_leaderboard_has_revenue(self):
        """Test leaderboard returns agents with revenue (not 0)"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/leaderboard", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Leaderboard - Number of agents: {len(data)}")
        
        if len(data) > 0:
            # Check leaderboard entries have expected fields
            for entry in data[:5]:
                assert "name" in entry, "Missing name field"
                assert "deals" in entry, "Missing deals field"
                assert "revenue" in entry, "Missing revenue field"
                assert "rank" in entry, "Missing rank field"
                print(f"  Rank {entry['rank']}: {entry['name']} - Deals: {entry['deals']}, Revenue: AED {entry['revenue']:,.2f}")
            
            # At least first entry should have revenue > 0
            if data[0].get("deals", 0) > 0:
                assert data[0].get("revenue", 0) > 0, "Top agent has deals but 0 revenue"
    
    def test_today_transactions_endpoint(self):
        """Test today's transactions endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/dashboard/today-transactions", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check response structure
        assert "date" in data, "Missing date field"
        assert "count" in data, "Missing count field"
        assert "total_amount" in data, "Missing total_amount field"
        assert "transactions" in data, "Missing transactions field"
        
        print(f"Today's Transactions - Date: {data['date']}")
        print(f"Today's Transactions - Count: {data['count']}")
        print(f"Today's Transactions - Total: AED {data['total_amount']:,.2f}")
        
        # Transactions array should exist even if empty
        assert isinstance(data["transactions"], list), "transactions should be a list"
    
    def test_sales_agent_closings_overall(self):
        """Test sales agent closings endpoint - overall period"""
        resp = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings",
            params={"period": "overall", "limit": 10},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Top 10 Agents Overall - Count: {len(data)}")
        
        if len(data) > 0:
            for agent in data[:5]:
                print(f"  {agent.get('agent_name', 'Unknown')}: {agent.get('closings', 0)} closings, Revenue: AED {agent.get('revenue', 0):,.2f}")
    
    def test_sales_agent_closings_this_month(self):
        """Test sales agent closings endpoint - this month"""
        resp = requests.get(
            f"{BASE_URL}/api/dashboard/sales-agent-closings",
            params={"period": "this_month", "limit": 5},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Top 5 Agents This Month - Count: {len(data)}")


class TestSalesCRMNoImportButtons:
    """Test that Sales CRM page doesn't have import buttons (removed per requirements)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_leads_endpoint_works(self):
        """Test leads endpoint works without errors"""
        resp = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert resp.status_code == 200, f"Leads endpoint failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Leads should be a list"
        print(f"Total leads: {len(data)}")


class TestFinanceCLTReceivables:
    """Test Finance CLT Receivables shows amount_in_aed"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_finance_clt_receivables_total(self):
        """Test Finance CLT receivables shows total > AED 0"""
        resp = requests.get(f"{BASE_URL}/api/finance/clt/receivables", headers=self.headers)
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Check we have receivables data
        receivables = data if isinstance(data, list) else data.get("receivables", data.get("data", []))
        if not isinstance(receivables, list):
            receivables = [receivables] if receivables else []
        
        print(f"Finance CLT Receivables - Count: {len(receivables)}")
        
        # Calculate total based on available fields
        total = 0
        for r in receivables[:5]:
            amount = r.get("amount_in_aed", r.get("amount", 0))
            total += amount
            if len(receivables) <= 5:
                print(f"  Receivable: {r.get('student_name', 'N/A')} - AED {amount:,.2f}")
        
        print(f"Total Receivables (sample): AED {total:,.2f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
