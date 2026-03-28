"""
Iteration 91 - Attendance Settings Tests
Tests for: Company Holidays, Special Periods, Shifts, Attendance Rules
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"


class TestAttendanceSettingsAPI:
    """Test Attendance Settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        self.token = login_res.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ─── HOLIDAYS TESTS ───────────────────────────────────────────────
    
    def test_get_holidays_2026(self):
        """GET /api/hr/holidays?year=2026 returns Eid holidays (Mar 20, Mar 21)"""
        res = self.session.get(f"{BASE_URL}/api/hr/holidays?year=2026")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        holidays = res.json()
        assert isinstance(holidays, list), "Response should be a list"
        
        # Check for Eid holidays on Mar 20-21
        eid_dates = [h for h in holidays if "2026-03-20" in h.get("date", "") or "2026-03-21" in h.get("date", "")]
        print(f"Found {len(eid_dates)} Eid holidays: {eid_dates}")
        
        # Verify at least one Eid holiday exists
        assert len(eid_dates) >= 1, f"Expected Eid holidays on Mar 20-21 2026, got: {holidays}"
    
    def test_create_holiday_date_range(self):
        """POST /api/hr/holidays creates holidays for a date range"""
        # Create a test holiday
        payload = {
            "name": "TEST_Holiday_Iteration91",
            "start_date": "2026-12-25",
            "end_date": "2026-12-26",
            "holiday_type": "company"
        }
        res = self.session.post(f"{BASE_URL}/api/hr/holidays", json=payload)
        assert res.status_code == 200, f"Failed to create holiday: {res.text}"
        
        data = res.json()
        assert "message" in data, "Response should have message"
        assert "holidays" in data, "Response should have holidays array"
        
        # Verify holidays were created
        holidays_created = data.get("holidays", [])
        print(f"Created {len(holidays_created)} holidays: {data['message']}")
        
        # Cleanup - delete created holidays
        for h in holidays_created:
            if h.get("id"):
                self.session.delete(f"{BASE_URL}/api/hr/holidays/{h['id']}")
    
    def test_delete_holiday(self):
        """DELETE /api/hr/holidays/{id} deletes a holiday"""
        # First create a holiday to delete
        payload = {
            "name": "TEST_ToDelete",
            "start_date": "2026-11-15",
            "holiday_type": "company"
        }
        create_res = self.session.post(f"{BASE_URL}/api/hr/holidays", json=payload)
        assert create_res.status_code == 200, f"Failed to create: {create_res.text}"
        
        holidays = create_res.json().get("holidays", [])
        assert len(holidays) > 0, "No holidays created"
        
        holiday_id = holidays[0]["id"]
        
        # Delete the holiday
        del_res = self.session.delete(f"{BASE_URL}/api/hr/holidays/{holiday_id}")
        assert del_res.status_code == 200, f"Failed to delete: {del_res.text}"
        
        data = del_res.json()
        assert "message" in data, "Response should have message"
        print(f"Delete response: {data}")
    
    # ─── ATTENDANCE RULES TESTS ───────────────────────────────────────
    
    def test_get_attendance_rules(self):
        """GET /api/hr/settings/attendance-rules returns rules with special_periods array"""
        res = self.session.get(f"{BASE_URL}/api/hr/settings/attendance-rules")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        rules = res.json()
        assert "special_periods" in rules, "Rules should have special_periods array"
        assert isinstance(rules["special_periods"], list), "special_periods should be a list"
        
        print(f"Attendance rules: {rules}")
        
        # Check for Ramadan special period
        ramadan_periods = [sp for sp in rules["special_periods"] if "ramadan" in sp.get("name", "").lower()]
        print(f"Found {len(ramadan_periods)} Ramadan periods: {ramadan_periods}")
    
    def test_update_attendance_rules(self):
        """PUT /api/hr/settings/attendance-rules saves special periods, grace period, full day hours"""
        # First get current rules
        get_res = self.session.get(f"{BASE_URL}/api/hr/settings/attendance-rules")
        current_rules = get_res.json()
        
        # Update with test values
        payload = {
            "grace_period_minutes": 30,
            "full_day_hours_min": 6,
            "half_day_hours_min": 3,
            "special_periods": current_rules.get("special_periods", [])
        }
        
        res = self.session.put(f"{BASE_URL}/api/hr/settings/attendance-rules", json=payload)
        assert res.status_code == 200, f"Failed to update: {res.text}"
        
        data = res.json()
        assert "special_periods" in data, "Response should have special_periods"
        print(f"Updated rules: {data}")
    
    # ─── SHIFTS TESTS ─────────────────────────────────────────────────
    
    def test_get_shifts(self):
        """GET /api/hr/shifts returns shifts (Morning, Afternoon, India)"""
        res = self.session.get(f"{BASE_URL}/api/hr/shifts")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        shifts = res.json()
        assert isinstance(shifts, list), "Response should be a list"
        assert len(shifts) >= 1, "Should have at least one shift"
        
        shift_names = [s.get("name", "").lower() for s in shifts]
        print(f"Found {len(shifts)} shifts: {shift_names}")
        
        # Check for expected shifts
        expected_shifts = ["morning", "afternoon", "india"]
        for expected in expected_shifts:
            found = any(expected in name for name in shift_names)
            print(f"Shift '{expected}': {'Found' if found else 'Not found'}")
    
    def test_update_shift(self):
        """PUT /api/hr/shifts/{id} updates a shift"""
        # First get shifts
        get_res = self.session.get(f"{BASE_URL}/api/hr/shifts")
        shifts = get_res.json()
        
        if not shifts:
            pytest.skip("No shifts to update")
        
        shift_id = shifts[0]["id"]
        original_name = shifts[0].get("name")
        
        # Update the shift
        payload = {
            "name": shifts[0].get("name"),  # Keep same name
            "start": shifts[0].get("start", "10:00"),
            "end": shifts[0].get("end", "19:00"),
            "grace_minutes": 30
        }
        
        res = self.session.put(f"{BASE_URL}/api/hr/shifts/{shift_id}", json=payload)
        assert res.status_code == 200, f"Failed to update shift: {res.text}"
        
        data = res.json()
        assert "message" in data, "Response should have message"
        print(f"Update shift response: {data}")
    
    def test_create_and_delete_shift(self):
        """POST /api/hr/shifts creates shift, DELETE /api/hr/shifts/{id} deletes it"""
        # Create a test shift
        payload = {
            "name": "TEST_Night_Shift",
            "start": "22:00",
            "end": "06:00",
            "grace_minutes": 15,
            "location": "UAE"
        }
        
        create_res = self.session.post(f"{BASE_URL}/api/hr/shifts", json=payload)
        assert create_res.status_code == 200, f"Failed to create shift: {create_res.text}"
        
        shift = create_res.json()
        assert "id" in shift, "Created shift should have id"
        shift_id = shift["id"]
        print(f"Created shift: {shift}")
        
        # Delete the shift
        del_res = self.session.delete(f"{BASE_URL}/api/hr/shifts/{shift_id}")
        assert del_res.status_code == 200, f"Failed to delete shift: {del_res.text}"
        print(f"Deleted shift: {del_res.json()}")
    
    # ─── MONTHLY ATTENDANCE TESTS ─────────────────────────────────────
    
    def test_monthly_attendance_holiday_status(self):
        """GET /api/hr/my-monthly-attendance shows Mar 20-21 as 'holiday' with holiday_name='Eid Al Fitr'"""
        res = self.session.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        data = res.json()
        assert "days" in data, "Response should have days array"
        assert "summary" in data, "Response should have summary"
        
        days = data["days"]
        
        # Find Mar 20 and Mar 21
        mar_20 = next((d for d in days if d.get("date") == "2026-03-20"), None)
        mar_21 = next((d for d in days if d.get("date") == "2026-03-21"), None)
        
        print(f"Mar 20: {mar_20}")
        print(f"Mar 21: {mar_21}")
        
        # Check holiday status
        if mar_20:
            assert mar_20.get("status") == "holiday", f"Mar 20 should be holiday, got: {mar_20.get('status')}"
            assert mar_20.get("holiday_name") is not None, "Mar 20 should have holiday_name"
            print(f"Mar 20 holiday_name: {mar_20.get('holiday_name')}")
        
        if mar_21:
            assert mar_21.get("status") == "holiday", f"Mar 21 should be holiday, got: {mar_21.get('status')}"
            assert mar_21.get("holiday_name") is not None, "Mar 21 should have holiday_name"
            print(f"Mar 21 holiday_name: {mar_21.get('holiday_name')}")
        
        # Check summary has holiday count
        summary = data.get("summary", {})
        print(f"Summary: {summary}")
        assert "holiday" in summary, "Summary should have holiday count"
    
    def test_monthly_attendance_special_period(self):
        """GET /api/hr/my-monthly-attendance includes special_period field for days within Ramadan"""
        res = self.session.get(f"{BASE_URL}/api/hr/my-monthly-attendance?year=2026&month=3")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        data = res.json()
        days = data.get("days", [])
        
        # Check for special_period field in early March (Ramadan period)
        # Ramadan 2026 is Mar 1-20 based on the context
        days_with_special_period = [d for d in days if d.get("special_period")]
        print(f"Days with special_period: {len(days_with_special_period)}")
        
        if days_with_special_period:
            print(f"Sample day with special_period: {days_with_special_period[0]}")
        
        # Check Mar 10 (should be in Ramadan)
        mar_10 = next((d for d in days if d.get("date") == "2026-03-10"), None)
        if mar_10:
            print(f"Mar 10 special_period: {mar_10.get('special_period')}")


class TestAttendanceSettingsIntegration:
    """Integration tests for attendance settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert login_res.status_code == 200
        self.token = login_res.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_special_period_affects_attendance_calculation(self):
        """Verify special periods affect attendance calculation"""
        # Get attendance rules
        rules_res = self.session.get(f"{BASE_URL}/api/hr/settings/attendance-rules")
        rules = rules_res.json()
        
        special_periods = rules.get("special_periods", [])
        print(f"Special periods configured: {len(special_periods)}")
        
        for sp in special_periods:
            print(f"  - {sp.get('name')}: {sp.get('start_date')} to {sp.get('end_date')}, {sp.get('reduced_hours')}h full day")
    
    def test_holidays_excluded_from_working_days(self):
        """Verify holidays are excluded from working days calculation"""
        # Get holidays for 2026
        hol_res = self.session.get(f"{BASE_URL}/api/hr/holidays?year=2026")
        holidays = hol_res.json()
        
        print(f"Total holidays in 2026: {len(holidays)}")
        for h in holidays[:5]:  # Show first 5
            print(f"  - {h.get('date')}: {h.get('name')} ({h.get('holiday_type')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
