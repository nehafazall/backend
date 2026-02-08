"""
Test file for CLT Academy ERP - New Features (Iteration 5)
Tests: Mentor Dashboard, Bulk Import (Courses & Users), Navigation Sections
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with super admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "super_admin"
        print(f"SUCCESS: Login successful, token received")
        return data["access_token"]


class TestMentorDashboard:
    """Tests for Mentor Dashboard endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        return response.json()["access_token"]
    
    def test_mentor_dashboard_endpoint_exists(self, auth_token):
        """Test GET /api/mentor/dashboard returns 200"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/dashboard", headers=headers)
        assert response.status_code == 200, f"Mentor dashboard failed: {response.text}"
        print(f"SUCCESS: Mentor dashboard endpoint returns 200")
    
    def test_mentor_dashboard_returns_expected_fields(self, auth_token):
        """Test mentor dashboard returns all expected metrics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = [
            "total_students",
            "total_revenue",
            "total_withdrawn",
            "current_net",
            "total_commission",
            "commission_received",
            "commission_balance",
            "upgrades_helped",
            "students_connected",
            "students_balance",
            "student_stages",
            "recent_activities"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            print(f"  - {field}: {data[field]}")
        
        print(f"SUCCESS: Mentor dashboard returns all expected fields")
    
    def test_mentor_dashboard_student_stages_is_dict(self, auth_token):
        """Test student_stages is a dictionary"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/dashboard", headers=headers)
        data = response.json()
        
        assert isinstance(data["student_stages"], dict), "student_stages should be a dict"
        print(f"SUCCESS: student_stages is a dict: {data['student_stages']}")
    
    def test_mentor_dashboard_recent_activities_is_list(self, auth_token):
        """Test recent_activities is a list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/dashboard", headers=headers)
        data = response.json()
        
        assert isinstance(data["recent_activities"], list), "recent_activities should be a list"
        print(f"SUCCESS: recent_activities is a list with {len(data['recent_activities'])} items")


class TestImportTemplates:
    """Tests for Import Template endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        return response.json()["access_token"]
    
    def test_courses_template_endpoint(self, auth_token):
        """Test GET /api/import/templates/courses"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/templates/courses", headers=headers)
        assert response.status_code == 200, f"Courses template failed: {response.text}"
        
        data = response.json()
        assert "template" in data, "Missing template field"
        assert "instructions" in data, "Missing instructions field"
        assert "fields" in data, "Missing fields field"
        assert "required" in data["fields"], "Missing required fields"
        assert "optional" in data["fields"], "Missing optional fields"
        
        # Check required fields
        required = data["fields"]["required"]
        assert "name" in required
        assert "code" in required
        assert "base_price" in required
        assert "category" in required
        
        print(f"SUCCESS: Courses template endpoint works")
        print(f"  Required fields: {required}")
        print(f"  Optional fields: {data['fields']['optional']}")
    
    def test_users_template_endpoint(self, auth_token):
        """Test GET /api/import/templates/users"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/templates/users", headers=headers)
        assert response.status_code == 200, f"Users template failed: {response.text}"
        
        data = response.json()
        assert "template" in data, "Missing template field"
        assert "instructions" in data, "Missing instructions field"
        assert "fields" in data, "Missing fields field"
        assert "valid_roles" in data, "Missing valid_roles field"
        
        # Check required fields
        required = data["fields"]["required"]
        assert "email" in required
        assert "full_name" in required
        assert "role" in required
        assert "password" in required
        
        # Check valid roles list
        assert len(data["valid_roles"]) > 0, "valid_roles should not be empty"
        
        print(f"SUCCESS: Users template endpoint works")
        print(f"  Required fields: {required}")
        print(f"  Valid roles: {data['valid_roles']}")
    
    def test_courses_template_has_csv_content(self, auth_token):
        """Test courses template contains valid CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/templates/courses", headers=headers)
        data = response.json()
        
        template = data["template"]
        lines = template.strip().split('\n')
        assert len(lines) >= 2, "Template should have header and at least one example row"
        
        # Check header
        header = lines[0]
        assert "name" in header
        assert "code" in header
        assert "base_price" in header
        
        print(f"SUCCESS: Courses template has valid CSV content")
    
    def test_users_template_has_csv_content(self, auth_token):
        """Test users template contains valid CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/templates/users", headers=headers)
        data = response.json()
        
        template = data["template"]
        lines = template.strip().split('\n')
        assert len(lines) >= 2, "Template should have header and at least one example row"
        
        # Check header
        header = lines[0]
        assert "email" in header
        assert "full_name" in header
        assert "role" in header
        
        print(f"SUCCESS: Users template has valid CSV content")


class TestBulkImportCourses:
    """Tests for bulk course import"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        return response.json()["access_token"]
    
    def test_import_courses_endpoint_accepts_file(self, auth_token):
        """Test POST /api/import/courses accepts CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test CSV
        csv_content = """name,code,base_price,category,description,is_active
