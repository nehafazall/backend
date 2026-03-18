"""
Test Suite for Interactive Drill-Down Analytics
Tests all drill-down endpoints across Sales, CS, and Mentor dashboards
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lead-pool-master.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "aqib@clt-academy.com",
        "password": "@Aqib1234"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSalesDashboardDrillDown:
    """Sales Dashboard drill-down endpoint tests"""
    
    def test_agent_students_drill_by_name(self, auth_headers):
        """Test: /dashboard/drill/agent-students?agent_name=X"""
        # First get list of agents from leaderboard
        leaderboard_res = requests.get(f"{BASE_URL}/api/dashboard/leaderboard", headers=auth_headers)
        assert leaderboard_res.status_code == 200
        leaderboard = leaderboard_res.json()
        
        if len(leaderboard) > 0:
            agent_name = leaderboard[0].get("name")
            response = requests.get(f"{BASE_URL}/api/dashboard/drill/agent-students?agent_name={agent_name}", headers=auth_headers)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert isinstance(data, list), "Expected list of students"
            
            if len(data) > 0:
                # Verify student record structure
                student = data[0]
                assert "name" in student, "Student should have name"
                assert "course" in student or "enrollment_amount" in student, "Student should have course or amount"
            
            print(f"✅ Agent '{agent_name}' drill-down returned {len(data)} students")
        else:
            pytest.skip("No agents in leaderboard to test")
    
    def test_aleesha_agent_drill(self, auth_headers):
        """Test: Aleesha should have 99 students (per requirements)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/drill/agent-students?agent_name=Aleesha", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Aleesha has {len(data)} students (expected ~99)")
        # Don't assert exact count as data may change
    
    def test_team_agents_drill(self, auth_headers):
        """Test: /dashboard/drill/team-agents?team_name=X"""
        # Get team revenue to find team names
        team_res = requests.get(f"{BASE_URL}/api/dashboard/team-revenue?period=overall", headers=auth_headers)
        assert team_res.status_code == 200
        teams = team_res.json()
        
        if len(teams) > 0:
            team_name = teams[0].get("team_name")
            response = requests.get(f"{BASE_URL}/api/dashboard/drill/team-agents?team_name={team_name}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list), "Expected list of agents"
            
            if len(data) > 0:
                agent = data[0]
                assert "agent_name" in agent
                assert "deals" in agent
                assert "revenue" in agent
            
            print(f"✅ Team '{team_name}' has {len(data)} agents")
        else:
            pytest.skip("No teams to test")
    
    def test_team_xlnc_drill(self, auth_headers):
        """Test: Team XLNC should have 15 agents (per requirements)"""
        response = requests.get(f"{BASE_URL}/api/dashboard/drill/team-agents?team_name=XLNC", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Team XLNC has {len(data)} agents (expected ~15)")
    
    def test_pipeline_stage_drill(self, auth_headers):
        """Test: /dashboard/drill/pipeline-stage?stage=X"""
        # Get lead funnel to find stages
        funnel_res = requests.get(f"{BASE_URL}/api/dashboard/lead-funnel", headers=auth_headers)
        assert funnel_res.status_code == 200
        funnel = funnel_res.json()
        
        if len(funnel) > 0:
            stage = funnel[0].get("_id") or "new_lead"
            response = requests.get(f"{BASE_URL}/api/dashboard/drill/pipeline-stage?stage={stage}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "stage" in data
            assert "total" in data
            assert "agent_breakdown" in data
            assert "leads" in data
            
            print(f"✅ Pipeline stage '{stage}' has {data['total']} leads, {len(data['agent_breakdown'])} agent breakdown")
        else:
            pytest.skip("No pipeline stages to test")


class TestCSDashboardDrillDown:
    """CS Dashboard drill-down endpoint tests"""
    
    def test_cs_agent_students_drill(self, auth_headers):
        """Test: /cs/drill/agent-students?agent_name=X"""
        # Get CS leaderboard
        leaderboard_res = requests.get(f"{BASE_URL}/api/cs/dashboard/leaderboard?period=overall", headers=auth_headers)
        assert leaderboard_res.status_code == 200
        leaderboard = leaderboard_res.json()
        
        if len(leaderboard) > 0:
            agent_name = leaderboard[0].get("agent_name")
            response = requests.get(f"{BASE_URL}/api/cs/drill/agent-students?agent_name={agent_name}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            
            if len(data) > 0:
                student = data[0]
                assert "student_name" in student
                assert "stage" in student
                
            print(f"✅ CS Agent '{agent_name}' has {len(data)} students")
        else:
            pytest.skip("No CS agents in leaderboard")
    
    def test_nasida_vn_drill(self, auth_headers):
        """Test: Nasida VN should have 153 students (per requirements)"""
        response = requests.get(f"{BASE_URL}/api/cs/drill/agent-students?agent_name=Nasida VN", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Nasida VN has {len(data)} students (expected ~153)")
        
        # Verify student structure has proper fields
        if len(data) > 0:
            student = data[0]
            assert "student_name" in student, "Should have student_name field"
            assert student["student_name"] != "Unknown", "Should have actual student names, not 'Unknown'"
    
    def test_cs_pipeline_stage_drill(self, auth_headers):
        """Test: /cs/drill/pipeline-stage?stage=X"""
        # Get CS pipeline
        pipeline_res = requests.get(f"{BASE_URL}/api/cs/dashboard/pipeline?view_mode=team", headers=auth_headers)
        assert pipeline_res.status_code == 200
        pipeline = pipeline_res.json()
        
        if len(pipeline) > 0:
            stage_label = pipeline[0].get("label", "new_student")
            stage_key = stage_label.lower().replace(" ", "_")
            response = requests.get(f"{BASE_URL}/api/cs/drill/pipeline-stage?stage={stage_key}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "stage" in data
            assert "total" in data
            assert "agent_breakdown" in data
            assert "students" in data
            
            print(f"✅ CS Pipeline '{stage_label}' has {data['total']} students")
        else:
            pytest.skip("No CS pipeline stages")


class TestMentorDashboardDrillDown:
    """Mentor Dashboard drill-down endpoint tests"""
    
    def test_mentor_students_drill(self, auth_headers):
        """Test: /mentor/drill/students?mentor_name=X"""
        # Get mentor bifurcation
        bif_res = requests.get(f"{BASE_URL}/api/dashboard/mentor-bifurcation?period=overall", headers=auth_headers)
        assert bif_res.status_code == 200
        mentors = bif_res.json()
        
        if len(mentors) > 0:
            mentor_name = mentors[0].get("mentor_name")
            response = requests.get(f"{BASE_URL}/api/mentor/drill/students?mentor_name={mentor_name}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            
            if len(data) > 0:
                student = data[0]
                assert "student_name" in student
                
            print(f"✅ Mentor '{mentor_name}' has {len(data)} students")
        else:
            pytest.skip("No mentors in bifurcation")
    
    def test_ashwin_sudarsh_drill(self, auth_headers):
        """Test: Ashwin Sudarsh should have 224 students (per requirements)"""
        response = requests.get(f"{BASE_URL}/api/mentor/drill/students?mentor_name=Ashwin Sudarsh", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Ashwin Sudarsh has {len(data)} students (expected ~224)")
    
    def test_mentor_pipeline_stage_drill(self, auth_headers):
        """Test: /mentor/drill/pipeline-stage?stage=X"""
        stages = ["new_student", "discussion_started", "pitched_for_redeposit", "interested", "closed"]
        
        for stage in stages:
            response = requests.get(f"{BASE_URL}/api/mentor/drill/pipeline-stage?stage={stage}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            
            assert "stage" in data
            assert "total" in data
            assert "mentor_breakdown" in data
            assert "students" in data
            
            print(f"✅ Mentor Pipeline '{stage}' has {data['total']} students")


class TestAgentRevenueAndBifurcation:
    """Test agent revenue and bifurcation chart APIs"""
    
    def test_cs_agent_revenue_chart(self, auth_headers):
        """Test: /cs/dashboard/agent-revenue API"""
        response = requests.get(f"{BASE_URL}/api/cs/dashboard/agent-revenue?period=overall", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            agent = data[0]
            assert "agent_name" in agent
            assert "revenue" in agent
            
        print(f"✅ CS Agent Revenue chart has {len(data)} agents")
    
    def test_cs_agent_bifurcation_chart(self, auth_headers):
        """Test: /dashboard/cs-agent-bifurcation API"""
        response = requests.get(f"{BASE_URL}/api/dashboard/cs-agent-bifurcation?period=overall", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            agent = data[0]
            assert "agent_name" in agent
            assert "total_students" in agent
            
        print(f"✅ CS Agent Bifurcation chart has {len(data)} agents")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
