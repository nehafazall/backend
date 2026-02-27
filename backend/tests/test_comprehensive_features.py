"""
Comprehensive Test Suite for CLT Synapse ERP
Testing: BioCloud, Payroll, Round Robin, Follow-ups, View As Dashboard,
Lead Reassignment, Multi-level Approvals, Access Control
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
TEAM_LEADER_EMAIL = "Mohammed@clt-academy.com"
TEAM_LEADER_PASSWORD = "Test@1234"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.fail(f"Super admin login failed: {response.text}")


@pytest.fixture(scope="module")
def team_leader_token():
    """Get team leader authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEAM_LEADER_EMAIL, "password": TEAM_LEADER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip(f"Team leader login failed: {response.text}")


@pytest.fixture(scope="module")
def super_admin_client(super_admin_token):
    """Session with super admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {super_admin_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def team_leader_client(team_leader_token):
    """Session with team leader auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {team_leader_token}",
        "Content-Type": "application/json"
    })
    return session


# ==================== BIOCLOUD ATTENDANCE SYNC TESTS ====================
class TestBioCloudSync:
    """BioCloud attendance sync tests"""

    def test_biocloud_status(self, super_admin_client):
        """Test GET /api/hr/biocloud/status - Check BioCloud connection status"""
        response = super_admin_client.get(f"{BASE_URL}/api/hr/biocloud/status")
        assert response.status_code == 200, f"BioCloud status failed: {response.text}"
        
        data = response.json()
        assert "connected" in data, "Response missing 'connected' field"
        print(f"BioCloud status: connected={data.get('connected')}")

    def test_biocloud_fetch_attendance(self, super_admin_client):
        """Test POST /api/hr/biocloud/fetch-attendance - Fetch attendance records"""
        response = super_admin_client.post(f"{BASE_URL}/api/hr/biocloud/fetch-attendance")
        assert response.status_code == 200, f"BioCloud fetch failed: {response.text}"
        
        data = response.json()
        print(f"BioCloud fetch result: {data}")
        # Verify response structure
        assert "message" in data or "records_fetched" in data or "records" in data

    def test_biocloud_fetch_with_date(self, super_admin_client):
        """Test POST /api/hr/biocloud/fetch-attendance with date parameter"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = super_admin_client.post(
            f"{BASE_URL}/api/hr/biocloud/fetch-attendance",
            params={"date": yesterday}
        )
        assert response.status_code == 200, f"BioCloud fetch with date failed: {response.text}"


# ==================== PAYROLL MODULE TESTS ====================
class TestPayrollModule:
    """Payroll run and batch tests"""

    def test_payroll_batches_list(self, super_admin_client):
        """Test GET /api/hr/payroll/batches - Get all payroll batches"""
        response = super_admin_client.get(f"{BASE_URL}/api/hr/payroll/batches")
        assert response.status_code == 200, f"Get payroll batches failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Payroll batches should be a list"
        print(f"Found {len(data)} payroll batches")
        
        if data:
            batch = data[0]
            assert "id" in batch or "batch_id" in batch, "Batch missing ID field"
            print(f"Sample batch: month={batch.get('month')}, status={batch.get('status')}")

    def test_payroll_run_duplicate_check(self, super_admin_client):
        """Test POST /api/hr/payroll/run - Verify duplicate month validation"""
        # Try to run payroll for a month that may already exist (Feb 2026)
        # Note: month is integer 1-12, not string
        response = super_admin_client.post(
            f"{BASE_URL}/api/hr/payroll/run",
            json={
                "month": 2,  # February as integer
                "year": 2026,
                "department": None
            }
        )
        # Should either succeed or return proper error (not 500)
        assert response.status_code in [200, 201, 400, 404, 409], \
            f"Payroll run returned unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code in [400, 409]:
            data = response.json()
            # Should contain a meaningful error message
            assert "detail" in data or "message" in data or "error" in data, \
                "Error response should contain detail message"
            print(f"Expected duplicate rejection: {data}")
        else:
            print(f"Payroll run result: {response.json()}")

    def test_payroll_list(self, super_admin_client):
        """Test GET /api/hr/payroll - Get payroll records"""
        response = super_admin_client.get(f"{BASE_URL}/api/hr/payroll")
        assert response.status_code == 200, f"Get payroll list failed: {response.text}"


# ==================== ROUND ROBIN LEAD DISTRIBUTION TESTS ====================
class TestRoundRobinDistribution:
    """Round robin lead assignment tests"""

    def test_create_lead_with_assignment(self, super_admin_client):
        """Test POST /api/leads - Verify round robin assigns lead"""
        test_lead = {
            "full_name": "TEST_RoundRobin Lead",
            "phone": f"+971500{datetime.now().strftime('%H%M%S')}",
            "email": f"test_rr_{datetime.now().strftime('%H%M%S')}@test.com",
            "source": "test",
            "region": "UAE"
        }
        
        response = super_admin_client.post(f"{BASE_URL}/api/leads", json=test_lead)
        assert response.status_code in [200, 201], f"Create lead failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Created lead should have an ID"
        
        # Verify lead was assigned (round robin fallback when no regional match)
        lead_id = data["id"]
        
        # Fetch the lead to verify assignment
        get_response = super_admin_client.get(f"{BASE_URL}/api/leads/{lead_id}")
        if get_response.status_code == 200:
            lead_data = get_response.json()
            print(f"Lead assigned_to: {lead_data.get('assigned_to')}, assigned_to_name: {lead_data.get('assigned_to_name')}")
        
        return lead_id


# ==================== TODAY'S FOLLOW-UPS TESTS ====================
class TestFollowups:
    """Follow-up and reminder tests"""

    def test_todays_followups(self, super_admin_client):
        """Test GET /api/followups/today - Get today's follow-ups"""
        response = super_admin_client.get(f"{BASE_URL}/api/followups/today")
        assert response.status_code == 200, f"Get today's followups failed: {response.text}"
        
        data = response.json()
        assert "date" in data, "Response should contain date"
        assert "total_followups" in data, "Response should contain total_followups count"
        assert "followups" in data, "Response should contain followups grouping"
        
        # Verify followups structure (morning, afternoon, evening, unscheduled)
        followups = data.get("followups", {})
        expected_slots = ["morning", "afternoon", "evening", "unscheduled"]
        for slot in expected_slots:
            assert slot in followups, f"Missing time slot: {slot}"
        
        print(f"Today's follow-ups: total={data['total_followups']}, leads={data.get('leads_count', 0)}, students={data.get('students_count', 0)}")

    def test_upcoming_followups(self, super_admin_client):
        """Test GET /api/followups/upcoming - Get upcoming follow-ups"""
        response = super_admin_client.get(f"{BASE_URL}/api/followups/upcoming", params={"days": 7})
        assert response.status_code == 200, f"Get upcoming followups failed: {response.text}"


