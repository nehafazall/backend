"""
Test Employee Role & Team Bug Fixes - Iteration 36

Tests:
1. PUT /api/hr/employees/{id} - Update employee role field saves correctly
2. PUT /api/hr/employees/{id} - Update employee team_id field saves correctly
3. Role change syncs to linked user account in users collection
4. Team_id change syncs to linked user account in users collection
5. GET /api/hr/employees - All joining_date fields returned in YYYY-MM-DD format
6. GET /api/hr/employees/{id} - Single employee date normalization
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmployeeRoleTeamBugFixes:
    """Test fixes for employee role and team saving issues"""
    
    token = None
    test_employee_id = "57d8e008-8e9b-4894-ab4c-111949f08370"  # Mohamadaffan
    test_user_id = "75c90474-9d95-4419-ae6a-51f266d017bb"  # Linked user
    
    @classmethod
    def setup_class(cls):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.token = response.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}", "Content-Type": "application/json"}
    
    def test_01_sync_options_returns_roles_and_teams(self):
        """Verify sync-options returns roles and teams for dropdowns"""
        response = requests.get(f"{BASE_URL}/api/hr/employees/sync-options", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify roles are returned
        assert "roles" in data, "roles field missing in sync-options"
        assert len(data["roles"]) > 0, "No roles returned"
        roles_values = [r["value"] for r in data["roles"]]
        assert "team_leader" in roles_values, "team_leader role missing"
        assert "sales_executive" in roles_values, "sales_executive role missing"
        print(f"✓ sync-options returns {len(data['roles'])} roles")
        
        # Verify teams are returned
        assert "teams" in data, "teams field missing in sync-options"
        print(f"✓ sync-options returns {len(data['teams'])} teams")
    
    def test_02_get_employee_returns_role_and_team_id(self):
        """Verify GET single employee returns role and team_id fields"""
        response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        emp = response.json()
        
        # Check that role field is present (may be null or have a value)
        assert "role" in emp or emp.get("role") is not None or "role" in emp.keys(), "role field missing from response"
        print(f"✓ Employee role: {emp.get('role')}")
        
        # Check that team_id field is present
        assert "team_id" in emp or emp.get("team_id") is not None or "team_id" in emp.keys(), "team_id field missing from response"
        print(f"✓ Employee team_id: {emp.get('team_id')}")
    
    def test_03_update_employee_role_saves(self):
        """Bug Fix Test: Update employee role via PUT and verify it saves"""
        # First get current state
        response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert response.status_code == 200
        original = response.json()
        original_role = original.get("role")
        
        # Update to a new role
        new_role = "sales_manager" if original_role != "sales_manager" else "team_leader"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.test_employee_id}",
            headers=self.headers,
            json={"role": new_role}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        
        # Verify the response contains the updated role
        assert updated.get("role") == new_role, f"Role not updated in response. Expected: {new_role}, Got: {updated.get('role')}"
        print(f"✓ Role updated from '{original_role}' to '{new_role}'")
        
        # Verify by fetching again
        response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert response.status_code == 200
        fetched = response.json()
        assert fetched.get("role") == new_role, f"Role not persisted. Expected: {new_role}, Got: {fetched.get('role')}"
        print(f"✓ Role persisted correctly: {new_role}")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers, json={"role": original_role or "team_leader"})
    
    def test_04_update_employee_team_id_saves(self):
        """Bug Fix Test: Update employee team_id via PUT and verify it saves"""
        # Get a team to use
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert teams_response.status_code == 200
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available for testing")
        
        test_team = teams[0]
        new_team_id = test_team["id"]
        
        # First get current state
        response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert response.status_code == 200
        original = response.json()
        original_team_id = original.get("team_id")
        
        # Update to new team
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.test_employee_id}",
            headers=self.headers,
            json={"team_id": new_team_id}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        updated = response.json()
        
        # Verify the response contains the updated team_id
        assert updated.get("team_id") == new_team_id, f"team_id not updated. Expected: {new_team_id}, Got: {updated.get('team_id')}"
        print(f"✓ team_id updated from '{original_team_id}' to '{new_team_id}'")
        
        # Verify by fetching again
        response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert response.status_code == 200
        fetched = response.json()
        assert fetched.get("team_id") == new_team_id, f"team_id not persisted. Expected: {new_team_id}, Got: {fetched.get('team_id')}"
        print(f"✓ team_id persisted correctly: {new_team_id}")
    
    def test_05_role_syncs_to_user_account(self):
        """Bug Fix Test: Verify role change syncs to linked user in users collection"""
        # Get original user state
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert users_response.status_code == 200
        users = users_response.json()
        user = next((u for u in users if u.get("id") == self.test_user_id), None)
        
        if not user:
            # Try to find the user by employee_id link
            emp_response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
            if emp_response.status_code == 200:
                emp = emp_response.json()
                linked_user_id = emp.get("user_id")
                if linked_user_id:
                    user = next((u for u in users if u.get("id") == linked_user_id), None)
        
        if not user:
            pytest.skip("Test user not found or not linked to employee")
        
        original_user_role = user.get("role")
        
        # Update employee role
        new_role = "sales_executive" if original_user_role != "sales_executive" else "team_leader"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.test_employee_id}",
            headers=self.headers,
            json={"role": new_role}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify user account was updated
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert users_response.status_code == 200
        users = users_response.json()
        updated_user = next((u for u in users if u.get("id") == user["id"]), None)
        
        assert updated_user is not None, "User not found after update"
        assert updated_user.get("role") == new_role, f"User role not synced. Expected: {new_role}, Got: {updated_user.get('role')}"
        print(f"✓ User role synced: {original_user_role} -> {new_role}")
    
    def test_06_team_id_syncs_to_user_account(self):
        """Bug Fix Test: Verify team_id change syncs to linked user in users collection"""
        # Get a team to use
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert teams_response.status_code == 200
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available for testing")
        
        test_team = teams[0]
        new_team_id = test_team["id"]
        
        # Get linked user_id from employee
        emp_response = requests.get(f"{BASE_URL}/api/hr/employees/{self.test_employee_id}", headers=self.headers)
        assert emp_response.status_code == 200
        emp = emp_response.json()
        linked_user_id = emp.get("user_id")
        
        if not linked_user_id:
            pytest.skip("Employee not linked to a user account")
        
        # Update employee team_id
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{self.test_employee_id}",
            headers=self.headers,
            json={"team_id": new_team_id}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify user account was updated
        users_response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert users_response.status_code == 200
        users = users_response.json()
        updated_user = next((u for u in users if u.get("id") == linked_user_id), None)
        
        assert updated_user is not None, "User not found after update"
        assert updated_user.get("team_id") == new_team_id, f"User team_id not synced. Expected: {new_team_id}, Got: {updated_user.get('team_id')}"
        print(f"✓ User team_id synced to: {new_team_id}")


class TestDateNormalization:
    """Test date format normalization (DD/MM/YYYY -> YYYY-MM-DD)"""
    
    token = None
    
    @classmethod
    def setup_class(cls):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.token = response.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}", "Content-Type": "application/json"}
    
    def test_07_get_employees_dates_normalized(self):
        """Bug Fix Test: All employees have dates in YYYY-MM-DD format"""
        response = requests.get(f"{BASE_URL}/api/hr/employees", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        employees = response.json()
        
        assert len(employees) > 0, "No employees returned"
        print(f"Checking {len(employees)} employees for date format...")
        
        invalid_dates = []
        for emp in employees:
            joining_date = emp.get("joining_date", "")
            if joining_date and not self._is_yyyy_mm_dd(joining_date):
                invalid_dates.append({
                    "employee_id": emp.get("employee_id"),
                    "full_name": emp.get("full_name"),
                    "joining_date": joining_date
                })
        
        if invalid_dates:
            print("Invalid date formats found:")
            for inv in invalid_dates[:5]:  # Show first 5
                print(f"  - {inv['employee_id']} ({inv['full_name']}): {inv['joining_date']}")
        
        assert len(invalid_dates) == 0, f"Found {len(invalid_dates)} employees with non-YYYY-MM-DD dates: {invalid_dates[:3]}"
        print(f"✓ All {len(employees)} employees have YYYY-MM-DD date format")
    
    def test_08_single_employee_dates_normalized(self):
        """Bug Fix Test: Single employee GET has normalized dates"""
        test_employee_id = "57d8e008-8e9b-4894-ab4c-111949f08370"
        response = requests.get(f"{BASE_URL}/api/hr/employees/{test_employee_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        emp = response.json()
        
        # Check joining_date
        joining_date = emp.get("joining_date", "")
        assert self._is_yyyy_mm_dd(joining_date), f"joining_date not YYYY-MM-DD: {joining_date}"
        print(f"✓ joining_date format: {joining_date}")
        
        # Check other date fields if present
        for date_field in ["date_of_birth", "confirmation_date"]:
            val = emp.get(date_field)
            if val:
                assert self._is_yyyy_mm_dd(val), f"{date_field} not YYYY-MM-DD: {val}"
                print(f"✓ {date_field} format: {val}")
    
    def test_09_date_normalization_samples(self):
        """Verify date normalization for various employees (spot check)"""
        response = requests.get(f"{BASE_URL}/api/hr/employees", headers=self.headers)
        assert response.status_code == 200
        employees = response.json()
        
        # Sample 10 random employees
        sample_size = min(10, len(employees))
        sample = employees[:sample_size]
        
        all_valid = True
        for emp in sample:
            joining_date = emp.get("joining_date", "")
            if joining_date and not self._is_yyyy_mm_dd(joining_date):
                print(f"✗ {emp.get('employee_id')}: Invalid date format: {joining_date}")
                all_valid = False
            else:
                print(f"✓ {emp.get('employee_id')}: {joining_date}")
        
        assert all_valid, "Some employees have invalid date formats"
    
    def _is_yyyy_mm_dd(self, date_str: str) -> bool:
        """Check if date is in YYYY-MM-DD format"""
        if not date_str:
            return True  # Empty is acceptable for optional fields
        if len(date_str) < 10:
            return False
        # Check YYYY-MM-DD pattern
        parts = date_str[:10].split('-')
        if len(parts) != 3:
            return False
        year, month, day = parts
        return len(year) == 4 and len(month) == 2 and len(day) == 2


class TestEmployeeUpdate:
    """Test EmployeeUpdate Pydantic model accepts role and team_id"""
    
    token = None
    
    @classmethod
    def setup_class(cls):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.token = response.json()["access_token"]
        cls.headers = {"Authorization": f"Bearer {cls.token}", "Content-Type": "application/json"}
    
    def test_10_update_role_accepted_by_pydantic(self):
        """Verify EmployeeUpdate model accepts 'role' field without validation error"""
        # This tests that the Pydantic model was fixed to include 'role'
        test_employee_id = "57d8e008-8e9b-4894-ab4c-111949f08370"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}",
            headers=self.headers,
            json={"role": "team_leader"}
        )
        
        # Should NOT get 422 Unprocessable Entity (validation error)
        assert response.status_code != 422, f"Pydantic rejected 'role' field: {response.text}"
        assert response.status_code == 200, f"Update failed: {response.text}"
        print("✓ Pydantic EmployeeUpdate model accepts 'role' field")
    
    def test_11_update_team_id_accepted_by_pydantic(self):
        """Verify EmployeeUpdate model accepts 'team_id' field without validation error"""
        # Get a valid team_id
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert teams_response.status_code == 200
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        test_team_id = teams[0]["id"]
        test_employee_id = "57d8e008-8e9b-4894-ab4c-111949f08370"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}",
            headers=self.headers,
            json={"team_id": test_team_id}
        )
        
        # Should NOT get 422 Unprocessable Entity (validation error)
        assert response.status_code != 422, f"Pydantic rejected 'team_id' field: {response.text}"
        assert response.status_code == 200, f"Update failed: {response.text}"
        print("✓ Pydantic EmployeeUpdate model accepts 'team_id' field")
    
    def test_12_update_both_role_and_team_together(self):
        """Verify updating both role and team_id in single request works"""
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert teams_response.status_code == 200
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        test_team_id = teams[0]["id"]
        test_employee_id = "57d8e008-8e9b-4894-ab4c-111949f08370"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/employees/{test_employee_id}",
            headers=self.headers,
            json={
                "role": "team_leader",
                "team_id": test_team_id
            }
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data.get("role") == "team_leader", f"Role not set: {data.get('role')}"
        assert data.get("team_id") == test_team_id, f"Team not set: {data.get('team_id')}"
        print(f"✓ Both role and team_id updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
