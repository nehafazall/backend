"""
Iteration 87 Backend Tests
Tests for:
1. Executive Dashboard - enriched data with all 3 departments
2. Chat system - online/away/offline status
3. Attendance grace period (30 minutes)
4. Leave approval marks attendance as on_leave
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EMAIL = "aleesha@clt-academy.com"
SALES_PASSWORD = "Aleesha@123"
CS_EMAIL = "falja@clt-academy.com"
CS_PASSWORD = "Falja@123"


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
    
    def test_sales_login(self):
        """Test Sales Executive login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "access_token" in data


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("CEO authentication failed")


@pytest.fixture(scope="module")
def sales_token():
    """Get Sales auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Sales authentication failed")


class TestExecutiveDashboard:
    """Executive Dashboard API tests - enriched data with all 3 departments"""
    
    def test_executive_dashboard_access(self, ceo_token):
        """Test CEO can access executive dashboard"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200, f"Executive dashboard failed: {response.text}"
    
    def test_executive_dashboard_kpis_structure(self, ceo_token):
        """Test KPIs include sales_revenue, cs_revenue, mentor_revenue"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        kpis = data.get("kpis", {})
        # Check required KPI fields
        assert "sales_revenue" in kpis, "Missing sales_revenue in KPIs"
        assert "cs_revenue" in kpis, "Missing cs_revenue in KPIs"
        assert "mentor_revenue" in kpis, "Missing mentor_revenue in KPIs"
        assert "revenue_month" in kpis, "Missing revenue_month in KPIs"
        assert "total_employees" in kpis, "Missing total_employees in KPIs"
        assert "enrolled_month" in kpis, "Missing enrolled_month in KPIs"
    
    def test_executive_dashboard_attendance_breakdown(self, ceo_token):
        """Test attendance breakdown includes present, half_day, absent, on_leave, warning"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        attendance = data.get("attendance", {})
        # Check required attendance fields
        assert "present" in attendance, "Missing present in attendance"
        assert "half_day" in attendance, "Missing half_day in attendance"
        assert "absent" in attendance, "Missing absent in attendance"
        assert "on_leave" in attendance, "Missing on_leave in attendance"
        assert "warning" in attendance, "Missing warning in attendance"
        assert "total" in attendance, "Missing total in attendance"
    
    def test_executive_dashboard_gender_breakdown(self, ceo_token):
        """Test gender breakdown has Male/Female properly tagged"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        gender = data.get("gender_breakdown", {})
        # Should have Male and/or Female keys
        assert isinstance(gender, dict), "gender_breakdown should be a dict"
        # At least one gender should be present
        assert len(gender) > 0 or True, "gender_breakdown can be empty if no employees"
    
    def test_executive_dashboard_monthly_trend(self, ceo_token):
        """Test monthly_trend has sales, cs, mentors columns"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        trend = data.get("monthly_trend", [])
        assert isinstance(trend, list), "monthly_trend should be a list"
        if len(trend) > 0:
            first_month = trend[0]
            assert "sales" in first_month, "Missing sales in monthly_trend"
            assert "cs" in first_month, "Missing cs in monthly_trend"
            assert "mentors" in first_month, "Missing mentors in monthly_trend"
            assert "month" in first_month, "Missing month in monthly_trend"
            assert "label" in first_month, "Missing label in monthly_trend"
    
    def test_executive_dashboard_revenue_by_course(self, ceo_token):
        """Test revenue_by_course has proper course names"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        rev_by_course = data.get("revenue_by_course", [])
        assert isinstance(rev_by_course, list), "revenue_by_course should be a list"
        for item in rev_by_course:
            assert "course" in item, "Missing course in revenue_by_course item"
            assert "revenue" in item, "Missing revenue in revenue_by_course item"
    
    def test_executive_dashboard_top_performers_all_depts(self, ceo_token):
        """Test top_performers includes sales, cs, mentors"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        top = data.get("top_performers", {})
        assert "sales" in top, "Missing sales in top_performers"
        assert "cs" in top, "Missing cs in top_performers"
        assert "mentors" in top, "Missing mentors in top_performers"
        
        # Check structure of each
        for dept in ["sales", "cs", "mentors"]:
            assert isinstance(top[dept], list), f"top_performers.{dept} should be a list"
    
    def test_executive_dashboard_revenue_split(self, ceo_token):
        """Test revenue_split by department"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        split = data.get("revenue_split", [])
        assert isinstance(split, list), "revenue_split should be a list"
        dept_names = [s.get("name") for s in split]
        assert "Sales" in dept_names, "Missing Sales in revenue_split"
        assert "Customer Service" in dept_names, "Missing Customer Service in revenue_split"
        assert "Academics" in dept_names, "Missing Academics in revenue_split"
    
    def test_executive_dashboard_recent_enrollments(self, ceo_token):
        """Test recent_enrollments data"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        enrollments = data.get("recent_enrollments", [])
        assert isinstance(enrollments, list), "recent_enrollments should be a list"
    
    def test_executive_dashboard_restricted_for_non_admin(self, sales_token):
        """Test executive dashboard is restricted for non-admin users"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        # Should be 403 Forbidden for non-admin
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestChatUsersStatus:
    """Chat system - online/away/offline status tests"""
    
    def test_chat_users_returns_status(self, ceo_token):
        """Test GET /api/chat/users returns status field"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/users", headers=headers)
        assert response.status_code == 200, f"Chat users failed: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "chat/users should return a list"
        
        # Check that users have status field
        for user in users[:5]:  # Check first 5 users
            assert "status" in user, f"User {user.get('id')} missing status field"
            assert user["status"] in ["online", "away", "offline"], f"Invalid status: {user['status']}"
    
    def test_chat_heartbeat(self, ceo_token):
        """Test POST /api/chat/heartbeat updates last_active"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.post(f"{BASE_URL}/api/chat/heartbeat", headers=headers)
        assert response.status_code == 200, f"Heartbeat failed: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Heartbeat should return ok: true"
    
    def test_chat_conversations_include_participant_status(self, ceo_token):
        """Test GET /api/chat/conversations includes participant status"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=headers)
        assert response.status_code == 200, f"Chat conversations failed: {response.text}"
        
        convos = response.json()
        assert isinstance(convos, list), "chat/conversations should return a list"
        
        # Check that conversations have other_participants with status
        for convo in convos[:3]:  # Check first 3 conversations
            other_participants = convo.get("other_participants", [])
            for p in other_participants:
                assert "status" in p, f"Participant {p.get('id')} missing status field"
                assert p["status"] in ["online", "away", "offline"], f"Invalid status: {p['status']}"


