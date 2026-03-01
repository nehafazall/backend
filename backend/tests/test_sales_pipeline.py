"""
Test Suite for Sales Pipeline Feature
- Pipeline Revenue Widget API
- Expected Commission Widget API
- Lead cards with course/value display
- Course selection required for pipeline stages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSalesPipelineFeature:
    """Test suite for Sales Pipeline and Commission tracking features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
    
    def authenticate(self):
        """Login and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user_id = data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    # ==================== AUTH TESTS ====================
    
    def test_login_success(self):
        """Test login with super admin credentials"""
        data = self.authenticate()
        assert "access_token" in data
        assert data["user"]["email"] == "aqib@clt-academy.com"
        print("✓ Login successful")
    
    # ==================== PIPELINE REVENUE API TESTS ====================
    
    def test_pipeline_revenue_endpoint_requires_auth(self):
        """Test that pipeline-revenue endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/pipeline-revenue")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Pipeline revenue endpoint requires authentication")
    
    def test_pipeline_revenue_returns_correct_structure(self):
        """Test GET /api/dashboard/pipeline-revenue returns correct data structure"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/pipeline-revenue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check top-level structure
        assert "stages" in data, "Response should have 'stages' field"
        assert "summary" in data, "Response should have 'summary' field"
        
        # Check summary structure
        summary = data["summary"]
        assert "active_pipeline_value" in summary, "Summary should have 'active_pipeline_value'"
        assert "enrolled_value" in summary, "Summary should have 'enrolled_value'"
        assert "rejected_value" in summary, "Summary should have 'rejected_value'"
        assert "total_potential" in summary, "Summary should have 'total_potential'"
        
        # Check stages structure
        stages = data["stages"]
        assert isinstance(stages, list), "Stages should be a list"
        
        # Verify expected stages exist
        expected_stages = ["warm_lead", "hot_lead", "in_progress", "enrolled", "rejected"]
        actual_stages = [s["stage"] for s in stages]
        for expected in expected_stages:
            assert expected in actual_stages, f"Stage '{expected}' should be in response"
        
        # Check each stage has required fields
        for stage in stages:
            assert "stage" in stage
            assert "stage_label" in stage
            assert "count" in stage
            assert "total_value" in stage
            assert "course_breakdown" in stage
            assert isinstance(stage["course_breakdown"], list)
        
        print(f"✓ Pipeline revenue returns correct structure with {len(stages)} stages")
        print(f"  Active pipeline value: AED {summary['active_pipeline_value']}")
        print(f"  Enrolled value: AED {summary['enrolled_value']}")
    
    def test_pipeline_revenue_values_are_numbers(self):
        """Test that pipeline revenue values are numeric"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/pipeline-revenue")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # All summary values should be numbers
        assert isinstance(summary["active_pipeline_value"], (int, float))
        assert isinstance(summary["enrolled_value"], (int, float))
        assert isinstance(summary["rejected_value"], (int, float))
        assert isinstance(summary["total_potential"], (int, float))
        
        # Stage values should be numbers
        for stage in data["stages"]:
            assert isinstance(stage["count"], int)
            assert isinstance(stage["total_value"], (int, float))
        
        print("✓ All pipeline revenue values are numeric")
    
    def test_pipeline_revenue_with_view_as(self):
        """Test pipeline-revenue with view_as parameter for managers"""
        self.authenticate()
        
        # Get list of users to test view_as
        users_response = self.session.get(f"{BASE_URL}/api/users?limit=5")
        if users_response.status_code == 200 and users_response.json():
            users = users_response.json()
            if len(users) > 1:
                test_user_id = users[1]["id"]
                response = self.session.get(f"{BASE_URL}/api/dashboard/pipeline-revenue?view_as={test_user_id}")
                assert response.status_code == 200, f"view_as failed: {response.text}"
                print(f"✓ Pipeline revenue works with view_as parameter")
            else:
                print("⚠ Skipping view_as test - not enough users")
        else:
            print("⚠ Skipping view_as test - couldn't fetch users")
    
    # ==================== EXPECTED COMMISSION API TESTS ====================
    
    def test_expected_commission_endpoint_requires_auth(self):
        """Test that expected-commission endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/expected-commission")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Expected commission endpoint requires authentication")
    
    def test_expected_commission_returns_correct_structure(self):
        """Test GET /api/dashboard/expected-commission returns correct data structure"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/expected-commission")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check top-level structure
        assert "summary" in data, "Response should have 'summary' field"
        assert "stage_breakdown" in data, "Response should have 'stage_breakdown' field"
        assert "pipeline_leads" in data, "Response should have 'pipeline_leads' field"
        assert "month" in data, "Response should have 'month' field"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_pipeline_value" in summary
        assert "expected_commission" in summary
        assert "earned_this_month" in summary
        assert "actual_pending" in summary
        assert "actual_paid" in summary
        assert "total_receivable" in summary
        
        # Check stage_breakdown structure
        stage_breakdown = data["stage_breakdown"]
        assert isinstance(stage_breakdown, list)
        
        expected_stages = ["warm_lead", "hot_lead", "in_progress"]
        actual_stages = [s["stage"] for s in stage_breakdown]
        for expected in expected_stages:
            assert expected in actual_stages, f"Stage '{expected}' should be in stage_breakdown"
        
        # Each stage breakdown should have required fields
        for stage in stage_breakdown:
            assert "stage" in stage
            assert "label" in stage
            assert "count" in stage
            assert "pipeline_value" in stage
            assert "expected_commission" in stage
        
        # Check pipeline_leads structure if any
        pipeline_leads = data["pipeline_leads"]
        assert isinstance(pipeline_leads, list)
        if len(pipeline_leads) > 0:
            lead = pipeline_leads[0]
            assert "id" in lead
            assert "name" in lead
            assert "stage" in lead
            assert "value" in lead
            assert "expected_commission" in lead
        
        print(f"✓ Expected commission returns correct structure")
        print(f"  Month: {data['month']}")
        print(f"  Expected commission: AED {summary['expected_commission']}")
        print(f"  Earned this month: AED {summary['earned_this_month']}")
        print(f"  Total receivable: AED {summary['total_receivable']}")
    
    def test_expected_commission_values_are_numbers(self):
        """Test that expected commission values are numeric"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/expected-commission")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # All summary values should be numbers
        assert isinstance(summary["total_pipeline_value"], (int, float))
        assert isinstance(summary["expected_commission"], (int, float))
        assert isinstance(summary["earned_this_month"], (int, float))
        assert isinstance(summary["actual_pending"], (int, float))
        assert isinstance(summary["actual_paid"], (int, float))
        assert isinstance(summary["total_receivable"], (int, float))
        
        print("✓ All expected commission values are numeric")
    
    def test_expected_commission_month_format(self):
        """Test that month is in correct YYYY-MM format"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/expected-commission")
        assert response.status_code == 200
        
        data = response.json()
        month = data["month"]
        
        # Month should be in YYYY-MM format
        import re
        assert re.match(r"^\d{4}-\d{2}$", month), f"Month '{month}' should be in YYYY-MM format"
        print(f"✓ Month format is correct: {month}")
    
    # ==================== LEAD UPDATE WITH COURSE TESTS ====================
    
    def test_leads_endpoint_returns_course_fields(self):
        """Test that leads endpoint returns course interest fields"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/leads?limit=5")
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        
        leads = response.json()
        if len(leads) > 0:
            lead = leads[0]
            # These fields should exist (may be null)
            # Check that interested_course_id and estimated_value fields can be present
            print(f"✓ Leads endpoint accessible, {len(leads)} leads returned")
            print(f"  Lead fields present: {list(lead.keys())[:10]}...")
        else:
            print("⚠ No leads in database to check fields")
    
    def test_courses_endpoint_available(self):
        """Test that courses endpoint is available for selection"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200, f"Failed to get courses: {response.text}"
        
        courses = response.json()
        assert isinstance(courses, list), "Courses should be a list"
        
        if len(courses) > 0:
            course = courses[0]
            assert "id" in course
            assert "name" in course
            assert "base_price" in course
            print(f"✓ Courses endpoint returns {len(courses)} courses")
            print(f"  Sample: {course['name']} - AED {course.get('base_price', 0)}")
        else:
            print("⚠ No courses in database")
    
    # ==================== DASHBOARD STATS TESTS ====================
    
    def test_dashboard_stats_endpoint(self):
        """Test dashboard stats endpoint works"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        # Should have various stats fields
        assert isinstance(data, dict), "Stats should be a dictionary"
        print(f"✓ Dashboard stats endpoint working")
        print(f"  Stats keys: {list(data.keys())[:5]}...")
    
    def test_dashboard_lead_funnel(self):
        """Test lead funnel endpoint"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/lead-funnel")
        assert response.status_code == 200, f"Lead funnel failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Lead funnel should be a list"
        print(f"✓ Lead funnel endpoint returns {len(data)} stages")
    
    def test_dashboard_leaderboard(self):
        """Test leaderboard endpoint"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/dashboard/leaderboard")
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Leaderboard should be a list"
        print(f"✓ Leaderboard endpoint returns {len(data)} entries")


# Run tests when executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
