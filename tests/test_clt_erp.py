"""
CLT Academy ERP Backend API Tests
Tests for: Auth, Departments, Courses, Commission Rules, Dashboard, Users
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "A@qib1234"


class TestHealthCheck:
    """Health check tests - run first"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with Super Admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Login successful for {SUPER_ADMIN_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL
        })
        assert response.status_code == 422  # Validation error
        print("✓ Missing fields correctly rejected")


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == SUPER_ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print(f"✓ Current user retrieved: {data['full_name']}")


class TestDepartments:
    """Department management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_departments(self):
        """Test GET /departments - should return 8 seeded departments"""
        response = requests.get(f"{BASE_URL}/api/departments", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 8, f"Expected at least 8 departments, got {len(data)}"
        
        # Verify expected departments exist
        dept_names = [d["name"] for d in data]
        expected_depts = ["Sales", "Finance", "Customer Service", "Mentors/Academics", 
                         "Operations", "Marketing", "HR", "Quality Control"]
        for dept in expected_depts:
            assert dept in dept_names, f"Missing department: {dept}"
        
        print(f"✓ Retrieved {len(data)} departments: {dept_names}")
    
    def test_create_department(self):
        """Test POST /departments - create new department"""
        test_dept = {
            "name": f"TEST_Department_{os.urandom(4).hex()}",
            "description": "Test department for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/departments", 
                                json=test_dept, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == test_dept["name"]
        assert data["description"] == test_dept["description"]
        assert "id" in data
        print(f"✓ Created department: {data['name']}")
        
        # Verify it was persisted
        get_response = requests.get(f"{BASE_URL}/api/departments", headers=self.headers)
        dept_names = [d["name"] for d in get_response.json()]
        assert test_dept["name"] in dept_names
        print(f"✓ Department persisted in database")


class TestCourses:
    """Course management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_courses(self):
        """Test GET /courses"""
        response = requests.get(f"{BASE_URL}/api/courses", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} courses")
    
    def test_create_course(self):
        """Test POST /courses - create new course"""
        test_course = {
            "name": f"TEST_Course_{os.urandom(4).hex()}",
            "code": f"TC{os.urandom(2).hex().upper()}",
            "description": "Test course for automated testing",
            "base_price": 5000,
            "category": "basic",
            "is_active": True,
            "addons": []
        }
        
        response = requests.post(f"{BASE_URL}/api/courses", 
                                json=test_course, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == test_course["name"]
        assert data["code"] == test_course["code"]
        assert data["base_price"] == test_course["base_price"]
        assert "id" in data
        print(f"✓ Created course: {data['name']} ({data['code']})")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/courses", headers=self.headers)
        course_names = [c["name"] for c in get_response.json()]
        assert test_course["name"] in course_names
        print(f"✓ Course persisted in database")


class TestCommissionRules:
    """Commission engine tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_commission_rules(self):
        """Test GET /commission-rules"""
        response = requests.get(f"{BASE_URL}/api/commission-rules", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} commission rules")
    
    def test_create_commission_rule(self):
        """Test POST /commission-rules - create new rule"""
        test_rule = {
            "name": f"TEST_Rule_{os.urandom(4).hex()}",
            "role": "sales_executive",
            "commission_type": "percentage",
            "commission_value": 5.0,
            "min_sale_amount": 0,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/commission-rules", 
                                json=test_rule, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == test_rule["name"]
        assert data["role"] == test_rule["role"]
        assert data["commission_value"] == test_rule["commission_value"]
        assert "id" in data
        print(f"✓ Created commission rule: {data['name']}")


class TestDashboard:
    """Dashboard stats tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_dashboard_stats(self):
        """Test GET /dashboard/stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        # Super admin should see all stats
        print(f"✓ Dashboard stats retrieved: {list(data.keys())}")
    
    def test_lead_funnel(self):
        """Test GET /dashboard/lead-funnel"""
        response = requests.get(f"{BASE_URL}/api/dashboard/lead-funnel", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Lead funnel data retrieved: {len(data)} stages")
    
    def test_sales_by_course(self):
        """Test GET /dashboard/sales-by-course"""
        response = requests.get(f"{BASE_URL}/api/dashboard/sales-by-course", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Sales by course data retrieved")
    
    def test_leaderboard(self):
        """Test GET /dashboard/leaderboard"""
        response = requests.get(f"{BASE_URL}/api/dashboard/leaderboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leaderboard data retrieved: {len(data)} entries")
    
    def test_monthly_trend(self):
        """Test GET /dashboard/monthly-trend"""
        response = requests.get(f"{BASE_URL}/api/dashboard/monthly-trend", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Monthly trend data retrieved")
    
    def test_student_funnel(self):
        """Test GET /dashboard/student-funnel (CS Dashboard)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/student-funnel", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Student funnel data retrieved")
    
    def test_upgrades_by_month(self):
        """Test GET /dashboard/upgrades-by-month (CS Dashboard)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/upgrades-by-month", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Upgrades by month data retrieved")
    
    def test_cs_leaderboard(self):
        """Test GET /dashboard/cs-leaderboard (CS Dashboard)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/cs-leaderboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ CS leaderboard data retrieved")


class TestUsers:
    """User management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_users(self):
        """Test GET /users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least super admin
        print(f"✓ Retrieved {len(data)} users")


class TestLeads:
    """Lead management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_leads(self):
        """Test GET /leads"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} leads")


class TestStudents:
    """Student management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_students(self):
        """Test GET /students"""
        response = requests.get(f"{BASE_URL}/api/students", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} students")


class TestPayments:
    """Payment management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_payments(self):
        """Test GET /payments"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} payments")


class TestNotifications:
    """Notification tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_notifications(self):
        """Test GET /notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} notifications")


class TestCommissions:
    """Commission records tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_commissions(self):
        """Test GET /commissions"""
        response = requests.get(f"{BASE_URL}/api/commissions", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} commission records")
    
    def test_get_commission_summary(self):
        """Test GET /commissions/summary"""
        response = requests.get(f"{BASE_URL}/api/commissions/summary", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "current_month" in data
        assert "all_time" in data
        print(f"✓ Commission summary retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