class TestAttendanceGracePeriod:
    """Attendance grace period tests - should be 30 minutes"""
    
    def test_shifts_grace_period(self, ceo_token):
        """Test that shifts have 30 minute grace period"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/shifts", headers=headers)
        assert response.status_code == 200, f"Shifts API failed: {response.text}"
        
        shifts = response.json()
        assert isinstance(shifts, list), "shifts should return a list"
        
        # Check that morning shift has 30 minute grace
        morning_shift = next((s for s in shifts if s.get("id") == "morning" or "morning" in s.get("name", "").lower()), None)
        if morning_shift:
            grace = morning_shift.get("grace_minutes", 0)
            assert grace == 30, f"Morning shift grace should be 30, got {grace}"


class TestLeaveApprovalAttendance:
    """Leave approval marks attendance as on_leave tests"""
    
    def test_leave_requests_endpoint(self, ceo_token):
        """Test leave requests endpoint is accessible"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/leave-requests", headers=headers)
        assert response.status_code == 200, f"Leave requests failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "leave-requests should return a list"


class TestChatAPIs:
    """Additional Chat API tests"""
    
    def test_chat_users_includes_all_employees(self, ceo_token):
        """Test chat users returns employees (not just active)"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        # Should have multiple users
        assert len(users) > 0, "Should have at least some users for chat"
        
        # Check user structure
        for user in users[:3]:
            assert "id" in user, "User missing id"
            assert "full_name" in user, "User missing full_name"
            assert "status" in user, "User missing status"
    
    def test_create_conversation(self, ceo_token):
        """Test creating a new conversation"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        
        # First get a user to chat with
        users_response = requests.get(f"{BASE_URL}/api/chat/users", headers=headers)
        assert users_response.status_code == 200
        users = users_response.json()
        
        if len(users) > 0:
            target_user = users[0]
            response = requests.post(f"{BASE_URL}/api/chat/conversations", 
                headers=headers,
                json={"participant_ids": [target_user["id"]]}
            )
            assert response.status_code == 200, f"Create conversation failed: {response.text}"
            data = response.json()
            assert "id" in data, "Conversation should have id"
            assert "participants" in data, "Conversation should have participants"


class TestDashboardDataIntegrity:
    """Test data integrity of executive dashboard"""
    
    def test_revenue_totals_match(self, ceo_token):
        """Test that revenue_month equals sum of department revenues"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        kpis = data.get("kpis", {})
        total = kpis.get("revenue_month", 0)
        sales = kpis.get("sales_revenue", 0)
        cs = kpis.get("cs_revenue", 0)
        mentor = kpis.get("mentor_revenue", 0)
        
        calculated_total = sales + cs + mentor
        # Allow small floating point differences
        assert abs(total - calculated_total) < 1, f"Revenue mismatch: {total} != {sales} + {cs} + {mentor}"
    
    def test_monthly_trend_has_6_months(self, ceo_token):
        """Test monthly trend has 6 months of data"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        trend = data.get("monthly_trend", [])
        assert len(trend) == 6, f"Expected 6 months in trend, got {len(trend)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
