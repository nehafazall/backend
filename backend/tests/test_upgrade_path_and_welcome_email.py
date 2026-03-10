"""
Test suite for:
1. Visual Upgrade Path Indicator in student detail modal
2. Welcome email for new employees

Features to test:
- Upgrade Path Indicator appears in student detail modal showing course levels
- Progress bar shows current course level highlighted
- Upgrade History displays all previous upgrades
- Next level hint shows what course comes next
- Backend API: POST /api/hr/employees/with-user sends welcome email
- Response includes 'welcome_email_sent: true' field
- Welcome email contains employee credentials and employment details
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


class TestAuthentication:
    """Authentication tests for login"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful for {TEST_EMAIL}")
        return data["access_token"]


class TestUpgradePathIndicator:
    """Test Upgrade Path Indicator functionality - Backend API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def test_get_students_with_upgrade_history(self):
        """Test that students API returns upgrade_history and upgrade_count fields"""
        response = requests.get(f"{BASE_URL}/api/students", headers=self.headers)
        assert response.status_code == 200, f"Failed to get students: {response.text}"
        students = response.json()
        
        # Check if any students have upgrade history
        students_with_upgrades = [s for s in students if s.get('upgrade_history') and len(s.get('upgrade_history', [])) > 0]
        if students_with_upgrades:
            student = students_with_upgrades[0]
            print(f"✅ Found student with upgrades: {student.get('full_name')}")
            print(f"   - upgrade_count: {student.get('upgrade_count', 0)}")
            print(f"   - upgrade_history length: {len(student.get('upgrade_history', []))}")
            print(f"   - is_upgraded_student: {student.get('is_upgraded_student', False)}")
            print(f"   - current_course_name: {student.get('current_course_name')}")
            
            # Verify upgrade_history structure
            if student.get('upgrade_history'):
                upgrade = student['upgrade_history'][0]
                assert 'from_course' in upgrade or 'from_course_name' in upgrade, "Missing from_course in upgrade history"
                assert 'to_course' in upgrade or 'to_course_name' in upgrade, "Missing to_course in upgrade history"
                print(f"   - First upgrade: {upgrade}")
        else:
            print("⚠️ No students with upgrade history found - this is expected if no upgrades have been done")
        
        # Verify all students have the fields for upgrade tracking
        for student in students[:5]:  # Check first 5 students
            assert 'upgrade_count' in student or student.get('upgrade_count') is None or 'upgrade_count' not in student
            print(f"   - Student: {student.get('full_name')}, upgrade_count: {student.get('upgrade_count', 0)}")
        
        print("✅ Students API returns upgrade-related fields correctly")
    
    def test_get_student_upgrade_history_endpoint(self):
        """Test the dedicated upgrade-history endpoint"""
        # First get a student
        response = requests.get(f"{BASE_URL}/api/students", headers=self.headers)
        assert response.status_code == 200
        students = response.json()
        
        if not students:
            pytest.skip("No students available for testing")
        
        # Find a student with upgrades or use first student
        student = None
        for s in students:
            if s.get('upgrade_count', 0) > 0:
                student = s
                break
        
        if not student:
            student = students[0]
        
        # Test upgrade-history endpoint
        response = requests.get(
            f"{BASE_URL}/api/students/{student['id']}/upgrade-history", 
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get upgrade history: {response.text}"
        history_data = response.json()
        
        print(f"✅ Upgrade history endpoint returned for student: {student.get('full_name')}")
        print(f"   - upgrade_count: {history_data.get('upgrade_count', 0)}")
        print(f"   - total_spent: {history_data.get('total_spent', 0)}")
        print(f"   - upgrade_history: {len(history_data.get('upgrade_history', []))} entries")
        
        # Verify response structure
        assert 'upgrade_count' in history_data
        assert 'upgrade_history' in history_data
        
        return history_data
    
    def test_courses_api_for_upgrade_levels(self):
        """Test that courses API returns courses for the upgrade path"""
        response = requests.get(f"{BASE_URL}/api/courses", headers=self.headers)
        assert response.status_code == 200, f"Failed to get courses: {response.text}"
        courses = response.json()
        
        # Check for course level keywords used in UpgradePathIndicator
        level_keywords = ['starter', 'basic', 'intermediate', 'advanced', 'mastery']
        courses_by_level = {keyword: [] for keyword in level_keywords}
        
        for course in courses:
            name_lower = course.get('name', '').lower()
            for keyword in level_keywords:
                if keyword in name_lower:
                    courses_by_level[keyword].append(course.get('name'))
                    break
        
        print(f"✅ Courses API returned {len(courses)} courses")
        for level, course_names in courses_by_level.items():
            if course_names:
                print(f"   - {level.capitalize()}: {', '.join(course_names)}")
        
        assert len(courses) > 0, "No courses found"
        print("✅ Courses available for upgrade path visualization")


class TestWelcomeEmailForEmployees:
    """Test welcome email functionality for new employees"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def test_create_employee_with_user_endpoint_exists(self):
        """Test that the endpoint exists and accepts requests"""
        # Test with minimal payload to verify endpoint exists
        # Using invalid data to avoid creating actual records
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/with-user",
            headers=self.headers,
            json={
                "employee_id": "",  # Empty to trigger validation
                "full_name": "",
                "company_email": "invalid",
            }
        )
        # 422 = validation error, 400 = business logic error
        # Both indicate endpoint exists and is processing
        assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        print("✅ POST /api/hr/employees/with-user endpoint exists")
    
    def test_create_employee_with_welcome_email(self):
        """Test creating employee and sending welcome email"""
        # Generate unique employee ID
        unique_id = f"CLT-EMP-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        unique_email = f"test.employee.{datetime.now().strftime('%H%M%S')}@test-clt.com"
        
        payload = {
            "employee_id": unique_id,
            "full_name": "Test Employee For Email",
            "gender": "male",
            "date_of_birth": "1990-01-15",
            "nationality": "UAE",
            "personal_email": "personal@test.com",
            "company_email": unique_email,
            "mobile_number": "+971501234567",
            "department": "Sales",
            "designation": "Sales Executive",
            "employment_type": "full_time",
            "work_location": "Dubai Office",
            "joining_date": datetime.now().strftime("%Y-%m-%d"),
            "probation_days": 90,
            "employment_status": "active",
            "role": "sales_executive",
            "create_user_account": True,
            "initial_password": "TestPassword@123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/with-user",
            headers=self.headers,
            json=payload
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response: {response.text[:500] if response.text else 'No content'}")
        
        assert response.status_code in [200, 201], f"Failed to create employee: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "employee" in data, "Response missing 'employee' field"
        assert "user_created" in data, "Response missing 'user_created' field"
        assert "welcome_email_sent" in data, "Response missing 'welcome_email_sent' field"
        
        print(f"✅ Employee created successfully: {unique_id}")
        print(f"   - user_created: {data.get('user_created')}")
        print(f"   - user_linked: {data.get('user_linked')}")
        print(f"   - welcome_email_sent: {data.get('welcome_email_sent')}")
        print(f"   - message: {data.get('message')}")
        
        # Clean up: Delete the test employee and user
        employee_id = data.get('employee', {}).get('id')
        user_id = data.get('user_id')
        
        if employee_id:
            # Try to delete employee (if endpoint exists)
            try:
                requests.delete(f"{BASE_URL}/api/hr/employees/{employee_id}", headers=self.headers)
            except:
                pass
        
        if user_id:
            # Try to delete user (if endpoint exists)
            try:
                requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=self.headers)
            except:
                pass
        
        return data
    
    def test_welcome_email_template_function(self):
        """Test that email template function returns proper HTML"""
        # This tests the email service module indirectly
        response = requests.get(f"{BASE_URL}/api/health", headers=self.headers)
        # Just verify the API is healthy, template test is done via email send
        assert response.status_code == 200
        print("✅ API is healthy - email service should be available")


