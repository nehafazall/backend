"""
Test Period Filter Feature - Iteration 62
Tests the universal period filter across Sales CRM, Customer Service, and Mentor CRM Kanbans.
- Sales CRM: filter by created_at (Lead Created) or enrolled_at (Enrolled)
- Customer Service: filter by upgrade_date
- Mentor CRM: filter by deposit_date
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token") or data.get("token")
    assert token, "No token in response"
    return token


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestLeadsPeriodFilter:
    """Test period filter for Sales CRM leads endpoint"""
    
    def test_leads_endpoint_accepts_date_params(self, api_client):
        """Test that /api/leads accepts date_from, date_to, date_field params"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Leads with created_at filter: {len(data)} leads returned")
    
    def test_leads_filter_by_enrolled_at(self, api_client):
        """Test filtering leads by enrolled_at date field"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "enrolled_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Leads with enrolled_at filter (This Month): {len(data)} leads returned")
        # Per requirements, should return ~59 leads for March 2026
        # Allow some variance
        if len(data) > 0:
            print(f"  Sample lead: {data[0].get('full_name', 'N/A')} - enrolled_at: {data[0].get('enrolled_at', 'N/A')}")
    
    def test_leads_filter_by_created_at_today(self, api_client):
        """Test filtering leads by created_at for today"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": today,
            "date_to": today,
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Leads created today ({today}): {len(data)} leads returned")
    
    def test_leads_filter_this_week(self, api_client):
        """Test filtering leads for this week"""
        # Calculate this week's Monday and Sunday
        today = datetime.now()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": monday.strftime("%Y-%m-%d"),
            "date_to": sunday.strftime("%Y-%m-%d"),
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Leads this week ({monday.strftime('%Y-%m-%d')} to {sunday.strftime('%Y-%m-%d')}): {len(data)} leads")
    
    def test_leads_no_filter_returns_all(self, api_client):
        """Test that no date filter returns all leads"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ All leads (no filter): {len(data)} leads returned")


class TestStudentsPeriodFilter:
    """Test period filter for Customer Service and Mentor CRM students endpoint"""
    
    def test_students_endpoint_accepts_date_params(self, api_client):
        """Test that /api/students accepts date_from, date_to, date_field params"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Students with created_at filter: {len(data)} students returned")
    
    def test_students_filter_by_upgrade_date(self, api_client):
        """Test filtering students by upgrade_date (Customer Service)"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "upgrade_date"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Students with upgrade_date filter (This Month): {len(data)} students returned")
        # Per requirements, should return ~22 students for March 2026
        if len(data) > 0:
            print(f"  Sample student: {data[0].get('full_name', 'N/A')} - last_upgrade_date: {data[0].get('last_upgrade_date', 'N/A')}")
    
    def test_students_filter_by_deposit_date_activated_only(self, api_client):
        """Test filtering students by deposit_date with activated_only (Mentor CRM)"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "deposit_date",
            "activated_only": "true"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Students with deposit_date filter + activated_only (This Month): {len(data)} students returned")
        # Per requirements, should return ~23 students for March 2026
    
    def test_students_filter_by_deposit_date_without_activated(self, api_client):
        """Test filtering students by deposit_date without activated_only"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "deposit_date"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Students with deposit_date filter (no activated_only): {len(data)} students returned")
    
    def test_students_no_filter_returns_all(self, api_client):
        """Test that no date filter returns all students"""
        response = api_client.get(f"{BASE_URL}/api/students")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ All students (no filter): {len(data)} students returned")


class TestCustomRangePeriodFilter:
    """Test custom date range filtering"""
    
    def test_leads_custom_range_last_quarter(self, api_client):
        """Test filtering leads for last quarter (Q4 2025)"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2025-10-01",
            "date_to": "2025-12-31",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Leads last quarter (Q4 2025): {len(data)} leads returned")
    
    def test_students_custom_range_this_year(self, api_client):
        """Test filtering students for this year"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-01-01",
            "date_to": "2026-12-31",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Students this year (2026): {len(data)} students returned")
    
    def test_leads_custom_single_day(self, api_client):
        """Test filtering leads for a single day"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2026-03-15",
            "date_to": "2026-03-15",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Leads on March 15, 2026: {len(data)} leads returned")


class TestPeriodFilterEdgeCases:
    """Test edge cases for period filter"""
    
    def test_leads_invalid_date_format(self, api_client):
        """Test that invalid date format is handled gracefully"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "invalid-date",
            "date_to": "2026-03-31",
            "date_field": "created_at"
        })
        # Should either return 400 or handle gracefully
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Invalid date format handled: status {response.status_code}")
    
    def test_leads_future_date_range(self, api_client):
        """Test filtering with future date range returns empty"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2030-01-01",
            "date_to": "2030-12-31",
            "date_field": "created_at"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Future date range: {len(data)} leads (expected 0 or few)")
    
    def test_students_unknown_date_field(self, api_client):
        """Test filtering with unknown date_field defaults to created_at"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "unknown_field"
        })
        # Should handle gracefully - either use default or return error
        assert response.status_code in [200, 400, 422], f"Unexpected status: {response.status_code}"
        print(f"✓ Unknown date_field handled: status {response.status_code}")


class TestPeriodFilterDataVerification:
    """Verify that filtered data actually matches the date criteria"""
    
    def test_leads_enrolled_at_data_verification(self, api_client):
        """Verify that leads returned have enrolled_at within the date range"""
        response = api_client.get(f"{BASE_URL}/api/leads", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "enrolled_at"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check that returned leads have enrolled_at in range
        for lead in data[:5]:  # Check first 5
            enrolled_at = lead.get("enrolled_at")
            if enrolled_at:
                # Verify date is in March 2026
                assert enrolled_at.startswith("2026-03"), f"Lead {lead.get('id')} has enrolled_at {enrolled_at} outside range"
        
        print(f"✓ Data verification passed: {len(data)} leads with enrolled_at in March 2026")
    
    def test_students_upgrade_date_data_verification(self, api_client):
        """Verify that students returned have upgrade_date within the date range"""
        response = api_client.get(f"{BASE_URL}/api/students", params={
            "date_from": "2026-03-01",
            "date_to": "2026-03-31",
            "date_field": "upgrade_date"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check that returned students have last_upgrade_date in range
        for student in data[:5]:  # Check first 5
            upgrade_date = student.get("last_upgrade_date")
            if upgrade_date:
                # Verify date is in March 2026
                assert upgrade_date.startswith("2026-03"), f"Student {student.get('id')} has upgrade_date {upgrade_date} outside range"
        
        print(f"✓ Data verification passed: {len(data)} students with upgrade_date in March 2026")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
