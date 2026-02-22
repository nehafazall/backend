"""
Test suite for User <-> Employee bidirectional sync feature
Tests:
1. Create user with create_employee_record=true -> verify employee record created
2. Update user is_active=false -> verify linked employee status becomes 'terminated'
3. Sync fields: department, role, full_name sync between user and employee
4. Delete user -> verify linked employee is terminated
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserEmployeeSync:
    """Tests for bidirectional sync between User Management and Employee Master"""
    
    auth_token = None
    created_user_ids = []
    created_employee_ids = []
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as super_admin"""
        if not TestUserEmployeeSync.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "aqib@clt-academy.com",
                "password": "@Aqib1234"
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            TestUserEmployeeSync.auth_token = response.json()["access_token"]
        yield
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestUserEmployeeSync.auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_login_super_admin(self):
        """Test super_admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print("✓ Super admin login successful")
    
    def test_02_create_user_with_employee_record(self):
        """Create user with create_employee_record=true -> verify employee record is created"""
        timestamp = int(time.time())
        test_email = f"test.sync.{timestamp}@clt-academy.com"
        
        # Create user with create_employee_record=true
        user_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "full_name": f"Test Sync User {timestamp}",
            "role": "sales_executive",
            "department": "Sales",
            "phone": "+971501234567",
            "is_active": True,
            "create_employee_record": True,
            "designation": "Sales Executive",
            "joining_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"User creation failed: {response.text}"
        user = response.json()
        
        # Store user ID for cleanup
        TestUserEmployeeSync.created_user_ids.append(user["id"])
        
        assert user["email"] == test_email
        assert user["full_name"] == user_data["full_name"]
        assert user["role"] == "sales_executive"
        assert user["department"] == "Sales"
        
        # Check if employee_id is linked to user
        assert "employee_id" in user, "User should have employee_id field"
        employee_uuid = user.get("employee_id")
        assert employee_uuid is not None, "employee_id should not be None"
        
        print(f"✓ User created with ID: {user['id']}")
        print(f"✓ User linked to employee_id: {employee_uuid}")
        
        # Verify employee record was created
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200, f"Employee not found: {emp_response.text}"
        employee = emp_response.json()
        
        # Verify employee fields match user data
        assert employee["full_name"] == user_data["full_name"]
        assert employee["company_email"] == test_email
        assert employee["department"] == "Sales"
        assert employee["designation"] == "Sales Executive"
        assert employee["role"] == "sales_executive"
        assert employee["employment_status"] == "active"
        assert employee["user_id"] == user["id"]
        assert employee["created_via"] == "user_management"
        
        TestUserEmployeeSync.created_employee_ids.append(employee["id"])
        
        print(f"✓ Employee record verified: {employee['employee_id']}")
        print(f"✓ Employee full_name: {employee['full_name']}")
        print(f"✓ Employee email: {employee['company_email']}")
        print(f"✓ Employee status: {employee['employment_status']}")
    
    def test_03_update_user_deactivate_syncs_to_employee_terminated(self):
        """Update user is_active=false -> verify linked employee status becomes 'terminated'"""
        if not TestUserEmployeeSync.created_user_ids:
            pytest.skip("No user created in previous test")
        
        user_id = TestUserEmployeeSync.created_user_ids[-1]
        
        # First get the user to find employee_id
        user_response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.get_headers()
        )
        assert user_response.status_code == 200
        users = user_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is not None, f"User {user_id} not found"
        
        employee_uuid = user.get("employee_id")
        assert employee_uuid, "User should have employee_id"
        
        # Update user is_active to false
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            json={"is_active": False},
            headers=self.get_headers()
        )
        
        assert update_response.status_code == 200, f"User update failed: {update_response.text}"
        updated_user = update_response.json()
        assert updated_user["is_active"] == False
        
        print(f"✓ User deactivated: is_active={updated_user['is_active']}")
        
        # Verify employee status became terminated
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200, f"Employee not found: {emp_response.text}"
        employee = emp_response.json()
        
        assert employee["employment_status"] == "terminated", f"Employee status should be 'terminated', got: {employee['employment_status']}"
        assert employee.get("termination_date") is not None, "Termination date should be set"
        
        print(f"✓ Employee status synced to: {employee['employment_status']}")
        print(f"✓ Employee termination_date: {employee['termination_date']}")
    
    def test_04_update_user_reactivate_syncs_to_employee_active(self):
        """Update user is_active=true -> verify linked employee status becomes 'active'"""
        if not TestUserEmployeeSync.created_user_ids:
            pytest.skip("No user created in previous test")
        
        user_id = TestUserEmployeeSync.created_user_ids[-1]
        
        # First get the user to find employee_id
        user_response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.get_headers()
        )
        assert user_response.status_code == 200
        users = user_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        assert user is not None
        
        employee_uuid = user.get("employee_id")
        
        # Update user is_active to true
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            json={"is_active": True},
            headers=self.get_headers()
        )
        
        assert update_response.status_code == 200
        updated_user = update_response.json()
        assert updated_user["is_active"] == True
        
        print(f"✓ User reactivated: is_active={updated_user['is_active']}")
        
        # Verify employee status became active
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200
        employee = emp_response.json()
        
        assert employee["employment_status"] == "active", f"Employee status should be 'active', got: {employee['employment_status']}"
        assert employee.get("termination_date") is None, "Termination date should be cleared"
        
        print(f"✓ Employee status synced to: {employee['employment_status']}")
    
    def test_05_sync_department_change(self):
        """Update user department -> verify employee department syncs"""
        if not TestUserEmployeeSync.created_user_ids:
            pytest.skip("No user created in previous test")
        
        user_id = TestUserEmployeeSync.created_user_ids[-1]
        
        # Get user to find employee_id
        user_response = requests.get(f"{BASE_URL}/api/users", headers=self.get_headers())
        users = user_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        employee_uuid = user.get("employee_id")
        
        # Update user department
        new_department = "Marketing"
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            json={"department": new_department},
            headers=self.get_headers()
        )
        
        assert update_response.status_code == 200
        updated_user = update_response.json()
        assert updated_user["department"] == new_department
        
        print(f"✓ User department updated to: {new_department}")
        
        # Verify employee department synced
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200
        employee = emp_response.json()
        assert employee["department"] == new_department, f"Employee department should be '{new_department}', got: {employee['department']}"
        
        print(f"✓ Employee department synced to: {employee['department']}")
    
    def test_06_sync_role_change(self):
        """Update user role -> verify employee role syncs"""
        if not TestUserEmployeeSync.created_user_ids:
            pytest.skip("No user created in previous test")
        
        user_id = TestUserEmployeeSync.created_user_ids[-1]
        
        # Get user to find employee_id
        user_response = requests.get(f"{BASE_URL}/api/users", headers=self.get_headers())
        users = user_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        employee_uuid = user.get("employee_id")
        
        # Update user role
        new_role = "team_leader"
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            json={"role": new_role},
            headers=self.get_headers()
        )
        
        assert update_response.status_code == 200
        updated_user = update_response.json()
        assert updated_user["role"] == new_role
        
        print(f"✓ User role updated to: {new_role}")
        
        # Verify employee role synced
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200
        employee = emp_response.json()
        assert employee["role"] == new_role, f"Employee role should be '{new_role}', got: {employee['role']}"
        
        print(f"✓ Employee role synced to: {employee['role']}")
    
    def test_07_sync_full_name_change(self):
        """Update user full_name -> verify employee full_name syncs"""
        if not TestUserEmployeeSync.created_user_ids:
            pytest.skip("No user created in previous test")
        
        user_id = TestUserEmployeeSync.created_user_ids[-1]
        
        # Get user to find employee_id
        user_response = requests.get(f"{BASE_URL}/api/users", headers=self.get_headers())
        users = user_response.json()
        user = next((u for u in users if u["id"] == user_id), None)
        employee_uuid = user.get("employee_id")
        
        # Update user full_name
        new_name = "Updated Test User Name"
        update_response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            json={"full_name": new_name},
            headers=self.get_headers()
        )
        
        assert update_response.status_code == 200
        updated_user = update_response.json()
        assert updated_user["full_name"] == new_name
        
        print(f"✓ User full_name updated to: {new_name}")
        
        # Verify employee full_name synced
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200
        employee = emp_response.json()
        assert employee["full_name"] == new_name, f"Employee full_name should be '{new_name}', got: {employee['full_name']}"
        
        print(f"✓ Employee full_name synced to: {employee['full_name']}")
    
    def test_08_create_user_without_employee_record(self):
        """Create user with create_employee_record=false -> verify no employee record"""
        timestamp = int(time.time())
        test_email = f"test.nosync.{timestamp}@clt-academy.com"
        
        user_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "full_name": f"Test NoSync User {timestamp}",
            "role": "cs_agent",
            "department": "Customer Service",
            "is_active": True,
            "create_employee_record": False  # Explicitly disabled
        }
        
        response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"User creation failed: {response.text}"
        user = response.json()
        
        TestUserEmployeeSync.created_user_ids.append(user["id"])
        
        # Verify no employee_id is set
        assert user.get("employee_id") is None, "User should NOT have employee_id when create_employee_record=false"
        
        print(f"✓ User created without employee record: {user['id']}")
        print(f"✓ employee_id is: {user.get('employee_id')}")
    
    def test_09_delete_user_terminates_employee(self):
        """Delete user -> verify linked employee is terminated"""
        # Create a new user specifically for deletion test
        timestamp = int(time.time())
        test_email = f"test.delete.{timestamp}@clt-academy.com"
        
        user_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "full_name": f"Test Delete User {timestamp}",
            "role": "sales_executive",
            "department": "Sales",
            "is_active": True,
            "create_employee_record": True
        }
        
        # Create user
        create_response = requests.post(
            f"{BASE_URL}/api/users",
            json=user_data,
            headers=self.get_headers()
        )
        
        assert create_response.status_code == 200
        user = create_response.json()
        user_id = user["id"]
        employee_uuid = user.get("employee_id")
        
        assert employee_uuid is not None, "User should have employee_id"
        
        print(f"✓ User created for deletion test: {user_id}")
        print(f"✓ Employee UUID: {employee_uuid}")
        
        # Verify employee exists and is active
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        assert emp_response.status_code == 200
        employee = emp_response.json()
        assert employee["employment_status"] == "active"
        employee_display_id = employee["employee_id"]
        
        print(f"✓ Employee verified active: {employee_display_id}")
        
        # Delete user
        delete_response = requests.delete(
            f"{BASE_URL}/api/users/{user_id}",
            headers=self.get_headers()
        )
        
        assert delete_response.status_code == 200, f"User deletion failed: {delete_response.text}"
        
        print(f"✓ User deleted: {user_id}")
        
        # Verify employee is now terminated
        emp_response = requests.get(
            f"{BASE_URL}/api/hr/employees/{employee_uuid}",
            headers=self.get_headers()
        )
        
        assert emp_response.status_code == 200
        employee = emp_response.json()
        
        assert employee["employment_status"] == "terminated", f"Employee should be 'terminated', got: {employee['employment_status']}"
        assert employee.get("termination_date") is not None, "Termination date should be set"
        
        print(f"✓ Employee terminated after user deletion: {employee['employment_status']}")
        print(f"✓ Termination date: {employee['termination_date']}")
    
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self, request):
        """Cleanup test data after all tests"""
        yield
        # Clean up created users (except the one deleted in test_09)
        for user_id in TestUserEmployeeSync.created_user_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/users/{user_id}",
                    headers={"Authorization": f"Bearer {TestUserEmployeeSync.auth_token}"}
                )
            except:
                pass


class TestEmployeeCreateUserAccount:
    """Test creating user account from Employee Master (reverse direction)"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as super_admin"""
        if not TestEmployeeCreateUserAccount.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "aqib@clt-academy.com",
                "password": "@Aqib1234"
            })
            assert response.status_code == 200
            TestEmployeeCreateUserAccount.auth_token = response.json()["access_token"]
        yield
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestEmployeeCreateUserAccount.auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_create_employee_with_user_account(self):
        """Create employee with create_user_account=true using /hr/employees/with-user -> verify user is created"""
        timestamp = int(time.time())
        test_email = f"emp.sync.{timestamp}@clt-academy.com"
        
        # Get next employee ID
        next_id_response = requests.get(
            f"{BASE_URL}/api/hr/employees/next-id",
            headers=self.get_headers()
        )
        assert next_id_response.status_code == 200
        next_emp_id = next_id_response.json().get("next_employee_id", f"CLT-{timestamp}")
        
        # Use the correct endpoint: /hr/employees/with-user
        employee_data = {
            "employee_id": next_emp_id,
            "full_name": f"Test Employee Sync {timestamp}",
            "company_email": test_email,
            "department": "Finance",
            "designation": "Finance Analyst",
            "role": "finance",
            "employment_type": "full_time",
            "work_location": "Dubai",
            "joining_date": datetime.now().strftime("%Y-%m-%d"),
            "employment_status": "active",
            "create_user_account": True,
            "initial_password": "EmployeePassword123!"
        }
        
        # Create employee with user account using the with-user endpoint
        response = requests.post(
            f"{BASE_URL}/api/hr/employees/with-user",
            json=employee_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Employee creation failed: {response.text}"
        result = response.json()
        
        # The response may be different for with-user endpoint
        employee = result.get("employee") if "employee" in result else result
        
        assert employee["full_name"] == employee_data["full_name"]
        assert employee["company_email"] == test_email
        user_id = employee.get("user_id") or result.get("user_id")
        assert user_id is not None, "Employee should have user_id when create_user_account=true"
        
        print(f"✓ Employee created: {employee.get('employee_id', next_emp_id)}")
        print(f"✓ Employee linked to user_id: {user_id}")
        
        # Verify user was created
        users_response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.get_headers()
        )
        assert users_response.status_code == 200
        users = users_response.json()
        
        user = next((u for u in users if u["email"] == test_email), None)
        assert user is not None, f"User with email {test_email} should exist"
        assert user["full_name"] == employee_data["full_name"]
        assert user["role"] == employee_data["role"]
        assert user["department"] == employee_data["department"]
        
        print(f"✓ User created from employee: {user['id']}")
        print(f"✓ User email: {user['email']}")
        print(f"✓ User employee_id: {user.get('employee_id')}")
        
        # Cleanup - delete user (which will terminate employee)
        requests.delete(
            f"{BASE_URL}/api/users/{user['id']}",
            headers=self.get_headers()
        )


class TestFrontendUIElements:
    """Test Frontend UI has Create Employee Record toggle"""
    
    def test_users_page_has_create_employee_toggle(self):
        """Verify UsersPage.jsx has create_employee_record toggle"""
        import os
        
        file_path = "/app/frontend/src/pages/UsersPage.jsx"
        assert os.path.exists(file_path), f"File not found: {file_path}"
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for create_employee_record in form state
        assert "create_employee_record" in content, "UsersPage should have create_employee_record in form state"
        
        # Check for the toggle element
        assert "Create Employee Record" in content, "UsersPage should have 'Create Employee Record' label"
        
        # Check for data-testid
        assert 'data-testid="create-employee-toggle"' in content, "UsersPage should have create-employee-toggle testid"
        
        # Check for designation and joining_date fields
        assert "designation" in content, "UsersPage should have designation field"
        assert "joining_date" in content, "UsersPage should have joining_date field"
        
        print("✓ UsersPage.jsx has create_employee_record toggle")
        print("✓ UsersPage.jsx has designation field")
        print("✓ UsersPage.jsx has joining_date field")
        print("✓ UsersPage.jsx has correct data-testid attributes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
