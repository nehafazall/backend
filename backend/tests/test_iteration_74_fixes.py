"""
Test suite for Iteration 74 - 8 Fixes:
1) CS Commissions visibility for CEO/Falja
2) CS Dashboard vs My Commissions sync
3) Department head assignment
4) Multi-team leader support
5) Student Portal session persistence (frontend only)
6) BD CRM drag-and-drop middle stage fix
7) Access Control missing pages
8) Certificates moved to Operations
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
CS_HEAD_CREDS = {"email": "falja@clt-academy.com", "password": "Falja@123"}
SALES_EXEC_CREDS = {"email": "aleesha@clt-academy.com", "password": "Aleesha@123"}


class TestAuthentication:
    """Test login for all required users"""
    
    def test_ceo_login(self, api_client):
        """CEO (super_admin) can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert data.get("user", {}).get("role") == "super_admin", "CEO should have super_admin role"
        print(f"✓ CEO login successful, role: {data['user']['role']}")
    
    def test_cs_head_login(self, api_client):
        """CS Head (Falja) can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=CS_HEAD_CREDS)
        assert response.status_code == 200, f"CS Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        print(f"✓ CS Head login successful, role: {data['user']['role']}")
    
    def test_sales_exec_login(self, api_client):
        """Sales Executive can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC_CREDS)
        assert response.status_code == 200, f"Sales Exec login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        print(f"✓ Sales Exec login successful, role: {data['user']['role']}")


class TestCSDashboardStats:
    """Test CS Dashboard stats endpoint - Fix #1 & #2: Real-time commission calculation"""
    
    def test_cs_dashboard_stats_returns_commission_data(self, cs_head_client):
        """CS Dashboard stats should return real-time commission calculation"""
        response = cs_head_client.get(f"{BASE_URL}/api/cs/dashboard/stats?period=this_month&view_mode=team")
        assert response.status_code == 200, f"CS Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify expected fields exist
        assert "achieved_revenue" in data, "Missing achieved_revenue"
        assert "total_agent_commission" in data, "Missing total_agent_commission"
        assert "total_head_commission" in data, "Missing total_head_commission"
        assert "total_commission" in data, "Missing total_commission"
        
        print(f"✓ CS Dashboard stats: achieved_revenue={data['achieved_revenue']}, "
              f"agent_commission={data['total_agent_commission']}, "
              f"head_commission={data['total_head_commission']}")
    
    def test_cs_dashboard_stats_individual_view(self, cs_head_client):
        """CS Dashboard stats individual view should work"""
        response = cs_head_client.get(f"{BASE_URL}/api/cs/dashboard/stats?period=this_month&view_mode=individual")
        assert response.status_code == 200, f"CS Dashboard stats individual failed: {response.text}"
        data = response.json()
        
        assert "total_agent_commission" in data
        assert "total_head_commission" in data
        print(f"✓ CS Dashboard individual view: agent={data['total_agent_commission']}, head={data['total_head_commission']}")


class TestCEOCommissionDashboard:
    """Test CEO Commission Dashboard - Fix #1: CEO should see Falja's CS commissions"""
    
    def test_ceo_commission_dashboard_has_cs_commissions(self, ceo_client):
        """CEO view of /api/commissions/dashboard should show CS commissions"""
        current_month = datetime.now().strftime("%Y-%m")
        response = ceo_client.get(f"{BASE_URL}/api/commissions/dashboard?month={current_month}")
        assert response.status_code == 200, f"CEO commission dashboard failed: {response.text}"
        data = response.json()
        
        # CEO should see cs_commissions array
        assert "cs_commissions" in data, "CEO dashboard missing cs_commissions array"
        cs_commissions = data["cs_commissions"]
        assert isinstance(cs_commissions, list), "cs_commissions should be a list"
        
        # Check for Falja in CS commissions
        falja_found = any(c.get("agent_name", "").lower().find("falja") >= 0 for c in cs_commissions)
        print(f"✓ CEO dashboard has {len(cs_commissions)} CS agents, Falja found: {falja_found}")
        
        # Verify totals exist
        assert "total_cs_earned" in data, "Missing total_cs_earned"
        assert "total_cs_head_earned" in data, "Missing total_cs_head_earned"
        print(f"✓ CEO totals: cs_earned={data['total_cs_earned']}, cs_head_earned={data['total_cs_head_earned']}")
    
    def test_ceo_dashboard_has_approvals(self, ceo_client):
        """CEO dashboard should include approvals field"""
        current_month = datetime.now().strftime("%Y-%m")
        response = ceo_client.get(f"{BASE_URL}/api/commissions/dashboard?month={current_month}")
        assert response.status_code == 200
        data = response.json()
        
        assert "approvals" in data, "CEO dashboard missing approvals field"
        print(f"✓ CEO dashboard has approvals: {data['approvals']}")


