"""
Iteration 89 Tests: Payroll Negative Salary Fix + Executive Dashboard Commission/Salary Fix

Tests:
1. Payroll should have ZERO negative salaries (only explicit absent/half-day deductions)
2. Executive Dashboard salary_payout should show correct values from payroll
3. Executive Dashboard commission should match commission dashboard totals
4. Shifts should have grace_minutes: 30
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get CEO auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        assert len(auth_token) > 50


class TestPayrollNoNegativeSalaries:
    """Test that payroll has no negative salaries after fix"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_payroll_march_2026_no_negative_salaries(self, auth_token):
        """Verify March 2026 payroll has zero negative net salaries"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/payroll?month=2026-03", headers=headers)
        
        assert response.status_code == 200, f"Payroll API failed: {response.text}"
        payroll_data = response.json()
        
        # Count negative salaries
        negative_salaries = [p for p in payroll_data if p.get("net_salary", 0) < 0]
        
        assert len(negative_salaries) == 0, f"Found {len(negative_salaries)} negative salaries: {[p['employee_name'] for p in negative_salaries[:5]]}"
        print(f"✓ Payroll has {len(payroll_data)} records with ZERO negative salaries")
    
    def test_payroll_deductions_only_for_explicit_absent(self, auth_token):
        """Verify deductions are only for explicitly absent/half-day records"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/payroll?month=2026-03", headers=headers)
        
        assert response.status_code == 200
        payroll_data = response.json()
        
        # Check employees with deductions
        employees_with_deductions = [p for p in payroll_data if p.get("total_deductions", 0) > 0]
        
        for emp in employees_with_deductions:
            deductions = emp.get("deductions", [])
            for d in deductions:
                # Deductions should only be for half_day or absence
                assert d.get("type") in ["half_day", "absence"], f"Unexpected deduction type: {d.get('type')} for {emp['employee_name']}"
        
        print(f"✓ {len(employees_with_deductions)} employees have valid deductions (half_day/absence only)")


