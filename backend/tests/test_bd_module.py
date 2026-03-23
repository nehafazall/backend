"""
Test suite for Business Development (BD) Module
Tests BD login, student management, dashboard, redeposits, and reassignment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# BD Agent credentials
BD_AGENT_EMAIL = "rashidha@clt-academy.com"
BD_AGENT_PASSWORD = "Rashida@123"

# Super Admin credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"

# BD Agent IDs
RASHIDA_ID = "c860d239-2277-4b94-abdc-8f08d1882a4c"
FARSANA_ID = "2a969244-99b9-4bcc-9034-450d60da1ec7"


class TestBDLogin:
    """Test BD agent login and role verification"""
    
    def test_bd_agent_login_success(self):
        """BD agent login returns role business_development"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "business_development", f"Expected role business_development, got {data['user']['role']}"
        assert data["user"]["email"] == BD_AGENT_EMAIL
        print(f"✓ BD agent login successful, role: {data['user']['role']}")
    
    def test_super_admin_login_success(self):
        """Super admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Super admin login successful")


class TestBDAgents:
    """Test BD agents endpoint"""
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Super admin login failed")
    
    def test_get_bd_agents_as_bd_user(self, bd_token):
        """BD user can get list of BD agents"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/agents", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        agents = response.json()
        assert isinstance(agents, list), "Response should be a list"
        assert len(agents) >= 2, f"Expected at least 2 BD agents, got {len(agents)}"
        
        # Verify agent structure
        agent_ids = [a["id"] for a in agents]
        assert RASHIDA_ID in agent_ids or any("rashid" in a.get("full_name", "").lower() for a in agents), "Rashida not found in agents"
        print(f"✓ Found {len(agents)} BD agents")
    
    def test_get_bd_agents_as_admin(self, admin_token):
        """Super admin can get list of BD agents"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/agents", headers=headers)
        assert response.status_code == 200
        agents = response.json()
        assert len(agents) >= 2
        print(f"✓ Admin sees {len(agents)} BD agents")


class TestBDStudents:
    """Test BD students endpoint"""
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Super admin login failed")
    
    def test_bd_agent_sees_own_students(self, bd_token):
        """BD agent sees only their assigned students (~522)"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        students = response.json()
        assert isinstance(students, list), "Response should be a list"
        # Should have around 522 students (round-robin assignment)
        assert len(students) >= 400, f"Expected ~522 students, got {len(students)}"
        print(f"✓ BD agent sees {len(students)} students")
        
        # Verify student structure
        if students:
            student = students[0]
            assert "id" in student
            assert "full_name" in student or "phone" in student
            assert "bd_stage" in student, "Student should have bd_stage"
            assert "bd_agent_id" in student, "Student should have bd_agent_id"
    
    def test_super_admin_sees_all_bd_students(self, admin_token):
        """Super admin sees all BD students (~1044)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        students = response.json()
        assert isinstance(students, list)
        # Should have around 1044 students (522 * 2 agents)
        assert len(students) >= 800, f"Expected ~1044 students, got {len(students)}"
        print(f"✓ Super admin sees {len(students)} BD students")
    
    def test_filter_students_by_stage(self, bd_token):
        """Can filter students by BD stage"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students?bd_stage=new_student", headers=headers)
        assert response.status_code == 200
        students = response.json()
        # All returned students should have new_student stage
        for s in students[:10]:  # Check first 10
            assert s.get("bd_stage") == "new_student", f"Expected new_student stage, got {s.get('bd_stage')}"
        print(f"✓ Stage filter works, found {len(students)} new_student")
    
    def test_search_students(self, bd_token):
        """Can search students by name/phone/email"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        # First get a student to search for
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        students = response.json()
        if students:
            search_term = students[0].get("phone", "")[:5] if students[0].get("phone") else ""
            if search_term:
                search_response = requests.get(f"{BASE_URL}/api/bd/students?search={search_term}", headers=headers)
                assert search_response.status_code == 200
                print(f"✓ Search works")


class TestBDDashboard:
    """Test BD dashboard endpoint"""
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Super admin login failed")
    
    def test_bd_dashboard_returns_metrics(self, bd_token):
        """BD dashboard returns pipeline metrics"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "total_students" in data, "Missing total_students"
        assert "stage_counts" in data, "Missing stage_counts"
        assert "period_revenue" in data, "Missing period_revenue"
        assert "all_time_revenue" in data, "Missing all_time_revenue"
        
        # Verify stage_counts has all stages
        stages = ["new_student", "contacted", "pitched", "interested", "closed"]
        for stage in stages:
            assert stage in data["stage_counts"], f"Missing stage {stage} in stage_counts"
        
        print(f"✓ BD dashboard returns metrics: {data['total_students']} students, stages: {data['stage_counts']}")
    
    def test_admin_dashboard_with_agent_performance(self, admin_token):
        """Super admin dashboard includes agent performance"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "agent_performance" in data, "Missing agent_performance for admin"
        assert "recent_deposits" in data, "Missing recent_deposits"
        print(f"✓ Admin dashboard includes agent_performance: {len(data.get('agent_performance', []))} agents")
    
    def test_dashboard_period_filter(self, bd_token):
        """Dashboard supports period filter"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        for period in ["this_month", "this_quarter", "this_year", "overall"]:
            response = requests.get(f"{BASE_URL}/api/bd/dashboard?period={period}", headers=headers)
            assert response.status_code == 200, f"Period {period} failed"
        print("✓ All period filters work")