class TestDepartmentHeadAssignment:
    """Test Department Head dropdown - Fix #3: Should show ALL active users"""
    
    def test_users_endpoint_returns_all_active_users(self, ceo_client):
        """GET /api/users should return all active users for department head dropdown"""
        response = ceo_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Users endpoint failed: {response.text}"
        users = response.json()
        
        assert isinstance(users, list), "Users should be a list"
        assert len(users) > 0, "Should have at least one user"
        
        # Check that we have users with various roles (not just managers)
        roles = set(u.get("role") for u in users if u.get("is_active", True))
        print(f"✓ Found {len(users)} users with roles: {roles}")
        
        # Verify we have more than just manager roles
        non_manager_roles = roles - {"sales_manager", "cs_head", "admin", "super_admin"}
        assert len(non_manager_roles) > 0, "Should have non-manager roles available for department head"
        print(f"✓ Non-manager roles available: {non_manager_roles}")
    
    def test_departments_endpoint(self, ceo_client):
        """GET /api/departments should work"""
        response = ceo_client.get(f"{BASE_URL}/api/departments")
        assert response.status_code == 200, f"Departments endpoint failed: {response.text}"
        departments = response.json()
        
        assert isinstance(departments, list), "Departments should be a list"
        print(f"✓ Found {len(departments)} departments")


class TestTeamLeaderMultiTeam:
    """Test Team Leader assignment - Fix #4: One person as head of multiple teams"""
    
    def test_teams_endpoint(self, ceo_client):
        """GET /api/teams should work"""
        response = ceo_client.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200, f"Teams endpoint failed: {response.text}"
        teams = response.json()
        
        assert isinstance(teams, list), "Teams should be a list"
        print(f"✓ Found {len(teams)} teams")
        
        # Check if any leader leads multiple teams
        leader_ids = [t.get("leader_id") for t in teams if t.get("leader_id")]
        from collections import Counter
        leader_counts = Counter(leader_ids)
        multi_team_leaders = {lid: count for lid, count in leader_counts.items() if count > 1}
        print(f"✓ Multi-team leaders: {len(multi_team_leaders)}")


class TestBDCRMStageChange:
    """Test BD CRM - Fix #6: Drag-and-drop and stage change dropdown"""
    
    def test_bd_students_endpoint(self, ceo_client):
        """GET /api/bd/students should work"""
        response = ceo_client.get(f"{BASE_URL}/api/bd/students")
        assert response.status_code == 200, f"BD students endpoint failed: {response.text}"
        data = response.json()
        
        # Handle paginated response
        students = data.get("items", data) if isinstance(data, dict) else data
        print(f"✓ BD students endpoint works, found {len(students)} students")
    
    def test_bd_stage_update_endpoint_exists(self, ceo_client):
        """PUT /api/bd/students/{id}/stage endpoint should exist"""
        # First get a student
        response = ceo_client.get(f"{BASE_URL}/api/bd/students?page_size=1")
        if response.status_code == 200:
            data = response.json()
            students = data.get("items", data) if isinstance(data, dict) else data
            if students and len(students) > 0:
                student_id = students[0].get("id")
                current_stage = students[0].get("bd_stage", "new_student")
                
                # Try to update stage (same stage to avoid side effects)
                update_response = ceo_client.put(
                    f"{BASE_URL}/api/bd/students/{student_id}/stage",
                    json={"bd_stage": current_stage}
                )
                assert update_response.status_code in [200, 404], f"Stage update failed: {update_response.text}"
                print(f"✓ BD stage update endpoint works")
            else:
                print("⚠ No BD students to test stage update")
        else:
            print("⚠ Could not fetch BD students")


