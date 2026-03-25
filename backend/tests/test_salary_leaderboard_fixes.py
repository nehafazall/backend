"""
Test Salary Consistency and Mentor Leaderboard Fixes - Iteration 81

Tests:
1. Salary consistency: GET /api/mentor/dashboard returns salary_aed matching hr_employees.salary
2. Salary consistency: GET /api/mentor/effort-summary returns salary matching hr_employees.salary
3. Both endpoints return identical salary values for the same user
4. Mentor Leaderboard GET /api/mentor/leaderboard returns mentors sorted by total_effort_usd descending
5. Leaderboard response includes total_effort_usd, total_effort_aed, deposit_count, bonus_tier fields
6. Leaderboard rank 1 has the highest total_effort_usd
7. Leaderboard rank ordering is strictly by effort (no upgrades/commission in scoring)
8. Leaderboard period filter works (monthly/quarterly/yearly/all_time)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
MASTER_OF_ACADEMICS = {"email": "edwin@clt-academy.com", "password": "Edwin@123"}
CEO_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}


class TestSalaryConsistency:
    """Test salary is correctly returned from hr_employees.salary field"""
    
    @pytest.fixture(scope="class")
    def edwin_token(self):
        """Login as Edwin (Master of Academics)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MASTER_OF_ACADEMICS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as CEO/Admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_mentor_dashboard_returns_salary_aed(self, edwin_token):
        """GET /api/mentor/dashboard?period=this_month&view_mode=individual returns salary_aed"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=this_month&view_mode=individual",
            headers=headers
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Check bonus structure contains salary_aed
        assert "bonus" in data, "Response missing 'bonus' field"
        bonus = data["bonus"]
        assert "salary_aed" in bonus, "Bonus missing 'salary_aed' field"
        
        # Edwin's salary should be 5000 AED (as per problem statement)
        salary_aed = bonus["salary_aed"]
        print(f"Dashboard salary_aed: {salary_aed}")
        assert salary_aed == 5000, f"Expected salary 5000, got {salary_aed}"
    
    def test_effort_summary_returns_salary(self, edwin_token):
        """GET /api/mentor/effort-summary returns salary matching hr_employees.salary"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/effort-summary",
            headers=headers
        )
        assert response.status_code == 200, f"Effort summary failed: {response.text}"
        data = response.json()
        
        # Check salary field exists
        assert "salary" in data, "Response missing 'salary' field"
        
        # Edwin's salary should be 5000 AED
        salary = data["salary"]
        print(f"Effort summary salary: {salary}")
        assert salary == 5000, f"Expected salary 5000, got {salary}"
    
    def test_both_endpoints_return_identical_salary(self, edwin_token):
        """Both dashboard and effort-summary return identical salary values"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        
        # Get dashboard salary
        dashboard_resp = requests.get(
            f"{BASE_URL}/api/mentor/dashboard?period=this_month&view_mode=individual",
            headers=headers
        )
        assert dashboard_resp.status_code == 200
        dashboard_salary = dashboard_resp.json()["bonus"]["salary_aed"]
        
        # Get effort-summary salary
        effort_resp = requests.get(
            f"{BASE_URL}/api/mentor/effort-summary",
            headers=headers
        )
        assert effort_resp.status_code == 200
        effort_salary = effort_resp.json()["salary"]
        
        print(f"Dashboard salary: {dashboard_salary}, Effort summary salary: {effort_salary}")
        assert dashboard_salary == effort_salary, f"Salary mismatch: dashboard={dashboard_salary}, effort={effort_salary}"


class TestMentorLeaderboard:
    """Test Mentor Leaderboard is ranked by total redeposit effort"""
    
    @pytest.fixture(scope="class")
    def edwin_token(self):
        """Login as Edwin (Master of Academics)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MASTER_OF_ACADEMICS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as CEO/Admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_leaderboard_returns_200(self, edwin_token):
        """GET /api/mentor/leaderboard returns 200"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=monthly",
            headers=headers
        )
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
    
    def test_leaderboard_has_required_fields(self, edwin_token):
        """Leaderboard response includes total_effort_usd, total_effort_aed, deposit_count, bonus_tier"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=monthly",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "leaderboard" in data, "Response missing 'leaderboard' field"
        assert "total_mentors" in data, "Response missing 'total_mentors' field"
        
        leaderboard = data["leaderboard"]
        if len(leaderboard) > 0:
            first_entry = leaderboard[0]
            required_fields = ["mentor_id", "mentor_name", "total_effort_usd", "total_effort_aed", 
                              "deposit_count", "bonus_tier", "rank", "total_students"]
            for field in required_fields:
                assert field in first_entry, f"Leaderboard entry missing '{field}' field"
            print(f"First entry: {first_entry}")
    
    def test_leaderboard_sorted_by_effort_descending(self, edwin_token):
        """Leaderboard is sorted by total_effort_usd descending"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=all_time",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        leaderboard = data["leaderboard"]
        if len(leaderboard) >= 2:
            for i in range(len(leaderboard) - 1):
                current_effort = leaderboard[i]["total_effort_usd"]
                next_effort = leaderboard[i + 1]["total_effort_usd"]
                assert current_effort >= next_effort, \
                    f"Leaderboard not sorted: rank {i+1} has {current_effort}, rank {i+2} has {next_effort}"
            print(f"Leaderboard correctly sorted by effort. Top 3: {[l['total_effort_usd'] for l in leaderboard[:3]]}")
    
    def test_rank_1_has_highest_effort(self, edwin_token):
        """Rank 1 has the highest total_effort_usd"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=all_time",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        leaderboard = data["leaderboard"]
        if len(leaderboard) >= 2:
            rank_1 = leaderboard[0]
            assert rank_1["rank"] == 1, f"First entry should have rank 1, got {rank_1['rank']}"
            
            max_effort = max(l["total_effort_usd"] for l in leaderboard)
            assert rank_1["total_effort_usd"] == max_effort, \
                f"Rank 1 should have highest effort ({max_effort}), but has {rank_1['total_effort_usd']}"
            print(f"Rank 1: {rank_1['mentor_name']} with ${rank_1['total_effort_usd']} effort")
    
    def test_leaderboard_no_upgrades_commission_in_response(self, edwin_token):
        """Leaderboard response does NOT include upgrades/commission/satisfaction_score fields"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=monthly",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        leaderboard = data["leaderboard"]
        if len(leaderboard) > 0:
            first_entry = leaderboard[0]
            # These old fields should NOT be present
            old_fields = ["upgrades", "commission", "satisfaction_score", "score", "upgrade_count"]
            for field in old_fields:
                assert field not in first_entry, f"Leaderboard should NOT have '{field}' field (old ranking system)"
            print("Confirmed: No old ranking fields (upgrades/commission/satisfaction_score) in response")
    
    def test_leaderboard_period_filter_monthly(self, edwin_token):
        """Leaderboard period filter works for monthly"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=monthly",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "monthly"
        print(f"Monthly leaderboard: {data['total_mentors']} mentors")
    
    def test_leaderboard_period_filter_quarterly(self, edwin_token):
        """Leaderboard period filter works for quarterly"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=quarterly",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "quarterly"
        print(f"Quarterly leaderboard: {data['total_mentors']} mentors")
    
    def test_leaderboard_period_filter_yearly(self, edwin_token):
        """Leaderboard period filter works for yearly"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=yearly",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "yearly"
        print(f"Yearly leaderboard: {data['total_mentors']} mentors")
    
    def test_leaderboard_period_filter_all_time(self, edwin_token):
        """Leaderboard period filter works for all_time"""
        headers = {"Authorization": f"Bearer {edwin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/mentor/leaderboard?period=all_time",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "all_time"
        print(f"All-time leaderboard: {data['total_mentors']} mentors")


class TestSalaryHelperFunction:
    """Test _get_employee_salary_aed helper function behavior via API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as CEO/Admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    def test_verify_edwin_hr_salary_computed_correctly(self, admin_token):
        """Verify Edwin's salary is correctly computed from hr_employees record (either top-level or structure)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get Edwin's user ID first
        users_resp = requests.get(
            f"{BASE_URL}/api/users?search=edwin",
            headers=headers
        )
        assert users_resp.status_code == 200
        users = users_resp.json()
        
        edwin = None
        for u in users:
            if u.get("email") == "edwin@clt-academy.com":
                edwin = u
                break
        
        assert edwin is not None, "Edwin user not found"
        print(f"Edwin user ID: {edwin['id']}, role: {edwin.get('role')}")
        
        # Get HR employee record
        hr_resp = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers=headers
        )
        assert hr_resp.status_code == 200
        hr_employees = hr_resp.json()
        
        edwin_hr = None
        for emp in hr_employees:
            if emp.get("user_id") == edwin["id"] or emp.get("company_email") == "edwin@clt-academy.com":
                edwin_hr = emp
                break
        
        assert edwin_hr is not None, "Edwin HR record not found"
        
        # Compute salary using same logic as _get_employee_salary_aed
        top_salary = edwin_hr.get("salary")
        if top_salary and float(top_salary) > 0:
            computed_salary = float(top_salary)
        else:
            ss = edwin_hr.get("salary_structure") or {}
            computed_salary = sum(float(ss.get(k, 0) or 0) for k in [
                "basic_salary", "housing_allowance", "transport_allowance",
                "food_allowance", "phone_allowance", "other_allowances", "fixed_incentive"
            ])
        
        print(f"Edwin HR record: top-level salary={edwin_hr.get('salary')}, salary_structure={edwin_hr.get('salary_structure')}")
        print(f"Computed salary: {computed_salary}")
        
        # The computed salary should be 5000
        assert computed_salary == 5000, f"Expected computed salary=5000, got {computed_salary}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
