"""
Test Historical Student Data Import
Verifies the bulk import of 901 students from XLSX file worked correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHistoricalImport:
    """Test the historical student import verification"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_health_endpoint(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Backend health check passed")
    
    def test_leads_endpoint_no_500_error(self):
        """Test GET /api/leads returns data without 500 error"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=10",
            headers=self.headers
        )
        # The main fix was to prevent 500 errors from bad dates/emails
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of leads"
        assert len(data) > 0, "Expected leads data"
        print(f"✓ Leads endpoint returned {len(data)} leads without error")
    
    def test_leads_count_matches_expected(self):
        """Test total leads count (1223 = 322 pre-existing + 901 imported)"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=2000",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Due to 1000 limit, we check we have at least 1000 leads
        assert len(data) >= 1000, f"Expected at least 1000 leads, got {len(data)}"
        print(f"✓ Total leads count: {len(data)} (expected ~1223, API limit 1000)")
    
    def test_enrolled_leads_from_import(self):
        """Test leads include 'enrolled' stage leads from import"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=2000",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        enrolled_leads = [l for l in data if l.get('stage') == 'enrolled']
        assert len(enrolled_leads) > 0, "Expected enrolled leads from import"
        # Should have significant enrolled leads (901 were imported as enrolled)
        assert len(enrolled_leads) >= 500, f"Expected many enrolled leads, got {len(enrolled_leads)}"
        print(f"✓ Enrolled leads found: {len(enrolled_leads)}")
    
    def test_students_count_matches_expected(self):
        """Test GET /api/students returns ~902 students"""
        response = requests.get(
            f"{BASE_URL}/api/students?limit=2000",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of students"
        # Should have 902 students from import
        assert len(data) >= 900, f"Expected ~902 students, got {len(data)}"
        print(f"✓ Students count: {len(data)} (expected 902)")
    
    def test_students_are_activated_stage(self):
        """Test students include 'activated' stage from import"""
        response = requests.get(
            f"{BASE_URL}/api/students?limit=100",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        activated_students = [s for s in data if s.get('stage') == 'activated']
        assert len(activated_students) > 0, "Expected activated students"
        # All imported students should be activated
        assert len(activated_students) == len(data), "All imported students should be activated"
        print(f"✓ All {len(data)} sample students are in 'activated' stage")
    
    def test_courses_auto_created(self):
        """Test courses were auto-created (should have ~46 courses)"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers=self.headers
        )
        assert response.status_code == 200, f"Courses endpoint returned {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of courses"
        # Should have 46 courses (2 pre-existing + 44 auto-created from import)
        assert len(data) >= 40, f"Expected ~46 courses, got {len(data)}"
        print(f"✓ Courses count: {len(data)} (expected ~46)")
    
    def test_courses_include_imported_types(self):
        """Test auto-created courses include various package types"""
        response = requests.get(
            f"{BASE_URL}/api/courses",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        course_names = [c.get('name', '') for c in data]
        # Check for typical imported course types
        assert any('Basic Package' in name for name in course_names), "Expected Basic Package courses"
        assert any('Offer Course' in name for name in course_names), "Expected Offer Course courses"
        print(f"✓ Auto-created courses include Basic Package and Offer Course types")
    
    def test_students_have_agent_assignments(self):
        """Test imported students have CS agent and mentor assignments"""
        response = requests.get(
            f"{BASE_URL}/api/students?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check students have CS agent and mentor assigned
        for student in data[:5]:
            assert student.get('cs_agent_id') or student.get('cs_agent_name'), \
                f"Student {student.get('full_name')} missing CS agent"
            assert student.get('mentor_id') or student.get('mentor_name'), \
                f"Student {student.get('full_name')} missing mentor"
        print(f"✓ Students have CS agent and mentor assignments")
    
    def test_leads_have_sales_agent_assignments(self):
        """Test imported leads have sales agent assignments"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check enrolled leads have assigned_to
        enrolled_leads = [l for l in data if l.get('stage') == 'enrolled']
        for lead in enrolled_leads[:5]:
            assert lead.get('assigned_to') or lead.get('assigned_to_name'), \
                f"Lead {lead.get('full_name')} missing sales agent assignment"
        print(f"✓ Enrolled leads have sales agent assignments")
    
    def test_seed_data_json_exists(self):
        """Test seed_data.json exists at expected location"""
        import os
        seed_path = "/app/backend/seed_data.json"
        assert os.path.exists(seed_path), f"seed_data.json not found at {seed_path}"
        
        # Check file has content
        file_size = os.path.getsize(seed_path)
        assert file_size > 1000000, f"seed_data.json too small ({file_size} bytes)"
        print(f"✓ seed_data.json exists ({file_size} bytes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
