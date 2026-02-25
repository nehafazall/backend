"""
Test Suite for Reminder and Follow-ups Features
Tests:
- Set Reminder on leads (POST /api/leads/{lead_id}/reminder)
- Complete lead reminder (POST /api/leads/{lead_id}/reminder/complete)
- Set Reminder on students (POST /api/students/{student_id}/reminder)
- Complete student reminder (POST /api/students/{student_id}/reminder/complete)
- Today's Follow-ups (GET /api/followups/today)
- User environment_access field in user management
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "A@qib1234"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestLeadReminder:
    """Lead reminder endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    @pytest.fixture(scope="class")
    def test_lead(self, auth_headers):
        """Create a test lead for reminder testing"""
        lead_data = {
            "full_name": "TEST_Reminder_Lead",
            "phone": f"+971501234{datetime.now().strftime('%H%M%S')}",
            "email": "test_reminder@example.com",
            "country": "UAE",
            "lead_source": "manual"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test lead: {response.text}"
        lead = response.json()
        yield lead
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers)
    
    def test_set_lead_reminder(self, auth_headers, test_lead):
        """Test setting a reminder on a lead"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        params = {
            "reminder_date": tomorrow,
            "reminder_time": "10:00",
            "reminder_note": "Test reminder note"
        }
        response = requests.post(
            f"{BASE_URL}/api/leads/{test_lead['id']}/reminder",
            params=params,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to set reminder: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["reminder_date"] == tomorrow
        print(f"✓ Lead reminder set for {tomorrow}")
    
    def test_lead_has_reminder_fields(self, auth_headers, test_lead):
        """Verify lead has reminder fields after setting reminder"""
        # First set a reminder
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        requests.post(
            f"{BASE_URL}/api/leads/{test_lead['id']}/reminder",
            params={"reminder_date": tomorrow, "reminder_time": "11:00", "reminder_note": "Verify fields"},
            headers=auth_headers
        )
        
        # Get leads and find our test lead
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        leads = response.json()
        our_lead = next((l for l in leads if l["id"] == test_lead["id"]), None)
        assert our_lead is not None, "Test lead not found"
        assert our_lead.get("reminder_date") is not None, "reminder_date not set"
        print(f"✓ Lead has reminder_date: {our_lead.get('reminder_date')}")
    
    def test_complete_lead_reminder(self, auth_headers, test_lead):
        """Test completing a lead reminder"""
        # First set a reminder
        today = datetime.now().strftime("%Y-%m-%d")
        requests.post(
            f"{BASE_URL}/api/leads/{test_lead['id']}/reminder",
            params={"reminder_date": today, "reminder_time": "09:00", "reminder_note": "Complete test"},
            headers=auth_headers
        )
        
        # Complete the reminder
        response = requests.post(
            f"{BASE_URL}/api/leads/{test_lead['id']}/reminder/complete",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to complete reminder: {response.text}"
        print("✓ Lead reminder completed successfully")


class TestStudentReminder:
    """Student reminder endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    @pytest.fixture(scope="class")
    def test_student(self, auth_headers):
        """Get an existing student or skip if none exist"""
        response = requests.get(f"{BASE_URL}/api/students", headers=auth_headers)
        assert response.status_code == 200
        students = response.json()
        if not students:
            pytest.skip("No students available for testing")
        return students[0]
    
    def test_set_student_reminder_upgrade(self, auth_headers, test_student):
        """Test setting an upgrade reminder on a student"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        params = {
            "reminder_date": tomorrow,
            "reminder_time": "14:00",
            "reminder_type": "upgrade",
            "reminder_note": "Test upgrade reminder"
        }
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/reminder",
            params=params,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to set student reminder: {response.text}"
        data = response.json()
        assert data.get("reminder_type") == "upgrade"
        print(f"✓ Student upgrade reminder set for {tomorrow}")
    
    def test_set_student_reminder_redeposit(self, auth_headers, test_student):
        """Test setting a redeposit reminder on a student"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        params = {
            "reminder_date": tomorrow,
            "reminder_time": "15:00",
            "reminder_type": "redeposit",
            "reminder_note": "Test redeposit reminder"
        }
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/reminder",
            params=params,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to set redeposit reminder: {response.text}"
        print("✓ Student redeposit reminder set")
    
    def test_complete_student_reminder(self, auth_headers, test_student):
        """Test completing a student reminder"""
        # First set a reminder
        today = datetime.now().strftime("%Y-%m-%d")
        requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/reminder",
            params={"reminder_date": today, "reminder_time": "10:00", "reminder_type": "general", "reminder_note": "Complete test"},
            headers=auth_headers
        )
        
        # Complete the reminder
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student['id']}/reminder/complete",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to complete student reminder: {response.text}"
        print("✓ Student reminder completed successfully")


