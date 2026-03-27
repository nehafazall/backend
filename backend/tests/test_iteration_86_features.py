"""
Iteration 86 Feature Tests:
- Executive Dashboard API (CEO View)
- Internal Chat System APIs
- CEO Commission Approval Workflow
- Commission Scatter Data (Net Pay chart)
- Color-coded closed leads (verified via API stage data)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EMAIL = "aleesha@clt-academy.com"
SALES_PASSWORD = "Aleesha@123"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


class TestAuth:
    """Authentication tests"""
    
    def test_ceo_login(self):
        """Test CEO/Super Admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert data.get("user", {}).get("role") == "super_admin"
        
    def test_sales_login(self):
        """Test Sales Executive login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        
    def test_cs_head_login(self):
        """Test CS Head login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"CS Head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CEO_EMAIL,
        "password": CEO_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("CEO authentication failed")


@pytest.fixture(scope="module")
def sales_token():
    """Get Sales Executive auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EMAIL,
        "password": SALES_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Sales authentication failed")


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS Head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("CS Head authentication failed")


class TestExecutiveDashboard:
    """Executive Dashboard API tests (CEO View)"""
    
    def test_executive_dashboard_ceo_access(self, ceo_token):
        """CEO can access executive dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/executive/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Executive dashboard failed: {response.text}"
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data, "kpis not in response"
        kpis = data["kpis"]
        assert "total_employees" in kpis
        assert "active_users" in kpis
        assert "new_leads_today" in kpis
        assert "total_leads_month" in kpis
        assert "enrolled_month" in kpis
        assert "revenue_month" in kpis
        assert "cs_upgrades_month" in kpis
        assert "pending_approvals" in kpis
        
        # Verify other data structures
        assert "monthly_trend" in data, "monthly_trend not in response"
        assert "revenue_by_course" in data, "revenue_by_course not in response"
        assert "top_agents" in data, "top_agents not in response"
        assert "department_headcount" in data, "department_headcount not in response"
        assert "lead_sources" in data, "lead_sources not in response"
        assert "commission_approvals" in data, "commission_approvals not in response"
        assert "current_month" in data, "current_month not in response"
        
    def test_executive_dashboard_sales_denied(self, sales_token):
        """Sales Executive cannot access executive dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/executive/dashboard",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403, "Sales should be denied access to executive dashboard"
        
    def test_executive_dashboard_monthly_trend_structure(self, ceo_token):
        """Verify monthly trend data structure"""
        response = requests.get(
            f"{BASE_URL}/api/executive/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        monthly_trend = data.get("monthly_trend", [])
        assert isinstance(monthly_trend, list)
        if monthly_trend:
            item = monthly_trend[0]
            assert "month" in item
            assert "label" in item
            assert "revenue" in item
            assert "deals" in item


class TestChatSystem:
    """Internal Chat System API tests"""
    
    def test_get_conversations_empty_or_list(self, ceo_token):
        """Get conversations returns list"""
        response = requests.get(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get conversations failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Conversations should be a list"
        
    def test_get_chat_users(self, ceo_token):
        """Get available chat users"""
        response = requests.get(
            f"{BASE_URL}/api/chat/users",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get chat users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Chat users should be a list"
        if data:
            user = data[0]
            assert "id" in user
            assert "full_name" in user
            
    def test_get_unread_count(self, ceo_token):
        """Get unread message count"""
        response = requests.get(
            f"{BASE_URL}/api/chat/unread-count",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        
    def test_create_conversation_and_send_message(self, ceo_token, sales_token):
        """Create a DM conversation and send a message"""
        # First get a user to chat with
        users_response = requests.get(
            f"{BASE_URL}/api/chat/users",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert users_response.status_code == 200
        users = users_response.json()
        
        if not users:
            pytest.skip("No users available for chat test")
            
        target_user = users[0]
        
        # Create conversation
        create_response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"participant_ids": [target_user["id"]]}
        )
        assert create_response.status_code == 200, f"Create conversation failed: {create_response.text}"
        convo = create_response.json()
        assert "id" in convo
        assert "participants" in convo
        
        convo_id = convo["id"]
        
        # Send a message
        test_message = f"TEST_message_{uuid.uuid4().hex[:8]}"
        msg_response = requests.post(
            f"{BASE_URL}/api/chat/conversations/{convo_id}/messages",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"text": test_message}
        )
        assert msg_response.status_code == 200, f"Send message failed: {msg_response.text}"
        msg = msg_response.json()
        assert "id" in msg
        assert msg["text"] == test_message
        assert "sender_id" in msg
        assert "created_at" in msg
        
        # Get messages to verify
        get_msgs_response = requests.get(
            f"{BASE_URL}/api/chat/conversations/{convo_id}/messages",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert get_msgs_response.status_code == 200
        msgs_data = get_msgs_response.json()
        assert "messages" in msgs_data
        assert any(m["text"] == test_message for m in msgs_data["messages"])
        
    def test_create_conversation_requires_participants(self, ceo_token):
        """Creating conversation without participants fails"""
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"participant_ids": []}
        )
        assert response.status_code == 400
        
    def test_send_empty_message_fails(self, ceo_token):
        """Sending empty message fails"""
        # First create a conversation
        users_response = requests.get(
            f"{BASE_URL}/api/chat/users",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        if users_response.status_code != 200 or not users_response.json():
            pytest.skip("No users available")
            
        target_user = users_response.json()[0]
        create_response = requests.post(
            f"{BASE_URL}/api/chat/conversations",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"participant_ids": [target_user["id"]]}
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create conversation")
            
        convo_id = create_response.json()["id"]
        
        # Try to send empty message
        response = requests.post(
            f"{BASE_URL}/api/chat/conversations/{convo_id}/messages",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"text": "   "}
        )
        assert response.status_code == 400


class TestCommissionApproval:
    """CEO Commission Approval Workflow tests"""
    
    def test_get_approval_status(self, ceo_token):
        """Get commission approval status"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/approval-status",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get approval status failed: {response.text}"
        data = response.json()
        assert "month" in data
        assert "approvals" in data
        
    def test_approve_sales_commissions(self, ceo_token):
        """CEO can approve sales commissions"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={
                "department": "sales",
                "month": current_month,
                "action": "approve"
            }
        )
        assert response.status_code == 200, f"Approve sales failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "approved" in data["message"].lower()
        
        # Verify approval status
        status_response = requests.get(
            f"{BASE_URL}/api/commissions/approval-status?month={current_month}",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["approvals"].get("sales", {}).get("status") == "approved"
        
    def test_approve_cs_commissions(self, ceo_token):
        """CEO can approve CS commissions"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={
                "department": "cs",
                "month": current_month,
                "action": "approve"
            }
        )
        assert response.status_code == 200, f"Approve CS failed: {response.text}"
        data = response.json()
        assert "message" in data
        
    def test_revoke_sales_approval(self, ceo_token):
        """CEO can revoke sales commission approval"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        # First approve
        requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"department": "sales", "month": current_month, "action": "approve"}
        )
        
        # Then revoke
        response = requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={
                "department": "sales",
                "month": current_month,
                "action": "revoke"
            }
        )
        assert response.status_code == 200, f"Revoke failed: {response.text}"
        data = response.json()
        assert "revoked" in data["message"].lower()
        
    def test_non_ceo_cannot_approve(self, sales_token):
        """Non-CEO cannot approve commissions"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={
                "department": "sales",
                "month": current_month,
                "action": "approve"
            }
        )
        assert response.status_code == 403, "Non-CEO should be denied"
        
    def test_invalid_department_fails(self, ceo_token):
        """Invalid department fails"""
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = requests.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={
                "department": "invalid_dept",
                "month": current_month,
                "action": "approve"
            }
        )
        assert response.status_code == 400


