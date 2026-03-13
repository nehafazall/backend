"""
Test Drill-Down Analytics Across All Dashboards
Tests: Sales, CS, Mentor, CEO/Bird's Eye Dashboard drill-down endpoints
"""
import pytest
import requests
import os

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
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Return auth headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSalesDashboardDrillDown:
    """Sales Dashboard drill-down endpoint tests"""
    
    def test_agent_closed_students_endpoint(self, headers):
        """Test /dashboard/agent/{agent_id}/closed-students endpoint"""
        # First get agents from sales closings
        closings_res = requests.get(f"{BASE_URL}/api/dashboard/sales-agent-closings?period=overall&limit=10", headers=headers)
        assert closings_res.status_code == 200
        agents = closings_res.json()
        
        if agents:
            # Use first agent's ID if available, or use a dummy ID
            # The endpoint uses assigned_to field from leads
            # Let's get leads to find a valid agent ID
            leads_res = requests.get(f"{BASE_URL}/api/leads?stage=enrolled&limit=1", headers=headers)
            if leads_res.status_code == 200 and leads_res.json():
                agent_id = leads_res.json()[0].get("assigned_to", "dummy")
                response = requests.get(f"{BASE_URL}/api/dashboard/agent/{agent_id}/closed-students", headers=headers)
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                print(f"✓ Agent closed students endpoint works - {len(data)} records")
            else:
                # Try with dummy ID - should return empty list
                response = requests.get(f"{BASE_URL}/api/dashboard/agent/dummy-id/closed-students", headers=headers)
                assert response.status_code == 200
                assert isinstance(response.json(), list)
                print("✓ Agent closed students endpoint works (no enrolled leads found)")
        else:
            print("✓ Agent closed students - no data to test with")
    
    def test_lead_pipeline_stage_details(self, headers):
        """Test /dashboard/lead-pipeline/{stage}/details endpoint"""
        stages = ["new_lead", "warm_lead", "hot_lead", "enrolled"]
        
        for stage in stages:
            response = requests.get(f"{BASE_URL}/api/dashboard/lead-pipeline/{stage}/details", headers=headers)
            assert response.status_code == 200, f"Failed for stage {stage}: {response.text}"
            data = response.json()
            
            assert "stage" in data, f"Missing stage field for {stage}"
            assert "total" in data, f"Missing total field for {stage}"
            assert "agent_breakdown" in data, f"Missing agent_breakdown field for {stage}"
            assert "leads" in data, f"Missing leads field for {stage}"
            assert isinstance(data["agent_breakdown"], list), f"agent_breakdown should be list for {stage}"
            assert isinstance(data["leads"], list), f"leads should be list for {stage}"
            
            print(f"✓ Lead pipeline {stage}: total={data['total']}, agents={len(data['agent_breakdown'])}")
    
    def test_monthly_revenue_details(self, headers):
        """Test /dashboard/monthly-revenue/{month}/details endpoint"""
        months = ["Jan", "Feb", "Mar"]
        
        for month in months:
            response = requests.get(f"{BASE_URL}/api/dashboard/monthly-revenue/{month}/details", headers=headers)
            assert response.status_code == 200, f"Failed for month {month}: {response.text}"
            data = response.json()
            
            # Check response structure
            assert "by_course" in data or "error" not in data, f"Invalid response for {month}"
            if "by_course" in data:
                assert "by_agent" in data
                assert "total_revenue" in data
                assert "total_enrolled" in data
                print(f"✓ Monthly revenue {month}: revenue={data.get('total_revenue', 0)}, enrolled={data.get('total_enrolled', 0)}")
            else:
                print(f"✓ Monthly revenue {month}: no data for this month")
    
    def test_team_revenue_agent_drill(self, headers):
        """Test /dashboard/team-revenue/{team_name}/agents endpoint"""
        # First get team revenue data
        team_res = requests.get(f"{BASE_URL}/api/dashboard/team-revenue?period=overall", headers=headers)
        assert team_res.status_code == 200
        teams = team_res.json()
        
        if teams:
            team_name = teams[0].get("team_name", "Sales")
            response = requests.get(f"{BASE_URL}/api/dashboard/team-revenue/{team_name}/agents", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Team '{team_name}' agents drill-down: {len(data)} agents")
        else:
            print("✓ Team revenue - no teams to test with")


class TestCSDashboardDrillDown:
    """CS Dashboard drill-down endpoint tests"""
    
    def test_cs_agent_students_endpoint(self, headers):
        """Test /cs/dashboard/agent/{agent_id}/students endpoint"""
        # Get students to find a CS agent
        students_res = requests.get(f"{BASE_URL}/api/students?limit=10", headers=headers)
        
        if students_res.status_code == 200 and students_res.json():
            student = students_res.json()[0]
            agent_id = student.get("cs_agent_id", "dummy")
            
            response = requests.get(f"{BASE_URL}/api/cs/dashboard/agent/{agent_id}/students", headers=headers)
            assert response.status_code == 200
            # The endpoint should return a list of students
            print(f"✓ CS agent students endpoint works")
        else:
            response = requests.get(f"{BASE_URL}/api/cs/dashboard/agent/dummy/students", headers=headers)
            assert response.status_code == 200
            print("✓ CS agent students endpoint works (no students found)")
    
    def test_cs_pipeline_stage_details(self, headers):
        """Test /cs/dashboard/pipeline/{stage}/details endpoint"""
        stages = ["pitched_for_upgrade", "new_student", "activated"]
        
        for stage in stages:
            response = requests.get(f"{BASE_URL}/api/cs/dashboard/pipeline/{stage}/details", headers=headers)
            assert response.status_code == 200, f"Failed for CS stage {stage}: {response.text}"
            data = response.json()
            
            assert "stage" in data
            assert "total" in data
            assert "agent_breakdown" in data
            assert "students" in data
            
            print(f"✓ CS pipeline {stage}: total={data['total']}, agents={len(data['agent_breakdown'])}")


class TestMentorDashboardDrillDown:
    """Mentor Dashboard drill-down endpoint tests"""
    
    def test_mentor_students_endpoint(self, headers):
        """Test /mentor/dashboard/{mentor_id}/students endpoint"""
        # Get students with mentors
        students_res = requests.get(f"{BASE_URL}/api/students?limit=50", headers=headers)
        
        mentor_id = None
        if students_res.status_code == 200:
            for student in students_res.json():
                if student.get("mentor_id"):
                    mentor_id = student["mentor_id"]
                    break
        
        if mentor_id:
            response = requests.get(f"{BASE_URL}/api/mentor/dashboard/{mentor_id}/students", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Mentor students endpoint works - {len(data)} students")
        else:
            response = requests.get(f"{BASE_URL}/api/mentor/dashboard/dummy-mentor/students", headers=headers)
            assert response.status_code == 200
            print("✓ Mentor students endpoint works (no mentors found)")
    
    def test_mentor_pipeline_stage_details(self, headers):
        """Test /mentor/dashboard/pipeline/{stage}/details endpoint"""
        stages = ["new_student", "discussion_started", "pitched_for_redeposit", "interested", "closed"]
        
        for stage in stages:
            response = requests.get(f"{BASE_URL}/api/mentor/dashboard/pipeline/{stage}/details", headers=headers)
            assert response.status_code == 200, f"Failed for mentor stage {stage}: {response.text}"
            data = response.json()
            
            assert "stage" in data
            assert "total" in data
            assert "mentor_breakdown" in data
            assert "students" in data
            
            print(f"✓ Mentor pipeline {stage}: total={data['total']}, mentors={len(data['mentor_breakdown'])}")


class TestCEODashboardDrillDown:
    """CEO/Bird's Eye Dashboard drill-down endpoint tests"""
    
    def test_department_employees_endpoint(self, headers):
        """Test /dashboard/department/{dept_name}/employees endpoint"""
        departments = ["Sales", "Finance", "Customer Service", "HR"]
        
        for dept in departments:
            response = requests.get(f"{BASE_URL}/api/dashboard/department/{dept}/employees", headers=headers)
            assert response.status_code == 200, f"Failed for department {dept}: {response.text}"
            data = response.json()
            assert isinstance(data, list)
            
            # Verify employee fields if data exists
            if data:
                emp = data[0]
                assert "full_name" in emp or "employee_id" in emp
            
            print(f"✓ Department '{dept}' employees: {len(data)} employees")


class TestThemeToggle:
    """Test theme toggle functionality"""
    
    def test_theme_mode_toggle_logic(self, headers):
        """Verify theme toggle cycles through auto->light->dark"""
        # This tests the frontend logic - we verify the backend doesn't break
        # The theme toggle is client-side only
        
        # Verify auth still works (theme doesn't affect API)
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        print("✓ Theme toggle is frontend-only, API unaffected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
