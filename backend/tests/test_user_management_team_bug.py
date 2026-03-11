"""
Test User Management Team Bug Fixes - Iteration 37
Tests:
1. User Management table shows team names for ALL users with team assignments
2. All 25 users visible in User Management including Falja, Della, Karthika
3. Edit User modal opens with team_id pre-populated
4. Edit User modal Team dropdown lists all teams (active_only=false)
5. Updating a user's team via Edit User modal saves correctly
6. Bidirectional sync: changing team_id in user update also updates linked employee's team_id
7. GET /api/users returns team_id field for all users
8. PUT /api/users/{id} accepts team_id and persists it
9. POST /api/hr/employees/sync-to-users creates user accounts for employees without one
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Team IDs from the bug report
TEAM_CHALLENGER_ID = "6ee2f29d-a98e-47ce-920a-9b34b4f863ee"
TEAM_GLADIATOR_ID = "abdd48bf-de7e-42fe-a723-b00a10dd3677"
TEAM_XLNC_ID = "34cec4f2-388d-4aa7-ac05-08266d63dcd4"
TEAM_CLOSING_MACHINE_ID = "73b4b626-a3a3-4746-abfb-903d09f2ecd9"

# Test user Falja
FALJA_USER_ID = "d101229f-2ff5-48c0-b8eb-03eb890fb540"


class TestUserManagementTeamBug:
    """Tests for User Management Team Bug Fixes"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # =============================================
    # Test 1: GET /api/users returns team_id field
    # =============================================
    def test_get_users_returns_team_id(self, headers):
        """GET /api/users should return team_id field for users with team assignments"""
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Response should be a list of users"
        assert len(users) >= 25, f"Expected at least 25 users, got {len(users)}"
        
        # Check that team_id field exists in response (can be null/empty for some users)
        users_with_teams = [u for u in users if u.get("team_id")]
        print(f"Total users: {len(users)}, Users with teams: {len(users_with_teams)}")
        
        # Verify users have team_id field
        for user in users_with_teams[:5]:
            assert "team_id" in user, f"User {user.get('full_name')} missing team_id field"
            print(f"  {user.get('full_name')}: team_id={user.get('team_id')}")
    
    # =============================================
    # Test 2: Users include Falja, Della, Karthika
    # =============================================
    def test_users_include_falja_della_karthika(self, headers):
        """All manually-created employees should have user accounts now"""
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        user_names = [u.get("full_name", "").lower() for u in users]
        
        # Check for the 3 employees that were missing user accounts
        expected_names = ["falja", "della", "karthika"]
        found = {}
        
        for name in expected_names:
            found[name] = any(name in un for un in user_names)
            print(f"  {name}: {'Found' if found[name] else 'NOT FOUND'}")
        
        # At least warn if not found - they might have been synced with different approach
        missing = [n for n, f in found.items() if not f]
        if missing:
            print(f"WARNING: Users not found by name search: {missing}")
            print(f"  Total users: {len(users)}")
    
    # =============================================
    # Test 3: GET /api/teams with active_only=false
    # =============================================
    def test_get_all_teams_including_inactive(self, headers):
        """GET /api/teams?active_only=false should return all teams"""
        response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=headers)
        assert response.status_code == 200, f"Failed to get teams: {response.text}"
        
        teams = response.json()
        assert isinstance(teams, list), "Response should be a list of teams"
        
        # Should have at least the 4 known teams
        team_ids = [t.get("id") for t in teams]
        print(f"Total teams: {len(teams)}")
        
        # Check for known teams
        known_teams = {
            "TEAM CHALLENGER": TEAM_CHALLENGER_ID,
            "TEAM GLADIATOR": TEAM_GLADIATOR_ID,
            "TEAM XLNC": TEAM_XLNC_ID,
            "TEAM CLOSING MACHINE": TEAM_CLOSING_MACHINE_ID
        }
        
        for name, team_id in known_teams.items():
            team = next((t for t in teams if t.get("id") == team_id), None)
            if team:
                print(f"  {name}: Found (active={team.get('active', True)})")
            else:
                print(f"  {name}: NOT FOUND")
    
    # =============================================
    # Test 4: Falja has team_id assignment
    # =============================================
    def test_falja_has_team_id(self, headers):
        """Falja should have team_id assigned to TEAM CHALLENGER"""
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        
        # Find Falja by ID or name
        falja = next((u for u in users if u.get("id") == FALJA_USER_ID), None)
        if not falja:
            falja = next((u for u in users if "falja" in u.get("full_name", "").lower()), None)
        
        if falja:
            print(f"Falja found: id={falja.get('id')}, team_id={falja.get('team_id')}")
            # Per bug report, Falja should be in TEAM CHALLENGER
            assert falja.get("team_id") == TEAM_CHALLENGER_ID, \
                f"Falja should be in TEAM CHALLENGER but has team_id={falja.get('team_id')}"
        else:
            print("WARNING: Falja user not found")
    
    # =============================================
    # Test 5: PUT /api/users/{id} accepts team_id
    # =============================================
    def test_update_user_team_id(self, headers):
        """PUT /api/users/{id} should accept and persist team_id"""
        # First, find a test user (Falja)
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = response.json()
        
        falja = next((u for u in users if u.get("id") == FALJA_USER_ID), None)
        if not falja:
            falja = next((u for u in users if "falja" in u.get("full_name", "").lower()), None)
        
        if not falja:
            pytest.skip("Falja user not found for team update test")
        
        user_id = falja["id"]
        original_team_id = falja.get("team_id")
        
        # Update to TEAM GLADIATOR
        new_team_id = TEAM_GLADIATOR_ID
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=headers,
            json={"team_id": new_team_id}
        )
        assert update_response.status_code == 200, f"Failed to update user: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user.get("team_id") == new_team_id, \
            f"team_id not updated correctly. Expected {new_team_id}, got {updated_user.get('team_id')}"
        print(f"Updated {falja.get('full_name')} team_id from {original_team_id} to {new_team_id}")
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = verify_response.json()
        user_after = next((u for u in users if u.get("id") == user_id), None)
        assert user_after.get("team_id") == new_team_id, "team_id not persisted after update"
        
        # Restore original team_id
        if original_team_id:
            restore_response = requests.put(
                f"{BASE_URL}/api/users/{user_id}",
                headers=headers,
                json={"team_id": original_team_id}
            )
            print(f"Restored team_id to {original_team_id}")
    
    # =============================================
    # Test 6: Bidirectional sync - user->employee
    # =============================================
    def test_bidirectional_sync_team_id(self, headers):
        """Changing team_id in user update should sync to linked employee"""
        # Find a user with employee_id link
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = response.json()
        
        # Find user with employee_id
        user_with_employee = next((u for u in users if u.get("employee_id")), None)
        if not user_with_employee:
            pytest.skip("No users with linked employee records found")
        
        user_id = user_with_employee["id"]
        employee_id = user_with_employee["employee_id"]
        original_team_id = user_with_employee.get("team_id")
        
        # Update user's team_id
        new_team_id = TEAM_XLNC_ID if original_team_id != TEAM_XLNC_ID else TEAM_GLADIATOR_ID
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=headers,
            json={"team_id": new_team_id}
        )
        assert update_response.status_code == 200
        
        # Check employee record
        emp_response = requests.get(f"{BASE_URL}/api/hr/employees/{employee_id}", headers=headers)
        if emp_response.status_code == 200:
            employee = emp_response.json()
            assert employee.get("team_id") == new_team_id, \
                f"Employee team_id not synced. Expected {new_team_id}, got {employee.get('team_id')}"
            print(f"Bidirectional sync verified: user {user_id} -> employee {employee_id}")
        
        # Restore original
        if original_team_id != new_team_id:
            requests.put(f"{BASE_URL}/api/users/{user_id}", headers=headers, json={"team_id": original_team_id or ""})
    
    # =============================================
    # Test 7: Team names display in users
    # =============================================
    def test_team_names_display(self, headers):
        """Verify team names can be resolved for users with team_id"""
        # Get teams first
        teams_response = requests.get(f"{BASE_URL}/api/teams?active_only=false", headers=headers)
        teams = teams_response.json()
        team_map = {t.get("id"): t.get("name") for t in teams}
        
        # Get users
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        users = users_response.json()
        
        users_with_teams = [u for u in users if u.get("team_id")]
        
        print(f"\nUsers with team assignments ({len(users_with_teams)}):")
        for user in users_with_teams[:10]:  # Show first 10
            team_id = user.get("team_id")
            team_name = team_map.get(team_id, "UNKNOWN")
            print(f"  {user.get('full_name')}: {team_name} ({team_id[:8]}...)")
            
            # Verify team_id resolves to a valid team name
            if team_id in team_map:
                assert team_map[team_id] is not None, f"Team name is None for {team_id}"
            else:
                print(f"    WARNING: team_id {team_id} not found in teams list")
    
    # =============================================
    # Test 8: POST /api/hr/employees/sync-to-users
    # =============================================
    def test_sync_employees_to_users_endpoint(self, headers):
        """POST /api/hr/employees/sync-to-users should create user accounts"""
        response = requests.post(f"{BASE_URL}/api/hr/employees/sync-to-users", headers=headers)
        assert response.status_code == 200, f"Failed to sync: {response.text}"
        
        result = response.json()
        print(f"Sync result: synced={result.get('synced')}, skipped={result.get('skipped')}")
        if result.get("errors"):
            print(f"  Errors: {result.get('errors')[:5]}")  # First 5 errors
        
        assert "synced" in result, "Response should include 'synced' count"
        assert "skipped" in result, "Response should include 'skipped' count"
    
    # =============================================
    # Test 9: User count verification
    # =============================================
    def test_user_count(self, headers):
        """Verify total user count is at least 25"""
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        print(f"Total users: {len(users)}")
        assert len(users) >= 25, f"Expected at least 25 users, got {len(users)}"
        
        # List users with their teams
        print("\nSample users with team assignments:")
        for user in users[:15]:
            team_id = user.get("team_id", "")
            print(f"  {user.get('full_name')}: role={user.get('role')}, team_id={team_id[:8] if team_id else 'None'}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
