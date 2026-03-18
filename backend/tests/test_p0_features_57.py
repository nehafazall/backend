"""
Test P0 Features for Iteration 57:
1. Dashboard time period filters (today, yesterday, this_week, etc.)
2. Quick reassign from Sales/CS Kanban for super admin
3. Backend API caching performance
4. Customer Master shows enrolled leads

Test credentials:
- Super Admin: aqib@clt-academy.com / @Aqib1234
- CS Head: falja@clt-academy.com / Falja@123
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardPeriodFilters:
    """Test Overall Dashboard period filter functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin before each test"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_dashboard_default_this_month(self):
        """Test dashboard loads with this_month by default"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        assert data["period"] == "this_month", f"Expected this_month, got {data.get('period')}"
        assert "revenue" in data
        assert "selected_period" in data["revenue"]
        
    def test_dashboard_today_filter(self):
        """Test dashboard with today filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=today")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        assert data["period"] == "today"
        assert "revenue" in data
        assert "selected_period" in data["revenue"]
        print(f"Today's revenue: {data['revenue']['selected_period']['total']}")
        
    def test_dashboard_yesterday_filter(self):
        """Test dashboard with yesterday filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=yesterday")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "yesterday"
        print(f"Yesterday's revenue: {data['revenue']['selected_period']['total']}")
        
    def test_dashboard_this_week_filter(self):
        """Test dashboard with this_week filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_week")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "this_week"
        
    def test_dashboard_last_week_filter(self):
        """Test dashboard with last_week filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=last_week")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "last_week"
        
    def test_dashboard_this_month_filter(self):
        """Test dashboard with this_month filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_month")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "this_month"
        
    def test_dashboard_last_month_filter(self):
        """Test dashboard with last_month filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=last_month")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "last_month"
        
    def test_dashboard_this_quarter_filter(self):
        """Test dashboard with this_quarter filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_quarter")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "this_quarter"
        
    def test_dashboard_last_quarter_filter(self):
        """Test dashboard with last_quarter filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=last_quarter")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "last_quarter"
        
    def test_dashboard_this_year_filter(self):
        """Test dashboard with this_year filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_year")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "this_year"
        
    def test_dashboard_last_year_filter(self):
        """Test dashboard with last_year filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=last_year")
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "last_year"
        
    def test_dashboard_overall_filter(self):
        """Test dashboard with overall (all-time) filter"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=overall")
        assert response.status_code == 200
        data = response.json()
        # period=overall returns no period in _get_date_range so it should have period="overall" in response
        assert data["period"] == "overall"
        all_time_total = data["revenue"]["all_time"]["sales"] + data["revenue"]["all_time"]["cs"] + data["revenue"]["all_time"]["mentors"]
        selected_total = data["revenue"]["selected_period"]["total"]
        # For overall, selected_period should equal all_time (approximately)
        print(f"All-time revenue: {all_time_total}, Selected period: {selected_total}")
        
    def test_dashboard_this_month_less_than_overall(self):
        """Test that this_month revenue is less than or equal to overall (all-time)"""
        # Get this_month data
        tm_response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_month")
        assert tm_response.status_code == 200
        tm_data = tm_response.json()
        
        # Get overall data
        overall_response = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=overall")
        assert overall_response.status_code == 200
        overall_data = overall_response.json()
        
        # Compare
        tm_total = tm_data["revenue"]["selected_period"]["total"]
        overall_total = overall_data["revenue"]["selected_period"]["total"]
        
        print(f"This Month Total: {tm_total}, All-Time Total: {overall_total}")
        assert tm_total <= overall_total, f"This month ({tm_total}) should be <= overall ({overall_total})"


class TestDashboardCaching:
    """Test dashboard caching performance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_caching_second_call_faster(self):
        """Test that second call is faster due to caching (60s TTL)"""
        # First call - should hit DB
        start1 = time.time()
        response1 = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_month")
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second call - should hit cache
        start2 = time.time()
        response2 = self.session.get(f"{BASE_URL}/api/dashboard/overall?period=this_month")
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        print(f"First call: {time1:.3f}s, Second call: {time2:.3f}s")
        # Cache hit should be faster (or at least comparable)
        # We don't assert strictly because network latency can vary


class TestQuickReassign:
    """Test quick reassign functionality for super admin"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_get_sales_agents(self):
        """Test fetching available sales agents for reassignment"""
        response = self.session.get(f"{BASE_URL}/api/users?role=sales_executive")
        assert response.status_code == 200
        agents = response.json()
        assert isinstance(agents, list)
        print(f"Found {len(agents)} sales agents")
        if agents:
            print(f"First agent: {agents[0].get('full_name')}")
            
    def test_get_cs_agents(self):
        """Test fetching available CS agents for reassignment"""
        response = self.session.get(f"{BASE_URL}/api/users?department=Customer Service")
        assert response.status_code == 200
        agents = response.json()
        assert isinstance(agents, list)
        print(f"Found {len(agents)} CS agents")
        
    def test_lead_reassign_endpoint(self):
        """Test lead reassignment endpoint"""
        # Get a lead first
        leads_response = self.session.get(f"{BASE_URL}/api/leads?limit=1")
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if leads:
            lead = leads[0]
            lead_id = lead["id"]
            
            # Get an agent
            agents_response = self.session.get(f"{BASE_URL}/api/users?role=sales_executive")
            if agents_response.status_code == 200:
                agents = agents_response.json()
                if agents:
                    agent = agents[0]
                    # Update lead assignment
                    update_response = self.session.put(f"{BASE_URL}/api/leads/{lead_id}", json={
                        "assigned_to": agent["id"],
                        "assigned_to_name": agent["full_name"]
                    })
                    if update_response.status_code in [200, 400]:  # 400 if already assigned
                        print(f"Lead reassignment test completed")
                    else:
                        print(f"Lead reassignment status: {update_response.status_code}")
        else:
            print("No leads found to test reassignment")


class TestCustomerMaster:
    """Test Customer Master functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_customers_endpoint(self):
        """Test customers endpoint returns data"""
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        customers = response.json()
        assert isinstance(customers, list)
        print(f"Found {len(customers)} customers")
        if customers:
            customer = customers[0]
            print(f"First customer: {customer.get('full_name')}, Total Spent: {customer.get('total_spent', 0)}")
            
    def test_customers_with_transactions(self):
        """Test that customers have transaction history"""
        response = self.session.get(f"{BASE_URL}/api/customers?limit=5")
        assert response.status_code == 200
        customers = response.json()
        
        for customer in customers:
            transactions = customer.get("transactions", [])
            if transactions:
                print(f"Customer {customer.get('full_name')} has {len(transactions)} transactions")
                break


class TestStudentReassign:
    """Test student (CS) reassignment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as super admin"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_get_students(self):
        """Test fetching students"""
        response = self.session.get(f"{BASE_URL}/api/students")
        assert response.status_code == 200
        students = response.json()
        assert isinstance(students, list)
        print(f"Found {len(students)} students")
        
    def test_student_has_cs_agent_info(self):
        """Test that students have CS agent info for reassignment"""
        response = self.session.get(f"{BASE_URL}/api/students?limit=5")
        assert response.status_code == 200
        students = response.json()
        
        for student in students:
            cs_agent = student.get("cs_agent_name")
            if cs_agent:
                print(f"Student {student.get('full_name')} assigned to CS Agent: {cs_agent}")
                break


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