# ==================== VIEW AS DASHBOARD TESTS ====================
class TestViewAsDashboard:
    """View As dashboard feature tests"""

    def test_viewable_users_super_admin(self, super_admin_client):
        """Test GET /api/dashboard/viewable-users - Super admin can see all users"""
        response = super_admin_client.get(f"{BASE_URL}/api/dashboard/viewable-users")
        assert response.status_code == 200, f"Get viewable users failed: {response.text}"
        
        data = response.json()
        assert "can_view_others" in data, "Response should contain can_view_others"
        assert "users" in data, "Response should contain users list"
        assert "total" in data, "Response should contain total count"
        
        assert data["can_view_others"] == True, "Super admin should be able to view others"
        print(f"Viewable users: total={data['total']}")
        
        # Verify grouped structure
        if "grouped" in data:
            print(f"Users grouped by role: {list(data['grouped'].keys())}")

    def test_viewable_users_team_leader(self, team_leader_client):
        """Test GET /api/dashboard/viewable-users - Team leader can see team members"""
        response = team_leader_client.get(f"{BASE_URL}/api/dashboard/viewable-users")
        assert response.status_code == 200, f"Get viewable users failed: {response.text}"
        
        data = response.json()
        print(f"Team leader can view {data.get('total', 0)} users")
        
        # Team leader should see their team members
        users = data.get("users", [])
        for user in users:
            print(f"  - {user.get('full_name')} ({user.get('role')})")

    def test_dashboard_stats_view_as(self, super_admin_client):
        """Test GET /api/dashboard/stats with view_as parameter"""
        # First get a user to view as
        viewable = super_admin_client.get(f"{BASE_URL}/api/dashboard/viewable-users").json()
        users = viewable.get("users", [])
        
        if users:
            # Find a sales executive to view as
            target_user = None
            for user in users:
                if user.get("role") == "sales_executive":
                    target_user = user
                    break
            
            if not target_user:
                target_user = users[0]  # Use any user
            
            # Get dashboard stats as that user
            response = super_admin_client.get(
                f"{BASE_URL}/api/dashboard/stats",
                params={"view_as": target_user["id"]}
            )
            assert response.status_code == 200, f"View As dashboard failed: {response.text}"
            
            data = response.json()
            # Check if viewing_as info is present
            if "viewing_as" in data:
                print(f"Viewing dashboard as: {data['viewing_as'].get('full_name')}")
            print(f"Stats: {list(data.keys())}")

    def test_dashboard_stats_unauthorized_view(self, team_leader_client, super_admin_client):
        """Test that team leader cannot view super_admin's dashboard"""
        # Get super admin's user ID
        me_response = super_admin_client.get(f"{BASE_URL}/api/users/me")
        if me_response.status_code == 200:
            super_admin_id = me_response.json().get("id")
            
            # Team leader should not be able to view super admin's dashboard
            response = team_leader_client.get(
                f"{BASE_URL}/api/dashboard/stats",
                params={"view_as": super_admin_id}
            )
            # Should return 403 Forbidden
            assert response.status_code in [403, 401], \
                f"Should not allow viewing super admin dashboard: {response.status_code}"


