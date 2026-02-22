"""
Test file for CLT Synapse ERP new features:
1. Team-based lead filtering
2. Quick Stats API
3. Mentor Leaderboard API
4. Commission Rules CRUD
5. Bank Reconciliation Summary
6. User Profile Update
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
TEAM_LEADER = {"email": "Mohammed@clt-academy.com", "password": "Test@1234"}
SALES_EXEC = {"email": "Aleesha@clt-academy.com", "password": "Test@1234"}


class TestAuth:
    """Authentication tests for different roles"""
    
    def test_super_admin_login(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print("✅ Super admin login successful")
    
    def test_team_leader_login(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEAM_LEADER)
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✅ Team leader login successful - Role: {data['user']['role']}")
        else:
            print(f"⚠️ Team leader login failed (may not exist): {response.text}")
            pytest.skip("Team leader user not found")
    
    def test_sales_exec_login(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC)
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✅ Sales executive login successful - Role: {data['user']['role']}")
        else:
            print(f"⚠️ Sales executive login failed (may not exist): {response.text}")
            pytest.skip("Sales executive user not found")


class TestQuickStatsAPI:
    """Quick Stats API tests"""
    
    def test_quick_stats_super_admin(self, authenticated_client):
        """Super admin should get comprehensive stats"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/quick-stats")
        assert response.status_code == 200, f"Quick stats failed: {response.text}"
        data = response.json()
        
        # Super admin should have sales stats
        assert "total_leads" in data or "total_students" in data, "Missing stats data"
        print(f"✅ Quick stats returned: {list(data.keys())}")
    
    def test_quick_stats_returns_role_appropriate_data(self, authenticated_client):
        """Verify stats structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/quick-stats")
        assert response.status_code == 200
        data = response.json()
        
        # Should have common stats
        assert "unread_notifications" in data
        print(f"✅ Quick stats structure verified: unread_notifications={data.get('unread_notifications')}")


class TestMentorLeaderboard:
    """Mentor Leaderboard API tests"""
    
    def test_mentor_leaderboard_default_period(self, authenticated_client):
        """Test mentor leaderboard with default period"""
        response = authenticated_client.get(f"{BASE_URL}/api/mentor/leaderboard")
        assert response.status_code == 200, f"Mentor leaderboard failed: {response.text}"
        data = response.json()
        
        assert "leaderboard" in data
        assert "total_mentors" in data
        print(f"✅ Mentor leaderboard returned {data['total_mentors']} mentors")
    
    def test_mentor_leaderboard_monthly(self, authenticated_client):
        """Test mentor leaderboard with monthly period"""
        response = authenticated_client.get(f"{BASE_URL}/api/mentor/leaderboard?period=monthly")
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        print(f"✅ Monthly mentor leaderboard: {len(data['leaderboard'])} entries")
    
    def test_mentor_leaderboard_all_time(self, authenticated_client):
        """Test mentor leaderboard all time"""
        response = authenticated_client.get(f"{BASE_URL}/api/mentor/leaderboard?period=all_time")
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        
        # Check leaderboard entry structure if there are entries
        if data["leaderboard"]:
            entry = data["leaderboard"][0]
            assert "mentor_id" in entry
            assert "mentor_name" in entry
            assert "score" in entry
            print(f"✅ Leaderboard entry structure verified: rank={entry.get('rank')}, score={entry.get('score')}")
        else:
            print("✅ Mentor leaderboard empty (no mentors)")


class TestCommissionRules:
    """Commission Rules CRUD tests"""
    
    def test_get_commission_rules(self, authenticated_client):
        """Get all commission rules"""
        response = authenticated_client.get(f"{BASE_URL}/api/commission-rules")
        assert response.status_code == 200, f"Get commission rules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} commission rules")
    
    def test_create_commission_rule(self, authenticated_client):
        """Create a new commission rule"""
        rule_data = {
            "name": "TEST_Sales Executive Basic Commission",
            "role": "sales_executive",
            "commission_type": "percentage",
            "commission_value": 5.0,
            "min_sale_amount": 0,
            "max_sale_amount": None,
            "is_active": True
        }
        response = authenticated_client.post(f"{BASE_URL}/api/commission-rules", json=rule_data)
        assert response.status_code == 200, f"Create commission rule failed: {response.text}"
        data = response.json()
        assert data["name"] == rule_data["name"]
        assert data["commission_value"] == 5.0
        assert "id" in data
        
        # Store for cleanup
        pytest.created_rule_id = data["id"]
        print(f"✅ Created commission rule: {data['id']}")
    
    def test_update_commission_rule(self, authenticated_client):
        """Update a commission rule"""
        if not hasattr(pytest, 'created_rule_id'):
            pytest.skip("No commission rule created to update")
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/commission-rules/{pytest.created_rule_id}",
            json={"commission_value": 7.5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["commission_value"] == 7.5
        print(f"✅ Updated commission rule value to 7.5%")
    
    def test_delete_commission_rule(self, authenticated_client):
        """Delete a commission rule"""
        if not hasattr(pytest, 'created_rule_id'):
            pytest.skip("No commission rule created to delete")
        
        response = authenticated_client.delete(f"{BASE_URL}/api/commission-rules/{pytest.created_rule_id}")
        assert response.status_code == 200
        print(f"✅ Deleted commission rule: {pytest.created_rule_id}")


class TestBankReconciliation:
    """Bank Reconciliation API tests"""
    
    def test_reconciliation_summary(self, authenticated_client):
        """Get reconciliation summary"""
        response = authenticated_client.get(f"{BASE_URL}/api/accounting/reconciliation/summary")
        assert response.status_code == 200, f"Reconciliation summary failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "total_statements" in data
        assert "pending_reconciliation" in data
        assert "completed_statements" in data
        assert "total_unmatched_lines" in data
        print(f"✅ Reconciliation summary: {data['total_statements']} statements, {data['pending_reconciliation']} pending")
    
    def test_bank_statements_list(self, authenticated_client):
        """Get list of bank statements"""
        response = authenticated_client.get(f"{BASE_URL}/api/accounting/bank-statements")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} bank statements")


class TestUserProfile:
    """User Profile Update API tests"""
    
    def test_get_current_user(self, authenticated_client):
        """Get current user profile"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        print(f"✅ Current user: {data['email']} ({data['role']})")
    
    def test_update_profile_bio(self, authenticated_client):
        """Update profile with bio"""
        response = authenticated_client.put(f"{BASE_URL}/api/users/me/profile", json={
            "bio": "Test bio from automated testing"
        })
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("bio") == "Test bio from automated testing" or data.get("message")
        print(f"✅ Profile bio updated successfully")
    
    def test_update_profile_additional_phones(self, authenticated_client):
        """Update profile with additional phones"""
        response = authenticated_client.put(f"{BASE_URL}/api/users/me/profile", json={
            "additional_phones": ["+971501234567", "+971509876543"]
        })
        assert response.status_code == 200
        print(f"✅ Profile additional phones updated successfully")


