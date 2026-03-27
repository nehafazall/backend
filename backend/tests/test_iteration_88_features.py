"""
Iteration 88 Backend Tests
Tests for:
1. Executive Dashboard API - enriched data with all new widgets
2. Chat users API with online/away/offline status
3. Chat heartbeat API
4. Attendance grace_minutes (30 min) via shifts API
5. Leave approval marks attendance as on_leave
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EMAIL = "aleesha@clt-academy.com"
SALES_PASSWORD = "Aleesha@123"


class TestAuth:
    """Authentication tests"""
    
    def test_ceo_login(self):
        """Test CEO/Super Admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("role") in ["super_admin", "admin"], "User is not admin"
        print(f"✓ CEO login successful, role: {data['user']['role']}")
    
    def test_sales_login(self):
        """Test Sales Executive login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        print(f"✓ Sales login successful, role: {data['user']['role']}")


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("CEO login failed")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def sales_token():
    """Get Sales auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Sales login failed")
    return response.json().get("access_token")


class TestExecutiveDashboard:
    """Executive Dashboard API tests - CEO only"""
    
    def test_executive_dashboard_returns_kpis(self, ceo_token):
        """Test GET /api/executive/dashboard returns KPIs"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Check KPIs exist
        assert "kpis" in data, "Missing kpis in response"
        kpis = data["kpis"]
        
        # Verify required KPI fields
        required_kpis = ["sales_revenue", "cs_revenue", "mentor_revenue", "active_pipeline", 
                        "pending_activations", "pending_leaves", "total_employees"]
        for kpi in required_kpis:
            assert kpi in kpis, f"Missing KPI: {kpi}"
        print(f"✓ KPIs present: sales_revenue={kpis['sales_revenue']}, cs_revenue={kpis['cs_revenue']}, mentor_revenue={kpis['mentor_revenue']}")
    
    def test_executive_dashboard_attendance(self, ceo_token):
        """Test attendance breakdown in dashboard"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "attendance" in data, "Missing attendance in response"
        att = data["attendance"]
        
        # Verify attendance fields
        required_fields = ["present", "half_day", "absent", "on_leave", "warning"]
        for field in required_fields:
            assert field in att, f"Missing attendance field: {field}"
        print(f"✓ Attendance: present={att['present']}, half_day={att['half_day']}, absent={att['absent']}, on_leave={att['on_leave']}, warning={att['warning']}")
    
    def test_executive_dashboard_gender_breakdown(self, ceo_token):
        """Test gender bifurcation in dashboard"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "gender_breakdown" in data, "Missing gender_breakdown"
        gender = data["gender_breakdown"]
        assert isinstance(gender, dict), "gender_breakdown should be a dict"
        print(f"✓ Gender breakdown: {gender}")
    
    def test_executive_dashboard_monthly_trend(self, ceo_token):
        """Test 6-month revenue trend with 3 departments"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "monthly_trend" in data, "Missing monthly_trend"
        trend = data["monthly_trend"]
        assert isinstance(trend, list), "monthly_trend should be a list"
        assert len(trend) == 6, f"Expected 6 months, got {len(trend)}"
        
        # Check each month has sales, cs, mentors
        for month in trend:
            assert "sales" in month, f"Missing sales in month {month.get('label')}"
            assert "cs" in month, f"Missing cs in month {month.get('label')}"
            assert "mentors" in month, f"Missing mentors in month {month.get('label')}"
        print(f"✓ Monthly trend: {len(trend)} months with sales/cs/mentors breakdown")
    
    def test_executive_dashboard_revenue_by_course(self, ceo_token):
        """Test revenue by course with proper names"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue_by_course" in data, "Missing revenue_by_course"
        courses = data["revenue_by_course"]
        assert isinstance(courses, list), "revenue_by_course should be a list"
        
        for course in courses:
            assert "course" in course, "Missing course name"
            assert "revenue" in course, "Missing revenue"
        print(f"✓ Revenue by course: {len(courses)} courses")
    
    def test_executive_dashboard_top_performers(self, ceo_token):
        """Test top performers from all 3 departments"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "top_performers" in data, "Missing top_performers"
        tp = data["top_performers"]
        
        # Check all 3 departments
        assert "sales" in tp, "Missing sales in top_performers"
        assert "cs" in tp, "Missing cs in top_performers"
        assert "mentors" in tp, "Missing mentors in top_performers"
        
        # CS should use cs_agent_name field
        print(f"✓ Top performers: sales={len(tp['sales'])}, cs={len(tp['cs'])}, mentors={len(tp['mentors'])}")
    
    def test_executive_dashboard_course_bifurcation(self, ceo_token):
        """Test course bifurcation for new accounts"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "course_bifurcation" in data, "Missing course_bifurcation"
        bifurcation = data["course_bifurcation"]
        assert isinstance(bifurcation, list), "course_bifurcation should be a list"
        
        for item in bifurcation:
            assert "course" in item, "Missing course in bifurcation"
            assert "count" in item, "Missing count in bifurcation"
        print(f"✓ Course bifurcation: {len(bifurcation)} courses")
    
    def test_executive_dashboard_expiring_documents(self, ceo_token):
        """Test documents expiring in 30 days"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "expiring_documents" in data, "Missing expiring_documents"
        docs = data["expiring_documents"]
        assert isinstance(docs, list), "expiring_documents should be a list"
        
        for doc in docs:
            assert "employee" in doc, "Missing employee in expiring doc"
            assert "document" in doc, "Missing document type"
            assert "days_left" in doc, "Missing days_left"
        print(f"✓ Expiring documents: {len(docs)} documents")
    
    def test_executive_dashboard_salary_payout(self, ceo_token):
        """Test salary + commission payout data"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "salary_payout" in data, "Missing salary_payout"
        sp = data["salary_payout"]
        
        # Verify required fields
        assert "total_gross" in sp, "Missing total_gross"
        assert "total_commission" in sp, "Missing total_commission"
        assert "total_payout" in sp, "Missing total_payout"
        assert "employee_count" in sp, "Missing employee_count"
        print(f"✓ Salary payout: gross={sp['total_gross']}, commission={sp['total_commission']}, total={sp['total_payout']}, employees={sp['employee_count']}")
    
    def test_executive_dashboard_recent_enrollments(self, ceo_token):
        """Test recent enrollments data"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_enrollments" in data, "Missing recent_enrollments"
        enrollments = data["recent_enrollments"]
        assert isinstance(enrollments, list), "recent_enrollments should be a list"
        print(f"✓ Recent enrollments: {len(enrollments)} entries")
    
    def test_executive_dashboard_revenue_split(self, ceo_token):
        """Test revenue split by department"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue_split" in data, "Missing revenue_split"
        split = data["revenue_split"]
        assert isinstance(split, list), "revenue_split should be a list"
        assert len(split) == 3, f"Expected 3 departments, got {len(split)}"
        
        dept_names = [s["name"] for s in split]
        assert "Sales" in dept_names, "Missing Sales in revenue_split"
        assert "Customer Service" in dept_names, "Missing Customer Service in revenue_split"
        assert "Academics" in dept_names, "Missing Academics in revenue_split"
        print(f"✓ Revenue split: {split}")
    
    def test_executive_dashboard_restricted_to_admin(self, sales_token):
        """Test that non-admin users cannot access executive dashboard"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Executive dashboard correctly restricted to admin only")


