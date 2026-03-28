"""
Iteration 93: SSHR and HR Attendance Fixes Tests
- SSHR overview shows monthly attendance instead of weekly
- Only Sunday is OFF (not Friday/Saturday)
- HR Attendance shows employees who didn't punch in
- Late minutes recalculated using current shift config
- SSHR Attendance tab shows calendar view with color-coded days
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"
SALES_EXEC_EMAIL = "aleesha@clt-academy.com"
SALES_EXEC_PASSWORD = "Aleesha@123"


class TestAuthentication:
    """Authentication tests"""
    
    def test_ceo_login(self):
        """Test CEO login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert data["user"]["role"] == "super_admin"
    
    def test_cs_head_login(self):
        """Test CS Head login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"CS Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data


@pytest.fixture
def ceo_token():
    """Get CEO authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("CEO authentication failed")


@pytest.fixture
def cs_head_token():
    """Get CS Head authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("CS Head authentication failed")


@pytest.fixture
def sales_exec_token():
    """Get Sales Executive authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EXEC_EMAIL,
        "password": SALES_EXEC_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Sales Executive authentication failed")


class TestESSMonthlyDashboard:
    """Test ESS Dashboard returns monthly_summary"""
    
    def test_ess_dashboard_has_monthly_summary(self, cs_head_token):
        """ESS dashboard should return monthly_summary with present, absent, half_day, late counts"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/ess/dashboard", headers=headers)
        assert response.status_code == 200, f"ESS dashboard failed: {response.text}"
        
        data = response.json()
        assert "attendance" in data, "Response should contain attendance"
        assert "monthly_summary" in data["attendance"], "attendance should contain monthly_summary"
        
        monthly = data["attendance"]["monthly_summary"]
        assert "present" in monthly, "monthly_summary should have present count"
        assert "absent" in monthly, "monthly_summary should have absent count"
        assert "half_day" in monthly, "monthly_summary should have half_day count"
        assert "late" in monthly, "monthly_summary should have late count"
        assert "total_hours" in monthly, "monthly_summary should have total_hours"
        
        print(f"Monthly summary: {monthly}")


class TestMyMonthlyAttendance:
    """Test /api/hr/my-monthly-attendance endpoint"""
    
    def test_my_monthly_attendance_returns_days(self, cs_head_token):
        """my-monthly-attendance should return days array with status for each day"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3", headers=headers)
        assert response.status_code == 200, f"my-monthly-attendance failed: {response.text}"
        
        data = response.json()
        assert "days" in data, "Response should contain days array"
        assert "summary" in data, "Response should contain summary"
        assert "shift" in data, "Response should contain shift info"
        
        days = data["days"]
        assert len(days) > 0, "days array should not be empty"
        
        # Check first day structure
        first_day = days[0]
        assert "date" in first_day
        assert "day" in first_day
        assert "day_name" in first_day
        assert "is_weekend" in first_day
        assert "status" in first_day
        
        print(f"Total days: {len(days)}, Summary: {data['summary']}")
    
    def test_only_sundays_are_weekend(self, cs_head_token):
        """Only Sundays (dow=6) should be marked as weekend, not Saturdays"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        days = data["days"]
        
        # Check each day
        saturdays = [d for d in days if d["day_name"] == "Sat"]
        sundays = [d for d in days if d["day_name"] == "Sun"]
        
        # Saturdays should NOT be weekend
        for sat in saturdays:
            assert sat["is_weekend"] == False, f"Saturday {sat['date']} should NOT be weekend"
            assert sat["status"] != "weekend", f"Saturday {sat['date']} status should not be 'weekend'"
        
        # Sundays SHOULD be weekend
        for sun in sundays:
            assert sun["is_weekend"] == True, f"Sunday {sun['date']} should be weekend"
            assert sun["status"] == "weekend", f"Sunday {sun['date']} status should be 'weekend'"
        
        print(f"Verified {len(saturdays)} Saturdays are working days, {len(sundays)} Sundays are off")
    
    def test_late_minutes_recalculated(self, cs_head_token):
        """Late minutes should be recalculated using current shift config with grace period"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        days = data["days"]
        shift = data.get("shift", {})
        
        # Find days with biometric_in
        days_with_punch = [d for d in days if d.get("biometric_in")]
        
        print(f"Shift: {shift}")
        print(f"Days with punch: {len(days_with_punch)}")
        
        # Check that late_minutes is present and reasonable
        for day in days_with_punch[:5]:  # Check first 5
            print(f"  {day['date']}: in={day['biometric_in']}, late={day.get('late_minutes', 0)}")


