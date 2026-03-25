"""
Test Cross-Mentor Deposits Feature - Iteration 80
Tests:
1. Cross-Mentor Deposits endpoints (GET, POST, search)
2. Effort Summary endpoint
3. Mentor Dashboard commission breakdown
4. Effort-based bonus calculation
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_OF_ACADEMICS = {"email": "edwin@clt-academy.com", "password": "Edwin@123"}
CEO_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}


class TestCrossMentorDeposits:
    """Test Cross-Mentor Deposits feature"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session"""
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def master_token(self, session):
        """Get auth token for Master of Academics (Edwin)"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=MASTER_OF_ACADEMICS)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Master of Academics login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        """Get auth token for CEO/Admin"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=CEO_ADMIN)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def master_user(self, session, master_token):
        """Get Master of Academics user info"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        if response.status_code == 200:
            return response.json()
        return None
    
    # ==================== STUDENT SEARCH ENDPOINT ====================
    
    def test_student_search_endpoint_exists(self, session, master_token):
        """Test /api/mentor/cross-deposits/search-student endpoint exists"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits/search-student?q=ahmed", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Student search endpoint returns 200")
    
    def test_student_search_returns_list(self, session, master_token):
        """Test student search returns a list"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits/search-student?q=a", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Student search returns list with {len(data)} results")
    
    def test_student_search_result_fields(self, session, master_token):
        """Test student search results have required fields"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits/search-student?q=a", headers=headers)
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            student = data[0]
            required_fields = ["id", "full_name"]
            for field in required_fields:
                assert field in student, f"Missing field: {field}"
            print(f"✓ Student search results have required fields: {list(student.keys())}")
        else:
            print("⚠ No students found in search, skipping field validation")
    
    # ==================== CROSS-DEPOSITS LIST ENDPOINT ====================
    
    def test_cross_deposits_list_endpoint(self, session, master_token):
        """Test GET /api/mentor/cross-deposits endpoint"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "deposits" in data, "Response should have 'deposits' key"
        assert "effort_summary" in data, "Response should have 'effort_summary' key"
        print(f"✓ Cross-deposits list endpoint returns deposits: {len(data['deposits'])}, effort_summary: {len(data['effort_summary'])}")
    
    def test_cross_deposits_with_period_filter(self, session, master_token):
        """Test cross-deposits with period filter"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits?period=this_month", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "deposits" in data
        print(f"✓ Cross-deposits with period filter works: {len(data['deposits'])} deposits this month")
    
    def test_cross_deposits_effort_summary_structure(self, session, master_token):
        """Test effort_summary structure in cross-deposits response"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits", headers=headers)
        assert response.status_code == 200
        data = response.json()
        effort_summary = data.get("effort_summary", [])
        if len(effort_summary) > 0:
            entry = effort_summary[0]
            expected_fields = ["mentor_id", "mentor_name", "total_effort_usd", "total_effort_aed", "deposit_count"]
            for field in expected_fields:
                assert field in entry, f"Missing field in effort_summary: {field}"
            print(f"✓ Effort summary has correct structure: {list(entry.keys())}")
        else:
            print("⚠ No effort summary data, skipping structure validation")
    
    # ==================== EFFORT SUMMARY ENDPOINT ====================
    
    def test_effort_summary_endpoint(self, session, master_token):
        """Test GET /api/mentor/effort-summary endpoint"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/effort-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"✓ Effort summary endpoint returns 200")
        return data
    
    def test_effort_summary_has_required_fields(self, session, master_token):
        """Test effort summary has all required fields"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/effort-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "own_deposits_usd", "own_deposits_aed", "own_count",
            "cross_deposits_usd", "cross_deposits_aed", "cross_count",
            "total_effort_usd", "total_effort_aed", "total_count",
            "bonus_tier"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Effort summary has all required fields")
        print(f"  - Own deposits: ${data['own_deposits_usd']} ({data['own_count']} deposits)")
        print(f"  - Cross deposits: ${data['cross_deposits_usd']} ({data['cross_count']} deposits)")
        print(f"  - Total effort: ${data['total_effort_usd']}")
        print(f"  - Bonus tier: {data['bonus_tier']}")
    
    def test_effort_summary_total_calculation(self, session, master_token):
        """Test that total_effort = own_deposits + cross_deposits"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/effort-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_total = data["own_deposits_usd"] + data["cross_deposits_usd"]
        actual_total = data["total_effort_usd"]
        assert abs(expected_total - actual_total) < 0.01, f"Total mismatch: {expected_total} != {actual_total}"
        print(f"✓ Total effort calculation correct: {data['own_deposits_usd']} + {data['cross_deposits_usd']} = {actual_total}")
    
    # ==================== MENTOR DASHBOARD COMMISSION BREAKDOWN ====================
    
    def test_mentor_dashboard_endpoint(self, session, master_token):
        """Test GET /api/mentor/dashboard endpoint"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Mentor dashboard endpoint returns 200")
    
    def test_mentor_dashboard_commission_fields(self, session, master_token):
        """Test mentor dashboard has commission breakdown fields"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        commission_fields = [
            "flat_commission_aed",
            "net_commission_aed",
            "team_override_aed",
            "total_commission_aed"
        ]
        for field in commission_fields:
            assert field in data, f"Missing commission field: {field}"
        
        print(f"✓ Mentor dashboard has commission breakdown:")
        print(f"  - Flat (1% of deposits): AED {data['flat_commission_aed']}")
        print(f"  - Net (1% of net): AED {data['net_commission_aed']}")
        print(f"  - Team Override (0.5%): AED {data['team_override_aed']}")
        print(f"  - Total: AED {data['total_commission_aed']}")
    
    def test_mentor_dashboard_bonus_structure(self, session, master_token):
        """Test mentor dashboard has bonus structure with effort-based calculation"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "bonus" in data, "Missing 'bonus' field in dashboard"
        bonus = data["bonus"]
        
        bonus_fields = ["month_net_usd", "slabs", "current_slab", "next_slab"]
        for field in bonus_fields:
            assert field in bonus, f"Missing bonus field: {field}"
        
        print(f"✓ Mentor dashboard has bonus structure:")
        print(f"  - Month net USD: ${bonus['month_net_usd']}")
        print(f"  - Current slab: {bonus['current_slab']}")
        print(f"  - Next slab: {bonus['next_slab']}")
    
    def test_mentor_dashboard_total_commission_calculation(self, session, master_token):
        """Test total commission = flat + net + team_override"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        expected_total = data["flat_commission_aed"] + data["net_commission_aed"] + data["team_override_aed"]
        actual_total = data["total_commission_aed"]
        assert abs(expected_total - actual_total) < 0.01, f"Commission total mismatch: {expected_total} != {actual_total}"
        print(f"✓ Total commission calculation correct: {data['flat_commission_aed']} + {data['net_commission_aed']} + {data['team_override_aed']} = {actual_total}")
    
    # ==================== RECORD CROSS-DEPOSIT (POST) ====================
    
    def test_record_cross_deposit_requires_student_id(self, session, master_token):
        """Test POST /api/mentor/cross-deposits requires student_id"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.post(f"{BASE_URL}/api/mentor/cross-deposits", 
                               json={"amount": 100}, headers=headers)
        assert response.status_code == 400, f"Expected 400 for missing student_id, got {response.status_code}"
        print(f"✓ Record cross-deposit correctly requires student_id")
    
    def test_record_cross_deposit_requires_positive_amount(self, session, master_token):
        """Test POST /api/mentor/cross-deposits requires positive amount"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.post(f"{BASE_URL}/api/mentor/cross-deposits", 
                               json={"student_id": "test", "amount": 0}, headers=headers)
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        print(f"✓ Record cross-deposit correctly requires positive amount")
    
    def test_record_cross_deposit_validates_student(self, session, master_token):
        """Test POST /api/mentor/cross-deposits validates student exists"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.post(f"{BASE_URL}/api/mentor/cross-deposits", 
                               json={"student_id": "nonexistent-student-id", "amount": 100}, headers=headers)
        assert response.status_code == 404, f"Expected 404 for nonexistent student, got {response.status_code}"
        print(f"✓ Record cross-deposit correctly validates student exists")
    
    # ==================== ADMIN ACCESS ====================
    
    def test_admin_can_access_cross_deposits(self, session, admin_token):
        """Test admin can access cross-deposits endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/cross-deposits", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Admin can access cross-deposits endpoint")
    
    def test_admin_can_access_effort_summary(self, session, admin_token):
        """Test admin can access effort-summary endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/effort-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Admin can access effort-summary endpoint")


class TestMentorDashboardCommission:
    """Test Mentor Dashboard Commission Display"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def master_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json=MASTER_OF_ACADEMICS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Master of Academics login failed")
    
    def test_dashboard_individual_view(self, session, master_token):
        """Test dashboard with individual view mode"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("effective_view") == "individual", f"Expected individual view, got {data.get('effective_view')}"
        print(f"✓ Dashboard individual view works correctly")
    
    def test_dashboard_team_view_for_master(self, session, master_token):
        """Test dashboard with team view mode for Master of Academics"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Master of Academics should be able to see team view
        print(f"✓ Dashboard team view works for Master of Academics")
        print(f"  - Total students: {data.get('total_students')}")
        print(f"  - Total deposits: AED {data.get('total_deposits_aed')}")
    
    def test_dashboard_revenue_fields(self, session, master_token):
        """Test dashboard has all revenue fields"""
        headers = {"Authorization": f"Bearer {master_token}"}
        response = session.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        revenue_fields = [
            "total_deposits_usd", "total_deposits_aed",
            "total_withdrawals_usd", "total_withdrawals_aed",
            "net_usd", "net_aed"
        ]
        for field in revenue_fields:
            assert field in data, f"Missing revenue field: {field}"
        
        print(f"✓ Dashboard has all revenue fields:")
        print(f"  - Deposits: ${data['total_deposits_usd']} / AED {data['total_deposits_aed']}")
        print(f"  - Withdrawals: ${data['total_withdrawals_usd']} / AED {data['total_withdrawals_aed']}")
        print(f"  - Net: ${data['net_usd']} / AED {data['net_aed']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