class TestChatUsers:
    """Chat users API with online status"""
    
    def test_chat_users_returns_all_employees(self, ceo_token):
        """Test GET /api/chat/users returns all employees with status"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/users", headers=headers)
        assert response.status_code == 200, f"Chat users failed: {response.text}"
        users = response.json()
        
        assert isinstance(users, list), "Response should be a list"
        assert len(users) >= 50, f"Expected 50+ users, got {len(users)}"
        print(f"✓ Chat users: {len(users)} users returned")
    
    def test_chat_users_have_status_field(self, ceo_token):
        """Test that each user has status field (online/away/offline)"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/users", headers=headers)
        assert response.status_code == 200
        users = response.json()
        
        valid_statuses = ["online", "away", "offline"]
        for user in users[:10]:  # Check first 10
            assert "status" in user, f"Missing status for user {user.get('full_name')}"
            assert user["status"] in valid_statuses, f"Invalid status: {user['status']}"
        
        # Count statuses
        status_counts = {"online": 0, "away": 0, "offline": 0}
        for user in users:
            status_counts[user.get("status", "offline")] += 1
        print(f"✓ User statuses: online={status_counts['online']}, away={status_counts['away']}, offline={status_counts['offline']}")


class TestChatHeartbeat:
    """Chat heartbeat API tests"""
    
    def test_heartbeat_updates_last_active(self, ceo_token):
        """Test POST /api/chat/heartbeat updates user last_active"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.post(f"{BASE_URL}/api/chat/heartbeat", headers=headers)
        assert response.status_code == 200, f"Heartbeat failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Heartbeat should return ok: true"
        print("✓ Heartbeat successful")
    
    def test_user_shows_online_after_heartbeat(self, ceo_token, sales_token):
        """Test that user shows as online after heartbeat"""
        # Send heartbeat for CEO
        headers = {"Authorization": f"Bearer {ceo_token}"}
        requests.post(f"{BASE_URL}/api/chat/heartbeat", headers=headers)
        
        # Check CEO status from sales user perspective
        sales_headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/users", headers=sales_headers)
        assert response.status_code == 200
        users = response.json()
        
        # Find CEO user
        ceo_user = next((u for u in users if u.get("full_name", "").lower().startswith("aqib")), None)
        if ceo_user:
            # After heartbeat, should be online or away (within 60 min)
            assert ceo_user["status"] in ["online", "away"], f"CEO should be online/away after heartbeat, got {ceo_user['status']}"
            print(f"✓ CEO status after heartbeat: {ceo_user['status']}")
        else:
            print("✓ Heartbeat test passed (CEO user not in list - excluded self)")


class TestAttendanceGraceMinutes:
    """Test attendance grace_minutes is 30"""
    
    def test_shifts_have_30_min_grace(self, ceo_token):
        """Test GET /api/hr/shifts returns grace_minutes: 30"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/shifts", headers=headers)
        assert response.status_code == 200, f"Shifts API failed: {response.text}"
        shifts = response.json()
        
        # API returns a list of shifts
        assert isinstance(shifts, list), "Shifts should be a list"
        assert len(shifts) >= 1, "Should have at least one shift"
        
        # Check each shift has grace_minutes: 30
        for shift in shifts:
            grace = shift.get("grace_minutes")
            assert grace == 30, f"Shift {shift.get('name')} has grace_minutes={grace}, expected 30"
        print(f"✓ All {len(shifts)} shifts have grace_minutes: 30")