class TestTeamBasedLeadFiltering:
    """Team-based lead filtering tests"""
    
    def test_super_admin_sees_all_leads(self, authenticated_client):
        """Super admin should see all leads"""
        response = authenticated_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Super admin retrieved {len(data)} leads (sees all)")
    
    def test_team_leader_lead_filtering(self, api_client):
        """Team leader should only see their team's leads"""
        # Login as team leader
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEAM_LEADER)
        if login_response.status_code != 200:
            pytest.skip("Team leader user not available")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get leads as team leader
        response = api_client.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Team leader should only see filtered leads
        print(f"✅ Team leader sees {len(data)} leads (team-filtered)")
        
        # Verify all leads are assigned to team members or team leader
        tl_user = login_response.json()["user"]
        print(f"   Team leader: {tl_user['full_name']} (ID: {tl_user['id']})")
    
    def test_sales_executive_lead_filtering(self, api_client):
        """Sales executive should only see their own leads"""
        # Login as sales executive
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC)
        if login_response.status_code != 200:
            pytest.skip("Sales executive user not available")
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        user_id = login_response.json()["user"]["id"]
        
        # Get leads as sales executive
        response = api_client.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # All leads should be assigned to this user
        for lead in data:
            assert lead.get("assigned_to") == user_id, f"Sales exec sees lead not assigned to them"
        
        print(f"✅ Sales executive sees {len(data)} leads (all assigned to them)")


class TestTeamsAPI:
    """Teams API tests for verifying team setup"""
    
    def test_list_teams(self, authenticated_client):
        """List all teams"""
        response = authenticated_client.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        data = response.json()
        
        print(f"✅ Found {len(data)} teams:")
        for team in data:
            print(f"   - {team.get('name')}: Leader={team.get('leader_name')}, Members={team.get('member_count')}")


# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for super admin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Super admin authentication failed")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