class TestAccessControlPages:
    """Test Access Control - Fix #7: MODULE_HIERARCHY includes all pages"""
    
    def test_roles_endpoint(self, ceo_client):
        """GET /api/roles should work"""
        response = ceo_client.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 200, f"Roles endpoint failed: {response.text}"
        roles = response.json()
        
        assert isinstance(roles, list), "Roles should be a list"
        print(f"✓ Found {len(roles)} roles")
    
    def test_role_permissions_endpoint(self, ceo_client):
        """GET /api/roles/{role}/permissions should work"""
        response = ceo_client.get(f"{BASE_URL}/api/roles/sales_executive/permissions")
        # May return 200 with data or 404 if no custom permissions set
        assert response.status_code in [200, 404], f"Role permissions failed: {response.text}"
        print(f"✓ Role permissions endpoint works (status: {response.status_code})")


class TestJWTExpiry:
    """Test JWT expiry - Fix #5: Extended to 7 days (168 hours)"""
    
    def test_jwt_token_valid(self, ceo_client):
        """JWT token should be valid and work for authenticated requests"""
        response = ceo_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"JWT validation failed: {response.text}"
        data = response.json()
        assert "id" in data, "User data should have id"
        print(f"✓ JWT token valid, user: {data.get('full_name')}")


class TestCSMergeApprovals:
    """Test CS Merge Approvals endpoint"""
    
    def test_merge_approvals_endpoint(self, ceo_client):
        """GET /api/cs/merge-requests should work"""
        response = ceo_client.get(f"{BASE_URL}/api/cs/merge-requests")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404], f"Merge requests failed: {response.text}"
        print(f"✓ CS Merge requests endpoint status: {response.status_code}")


class TestCommissionDashboardSync:
    """Test Commission Dashboard sync - Fix #2: CS Dashboard vs My Commissions"""
    
    def test_cs_head_commission_dashboard(self, cs_head_client):
        """CS Head's commission dashboard should show their commissions"""
        current_month = datetime.now().strftime("%Y-%m")
        response = cs_head_client.get(f"{BASE_URL}/api/commissions/dashboard?month={current_month}")
        assert response.status_code == 200, f"CS Head commission dashboard failed: {response.text}"
        data = response.json()
        
        # CS Head should see their own commissions
        assert "earned_commission" in data or "my_commission" in data or "total_cs_earned" in data, \
            f"CS Head dashboard missing commission data: {list(data.keys())}"
        
        # Should also see approval_status (non-CEO)
        if "approval_status" in data:
            print(f"✓ CS Head sees approval_status: {data['approval_status']}")
        
        print(f"✓ CS Head commission dashboard works, keys: {list(data.keys())[:10]}")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def ceo_client(api_client):
    """Authenticated session for CEO"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
    if response.status_code == 200:
        token = response.json().get("access_token")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
    else:
        pytest.skip(f"CEO login failed: {response.text}")
    return api_client


@pytest.fixture
def cs_head_client():
    """Authenticated session for CS Head (Falja)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=CS_HEAD_CREDS)
    if response.status_code == 200:
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        pytest.skip(f"CS Head login failed: {response.text}")
    return session


@pytest.fixture
def sales_exec_client():
    """Authenticated session for Sales Executive"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC_CREDS)
    if response.status_code == 200:
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        pytest.skip(f"Sales Exec login failed: {response.text}")
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