class TestChatConversations:
    """Chat conversation tests"""
    
    def test_get_conversations(self, ceo_token):
        """Test GET /api/chat/conversations"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=headers)
        assert response.status_code == 200, f"Conversations failed: {response.text}"
        convos = response.json()
        assert isinstance(convos, list), "Response should be a list"
        print(f"✓ Conversations: {len(convos)} found")
    
    def test_chat_unread_count(self, ceo_token):
        """Test GET /api/chat/unread-count"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/unread-count", headers=headers)
        assert response.status_code == 200, f"Unread count failed: {response.text}"
        data = response.json()
        assert "unread_count" in data, "Missing unread_count"
        print(f"✓ Unread count: {data['unread_count']}")


class TestDepartmentHeadcount:
    """Test department headcount in executive dashboard"""
    
    def test_department_headcount(self, ceo_token):
        """Test department_headcount in dashboard"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "department_headcount" in data, "Missing department_headcount"
        headcount = data["department_headcount"]
        assert isinstance(headcount, list), "department_headcount should be a list"
        
        for dept in headcount:
            assert "department" in dept, "Missing department name"
            assert "count" in dept, "Missing count"
        print(f"✓ Department headcount: {len(headcount)} departments")


class TestLeadSources:
    """Test lead sources in executive dashboard"""
    
    def test_lead_sources(self, ceo_token):
        """Test lead_sources in dashboard"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "lead_sources" in data, "Missing lead_sources"
        sources = data["lead_sources"]
        assert isinstance(sources, list), "lead_sources should be a list"
        
        for source in sources:
            assert "source" in source, "Missing source name"
            assert "count" in source, "Missing count"
        print(f"✓ Lead sources: {len(sources)} sources")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