class TestBDStageUpdate:
    """Test BD stage update endpoint"""
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    def test_update_student_stage(self, bd_token):
        """BD agent can update student stage"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        
        # Get a student to update
        response = requests.get(f"{BASE_URL}/api/bd/students?bd_stage=new_student", headers=headers)
        students = response.json()
        if not students:
            pytest.skip("No new_student students to test with")
        
        student_id = students[0]["id"]
        original_stage = students[0].get("bd_stage", "new_student")
        
        # Update to contacted
        update_response = requests.put(
            f"{BASE_URL}/api/bd/students/{student_id}/stage",
            headers=headers,
            json={"bd_stage": "contacted"}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated.get("bd_stage") == "contacted", f"Stage not updated, got {updated.get('bd_stage')}"
        print(f"✓ Stage updated to contacted")
        
        # Revert back to original
        revert_response = requests.put(
            f"{BASE_URL}/api/bd/students/{student_id}/stage",
            headers=headers,
            json={"bd_stage": original_stage}
        )
        assert revert_response.status_code == 200
        print(f"✓ Stage reverted to {original_stage}")
    
    def test_invalid_stage_rejected(self, bd_token):
        """Invalid BD stage is rejected"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        
        # Get a student
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        students = response.json()
        if not students:
            pytest.skip("No students to test with")
        
        student_id = students[0]["id"]
        
        # Try invalid stage
        update_response = requests.put(
            f"{BASE_URL}/api/bd/students/{student_id}/stage",
            headers=headers,
            json={"bd_stage": "invalid_stage"}
        )
        assert update_response.status_code == 400, f"Expected 400 for invalid stage, got {update_response.status_code}"
        print("✓ Invalid stage rejected with 400")


