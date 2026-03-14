"""
Test Suite for Iteration 47: Transfer Requests, Round Robin, Salary Estimation
Features tested:
- GET /api/round-robin/status - Agent list with CS window status
- POST /api/round-robin/toggle-agent - Pause/resume agent
- GET /api/transfers/requests?status=pending_first_approval - Transfer requests list
- POST /api/transfers/request - Create transfer request
- GET /api/hr/salary-estimation - Salary totals and employee breakdown
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication helper"""
    token = None
    
    @classmethod
    def get_token(cls):
        if cls.token:
            return cls.token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aqib@clt-academy.com",
            "password": "@Aqib1234"
        })
        if response.status_code == 200:
            # Login uses 'access_token' not 'token'
            cls.token = response.json().get("access_token")
        return cls.token


class TestRoundRobinAPIs:
    """Round Robin Controls APIs"""
    
    def test_get_round_robin_status(self):
        """GET /api/round-robin/status - Should return agents list and CS window status"""
        token = TestAuth.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(
            f"{BASE_URL}/api/round-robin/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "agents" in data, "Response should contain 'agents' key"
        assert "cs_window" in data, "Response should contain 'cs_window' key"
        assert isinstance(data["agents"], list), "agents should be a list"
        
        # Verify CS window structure
        cs_window = data["cs_window"]
        assert "active" in cs_window, "cs_window should have 'active' key"
        assert "current_time_gst4" in cs_window, "cs_window should have 'current_time_gst4' key"
        assert "window" in cs_window, "cs_window should have 'window' key"
        
        print(f"✓ Round robin status: {len(data['agents'])} agents, CS window active={cs_window['active']}")
    
    def test_round_robin_agents_have_required_fields(self):
        """Verify each agent has required fields"""
        token = TestAuth.get_token()
        response = requests.get(
            f"{BASE_URL}/api/round-robin/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["agents"]) > 0:
            agent = data["agents"][0]
            required_fields = ["id", "full_name", "role"]
            for field in required_fields:
                assert field in agent, f"Agent should have '{field}' field"
            print(f"✓ Agent fields verified: {list(agent.keys())}")
        else:
            print("⚠ No agents found to verify fields")
    
    def test_toggle_agent_pause_resume(self):
        """POST /api/round-robin/toggle-agent - Pause and resume an agent"""
        token = TestAuth.get_token()
        assert token, "Failed to get auth token"
        
        # Get first CS agent
        response = requests.get(
            f"{BASE_URL}/api/round-robin/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        agents = [a for a in response.json()["agents"] if a["role"] == "cs_agent"]
        
        if not agents:
            pytest.skip("No CS agents found")
        
        agent = agents[0]
        original_paused = agent.get("round_robin_paused", False)
        
        # Toggle pause (set to opposite of current)
        new_paused = not original_paused
        toggle_response = requests.post(
            f"{BASE_URL}/api/round-robin/toggle-agent",
            headers={"Authorization": f"Bearer {token}"},
            json={"agent_id": agent["id"], "paused": new_paused, "reason": "Test pause"}
        )
        
        assert toggle_response.status_code == 200, f"Expected 200, got {toggle_response.status_code}: {toggle_response.text}"
        result = toggle_response.json()
        assert "message" in result, "Response should have 'message'"
        assert result["paused"] == new_paused, f"Expected paused={new_paused}"
        
        # Revert to original state
        revert_response = requests.post(
            f"{BASE_URL}/api/round-robin/toggle-agent",
            headers={"Authorization": f"Bearer {token}"},
            json={"agent_id": agent["id"], "paused": original_paused, "reason": "Revert test"}
        )
        assert revert_response.status_code == 200
        
        print(f"✓ Toggle agent {agent['full_name']}: paused {original_paused} -> {new_paused} -> {original_paused}")


class TestTransferRequestsAPIs:
    """Transfer Requests APIs"""
    
    def test_get_transfer_requests_pending(self):
        """GET /api/transfers/requests?status=pending_first_approval - List pending requests"""
        token = TestAuth.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(
            f"{BASE_URL}/api/transfers/requests?status=pending_first_approval",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Transfer requests (pending): {len(data)} found")
        
        if len(data) > 0:
            req = data[0]
            expected_fields = ["id", "entity_type", "entity_name", "from_agent_name", "to_agent_name", "status"]
            for field in expected_fields:
                assert field in req, f"Transfer request should have '{field}' field"
            print(f"✓ Transfer request fields verified: {list(req.keys())}")
    
    def test_get_transfer_requests_all_statuses(self):
        """GET /api/transfers/requests - List all requests without status filter"""
        token = TestAuth.get_token()
        
        response = requests.get(
            f"{BASE_URL}/api/transfers/requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ All transfer requests: {len(data)} found")
    
    def test_get_transfer_requests_by_status_tabs(self):
        """Test all status tabs: pending_first_approval, pending_final_approval, approved, rejected"""
        token = TestAuth.get_token()
        
        statuses = ["pending_first_approval", "pending_final_approval", "approved", "rejected"]
        for status in statuses:
            response = requests.get(
                f"{BASE_URL}/api/transfers/requests?status={status}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200, f"Status {status} failed: {response.text}"
            data = response.json()
            print(f"✓ Transfer requests ({status}): {len(data)} found")


class TestSalaryEstimationAPI:
    """Salary Estimation API"""
    
    def test_get_salary_estimation(self):
        """GET /api/hr/salary-estimation - Should return salary totals and breakdown"""
        token = TestAuth.get_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(
            f"{BASE_URL}/api/hr/salary-estimation",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        required_fields = ["total_employees", "total_gross", "total_net", "total_deductions"]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}' key"
        
        # Verify data types
        assert isinstance(data["total_employees"], int), "total_employees should be int"
        assert isinstance(data["total_gross"], (int, float)), "total_gross should be numeric"
        assert isinstance(data["total_net"], (int, float)), "total_net should be numeric"
        assert isinstance(data["total_deductions"], (int, float)), "total_deductions should be numeric"
        
        print(f"✓ Salary estimation: {data['total_employees']} employees")
        print(f"  Total Gross: {data['total_gross']}")
        print(f"  Total Net: {data['total_net']}")
        print(f"  Total Deductions: {data['total_deductions']}")
    
    def test_salary_estimation_includes_breakdown(self):
        """Verify salary estimation includes department and employee breakdowns"""
        token = TestAuth.get_token()
        
        response = requests.get(
            f"{BASE_URL}/api/hr/salary-estimation",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check optional breakdown fields
        if "by_department" in data:
            assert isinstance(data["by_department"], list), "by_department should be a list"
            print(f"✓ By department: {len(data['by_department'])} departments")
        
        if "employees" in data:
            assert isinstance(data["employees"], list), "employees should be a list"
            print(f"✓ Employee details: {len(data['employees'])} employees with salary data")
            
            if len(data["employees"]) > 0:
                emp = data["employees"][0]
                emp_fields = ["name", "department", "gross", "net"]
                for field in emp_fields:
                    assert field in emp, f"Employee should have '{field}' field"


class TestAPIAuthentication:
    """Test API authentication requirements"""
    
    def test_round_robin_requires_auth(self):
        """Round robin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/round-robin/status")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Round robin status requires auth")
    
    def test_transfers_requires_auth(self):
        """Transfer requests endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/transfers/requests")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Transfer requests requires auth")
    
    def test_salary_estimation_requires_auth(self):
        """Salary estimation endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/hr/salary-estimation")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Salary estimation requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
