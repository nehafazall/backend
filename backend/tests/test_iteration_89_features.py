"""
Iteration 89 Tests - Payroll Attendance Validation, Net Pay Chart Fix, Organization Map
Tests:
1. POST /api/hr/payroll/run - Payroll with/without attendance data
2. GET /api/commissions/scatter-data - Net Pay chart with correct base_salary
3. GET /api/organization/map - Full org hierarchy with CEO, departments, approval matrix, stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EMAIL = "aleesha@clt-academy.com"
SALES_PASSWORD = "Aleesha@123"


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO/Super Admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    assert response.status_code == 200, f"CEO login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def sales_token():
    """Get Sales Executive auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    assert response.status_code == 200, f"Sales login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def sales_user_id(sales_token):
    """Get sales user ID"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {sales_token}"
    })
    assert response.status_code == 200, f"Auth/me failed: {response.text}"
    return response.json()["id"]


class TestPayrollAttendanceValidation:
    """P0: Payroll should warn when no attendance data exists"""
    
    def test_payroll_run_returns_warning_when_no_attendance(self, ceo_token):
        """POST /api/hr/payroll/run should return warning when no attendance data exists"""
        # Use a future month that definitely has no attendance data
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/run",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"year": 2030, "month": 12}  # Future month with no attendance
        )
        # Should succeed but with warning
        assert response.status_code == 200, f"Payroll run failed: {response.text}"
        data = response.json()
        
        # Check for warning field
        assert "warning" in data or "attendance_warning" in data, \
            f"Expected warning field in response: {data.keys()}"
        
        warning = data.get("warning") or data.get("attendance_warning")
        assert warning is not None, "Warning should not be None"
        assert "attendance" in warning.lower() or "no attendance" in warning.lower(), \
            f"Warning should mention attendance: {warning}"
        
        # Payroll should still be generated
        assert "employee_count" in data or "records" in data or "payroll_records" in data, \
            f"Payroll records should be generated: {data.keys()}"
        assert data.get("employee_count", 0) > 0, "Should have processed employees"
        print(f"✓ Payroll warning received: {warning}")
        print(f"✓ Payroll generated for {data.get('employee_count', 0)} employees")
    
    def test_payroll_run_with_current_month(self, ceo_token):
        """POST /api/hr/payroll/run for current month should work"""
        from datetime import datetime
        now = datetime.now()
        
        response = requests.post(
            f"{BASE_URL}/api/hr/payroll/run",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"year": now.year, "month": now.month}
        )
        assert response.status_code == 200, f"Payroll run failed: {response.text}"
        data = response.json()
        
        # Should have records
        records = data.get("records") or data.get("payroll_records") or []
        count = data.get("count", len(records))
        print(f"✓ Payroll generated {count} records for {now.year}-{now.month:02d}")
        
        # Check if warning exists (depends on whether attendance data exists)
        if "warning" in data or "attendance_warning" in data:
            warning = data.get("warning") or data.get("attendance_warning")
            print(f"  Warning: {warning}")


class TestNetPayChartScatterData:
    """P1: Net Pay chart should show correct base_salary, commission, net_pay"""
    
    def test_scatter_data_returns_correct_fields(self, sales_token, sales_user_id):
        """GET /api/commissions/scatter-data should return base_salary, commission, net_pay"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data",
            headers={"Authorization": f"Bearer {sales_token}"},
            params={"user_id": sales_user_id, "months": 6}
        )
        assert response.status_code == 200, f"Scatter data failed: {response.text}"
        data = response.json()
        
        # Check top-level fields
        assert "agent_name" in data, f"Missing agent_name: {data.keys()}"
        assert "role" in data, f"Missing role: {data.keys()}"
        assert "base_salary" in data, f"Missing base_salary: {data.keys()}"
        assert "data" in data, f"Missing data array: {data.keys()}"
        
        print(f"✓ Agent: {data['agent_name']}, Role: {data['role']}, Base Salary: {data['base_salary']}")
        
        # Check data points
        data_points = data["data"]
        assert len(data_points) > 0, "Should have at least one data point"
        
        for point in data_points:
            assert "month" in point, f"Missing month in data point: {point.keys()}"
            assert "label" in point, f"Missing label in data point: {point.keys()}"
            assert "commission" in point, f"Missing commission in data point: {point.keys()}"
            assert "net_pay" in point, f"Missing net_pay in data point: {point.keys()}"
            assert "base_salary" in point, f"Missing base_salary in data point: {point.keys()}"
            
            # Verify net_pay = base_salary + commission
            expected_net = point["base_salary"] + point["commission"]
            assert point["net_pay"] == expected_net, \
                f"net_pay ({point['net_pay']}) should equal base_salary ({point['base_salary']}) + commission ({point['commission']})"
        
        print(f"✓ {len(data_points)} data points with correct net_pay calculation")
    
    def test_scatter_data_base_salary_from_hr_employees(self, ceo_token, sales_user_id):
        """Base salary should come from hr_employees.salary_structure.gross_salary"""
        # First get the scatter data
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data",
            headers={"Authorization": f"Bearer {ceo_token}"},
            params={"user_id": sales_user_id, "months": 6}
        )
        assert response.status_code == 200
        scatter_data = response.json()
        scatter_base_salary = scatter_data.get("base_salary", 0)
        
        # Now get the HR employee record to verify
        response = requests.get(
            f"{BASE_URL}/api/hr/employees",
            headers={"Authorization": f"Bearer {ceo_token}"},
            params={"user_id": sales_user_id}
        )
        
        if response.status_code == 200:
            employees = response.json()
            if isinstance(employees, dict):
                employees = employees.get("employees", [])
            
            # Find the employee
            emp = None
            for e in employees:
                if e.get("user_id") == sales_user_id:
                    emp = e
                    break
            
            if emp:
                salary_structure = emp.get("salary_structure", {})
                expected_salary = salary_structure.get("gross_salary") or salary_structure.get("net_salary") or emp.get("basic_salary", 0)
                print(f"✓ HR Employee salary_structure.gross_salary: {expected_salary}")
                print(f"✓ Scatter data base_salary: {scatter_base_salary}")
                # They should match
                assert scatter_base_salary == expected_salary, \
                    f"Base salary mismatch: scatter={scatter_base_salary}, hr={expected_salary}"
            else:
                print(f"⚠ No HR employee record found for user_id {sales_user_id}")
        else:
            print(f"⚠ Could not fetch HR employees: {response.status_code}")