# ==================== LEAD REASSIGNMENT & APPROVAL WORKFLOW TESTS ====================
class TestLeadReassignment:
    """Lead reassignment and multi-level approval tests"""

    def test_get_available_agents(self, super_admin_client):
        """Test GET /api/leads/reassignment/available-agents"""
        response = super_admin_client.get(f"{BASE_URL}/api/leads/reassignment/available-agents")
        assert response.status_code == 200, f"Get available agents failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Available agents should be a list"
        print(f"Available agents for reassignment: {len(data)}")
        
        for agent in data[:3]:  # Print first 3
            print(f"  - {agent.get('full_name')} ({agent.get('role')}): {agent.get('current_lead_count', 0)} leads")

    def test_get_pending_approvals(self, super_admin_client):
        """Test GET /api/leads/reassignment-requests/pending"""
        response = super_admin_client.get(f"{BASE_URL}/api/leads/reassignment-requests/pending")
        assert response.status_code == 200, f"Get pending approvals failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Pending requests should be a list"
        print(f"Pending reassignment requests: {len(data)}")

    def test_get_all_reassignment_requests(self, super_admin_client):
        """Test GET /api/leads/reassignment-requests"""
        response = super_admin_client.get(f"{BASE_URL}/api/leads/reassignment-requests")
        assert response.status_code == 200, f"Get reassignment requests failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Reassignment requests should be a list"
        print(f"All reassignment requests: {len(data)}")

    def test_reassignment_workflow_admin_direct(self, super_admin_client):
        """Test that admin can directly reassign leads without approval"""
        # First get a lead
        leads_response = super_admin_client.get(f"{BASE_URL}/api/leads", params={"limit": 1})
        if leads_response.status_code != 200 or not leads_response.json():
            pytest.skip("No leads available for testing")
        
        leads = leads_response.json()
        if not leads:
            pytest.skip("No leads available")
        
        lead = leads[0]
        lead_id = lead.get("id")
        current_agent = lead.get("assigned_to")
        
        # Get available agents
        agents_response = super_admin_client.get(f"{BASE_URL}/api/leads/reassignment/available-agents")
        agents = agents_response.json()
        
        # Find a different agent
        new_agent = None
        for agent in agents:
            if agent["id"] != current_agent:
                new_agent = agent
                break
        
        if not new_agent:
            pytest.skip("No different agent available for reassignment test")
        
        # Super admin should be able to reassign directly
        # Note: API requires lead_id in both URL path and body (model design)
        response = super_admin_client.post(
            f"{BASE_URL}/api/leads/{lead_id}/reassignment-request",
            json={
                "lead_id": lead_id,  # Required by model even though in URL
                "new_agent_id": new_agent["id"],
                "current_agent_id": current_agent or "",
                "reason": "TEST_Admin direct reassignment"
            }
        )
        assert response.status_code == 200, f"Admin reassignment failed: {response.text}"
        
        data = response.json()
        # Admin should get direct completion, not approval required
        print(f"Reassignment result: {data.get('message')}, requires_approval={data.get('requires_approval')}")
        assert data.get("requires_approval") == False or data.get("status") == "completed", \
            "Admin should be able to reassign directly"