class TestCommissionScatterData:
    """Commission Scatter Data (Net Pay chart) tests"""
    
    def test_get_scatter_data(self, ceo_token):
        """Get scatter data for net pay chart"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data?months=6",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get scatter data failed: {response.text}"
        data = response.json()
        
        assert "agent_name" in data
        assert "role" in data
        assert "base_salary" in data
        assert "data" in data
        assert isinstance(data["data"], list)
        
        # Verify data point structure
        if data["data"]:
            point = data["data"][0]
            assert "month" in point
            assert "label" in point
            assert "commission" in point
            assert "net_pay" in point
            assert "base_salary" in point
            
    def test_scatter_data_sales_user(self, sales_token):
        """Sales user can get their scatter data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data?months=6",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Sales scatter data failed: {response.text}"
        data = response.json()
        assert "data" in data
        
    def test_scatter_data_cs_user(self, cs_head_token):
        """CS user can get their scatter data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data?months=6",
            headers={"Authorization": f"Bearer {cs_head_token}"}
        )
        assert response.status_code == 200, f"CS scatter data failed: {response.text}"
        data = response.json()
        assert "data" in data


class TestLeadStages:
    """Lead stages API tests (for color-coded closed leads)"""
    
    def test_get_leads_with_stages(self, sales_token):
        """Get leads and verify stage field exists"""
        response = requests.get(
            f"{BASE_URL}/api/leads?limit=50",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        data = response.json()
        
        # Check if leads have stage field
        leads = data.get("leads", data) if isinstance(data, dict) else data
        if isinstance(leads, list) and leads:
            lead = leads[0]
            assert "stage" in lead, "Lead should have stage field"
            
    def test_enrolled_leads_have_enrolled_stage(self, ceo_token):
        """Verify enrolled leads have correct stage"""
        response = requests.get(
            f"{BASE_URL}/api/leads?stage=enrolled&limit=10",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", data) if isinstance(data, dict) else data
        
        if isinstance(leads, list):
            for lead in leads:
                assert lead.get("stage") == "enrolled", f"Expected enrolled stage, got {lead.get('stage')}"
                
    def test_rejected_leads_have_rejected_stage(self, ceo_token):
        """Verify rejected leads have correct stage"""
        response = requests.get(
            f"{BASE_URL}/api/leads?stage=rejected&limit=10",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        leads = data.get("leads", data) if isinstance(data, dict) else data
        
        if isinstance(leads, list):
            for lead in leads:
                assert lead.get("stage") == "rejected", f"Expected rejected stage, got {lead.get('stage')}"


class TestCommissionDashboard:
    """Commission Dashboard API tests"""
    
    def test_commission_dashboard_ceo(self, ceo_token):
        """CEO can access commission dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Commission dashboard failed: {response.text}"
        data = response.json()
        
        # CEO should see totals
        assert "total_sales_earned" in data or "my_commission" in data
        
    def test_commission_dashboard_sales(self, sales_token):
        """Sales user can access commission dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200, f"Sales commission dashboard failed: {response.text}"
        data = response.json()
        
        # Sales should see their commission
        assert "my_commission" in data
        my_comm = data["my_commission"]
        assert "earned_commission" in my_comm
        assert "pending_commission" in my_comm
        
    def test_commission_transactions(self, ceo_token):
        """CEO can get commission transactions"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200, f"Get transactions failed: {response.text}"
        data = response.json()
        
        assert "transactions" in data
        assert "summary" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