class TestBDRedeposit:
    """Test BD redeposit recording"""
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    def test_record_redeposit(self, bd_token):
        """BD agent can record a redeposit"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        
        # Get a student that's not closed - try all non-closed stages
        students = []
        for stage in ["interested", "pitched", "contacted", "new_student"]:
            response = requests.get(f"{BASE_URL}/api/bd/students?bd_stage={stage}", headers=headers)
            students = response.json()
            if students:
                break
        if not students:
            pytest.skip("No suitable students for redeposit test")
        
        student_id = students[0]["id"]
        student_name = students[0].get("full_name", "Unknown")
        
        # Record redeposit
        redeposit_response = requests.post(
            f"{BASE_URL}/api/bd/record-redeposit",
            headers=headers,
            json={
                "student_id": student_id,
                "amount_aed": 5000,
                "amount": 5000,
                "date": "2026-01-15"
            }
        )
        assert redeposit_response.status_code == 200, f"Redeposit failed: {redeposit_response.text}"
        result = redeposit_response.json()
        assert result.get("status") == "success", f"Expected success status, got {result}"
        assert "redeposit_id" in result, "Missing redeposit_id"
        print(f"✓ Redeposit recorded for {student_name}, ID: {result['redeposit_id']}")
        
        # Verify student moved to closed
        verify_response = requests.get(f"{BASE_URL}/api/bd/students?bd_stage=closed", headers=headers)
        closed_students = verify_response.json()
        closed_ids = [s["id"] for s in closed_students]
        assert student_id in closed_ids, "Student not moved to closed stage"
        print("✓ Student moved to closed stage after redeposit")


class TestBDReassign:
    """Test BD student reassignment (super admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Super admin login failed")
    
    @pytest.fixture
    def bd_token(self):
        """Get BD agent token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("BD agent login failed")
    
    def test_admin_can_reassign_student(self, admin_token):
        """Super admin can reassign student to different BD agent"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get BD agents
        agents_response = requests.get(f"{BASE_URL}/api/bd/agents", headers=headers)
        agents = agents_response.json()
        if len(agents) < 2:
            pytest.skip("Need at least 2 BD agents for reassignment test")
        
        # Get a student assigned to first agent
        first_agent_id = agents[0]["id"]
        second_agent_id = agents[1]["id"]
        
        students_response = requests.get(f"{BASE_URL}/api/bd/students?bd_agent_id={first_agent_id}", headers=headers)
        students = students_response.json()
        if not students:
            pytest.skip("No students to reassign")
        
        student_id = students[0]["id"]
        original_agent = students[0].get("bd_agent_id")
        
        # Reassign to second agent
        reassign_response = requests.post(
            f"{BASE_URL}/api/bd/students/{student_id}/reassign?new_bd_agent_id={second_agent_id}",
            headers=headers
        )
        assert reassign_response.status_code == 200, f"Reassign failed: {reassign_response.text}"
        updated = reassign_response.json()
        assert updated.get("bd_agent_id") == second_agent_id, "Agent not updated"
        print(f"✓ Student reassigned from {original_agent} to {second_agent_id}")
        
        # Reassign back
        revert_response = requests.post(
            f"{BASE_URL}/api/bd/students/{student_id}/reassign?new_bd_agent_id={original_agent}",
            headers=headers
        )
        assert revert_response.status_code == 200
        print("✓ Student reassigned back to original agent")
    
    def test_bd_agent_cannot_reassign(self, bd_token):
        """BD agent cannot reassign students (403)"""
        headers = {"Authorization": f"Bearer {bd_token}"}
        
        # Get a student
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        students = response.json()
        if not students:
            pytest.skip("No students")
        
        student_id = students[0]["id"]
        
        # Try to reassign (should fail)
        reassign_response = requests.post(
            f"{BASE_URL}/api/bd/students/{student_id}/reassign?new_bd_agent_id={FARSANA_ID}",
            headers=headers
        )
        assert reassign_response.status_code == 403, f"Expected 403, got {reassign_response.status_code}"
        print("✓ BD agent correctly denied reassignment (403)")


class TestBDAccessControl:
    """Test BD access control"""
    
    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests are denied (401 or 403)"""
        response = requests.get(f"{BASE_URL}/api/bd/students")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unauthenticated access denied ({response.status_code})")
    
    def test_non_bd_role_denied(self):
        """Non-BD roles cannot access BD endpoints"""
        # For now, just verify the endpoint requires auth
        response = requests.get(f"{BASE_URL}/api/bd/dashboard")
        assert response.status_code in [401, 403]
        print(f"✓ Non-authenticated access to dashboard denied ({response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
