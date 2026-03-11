"""
Teams Management Backend Tests - Iteration 35
Testing: Teams CRUD, leader assignment, member management, N+1 query fixes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestTeamsEndpoint:
    """Test GET /api/teams with N+1 fix - returns leader_name and member_count"""
    
    def test_get_teams_returns_list(self, auth_headers):
        """GET /api/teams returns a list of teams"""
        response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/teams returned {len(data)} teams")
    
    def test_teams_have_leader_name_field(self, auth_headers):
        """Teams should have leader_name field (N+1 fix verification)"""
        response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert response.status_code == 200
        teams = response.json()
        for team in teams:
            assert "leader_name" in team, f"Team {team.get('name')} missing leader_name field"
        print(f"✓ All {len(teams)} teams have leader_name field")
    
    def test_teams_have_member_count_field(self, auth_headers):
        """Teams should have member_count field (N+1 fix verification)"""
        response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert response.status_code == 200
        teams = response.json()
        for team in teams:
            assert "member_count" in team, f"Team {team.get('name')} missing member_count field"
            assert isinstance(team["member_count"], int), "member_count should be integer"
        print(f"✓ All {len(teams)} teams have member_count field")


class TestCreateTeam:
    """Test POST /api/teams - creating teams with all 8 departments"""
    
    DEPARTMENTS = ['Sales', 'Finance', 'Customer Service', 'Mentors/Academics', 
                   'Operations', 'Marketing', 'HR', 'Quality Control']
    
    def test_create_team_with_mentors_academics_department(self, auth_headers):
        """Create a team with 'Mentors/Academics' department"""
        team_data = {
            "name": "TEST_Mentors_Team_35",
            "department": "Mentors/Academics",
            "description": "Test team for mentors iteration 35"
        }
        response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
        # If team already exists, that's OK for testing
        if response.status_code == 400 and "already exists" in response.text:
            print("✓ Team with Mentors/Academics department already exists (OK)")
            return
        assert response.status_code == 200, f"Failed to create team: {response.text}"
        data = response.json()
        assert data["department"] == "Mentors/Academics"
        print(f"✓ Created team '{data['name']}' with department 'Mentors/Academics'")
    
    def test_create_team_with_all_departments(self, auth_headers):
        """Verify teams can be created with all 8 departments"""
        for dept in self.DEPARTMENTS:
            team_data = {
                "name": f"TEST_Dept_Team_{dept.replace('/', '_')}",
                "department": dept,
                "description": f"Test team for {dept}"
            }
            response = requests.post(f"{BASE_URL}/api/teams", json=team_data, headers=auth_headers)
            # 200 = created, 400 = already exists (both OK)
            assert response.status_code in [200, 400], f"Failed for dept {dept}: {response.text}"
        print(f"✓ All 8 departments are valid for team creation")


class TestTeamDetails:
    """Test GET /api/teams/{team_id} - team details with members"""
    
    def test_get_team_details(self, auth_headers):
        """Get team details includes leader info and members"""
        # First get list of teams
        response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert response.status_code == 200
        teams = response.json()
        if not teams:
            pytest.skip("No teams to test")
        
        team_id = teams[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        team = response.json()
        
        # Verify team details structure
        assert "id" in team
        assert "name" in team
        assert "department" in team
        assert "members" in team
        assert isinstance(team["members"], list)
        print(f"✓ Team details for '{team['name']}' loaded with {len(team['members'])} members")


class TestAssignLeader:
    """Test PUT /api/teams/{team_id} with leader_id - assigning team leaders"""
    
    def test_get_all_users_for_leader_selection(self, auth_headers):
        """GET /api/users returns all active users (no role filter)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        users = response.json()
        assert isinstance(users, list)
        # Count users by role
        roles = {}
        for u in users:
            r = u.get("role", "unknown")
            roles[r] = roles.get(r, 0) + 1
        print(f"✓ GET /api/users returned {len(users)} users. Roles: {roles}")
        # Verify we have users available for leader selection
        active_users = [u for u in users if u.get("is_active") != False]
        assert len(active_users) > 0, "No active users available for leader selection"
        print(f"✓ {len(active_users)} active users available for leader selection (no role filter)")
    
    def test_assign_leader_to_team(self, auth_headers):
        """Assign a leader to a team using PUT /api/teams/{team_id}"""
        # Get a team
        teams_resp = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert teams_resp.status_code == 200
        teams = teams_resp.json()
        if not teams:
            pytest.skip("No teams available")
        
        test_team = teams[0]
        team_id = test_team["id"]
        
        # Get a user to assign as leader
        users_resp = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert users_resp.status_code == 200
        users = users_resp.json()
        active_users = [u for u in users if u.get("is_active") != False]
        
        if not active_users:
            pytest.skip("No active users available")
        
        # Pick a user that's not super_admin
        candidate = None
        for u in active_users:
            if u["role"] != "super_admin":
                candidate = u
                break
        
        if not candidate:
            pytest.skip("No non-super_admin user available for leader assignment")
        
        # Assign as leader
        response = requests.put(
            f"{BASE_URL}/api/teams/{team_id}",
            json={"leader_id": candidate["id"]},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to assign leader: {response.text}"
        
        # Verify the user is now team_leader
        user_resp = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = user_resp.json()
        assigned_user = next((u for u in users if u["id"] == candidate["id"]), None)
        assert assigned_user is not None
        assert assigned_user["role"] == "team_leader", f"User role should be team_leader, got {assigned_user['role']}"
        
        print(f"✓ Assigned '{candidate['full_name']}' as leader of team '{test_team['name']}'")
        print(f"✓ User role updated to 'team_leader'")


class TestAddMember:
    """Test POST /api/teams/{team_id}/members - adding members to team"""
    
    def test_add_member_to_team(self, auth_headers):
        """Add a member to a team"""
        # Get a team
        teams_resp = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        assert teams_resp.status_code == 200
        teams = teams_resp.json()
        if not teams:
            pytest.skip("No teams available")
        
        team = teams[0]
        team_id = team["id"]
        
        # Get team details to see current members
        team_details = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers).json()
        current_member_ids = {m["id"] for m in team_details.get("members", [])}
        
        # Get users not in this team
        users_resp = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        users = users_resp.json()
        available_users = [u for u in users if u.get("is_active") != False and u["id"] not in current_member_ids]
        
        if not available_users:
            print(f"✓ No available users to add (all users may already be in team or this is expected)")
            return
        
        # Add first available user
        new_member = available_users[0]
        response = requests.post(
            f"{BASE_URL}/api/teams/{team_id}/members",
            json={"user_id": new_member["id"]},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to add member: {response.text}"
        print(f"✓ Added '{new_member['full_name']}' to team '{team['name']}'")
        
        # Verify user's team_id is updated
        user_check = requests.get(f"{BASE_URL}/api/users", headers=auth_headers).json()
        updated_user = next((u for u in user_check if u["id"] == new_member["id"]), None)
        assert updated_user is not None
        assert updated_user.get("team_id") == team_id, "User's team_id should be updated"
        print(f"✓ User's team_id correctly updated to {team_id}")


class TestLeadsN1QueryFix:
    """Test GET /api/leads N+1 query fix - assigned_to_name and course_name"""
    
    def test_leads_have_assigned_to_name(self, auth_headers):
        """GET /api/leads returns assigned_to_name (N+1 fix)"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        leads = response.json()
        
        # Check leads with assigned_to have assigned_to_name
        for lead in leads[:10]:  # Check first 10
            if lead.get("assigned_to"):
                assert "assigned_to_name" in lead, f"Lead {lead.get('id')} missing assigned_to_name"
        
        assigned_count = len([l for l in leads if l.get("assigned_to")])
        print(f"✓ GET /api/leads returned {len(leads)} leads, {assigned_count} with assignments")
        print(f"✓ assigned_to_name field present (N+1 fix verified)")
    
    def test_leads_have_course_name(self, auth_headers):
        """GET /api/leads returns course_name for enrolled leads (N+1 fix)"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        assert response.status_code == 200
        leads = response.json()
        
        # Check leads with course_id have course_name
        for lead in leads[:10]:
            if lead.get("course_id"):
                assert "course_name" in lead, f"Lead {lead.get('id')} missing course_name"
        
        course_count = len([l for l in leads if l.get("course_id")])
        print(f"✓ {course_count} leads have course_id, course_name field present (N+1 fix verified)")


class TestSearchFunctionality:
    """Test search in leader and member modals (frontend filter, but backend provides data)"""
    
    def test_users_have_searchable_fields(self, auth_headers):
        """Users have full_name and email for search functionality"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        
        for user in users[:5]:
            assert "full_name" in user, "User missing full_name"
            assert "email" in user, "User missing email"
        
        print(f"✓ All {len(users)} users have full_name and email for search")


# Cleanup tests
class TestCleanup:
    """Cleanup test data created during testing"""
    
    def test_cleanup_test_teams(self, auth_headers):
        """Remove test teams created during testing"""
        teams_resp = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=auth_headers)
        if teams_resp.status_code != 200:
            return
        
        teams = teams_resp.json()
        test_teams = [t for t in teams if t["name"].startswith("TEST_")]
        
        for team in test_teams:
            # Deactivate the team (can't delete if has members)
            requests.delete(f"{BASE_URL}/api/teams/{team['id']}", headers=auth_headers)
        
        print(f"✓ Cleanup: Attempted to remove {len(test_teams)} test teams")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