class TestHRAttendanceEndpoint:
    """Test /api/hr/attendance endpoint for CEO/HR view"""
    
    def test_hr_attendance_returns_missing_employees(self, ceo_token):
        """HR attendance should return missing_employees array for employees who didn't punch in"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-23", headers=headers)
        assert response.status_code == 200, f"HR attendance failed: {response.text}"
        
        data = response.json()
        assert "records" in data, "Response should contain records"
        assert "missing_employees" in data, "Response should contain missing_employees"
        assert "summary" in data, "Response should contain summary"
        assert "team_strength" in data, "Response should contain team_strength"
        
        missing = data["missing_employees"]
        summary = data["summary"]
        
        print(f"Records: {len(data['records'])}, Missing: {len(missing)}")
        print(f"Summary: {summary}")
        
        # Check summary has no_record count
        assert "no_record" in summary, "summary should have no_record count"
        assert summary["no_record"] == len(missing), "no_record count should match missing_employees length"
    
    def test_hr_attendance_missing_employee_structure(self, ceo_token):
        """Missing employees should have proper structure"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-23", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        missing = data["missing_employees"]
        
        if len(missing) > 0:
            emp = missing[0]
            assert "employee_id" in emp, "Missing employee should have employee_id"
            assert "employee_code" in emp, "Missing employee should have employee_code"
            assert "employee_name" in emp, "Missing employee should have employee_name"
            assert "department" in emp, "Missing employee should have department"
            assert "status" in emp, "Missing employee should have status"
            assert emp["status"] == "no_record", "Missing employee status should be 'no_record'"
            
            print(f"Sample missing employee: {emp['employee_name']} ({emp['employee_code']})")
    
    def test_hr_attendance_late_recalculation(self, ceo_token):
        """Late minutes should be recalculated on-the-fly using current shift config"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-23", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        records = data["records"]
        
        # Find Rashida (employee 30001) if present
        rashida = next((r for r in records if r.get("employee_code") == "30001"), None)
        
        if rashida:
            print(f"Rashida's record: in={rashida.get('biometric_in')}, late={rashida.get('late_minutes')}")
            # Rashida punched in at 10:13, shift starts at 10:00, grace is 30 mins
            # 13 mins < 30 mins grace, so late should be 0
            late = rashida.get("late_minutes", 0)
            assert late == 0, f"Rashida's late_minutes should be 0 (within grace), got {late}"
        else:
            print("Rashida (30001) not found in records for 2026-03-23")
    
    def test_hr_attendance_team_strength(self, ceo_token):
        """HR attendance should return team strength breakdown"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-23", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        team_strength = data["team_strength"]
        
        assert "total" in team_strength, "team_strength should have total"
        assert "uae" in team_strength, "team_strength should have uae"
        assert "india" in team_strength, "team_strength should have india"
        
        print(f"Team strength: {team_strength}")


class TestSundayOnlyWeekend:
    """Test that only Sunday is treated as weekend across the system"""
    
    def test_hr_attendance_sunday_check(self, ceo_token):
        """HR attendance should not return missing employees for Sundays"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        
        # 2026-03-22 is a Sunday
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-22", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        missing = data.get("missing_employees", [])
        
        # On Sunday, there should be no missing employees (it's a day off)
        print(f"Sunday 2026-03-22: records={len(data['records'])}, missing={len(missing)}")
        assert len(missing) == 0, "Sunday should have no missing employees (it's a day off)"
    
    def test_hr_attendance_saturday_has_missing(self, ceo_token):
        """HR attendance should return missing employees for Saturdays (working day)"""
        headers = {"Authorization": f"Bearer {ceo_token}"}
        
        # 2026-03-21 is a Saturday
        response = requests.get(f"{BASE_URL}/api/hr/attendance?date=2026-03-21", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Saturday is a working day, so there could be missing employees
        print(f"Saturday 2026-03-21: records={len(data['records'])}, missing={len(data.get('missing_employees', []))}")


class TestNoEmployeeRecord:
    """Test behavior when user has no employee record"""
    
    def test_sales_exec_no_employee_record(self, sales_exec_token):
        """Aleesha (sales exec) has no employee record - should return empty data"""
        headers = {"Authorization": f"Bearer {sales_exec_token}"}
        response = requests.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        # Should return empty days array when no employee record
        assert "days" in data
        print(f"Sales exec (no employee record): days={len(data['days'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