"TEST Import Course 1","TEST_IMP001",1500,"basic","Test course for import",true
"TEST Import Course 2","TEST_IMP002",2500,"advanced","Another test course",true"""
        
        files = {"file": ("test_courses.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/courses", headers=headers, files=files)
        
        assert response.status_code == 200, f"Import courses failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "results" in data
        
        print(f"SUCCESS: Import courses endpoint works")
        print(f"  Message: {data['message']}")
        print(f"  Results: {data['results']}")
        
        # Cleanup - delete test courses
        courses_response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        courses = courses_response.json()
        for course in courses:
            if course.get("code", "").startswith("TEST_IMP"):
                requests.delete(f"{BASE_URL}/api/courses/{course['id']}", headers=headers)
                print(f"  Cleaned up: {course['code']}")
    
    def test_import_courses_validates_required_fields(self, auth_token):
        """Test import validates required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # CSV with missing required fields
        csv_content = """name,code,base_price,category
"Missing Price Course","TEST_MISS001",,"basic"
"","TEST_MISS002",1500,"basic"
"Missing Category","TEST_MISS003",1500,"""
        
        files = {"file": ("test_invalid.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/courses", headers=headers, files=files)
        
        assert response.status_code == 200  # Should still return 200 with errors in results
        data = response.json()
        
        # Should have errors for invalid rows
        assert "results" in data
        assert len(data["results"]["errors"]) > 0, "Should have validation errors"
        
        print(f"SUCCESS: Import validates required fields")
        print(f"  Errors: {data['results']['errors']}")


class TestBulkImportUsers:
    """Tests for bulk user import"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        return response.json()["access_token"]
    
    def test_import_users_endpoint_accepts_file(self, auth_token):
        """Test POST /api/import/users accepts CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test CSV with unique emails
        import time
        timestamp = int(time.time())
        csv_content = f"""email,full_name,role,password,department,phone,region
"test_import_{timestamp}@test.com","Test Import User","sales_executive","TestPass123!","Sales","+971501234567","UAE"
"test_import2_{timestamp}@test.com","Test Import User 2","cs_agent","TestPass123!","Customer Service","+971509876543","UAE"
"""
        
        files = {"file": ("test_users.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/users", headers=headers, files=files)
        
        assert response.status_code == 200, f"Import users failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "results" in data
        
        print(f"SUCCESS: Import users endpoint works")
        print(f"  Message: {data['message']}")
        print(f"  Results: {data['results']}")
        
        # Cleanup - delete test users
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        for user in users:
            if user.get("email", "").startswith("test_import"):
                requests.delete(f"{BASE_URL}/api/users/{user['id']}", headers=headers)
                print(f"  Cleaned up: {user['email']}")
    
    def test_import_users_validates_role(self, auth_token):
        """Test import validates role field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # CSV with invalid role
        csv_content = """email,full_name,role,password
"invalid_role@test.com","Invalid Role User","invalid_role_xyz","TestPass123!"
"""
        
        files = {"file": ("test_invalid_role.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/users", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have error for invalid role
        assert "results" in data
        assert len(data["results"]["errors"]) > 0, "Should have validation error for invalid role"
        
        print(f"SUCCESS: Import validates role field")
        print(f"  Errors: {data['results']['errors']}")
    
    def test_import_users_skips_duplicate_emails(self, auth_token):
        """Test import skips existing emails"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Try to import existing super admin email
        csv_content = """email,full_name,role,password
"aqib@clt-academy.com","Duplicate User","admin","TestPass123!"
"""
        
        files = {"file": ("test_duplicate.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/users", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have skipped the duplicate
        assert data["results"]["skipped"] >= 1 or len(data["results"]["errors"]) > 0
        
        print(f"SUCCESS: Import skips duplicate emails")
        print(f"  Results: {data['results']}")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        })
        return response.json()["access_token"]
    
    def test_get_courses(self, auth_token):
        """Test GET /api/courses still works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/courses", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/courses works - {len(response.json())} courses")
    
    def test_get_users(self, auth_token):
        """Test GET /api/users still works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/users works - {len(response.json())} users")
    
    def test_get_leads(self, auth_token):
        """Test GET /api/leads still works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/leads works - {len(response.json())} leads")
    
    def test_get_students(self, auth_token):
        """Test GET /api/students still works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        assert response.status_code == 200
        print(f"SUCCESS: GET /api/students works - {len(response.json())} students")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