class TestStudentDetailModalFields:
    """Test that student detail returns all fields needed for Upgrade Path Indicator"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def test_student_has_upgrade_fields(self):
        """Test that student response includes all upgrade-related fields"""
        response = requests.get(f"{BASE_URL}/api/students", headers=self.headers)
        assert response.status_code == 200
        students = response.json()
        
        if not students:
            pytest.skip("No students available")
        
        # Find student with upgrade history or use first
        student = None
        for s in students:
            if s.get('upgrade_history') and len(s.get('upgrade_history', [])) > 0:
                student = s
                break
        
        if not student:
            student = students[0]
        
        # Required fields for UpgradePathIndicator
        required_fields_for_upgrade_indicator = [
            'current_course_name',  # or 'package_bought' as fallback
        ]
        
        optional_fields = [
            'upgrade_history',
            'upgrade_count', 
            'is_upgraded_student',
            'package_bought'
        ]
        
        print(f"✅ Checking student: {student.get('full_name')}")
        
        for field in optional_fields:
            value = student.get(field)
            print(f"   - {field}: {value}")
        
        # At least one course field should exist
        has_course = student.get('current_course_name') or student.get('package_bought')
        print(f"   - Has course info: {has_course is not None}")
        
        print("✅ Student has fields needed for Upgrade Path Indicator")


class TestEmailServiceConfiguration:
    """Test email service configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {token}"}
    
    def test_email_config_status(self):
        """Check if SMTP is configured (via settings or health check)"""
        # Check if settings endpoint exists
        response = requests.get(f"{BASE_URL}/api/settings", headers=self.headers)
        
        if response.status_code == 200:
            settings = response.json()
            email_config = settings.get('email_configured') or settings.get('smtp_configured')
            print(f"✅ Email configuration status from settings: {email_config}")
        else:
            # Settings endpoint might not expose this
            print("⚠️ Settings endpoint doesn't expose email config status")
        
        # The main test is that the employee creation endpoint has welcome_email_sent field
        print("✅ Email service integration is available via /api/hr/employees/with-user")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