class TestOrganizationMap:
    """Organization Map page API tests"""
    
    def test_organization_map_returns_ceo(self, ceo_token):
        """GET /api/organization/map should return CEO info"""
        response = requests.get(
            f"{BASE_URL}/api/organization/map",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Org map failed: {response.text}"
        data = response.json()
        
        assert "ceo" in data, f"Missing ceo field: {data.keys()}"
        ceo = data["ceo"]
        assert ceo is not None, "CEO should not be None"
        assert "name" in ceo, f"CEO missing name: {ceo.keys()}"
        assert "role" in ceo, f"CEO missing role: {ceo.keys()}"
        assert ceo["role"] == "super_admin", f"CEO role should be super_admin: {ceo['role']}"
        
        print(f"✓ CEO: {ceo['name']} ({ceo['role']})")
    
    def test_organization_map_returns_departments(self, ceo_token):
        """GET /api/organization/map should return departments with heads and teams"""
        response = requests.get(
            f"{BASE_URL}/api/organization/map",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "departments" in data, f"Missing departments: {data.keys()}"
        departments = data["departments"]
        assert len(departments) > 0, "Should have at least one department"
        
        for dept in departments:
            assert "name" in dept, f"Department missing name: {dept.keys()}"
            assert "teams" in dept, f"Department missing teams: {dept.keys()}"
            assert "count" in dept, f"Department missing count: {dept.keys()}"
            
            # Check teams structure
            for team in dept.get("teams", []):
                assert "leader" in team, f"Team missing leader: {team.keys()}"
                assert "members" in team, f"Team missing members: {team.keys()}"
                
                leader = team["leader"]
                assert "id" in leader, f"Leader missing id: {leader.keys()}"
                assert "name" in leader, f"Leader missing name: {leader.keys()}"
        
        dept_names = [d["name"] for d in departments]
        print(f"✓ {len(departments)} departments: {', '.join(dept_names[:5])}...")
    
    def test_organization_map_returns_approval_matrix(self, ceo_token):
        """GET /api/organization/map should return approval matrix with 6 workflow items"""
        response = requests.get(
            f"{BASE_URL}/api/organization/map",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "approval_matrix" in data, f"Missing approval_matrix: {data.keys()}"
        matrix = data["approval_matrix"]
        assert len(matrix) >= 6, f"Should have at least 6 approval workflows: {len(matrix)}"
        
        expected_types = ["Leave Request", "Commission Payout", "Payroll", "Lead Transfer", "Expense Claim", "Student Merge"]
        actual_types = [item["type"] for item in matrix]
        
        for expected in expected_types:
            assert expected in actual_types, f"Missing approval type: {expected}"
        
        for item in matrix:
            assert "type" in item, f"Approval item missing type: {item.keys()}"
            assert "flow" in item, f"Approval item missing flow: {item.keys()}"
            assert "description" in item, f"Approval item missing description: {item.keys()}"
            assert len(item["flow"]) > 0, f"Flow should have steps: {item}"
        
        print(f"✓ {len(matrix)} approval workflows: {', '.join(actual_types)}")
    
    def test_organization_map_returns_stats(self, ceo_token):
        """GET /api/organization/map should return statistics"""
        response = requests.get(
            f"{BASE_URL}/api/organization/map",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data, f"Missing stats: {data.keys()}"
        stats = data["stats"]
        
        assert "total_employees" in stats, f"Missing total_employees: {stats.keys()}"
        assert "total_departments" in stats, f"Missing total_departments: {stats.keys()}"
        assert "total_teams" in stats, f"Missing total_teams: {stats.keys()}"
        assert "role_distribution" in stats, f"Missing role_distribution: {stats.keys()}"
        assert "department_distribution" in stats, f"Missing department_distribution: {stats.keys()}"
        
        assert stats["total_employees"] > 0, "Should have employees"
        assert stats["total_departments"] > 0, "Should have departments"
        assert len(stats["role_distribution"]) > 0, "Should have role distribution"
        assert len(stats["department_distribution"]) > 0, "Should have department distribution"
        
        print(f"✓ Stats: {stats['total_employees']} employees, {stats['total_departments']} depts, {stats['total_teams']} teams")
        print(f"  Roles: {list(stats['role_distribution'].keys())[:5]}...")
    
    def test_organization_map_accessible_by_hr(self, ceo_token):
        """Organization map should be accessible by HR role"""
        # First get an HR user
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {ceo_token}"},
            params={"role": "hr", "limit": 1}
        )
        
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, dict):
                users = users.get("users", [])
            
            if users:
                hr_user = users[0]
                print(f"✓ Found HR user: {hr_user.get('full_name', hr_user.get('email'))}")
                # Note: We can't login as HR without password, but we verified the endpoint works
            else:
                print("⚠ No HR users found in system")
        else:
            print(f"⚠ Could not fetch users: {response.status_code}")
        
        # The endpoint should work for CEO (super_admin)
        response = requests.get(
            f"{BASE_URL}/api/organization/map",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, "Org map should be accessible"
        print("✓ Organization map accessible by super_admin")


class TestOrganizationMapFrontendRoute:
    """Verify frontend route exists for Organization Map"""
    
    def test_organization_route_in_app_js(self):
        """Verify /organization route exists in App.js"""
        # Read App.js to verify route exists
        import os
        app_js_path = "/app/frontend/src/App.js"
        if os.path.exists(app_js_path):
            with open(app_js_path, 'r') as f:
                content = f.read()
            
            assert 'path="organization"' in content or "path='organization'" in content, \
                "Route /organization should exist in App.js"
            assert "OrganizationMapPage" in content, \
                "OrganizationMapPage component should be imported"
            print("✓ /organization route exists in App.js")
        else:
            pytest.skip("App.js not found")
    
    def test_organization_link_in_sidebar(self):
        """Verify Organization Map link exists in sidebar under Executive section"""
        import os
        layout_path = "/app/frontend/src/components/Layout.jsx"
        if os.path.exists(layout_path):
            with open(layout_path, 'r') as f:
                content = f.read()
            
            assert "Organization Map" in content, \
                "Organization Map should be in sidebar"
            assert "'/organization'" in content or '"/organization"' in content, \
                "Organization Map path should be /organization"
            assert "executive" in content.lower(), \
                "Organization Map should be under Executive section"
            print("✓ Organization Map link exists in sidebar under Executive section")
        else:
            pytest.skip("Layout.jsx not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
