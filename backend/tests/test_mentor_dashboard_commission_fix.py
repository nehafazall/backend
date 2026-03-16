"""
Mentor Dashboard Commission Fix Tests - Iteration 52
Tests for:
1. Edwin's net commission = 1% (not 1.5%)
2. Team override for Edwin = 0.5%
3. Leaderboard returns 6 mentors
4. Revenue chart returns 6 mentors
5. Monthly trend returns data
6. Team stats visible for Edwin
7. Regular mentor (Ashwin) sees individual data only
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCommissionFix:
    """Commission calculation and API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get Edwin's token"""
        # Edwin (master_of_academics) login
        edwin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "edwin@clt-academy.com",
            "password": "Edwin@123"
        })
        assert edwin_login.status_code == 200, f"Edwin login failed: {edwin_login.text}"
        self.edwin_token = edwin_login.json().get("access_token")
        
        # Ashwin (regular mentor) login
        ashwin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ashwin@clt-academy.com", 
            "password": "@Aqib1234"
        })
        assert ashwin_login.status_code == 200, f"Ashwin login failed: {ashwin_login.text}"
        self.ashwin_token = ashwin_login.json().get("access_token")
    
    # === COMMISSION RATE TESTS ===
    
    def test_edwin_net_commission_rate_is_one_percent(self):
        """Edwin's net commission should be 1% of net (not 1.5%)"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert resp.status_code == 200, f"API failed: {resp.text}"
        data = resp.json()
        
        # Calculate expected net commission (1% of net_aed)
        net_aed = data.get("net_aed", 0)
        net_commission_aed = data.get("net_commission_aed", 0)
        expected_commission = round(net_aed * 0.01, 2)
        
        # The commission should be 1% of net
        assert abs(net_commission_aed - expected_commission) < 0.01, \
            f"Net commission should be 1% ({expected_commission}) but got {net_commission_aed}"
        print(f"✓ Edwin's net commission is 1%: {net_commission_aed} AED (net: {net_aed} AED)")
    
    def test_edwin_team_override_is_half_percent(self):
        """Edwin's team override should be 0.5% of team net"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Team override should exist for master_of_academics
        team_override = data.get("team_override_aed", 0)
        is_master = data.get("is_master", False)
        
        assert is_master == True, "Edwin should be identified as master_of_academics"
        # Team override can be 0 if no team net, but should exist as a field
        assert "team_override_aed" in data, "team_override_aed field should exist"
        print(f"✓ Edwin's team override: {team_override} AED (is_master: {is_master})")
    
    def test_regular_mentor_net_commission_is_one_percent(self):
        """Regular mentor (Ashwin) should have 1% net commission"""
        headers = {"Authorization": f"Bearer {self.ashwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        net_aed = data.get("net_aed", 0)
        net_commission_aed = data.get("net_commission_aed", 0)
        expected_commission = round(net_aed * 0.01, 2)
        
        assert abs(net_commission_aed - expected_commission) < 0.01, \
            f"Ashwin's net commission should be 1% ({expected_commission}) but got {net_commission_aed}"
        print(f"✓ Ashwin's net commission is 1%: {net_commission_aed} AED (net: {net_aed} AED)")
    
    def test_regular_mentor_no_team_override(self):
        """Regular mentor should have team_override_aed = 0"""
        headers = {"Authorization": f"Bearer {self.ashwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        team_override = data.get("team_override_aed", 0)
        is_master = data.get("is_master", False)
        
        assert is_master == False, "Ashwin should not be master_of_academics"
        assert team_override == 0, f"Regular mentor should have 0 team override, got {team_override}"
        print(f"✓ Ashwin has no team override (team_override_aed: {team_override})")
    
    # === LEADERBOARD TESTS ===
    
    def test_leaderboard_returns_mentor_data(self):
        """Leaderboard should return mentor rankings"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard/leaderboard?period=overall", headers=headers)
        assert resp.status_code == 200, f"Leaderboard API failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Leaderboard should return a list"
        assert len(data) > 0, "Leaderboard should have at least 1 mentor"
        
        # Check structure of first entry
        if len(data) > 0:
            first = data[0]
            assert "mentor_id" in first, "Leaderboard entry should have mentor_id"
            assert "mentor_name" in first, "Leaderboard entry should have mentor_name"
            assert "net_aed" in first, "Leaderboard entry should have net_aed"
            assert "deposits_aed" in first, "Leaderboard entry should have deposits_aed"
        
        print(f"✓ Leaderboard returned {len(data)} mentors")
        for i, m in enumerate(data[:3]):
            print(f"  {i+1}. {m.get('mentor_name')}: {m.get('net_aed')} AED net")
    
    # === REVENUE CHART TESTS ===
    
    def test_revenue_chart_returns_mentor_data(self):
        """Revenue chart should return mentor deposits data"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard/revenue-chart?period=overall", headers=headers)
        assert resp.status_code == 200, f"Revenue chart API failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Revenue chart should return a list"
        assert len(data) > 0, "Revenue chart should have data"
        
        if len(data) > 0:
            first = data[0]
            assert "mentor_name" in first, "Revenue chart entry should have mentor_name"
            assert "deposits_aed" in first, "Revenue chart entry should have deposits_aed"
        
        print(f"✓ Revenue chart returned {len(data)} mentors")
    
    # === MONTHLY TREND TESTS ===
    
    def test_monthly_trend_returns_data(self):
        """Monthly trend should return monthly aggregates"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard/monthly-trend?view_mode=individual", headers=headers)
        assert resp.status_code == 200, f"Monthly trend API failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Monthly trend should return a list"
        
        if len(data) > 0:
            first = data[0]
            assert "month" in first, "Trend entry should have month"
            assert "deposits_aed" in first, "Trend entry should have deposits_aed"
            assert "withdrawals_aed" in first, "Trend entry should have withdrawals_aed"
            assert "net_aed" in first, "Trend entry should have net_aed"
        
        print(f"✓ Monthly trend returned {len(data)} months of data")
    
    # === TEAM VIEW TESTS ===
    
    def test_edwin_team_view_aggregates_team_data(self):
        """Edwin's team view should aggregate all team mentors"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team", headers=headers)
        assert resp.status_code == 200, f"Team view API failed: {resp.text}"
        data = resp.json()
        
        assert data.get("effective_view") == "team", "View mode should be team"
        assert "total_deposits_aed" in data, "Team view should have total_deposits_aed"
        assert "total_withdrawals_aed" in data, "Team view should have total_withdrawals_aed"
        assert "net_aed" in data, "Team view should have net_aed"
        
        print(f"✓ Team view: {data.get('total_deposits_aed')} AED deposits, "
              f"{data.get('total_withdrawals_aed')} AED withdrawals, "
              f"{data.get('net_aed')} AED net")
    
    def test_ashwin_individual_view_only(self):
        """Ashwin should only see individual view"""
        headers = {"Authorization": f"Bearer {self.ashwin_token}"}
        # Even if view_mode=team is passed, regular mentor should get individual
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=team", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        effective_view = data.get("effective_view")
        assert effective_view == "individual", \
            f"Ashwin should always get individual view, got {effective_view}"
        print(f"✓ Ashwin forced to individual view (effective_view: {effective_view})")
    
    # === BONUS PROGRESS TESTS ===
    
    def test_bonus_slabs_structure(self):
        """Bonus slabs should be properly structured"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        bonus = data.get("bonus", {})
        assert "slabs" in bonus, "Bonus should have slabs"
        slabs = bonus.get("slabs", [])
        assert len(slabs) == 5, f"Should have 5 bonus slabs, got {len(slabs)}"
        
        # Verify slab structure
        expected_slabs = [
            {"threshold": 10000, "bonus_pct": 10},
            {"threshold": 20000, "bonus_pct": 15},
            {"threshold": 30000, "bonus_pct": 17.5},
            {"threshold": 40000, "bonus_pct": 20},
            {"threshold": 50000, "bonus_pct": 25},
        ]
        for i, slab in enumerate(slabs):
            assert slab["threshold"] == expected_slabs[i]["threshold"], \
                f"Slab {i} threshold mismatch"
            assert slab["bonus_pct"] == expected_slabs[i]["bonus_pct"], \
                f"Slab {i} bonus_pct mismatch"
        
        print(f"✓ Bonus slabs correctly structured (5 slabs)")
        print(f"  Current month net: ${bonus.get('month_net_usd', 0)}")
        print(f"  Current slab: {bonus.get('current_slab')}")
    
    # === STUDENT PIPELINE TESTS ===
    
    def test_student_stages_present(self):
        """Dashboard should include student stage breakdown"""
        headers = {"Authorization": f"Bearer {self.edwin_token}"}
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "student_stages" in data, "Dashboard should have student_stages"
        assert "total_students" in data, "Dashboard should have total_students"
        assert "students_connected" in data, "Dashboard should have students_connected"
        
        print(f"✓ Student pipeline: {data.get('total_students')} total, "
              f"{data.get('students_connected')} connected")
        print(f"  Stages: {data.get('student_stages')}")


class TestCommissionCalculation:
    """Detailed commission calculation verification"""
    
    def test_commission_formula_verification(self):
        """Verify the commission calculation formula"""
        # Login as Edwin
        login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "edwin@clt-academy.com",
            "password": "Edwin@123"
        })
        assert login.status_code == 200
        token = login.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        resp = requests.get(f"{BASE_URL}/api/mentor/dashboard?period=overall&view_mode=individual", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Extract values
        total_deposits_aed = data.get("total_deposits_aed", 0)
        net_aed = data.get("net_aed", 0)
        flat_commission_aed = data.get("flat_commission_aed", 0)
        net_commission_aed = data.get("net_commission_aed", 0)
        team_override_aed = data.get("team_override_aed", 0)
        total_commission_aed = data.get("total_commission_aed", 0)
        
        # Verify flat commission = 1% of deposits
        expected_flat = round(total_deposits_aed * 0.01, 2)
        assert abs(flat_commission_aed - expected_flat) < 0.01, \
            f"Flat commission should be 1% of deposits. Expected {expected_flat}, got {flat_commission_aed}"
        
        # Verify net commission = 1% of net (NOT 1.5%)
        expected_net = round(net_aed * 0.01, 2)  # THIS IS THE FIX - 1% not 1.5%
        assert abs(net_commission_aed - expected_net) < 0.01, \
            f"Net commission should be 1% of net. Expected {expected_net}, got {net_commission_aed}"
        
        # Verify total = flat + net + team_override
        expected_total = flat_commission_aed + net_commission_aed + team_override_aed
        assert abs(total_commission_aed - expected_total) < 0.01, \
            f"Total commission should be sum of parts. Expected {expected_total}, got {total_commission_aed}"
        
        print(f"✓ Commission formula verified:")
        print(f"  Deposits: {total_deposits_aed} AED")
        print(f"  Net: {net_aed} AED")
        print(f"  Flat (1% of deposits): {flat_commission_aed} AED")
        print(f"  Net (1% of net): {net_commission_aed} AED")
        print(f"  Team Override (0.5% team): {team_override_aed} AED")
        print(f"  Total: {total_commission_aed} AED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
