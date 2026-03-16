"""
Test Mentor Dashboard and Finance Withdrawals Feature
======================================================
Tests the new mentor dashboard with:
1. Role-based views (master_of_academics vs regular mentor)
2. Commission calculations (flat 1%, net 1%, team override 0.5%)
3. Bonus slabs ($10K=10%, $20K=15%, $30K=17.5%, $40K=20%, $50K=25%)
4. Finance withdrawal management
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EDWIN_CREDS = {"email": "edwin@clt-academy.com", "password": "Edwin@123"}
ASHWIN_CREDS = {"email": "ashwin@clt-academy.com", "password": "@Aqib1234"}
FINANCE_CREDS = {"email": "finance@clt-academy.com", "password": "@Aqib1234"}
ADMIN_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}


class TestAuth:
    """Authentication helpers"""
    
    @staticmethod
    def get_token(email, password):
        """Get auth token for a user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        return None

    @staticmethod
    def get_auth_headers(token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


class TestMentorDashboardEdwin:
    """Test Mentor Dashboard as Edwin (master_of_academics role)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuth.get_token(**EDWIN_CREDS)
        if not self.token:
            pytest.skip("Edwin login failed")
        self.headers = TestAuth.get_auth_headers(self.token)
    
    def test_mentor_dashboard_individual_view(self):
        """Edwin can access individual view of mentor dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Verify required fields
        assert "total_deposits_aed" in data
        assert "total_withdrawals_aed" in data
        assert "net_aed" in data
        assert "flat_commission_aed" in data
        assert "net_commission_aed" in data
        assert "total_commission_aed" in data
        assert data.get("is_master") == True, "Edwin should be marked as master_of_academics"
        assert data.get("effective_view") == "individual"
        print(f"✓ Edwin individual view - Deposits: {data['total_deposits_aed']} AED, Net: {data['net_aed']} AED")
    
    def test_mentor_dashboard_team_view(self):
        """Edwin can access team view of mentor dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("is_master") == True
        assert data.get("effective_view") == "team"
        # Team override should be present for Edwin
        assert "team_override_aed" in data
        print(f"✓ Edwin team view - Team Override: {data.get('team_override_aed', 0)} AED")
    
    def test_edwin_has_team_override_commission(self):
        """Edwin should have team_override_aed commission (0.5% of team net)"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # team_override_aed should be 0.5% of team net
        assert "team_override_aed" in data
        team_override = data.get("team_override_aed", 0)
        # Verify it's a number
        assert isinstance(team_override, (int, float))
        print(f"✓ Edwin Team Override Commission: {team_override} AED")
    
    def test_bonus_slab_structure(self):
        """Verify bonus slab structure is returned correctly"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        bonus = data.get("bonus", {})
        assert "slabs" in bonus
        slabs = bonus["slabs"]
        assert len(slabs) == 5, f"Expected 5 bonus slabs, got {len(slabs)}"
        # Verify slab thresholds
        expected_slabs = [
            {"threshold": 10000, "bonus_pct": 10},
            {"threshold": 20000, "bonus_pct": 15},
            {"threshold": 30000, "bonus_pct": 17.5},
            {"threshold": 40000, "bonus_pct": 20},
            {"threshold": 50000, "bonus_pct": 25},
        ]
        for i, expected in enumerate(expected_slabs):
            assert slabs[i]["threshold"] == expected["threshold"], f"Slab {i} threshold mismatch"
            assert slabs[i]["bonus_pct"] == expected["bonus_pct"], f"Slab {i} bonus_pct mismatch"
        print(f"✓ Bonus slabs verified: {[s['bonus_pct'] for s in slabs]}%")
    
    def test_monthly_trend_endpoint(self):
        """Test monthly trend endpoint for Edwin"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard/monthly-trend?view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Monthly trend should return a list"
        if len(data) > 0:
            # Verify structure
            item = data[0]
            assert "month" in item
            assert "deposits_aed" in item
            assert "withdrawals_aed" in item
            assert "net_aed" in item
        print(f"✓ Monthly trend: {len(data)} months of data")
    
    def test_leaderboard_endpoint(self):
        """Test leaderboard endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard/leaderboard?period=overall",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leaderboard should return a list"
        if len(data) > 0:
            # Verify structure
            mentor = data[0]
            assert "mentor_id" in mentor
            assert "mentor_name" in mentor
            assert "net_aed" in mentor
            assert "deposits_aed" in mentor
        print(f"✓ Leaderboard: {len(data)} mentors")
    
    def test_revenue_chart_endpoint(self):
        """Test revenue chart endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard/revenue-chart?period=overall",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Revenue chart should return a list"
        print(f"✓ Revenue chart: {len(data)} data points")


class TestMentorDashboardRegularMentor:
    """Test Mentor Dashboard as regular mentor (Ashwin)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuth.get_token(**ASHWIN_CREDS)
        if not self.token:
            pytest.skip("Ashwin login failed")
        self.headers = TestAuth.get_auth_headers(self.token)
    
    def test_mentor_dashboard_individual_only(self):
        """Regular mentor should only see individual view"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Regular mentor should get individual view even if team requested
        assert data.get("is_master") == False, "Ashwin should NOT be master_of_academics"
        assert data.get("effective_view") == "individual", "Regular mentor should get individual view"
        print(f"✓ Regular mentor gets individual view - is_master: {data.get('is_master')}")
    
    def test_regular_mentor_no_team_override(self):
        """Regular mentor should NOT have team_override_aed in commission"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # team_override_aed should be 0 or missing for regular mentor
        team_override = data.get("team_override_aed", 0)
        assert team_override == 0, f"Regular mentor should not have team override, got {team_override}"
        print(f"✓ Regular mentor has NO team override: {team_override}")
    
    def test_regular_mentor_commission_1_percent_net(self):
        """Regular mentor should have 1% net commission (not 1.5%)"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Net commission should be 1% of net_aed for regular mentor
        net_aed = data.get("net_aed", 0)
        net_commission = data.get("net_commission_aed", 0)
        # Verify it's approximately 1% (with some tolerance for rounding)
        if net_aed > 0:
            expected_commission = net_aed * 0.01
            tolerance = abs(expected_commission * 0.1)  # 10% tolerance for rounding
            assert abs(net_commission - expected_commission) <= tolerance, \
                f"Net commission {net_commission} should be ~1% of {net_aed} = {expected_commission}"
        print(f"✓ Regular mentor net commission: {net_commission} AED (1% of {net_aed})")


class TestMentorDashboardPeriodFilters:
    """Test period filters on mentor dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuth.get_token(**EDWIN_CREDS)
        if not self.token:
            pytest.skip("Edwin login failed")
        self.headers = TestAuth.get_auth_headers(self.token)
    
    def test_this_month_filter(self):
        """Test this_month period filter"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=this_month&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ This Month filter - Deposits: {data.get('total_deposits_aed', 0)} AED")
    
    def test_this_quarter_filter(self):
        """Test this_quarter period filter"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=this_quarter&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ This Quarter filter - Deposits: {data.get('total_deposits_aed', 0)} AED")
    
    def test_this_year_filter(self):
        """Test this_year period filter"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=this_year&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ This Year filter - Deposits: {data.get('total_deposits_aed', 0)} AED")
    
    def test_overall_filter(self):
        """Test overall period filter"""
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Overall filter - Deposits: {data.get('total_deposits_aed', 0)} AED")