class TestExecutiveDashboardSalaryPayout:
    """Test Executive Dashboard salary_payout values"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_executive_dashboard_returns_200(self, auth_token):
        """Verify executive dashboard endpoint works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers, timeout=30)
        
        assert response.status_code == 200, f"Executive dashboard failed: {response.text}"
        data = response.json()
        assert "salary_payout" in data, "Missing salary_payout in response"
        assert "kpis" in data, "Missing kpis in response"
    
    def test_salary_payout_values_correct(self, auth_token):
        """Verify salary_payout shows correct values (~171K gross, ~166K net, ~12K deductions)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        sp = data.get("salary_payout", {})
        
        # Expected values based on requirements
        total_gross = sp.get("total_gross", 0)
        total_net = sp.get("total_net", 0)
        total_deductions = sp.get("total_deductions", 0)
        employee_count = sp.get("employee_count", 0)
        
        # Verify gross salary is around 171K (allow 10% variance)
        assert 150000 <= total_gross <= 200000, f"Gross salary {total_gross} not in expected range 150K-200K"
        
        # Verify net salary is around 166K
        assert 140000 <= total_net <= 190000, f"Net salary {total_net} not in expected range 140K-190K"
        
        # Verify deductions are around 12K (not inflated)
        assert total_deductions <= 30000, f"Deductions {total_deductions} too high (expected ~12K)"
        
        # Verify employee count is reasonable
        assert employee_count >= 40, f"Employee count {employee_count} too low"
        
        print(f"✓ Salary Payout: Gross={total_gross}, Net={total_net}, Deductions={total_deductions}, Employees={employee_count}")


class TestExecutiveDashboardCommission:
    """Test Executive Dashboard commission matches commission dashboard"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_commission_matches_commission_dashboard(self, auth_token):
        """Verify total_commission in exec dashboard matches commission dashboard totals"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get executive dashboard
        exec_response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers, timeout=30)
        assert exec_response.status_code == 200
        exec_data = exec_response.json()
        exec_commission = exec_data.get("salary_payout", {}).get("total_commission", 0)
        
        # Get commission dashboard
        comm_response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month=2026-03", headers=headers)
        assert comm_response.status_code == 200
        comm_data = comm_response.json()
        
        # Calculate total from commission dashboard
        comm_total = (
            comm_data.get("total_sales_earned", 0) +
            comm_data.get("total_sales_pending", 0) +
            comm_data.get("total_tl_earned", 0) +
            comm_data.get("total_tl_pending", 0) +
            comm_data.get("total_cs_earned", 0) +
            comm_data.get("total_cs_pending", 0) +
            comm_data.get("total_cs_head_earned", 0)
        )
        
        # Allow 5% variance due to timing
        variance = abs(exec_commission - comm_total) / max(comm_total, 1) * 100
        
        assert variance <= 5, f"Commission mismatch: Exec={exec_commission}, CommDash={comm_total}, Variance={variance:.1f}%"
        print(f"✓ Commission matches: Exec={exec_commission}, CommDash={comm_total}")
    
    def test_commission_not_inflated(self, auth_token):
        """Verify commission is around 42-48K, not 755K from old commission_transactions"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        total_commission = data.get("salary_payout", {}).get("total_commission", 0)
        
        # Commission should be around 42-48K, definitely not 755K
        assert total_commission < 100000, f"Commission {total_commission} is inflated (expected ~48K)"
        assert total_commission >= 30000, f"Commission {total_commission} too low (expected ~48K)"
        
        print(f"✓ Commission is reasonable: {total_commission} (expected ~48K)")
    
    def test_total_payout_calculation(self, auth_token):
        """Verify total_payout = total_net + total_commission"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/executive/dashboard", headers=headers, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        sp = data.get("salary_payout", {})
        
        total_net = sp.get("total_net", 0)
        total_commission = sp.get("total_commission", 0)
        total_payout = sp.get("total_payout", 0)
        
        expected_payout = total_net + total_commission
        
        # Allow small rounding difference
        assert abs(total_payout - expected_payout) < 1, f"Payout mismatch: {total_payout} != {total_net} + {total_commission}"
        
        # Verify total payout is around 214K
        assert 180000 <= total_payout <= 250000, f"Total payout {total_payout} not in expected range"
        
        print(f"✓ Total Payout: {total_payout} = Net({total_net}) + Commission({total_commission})")


class TestShiftsGraceMinutes:
    """Test shifts have grace_minutes: 30"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_all_shifts_have_grace_minutes_30(self, auth_token):
        """Verify all shifts have grace_minutes: 30"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/shifts", headers=headers)
        
        assert response.status_code == 200, f"Shifts API failed: {response.text}"
        shifts = response.json()
        
        assert len(shifts) > 0, "No shifts found"
        
        for shift in shifts:
            grace = shift.get("grace_minutes")
            assert grace == 30, f"Shift '{shift.get('name')}' has grace_minutes={grace}, expected 30"
        
        print(f"✓ All {len(shifts)} shifts have grace_minutes: 30")


class TestCommissionDashboard:
    """Test commission dashboard returns expected values"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        return response.json().get("access_token")
    
    def test_commission_dashboard_march_2026(self, auth_token):
        """Verify commission dashboard returns expected fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month=2026-03", headers=headers)
        
        assert response.status_code == 200, f"Commission dashboard failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        required_fields = [
            "total_sales_earned", "total_sales_pending",
            "total_tl_earned", "total_tl_pending",
            "total_cs_earned", "total_cs_pending",
            "total_cs_head_earned"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Calculate total
        total = sum(data.get(f, 0) for f in required_fields)
        
        # Total should be around 42-48K
        assert 30000 <= total <= 60000, f"Commission total {total} not in expected range 30K-60K"
        
        print(f"✓ Commission Dashboard total: {total}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
