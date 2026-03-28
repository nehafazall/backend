"""
Iteration 92: CEO Commission Approval Workflow Tests
Tests for CEO/COO commission approval, transactions, and role-based dashboard views.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EXEC_EMAIL = "aleesha@clt-academy.com"
SALES_EXEC_PASSWORD = "Aleesha@123"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"

# Test month - March 2026
TEST_MONTH = "2026-03"


class TestCEOCommissionApproval:
    """Tests for CEO Commission Approval Workflow"""
    
    @pytest.fixture(scope="class")
    def ceo_token(self):
        """Get CEO (super_admin) auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"CEO login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def sales_exec_token(self):
        """Get Sales Executive auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Sales Exec login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def cs_head_token(self):
        """Get CS Head auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"CS Head login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def ceo_headers(self, ceo_token):
        """Headers with CEO auth"""
        return {"Authorization": f"Bearer {ceo_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def sales_exec_headers(self, sales_exec_token):
        """Headers with Sales Exec auth"""
        return {"Authorization": f"Bearer {sales_exec_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def cs_head_headers(self, cs_head_token):
        """Headers with CS Head auth"""
        return {"Authorization": f"Bearer {cs_head_token}", "Content-Type": "application/json"}

    # ============ CEO Dashboard Tests ============
    
    def test_ceo_dashboard_returns_sales_and_cs_totals(self, ceo_headers):
        """CEO can see Sales and CS commission totals on /commission-dashboard"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] in ["super_admin", "coo"], f"Expected CEO role, got {data['role']}"
        
        # Verify sales totals exist
        assert "total_sales_earned" in data, "Missing total_sales_earned"
        assert "total_sales_pending" in data, "Missing total_sales_pending"
        assert "total_tl_earned" in data, "Missing total_tl_earned"
        assert "sm_bonus_pool" in data, "Missing sm_bonus_pool"
        
        # Verify CS totals exist
        assert "total_cs_earned" in data, "Missing total_cs_earned"
        assert "total_cs_pending" in data, "Missing total_cs_pending"
        assert "total_cs_head_earned" in data, "Missing total_cs_head_earned"
        assert "mentor_pool" in data, "Missing mentor_pool"
        
        # Verify approvals object exists
        assert "approvals" in data, "Missing approvals object"
        print(f"CEO Dashboard: Sales Earned={data['total_sales_earned']}, CS Earned={data['total_cs_earned']}")
        print(f"Approvals: {data['approvals']}")
    
    def test_ceo_dashboard_includes_sales_commissions_list(self, ceo_headers):
        """CEO dashboard includes list of sales commissions by agent"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "sales_commissions" in data, "Missing sales_commissions list"
        assert isinstance(data["sales_commissions"], list), "sales_commissions should be a list"
        
        if data["sales_commissions"]:
            agent = data["sales_commissions"][0]
            assert "agent_name" in agent, "Missing agent_name in sales commission"
            assert "earned_commission" in agent, "Missing earned_commission"
            assert "pending_commission" in agent, "Missing pending_commission"
            print(f"Found {len(data['sales_commissions'])} sales agents")
    
    def test_ceo_dashboard_includes_cs_commissions_list(self, ceo_headers):
        """CEO dashboard includes list of CS commissions by agent"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "cs_commissions" in data, "Missing cs_commissions list"
        assert isinstance(data["cs_commissions"], list), "cs_commissions should be a list"
        
        if data["cs_commissions"]:
            agent = data["cs_commissions"][0]
            assert "agent_name" in agent, "Missing agent_name in CS commission"
            assert "earned_commission" in agent, "Missing earned_commission"
            print(f"Found {len(data['cs_commissions'])} CS agents")

    # ============ Approval Endpoint Tests ============
    
    def test_ceo_can_approve_sales_commissions(self, ceo_headers):
        """CEO can approve Sales commissions via POST /api/commissions/approve"""
        response = requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "sales", "month": TEST_MONTH, "action": "approve"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "SALES" in data["message"].upper() or "sales" in data["message"].lower(), f"Unexpected message: {data['message']}"
        print(f"Sales approval response: {data['message']}")
    
    def test_ceo_can_revoke_sales_approval(self, ceo_headers):
        """CEO can revoke Sales commission approval"""
        response = requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "sales", "month": TEST_MONTH, "action": "revoke"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"Sales revoke response: {data['message']}")
    
    def test_ceo_can_approve_cs_commissions(self, ceo_headers):
        """CEO can approve CS commissions via POST /api/commissions/approve"""
        response = requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "cs", "month": TEST_MONTH, "action": "approve"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"CS approval response: {data['message']}")
    
    def test_ceo_can_revoke_cs_approval(self, ceo_headers):
        """CEO can revoke CS commission approval"""
        response = requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "cs", "month": TEST_MONTH, "action": "revoke"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"CS revoke response: {data['message']}")
    
    def test_non_ceo_cannot_approve_commissions(self, sales_exec_headers):
        """Non-CEO users cannot approve commissions"""
        response = requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=sales_exec_headers,
            json={"department": "sales", "month": TEST_MONTH, "action": "approve"}
        )
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("Non-CEO correctly blocked from approving commissions")

    # ============ Transactions Endpoint Tests ============
    
    def test_ceo_can_get_transactions(self, ceo_headers):
        """CEO can view commission transactions via GET /api/commissions/transactions"""
        response = requests.get(f"{BASE_URL}/api/commissions/transactions?month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Missing transactions list"
        assert "summary" in data, "Missing summary object"
        
        summary = data["summary"]
        assert "total" in summary, "Missing total in summary"
        assert "pending_count" in summary, "Missing pending_count"
        assert "approved_count" in summary, "Missing approved_count"
        print(f"Transactions: total={summary['total']}, pending={summary['pending_count']}, approved={summary['approved_count']}")
    
    def test_ceo_can_filter_transactions_by_department(self, ceo_headers):
        """CEO can filter transactions by department"""
        # Filter by sales
        response = requests.get(f"{BASE_URL}/api/commissions/transactions?month={TEST_MONTH}&department=sales", headers=ceo_headers)
        assert response.status_code == 200
        
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("department") == "sales", f"Expected sales department, got {txn.get('department')}"
        print(f"Sales transactions: {len(data.get('transactions', []))}")
        
        # Filter by CS
        response = requests.get(f"{BASE_URL}/api/commissions/transactions?month={TEST_MONTH}&department=cs", headers=ceo_headers)
        assert response.status_code == 200
        
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("department") == "cs", f"Expected cs department, got {txn.get('department')}"
        print(f"CS transactions: {len(data.get('transactions', []))}")
    
    def test_ceo_can_generate_transactions(self, ceo_headers):
        """CEO can generate transactions for a month"""
        response = requests.post(f"{BASE_URL}/api/commissions/generate-transactions", 
            headers=ceo_headers,
            json={"month": TEST_MONTH}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "created" in data, "Missing created count"
        print(f"Generate transactions: {data['message']}, created={data['created']}")
    
    def test_ceo_can_bulk_approve_transactions(self, ceo_headers):
        """CEO can bulk approve all pending transactions"""
        response = requests.post(f"{BASE_URL}/api/commissions/transactions/bulk-approve", 
            headers=ceo_headers,
            json={"month": TEST_MONTH}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"Bulk approve: {data['message']}")

    # ============ Sales Executive View Tests ============
    
    def test_sales_exec_dashboard_returns_approval_status(self, sales_exec_headers):
        """Sales Executive dashboard returns approval_status field"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=sales_exec_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] in ["sales_executive", "team_leader"], f"Expected sales role, got {data['role']}"
        
        # Verify approval-related fields
        assert "approval_status" in data, "Missing approval_status field"
        assert data["approval_status"] in ["approved", "pending"], f"Invalid approval_status: {data['approval_status']}"
        
        assert "approved_commission" in data, "Missing approved_commission field"
        assert "pending_approval_commission" in data, "Missing pending_approval_commission field"
        
        print(f"Sales Exec: approval_status={data['approval_status']}, approved={data['approved_commission']}, pending_approval={data['pending_approval_commission']}")
    
    def test_sales_exec_sees_my_commission(self, sales_exec_headers):
        """Sales Executive sees their own commission data"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=sales_exec_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "my_commission" in data, "Missing my_commission object"
        
        my_comm = data["my_commission"]
        assert "earned_commission" in my_comm, "Missing earned_commission in my_commission"
        assert "pending_commission" in my_comm, "Missing pending_commission in my_commission"
        print(f"Sales Exec my_commission: earned={my_comm['earned_commission']}, pending={my_comm['pending_commission']}")
    
    def test_sales_exec_can_view_own_transactions(self, sales_exec_headers):
        """Sales Executive can view their own transactions"""
        response = requests.get(f"{BASE_URL}/api/commissions/transactions?month={TEST_MONTH}", headers=sales_exec_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Missing transactions list"
        print(f"Sales Exec transactions: {len(data.get('transactions', []))}")

    # ============ CS Head View Tests ============
    
    def test_cs_head_dashboard_returns_approval_status(self, cs_head_headers):
        """CS Head dashboard returns approval_status field"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=cs_head_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["role"] in ["cs_agent", "cs_head"], f"Expected CS role, got {data['role']}"
        
        # Verify approval-related fields
        assert "approval_status" in data, "Missing approval_status field"
        assert data["approval_status"] in ["approved", "pending"], f"Invalid approval_status: {data['approval_status']}"
        
        assert "approved_commission" in data, "Missing approved_commission field"
        assert "pending_approval_commission" in data, "Missing pending_approval_commission field"
        
        print(f"CS Head: approval_status={data['approval_status']}, approved={data['approved_commission']}, pending_approval={data['pending_approval_commission']}")
    
    def test_cs_head_sees_team_commissions(self, cs_head_headers):
        """CS Head sees team commission breakdown"""
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=cs_head_headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["role"] == "cs_head":
            assert "team_commissions" in data, "Missing team_commissions for CS Head"
            assert "total_cs_head_earned" in data, "Missing total_cs_head_earned"
            print(f"CS Head team_commissions: {len(data.get('team_commissions', []))} agents")

    # ============ Approval Status Verification Tests ============
    
    def test_approval_status_changes_after_ceo_approval(self, ceo_headers, sales_exec_headers):
        """Verify approval_status changes when CEO approves"""
        # First revoke to ensure pending state
        requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "sales", "month": TEST_MONTH, "action": "revoke"}
        )
        
        # Check sales exec sees pending
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=sales_exec_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "pending", f"Expected pending, got {data['approval_status']}"
        pending_amount = data.get("pending_approval_commission", 0)
        print(f"Before approval: status=pending, pending_approval_commission={pending_amount}")
        
        # CEO approves
        requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "sales", "month": TEST_MONTH, "action": "approve"}
        )
        
        # Check sales exec sees approved
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=sales_exec_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "approved", f"Expected approved, got {data['approval_status']}"
        approved_amount = data.get("approved_commission", 0)
        print(f"After approval: status=approved, approved_commission={approved_amount}")
    
    def test_cs_approval_status_changes_after_ceo_approval(self, ceo_headers, cs_head_headers):
        """Verify CS approval_status changes when CEO approves"""
        # First revoke to ensure pending state
        requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "cs", "month": TEST_MONTH, "action": "revoke"}
        )
        
        # Check CS head sees pending
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=cs_head_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "pending", f"Expected pending, got {data['approval_status']}"
        print(f"CS Before approval: status=pending")
        
        # CEO approves
        requests.post(f"{BASE_URL}/api/commissions/approve", 
            headers=ceo_headers,
            json={"department": "cs", "month": TEST_MONTH, "action": "approve"}
        )
        
        # Check CS head sees approved
        response = requests.get(f"{BASE_URL}/api/commissions/dashboard?month={TEST_MONTH}", headers=cs_head_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["approval_status"] == "approved", f"Expected approved, got {data['approval_status']}"
        print(f"CS After approval: status=approved")

    # ============ CEO Drill-Down Tests ============
    
    def test_ceo_can_drill_down_sales(self, ceo_headers):
        """CEO can drill down into sales commission details"""
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=sales&month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rows" in data, "Missing rows in drill-down response"
        print(f"Sales drill-down: {len(data.get('rows', []))} rows")
    
    def test_ceo_can_drill_down_cs(self, ceo_headers):
        """CEO can drill down into CS commission details"""
        response = requests.get(f"{BASE_URL}/api/commissions/ceo/drill?dept=cs&month={TEST_MONTH}", headers=ceo_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rows" in data, "Missing rows in drill-down response"
        print(f"CS drill-down: {len(data.get('rows', []))} rows")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