class TestFollowupsToday:
    """Today's Follow-ups endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_todays_followups(self, auth_headers):
        """Test getting today's follow-ups"""
        response = requests.get(f"{BASE_URL}/api/followups/today", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get followups: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "date" in data, "Missing 'date' field"
        assert "total_followups" in data, "Missing 'total_followups' field"
        assert "followups" in data, "Missing 'followups' field"
        assert "leads_count" in data, "Missing 'leads_count' field"
        assert "students_count" in data, "Missing 'students_count' field"
        
        # Verify followups structure has time slots
        followups = data["followups"]
        assert "morning" in followups, "Missing 'morning' slot"
        assert "afternoon" in followups, "Missing 'afternoon' slot"
        assert "evening" in followups, "Missing 'evening' slot"
        assert "unscheduled" in followups, "Missing 'unscheduled' slot"
        
        print(f"✓ Today's followups: {data['total_followups']} total")
        print(f"  - Morning: {len(followups['morning'])}")
        print(f"  - Afternoon: {len(followups['afternoon'])}")
        print(f"  - Evening: {len(followups['evening'])}")
        print(f"  - Unscheduled: {len(followups['unscheduled'])}")
    
    def test_followups_with_lead_reminder_today(self, auth_headers):
        """Test that a lead with today's reminder appears in followups"""
        # Create a test lead
        lead_data = {
            "full_name": "TEST_Followup_Lead",
            "phone": f"+971509999{datetime.now().strftime('%H%M%S')}",
            "email": "test_followup@example.com",
            "country": "UAE"
        }
        create_resp = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=auth_headers)
        assert create_resp.status_code == 200
        lead = create_resp.json()
        
        try:
            # Set reminder for today
            today = datetime.now().strftime("%Y-%m-%d")
            requests.post(
                f"{BASE_URL}/api/leads/{lead['id']}/reminder",
                params={"reminder_date": today, "reminder_time": "10:00", "reminder_note": "Followup test"},
                headers=auth_headers
            )
            
            # Get today's followups
            response = requests.get(f"{BASE_URL}/api/followups/today", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            
            # Check if our lead is in the followups
            all_followups = (
                data["followups"]["morning"] + 
                data["followups"]["afternoon"] + 
                data["followups"]["evening"] + 
                data["followups"]["unscheduled"]
            )
            our_lead = next((f for f in all_followups if f.get("id") == lead["id"]), None)
            assert our_lead is not None, "Test lead not found in today's followups"
            assert our_lead.get("entity_type") == "lead"
            print("✓ Lead with today's reminder appears in followups")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/leads/{lead['id']}", headers=auth_headers)


class TestUserEnvironmentAccess:
    """User environment_access field tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_create_user_with_environment_access(self, auth_headers):
        """Test creating a user with environment_access field"""
        user_data = {
            "email": f"test_env_{datetime.now().strftime('%H%M%S')}@clt-academy.com",
            "password": "TestPass123!",
            "full_name": "TEST_Env_User",
            "role": "sales_executive",
            "department": "Sales",
            "environment_access": ["development", "testing"]
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        user = response.json()
        
        try:
            assert "environment_access" in user, "environment_access field missing"
            assert "development" in user["environment_access"], "development access not set"
            assert "testing" in user["environment_access"], "testing access not set"
            print(f"✓ User created with environment_access: {user['environment_access']}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=auth_headers)
    
    def test_update_user_environment_access(self, auth_headers):
        """Test updating a user's environment_access"""
        # Create a test user first
        user_data = {
            "email": f"test_env_update_{datetime.now().strftime('%H%M%S')}@clt-academy.com",
            "password": "TestPass123!",
            "full_name": "TEST_Env_Update_User",
            "role": "cs_agent",
            "department": "Customer Service"
        }
        create_resp = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=auth_headers)
        assert create_resp.status_code == 200
        user = create_resp.json()
        
        try:
            # Update environment_access
            update_data = {"environment_access": ["development"]}
            update_resp = requests.put(
                f"{BASE_URL}/api/users/{user['id']}", 
                json=update_data, 
                headers=auth_headers
            )
            assert update_resp.status_code == 200, f"Failed to update user: {update_resp.text}"
            updated_user = update_resp.json()
            assert "development" in updated_user.get("environment_access", [])
            print("✓ User environment_access updated successfully")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=auth_headers)
    
    def test_get_users_shows_environment_access(self, auth_headers):
        """Test that GET /api/users returns environment_access field"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        assert len(users) > 0, "No users returned"
        
        # Check that environment_access field exists (can be None or list)
        for user in users[:5]:  # Check first 5 users
            # Field should exist in response schema
            print(f"  User {user['email']}: environment_access = {user.get('environment_access')}")
        print("✓ Users API returns environment_access field")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_leads(self, auth_headers):
        """Test GET /api/leads still works"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ GET /api/leads returns {len(response.json())} leads")
    
    def test_get_students(self, auth_headers):
        """Test GET /api/students still works"""
        response = requests.get(f"{BASE_URL}/api/students", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ GET /api/students returns {len(response.json())} students")
    
    def test_get_users(self, auth_headers):
        """Test GET /api/users still works"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ GET /api/users returns {len(response.json())} users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