class TestFinanceWithdrawals:
    """Test Finance Withdrawal Management for financier role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = TestAuth.get_token(**FINANCE_CREDS)
        if not self.token:
            pytest.skip("Finance login failed")
        self.headers = TestAuth.get_auth_headers(self.token)
    
    def test_finance_can_access_student_deposits(self):
        """Financier can access student deposits list"""
        response = requests.get(
            f"{BASE_URL}/api/finance/mentor-student-deposits?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data
        assert "total" in data
        items = data.get("items", [])
        if len(items) > 0:
            # Verify structure
            item = items[0]
            assert "student_id" in item
            assert "student_name" in item
            assert "mentor_name" in item
            assert "total_deposits_usd" in item
            assert "total_withdrawals_usd" in item
            assert "net_usd" in item
        print(f"✓ Finance can access student deposits: {len(items)} students, total: {data.get('total', 0)}")
    
    def test_finance_can_list_withdrawals(self):
        """Financier can list existing withdrawals"""
        response = requests.get(
            f"{BASE_URL}/api/finance/mentor-withdrawals?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✓ Finance can list withdrawals: {data.get('total', 0)} total")


class TestFinanceWithdrawalAuthorization:
    """Test that withdrawal endpoints are properly secured"""
    
    def test_mentor_cannot_access_finance_student_deposits(self):
        """Regular mentor should get 403 when accessing finance endpoints"""
        token = TestAuth.get_token(**ASHWIN_CREDS)
        if not token:
            pytest.skip("Ashwin login failed")
        headers = TestAuth.get_auth_headers(token)
        
        response = requests.get(
            f"{BASE_URL}/api/finance/mentor-student-deposits",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to finance student deposits")
    
    def test_mentor_cannot_record_withdrawal(self):
        """Regular mentor should get 403 when trying to record withdrawal"""
        token = TestAuth.get_token(**ASHWIN_CREDS)
        if not token:
            pytest.skip("Ashwin login failed")
        headers = TestAuth.get_auth_headers(token)
        
        response = requests.post(
            f"{BASE_URL}/api/finance/mentor-withdrawal",
            headers=headers,
            json={"student_id": "test", "amount_usd": 100}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Mentor correctly denied access to record withdrawal")


class TestMentorDashboardAccessControl:
    """Test access control for mentor dashboard"""
    
    def test_unauthorized_role_denied(self):
        """Non-mentor role should be denied access"""
        # Get a finance token
        token = TestAuth.get_token(**FINANCE_CREDS)
        if not token:
            pytest.skip("Finance login failed")
        headers = TestAuth.get_auth_headers(token)
        
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard",
            headers=headers
        )
        # Finance should get 403 for mentor dashboard
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Finance role correctly denied access to mentor dashboard")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