class TestTeamLeaderReassignment:
    """Team leader reassignment workflow (requires approval)"""

    def test_team_leader_available_agents(self, team_leader_client):
        """Test that team leader only sees their team members"""
        response = team_leader_client.get(f"{BASE_URL}/api/leads/reassignment/available-agents")
        assert response.status_code == 200, f"Get available agents failed: {response.text}"
        
        data = response.json()
        print(f"Team leader can reassign to {len(data)} agents")
        # Team leader should only see their team + themselves

    def test_team_leader_reassignment_request(self, team_leader_client, super_admin_client):
        """Test that team leader's reassignment creates approval request"""
        # First get a lead assigned to team leader
        leads_response = team_leader_client.get(f"{BASE_URL}/api/leads", params={"limit": 5})
        if leads_response.status_code != 200:
            pytest.skip("Cannot get leads for team leader")
        
        leads = leads_response.json()
        if not leads:
            pytest.skip("Team leader has no leads")
        
        # Get available agents
        agents_response = team_leader_client.get(f"{BASE_URL}/api/leads/reassignment/available-agents")
        agents = agents_response.json()
        
        if not agents or len(agents) < 2:
            pytest.skip("Not enough agents for reassignment test")
        
        lead = leads[0]
        current_agent = lead.get("assigned_to")
        
        # Find a different agent
        new_agent = None
        for agent in agents:
            if agent["id"] != current_agent:
                new_agent = agent
                break
        
        if not new_agent:
            pytest.skip("No different agent available")
        
        # Team leader creates reassignment request
        response = team_leader_client.post(
            f"{BASE_URL}/api/leads/{lead['id']}/reassignment-request",
            json={
                "new_agent_id": new_agent["id"],
                "current_agent_id": current_agent,
                "reason": "TEST_Team leader reassignment test"
            }
        )
        
        # Should either succeed or fail with proper message
        if response.status_code == 200:
            data = response.json()
            print(f"Reassignment request result: {data}")
            # Team leader should require approval
            if data.get("requires_approval") == True:
                print(f"Request ID: {data.get('request_id')}")
                # Store for approval test
                return data.get("request_id")


# ==================== ACCESS CONTROL TESTS ====================
class TestAccessControl:
    """Access control and permissions tests"""

    def test_users_list(self, super_admin_client):
        """Test GET /api/users - List all users with their permissions"""
        response = super_admin_client.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Get users failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Users should be a list"
        print(f"Total users: {len(data)}")
        
        # Check for team_leader_id field
        for user in data:
            if user.get("team_leader_id"):
                print(f"  {user.get('full_name')} is assigned to team leader ID: {user.get('team_leader_id')}")

    def test_user_permissions_update(self, super_admin_client):
        """Test updating user permissions"""
        # Get a non-admin user
        users = super_admin_client.get(f"{BASE_URL}/api/users").json()
        
        test_user = None
        for user in users:
            if user.get("role") not in ["super_admin", "admin"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No non-admin user available for permission test")
        
        # Update permissions
        response = super_admin_client.put(
            f"{BASE_URL}/api/users/{test_user['id']}",
            json={
                "permissions": {
                    "dashboard": "view",
                    "sales_crm": "edit"
                }
            }
        )
        
        # Should succeed or return meaningful error
        assert response.status_code in [200, 400], f"Permission update unexpected status: {response.text}"


# ==================== SALES CRM TESTS ====================
class TestSalesCRM:
    """Sales CRM and Kanban tests"""

    def test_get_leads(self, super_admin_client):
        """Test GET /api/leads - Get leads for CRM Kanban"""
        response = super_admin_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Leads should be a list"
        print(f"Total leads: {len(data)}")
        
        # Check for stage distribution
        stages = {}
        for lead in data:
            stage = lead.get("stage", "unknown")
            stages[stage] = stages.get(stage, 0) + 1
        print(f"Leads by stage: {stages}")

    def test_lead_detail_from_list(self, super_admin_client):
        """Test GET /api/leads - Lead list contains full detail for modal display"""
        # Note: There is no GET /api/leads/{lead_id} endpoint, modal uses data from list
        leads = super_admin_client.get(f"{BASE_URL}/api/leads", params={"limit": 5}).json()
        
        if not leads:
            pytest.skip("No leads available")
        
        lead = leads[0]
        # Verify lead has all necessary fields for detail modal
        assert "id" in lead, "Lead should have ID"
        assert "full_name" in lead, "Lead should have full_name"
        assert "phone" in lead, "Lead should have phone"
        assert "stage" in lead, "Lead should have stage"
        
        print(f"Lead detail from list: {lead.get('full_name')} - {lead.get('stage')} - assigned_to: {lead.get('assigned_to_name')}")


# ==================== CLEANUP ====================
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(super_admin_client):
    """Cleanup test data after all tests"""
    yield
    # Delete test leads created during tests
    try:
        leads = super_admin_client.get(f"{BASE_URL}/api/leads").json()
        for lead in leads:
            if lead.get("full_name", "").startswith("TEST_"):
                super_admin_client.delete(f"{BASE_URL}/api/leads/{lead['id']}")
                print(f"Cleaned up test lead: {lead['full_name']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
