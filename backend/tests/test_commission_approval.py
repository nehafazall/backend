"""
Test Commission Approval Workflow
Tests CEO commission approval endpoints and non-CEO approval status visibility
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
CS_AGENT_EMAIL = "nasida@clt-academy.com"
CS_AGENT_PASSWORD = "Nasida@123"


class TestCommissionApprovalWorkflow:
    """Test CEO commission approval workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.ceo_token = None
        self.sales_token = None
        self.cs_head_token = None
        self.current_month = None
        
    def login(self, email, password):
        """Login and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_01_ceo_login(self):
        """Test CEO can login"""
        self.ceo_token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert self.ceo_token is not None, "CEO login failed"
        print(f"✓ CEO login successful")
        
    def test_02_sales_login(self):
        """Test Sales Executive can login"""
        self.sales_token = self.login(SALES_EMAIL, SALES_PASSWORD)
        assert self.sales_token is not None, "Sales login failed"
        print(f"✓ Sales Executive login successful")
        
    def test_03_cs_agent_login(self):
        """Test CS Agent can login"""
        self.cs_agent_token = self.login(CS_AGENT_EMAIL, CS_AGENT_PASSWORD)
        assert self.cs_agent_token is not None, "CS Agent login failed"
        print(f"✓ CS Agent login successful")
        
    def test_04_ceo_can_access_commission_dashboard(self):
        """Test CEO can access commission dashboard with approvals field"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # CEO view should include approvals field
        assert "approvals" in data, "CEO view should include 'approvals' field"
        print(f"✓ CEO dashboard includes approvals field: {data.get('approvals')}")
        
    def test_05_non_ceo_cannot_approve_commissions(self):
        """Test non-CEO users cannot call POST /api/commissions/approve"""
        token = self.login(SALES_EMAIL, SALES_PASSWORD)
        assert token, "Sales login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "sales", "month": current_month, "action": "approve"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-CEO (sales_executive) correctly blocked from approving commissions")
        
    def test_06_cs_agent_cannot_approve_commissions(self):
        """Test CS Agent cannot call POST /api/commissions/approve"""
        token = self.login(CS_AGENT_EMAIL, CS_AGENT_PASSWORD)
        assert token, "CS Agent login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "cs", "month": current_month, "action": "approve"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-CEO (cs_agent) correctly blocked from approving commissions")
        
    def test_07_ceo_can_approve_sales_commissions(self):
        """Test CEO can approve sales commissions for a month"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "sales", "month": current_month, "action": "approve"}
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        assert "approved" in data.get("message", "").lower(), f"Unexpected message: {data}"
        print(f"✓ CEO approved sales commissions: {data.get('message')}")
        
    def test_08_ceo_can_approve_cs_commissions(self):
        """Test CEO can approve CS commissions for a month"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "cs", "month": current_month, "action": "approve"}
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        assert "approved" in data.get("message", "").lower(), f"Unexpected message: {data}"
        print(f"✓ CEO approved CS commissions: {data.get('message')}")
        
    def test_09_approval_status_endpoint_returns_correct_data(self):
        """Test GET /api/commissions/approval-status returns approval status"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.get(
            f"{BASE_URL}/api/commissions/approval-status?month={current_month}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Status failed: {response.text}"
        data = response.json()
        
        assert "month" in data, "Response should include month"
        assert "approvals" in data, "Response should include approvals"
        
        # After approving both, both should be approved
        approvals = data.get("approvals", {})
        print(f"✓ Approval status: {approvals}")
        
        # Check sales approval
        if "sales" in approvals:
            assert approvals["sales"]["status"] == "approved", "Sales should be approved"
            print(f"✓ Sales approval status: approved")
        
        # Check CS approval
        if "cs" in approvals:
            assert approvals["cs"]["status"] == "approved", "CS should be approved"
            print(f"✓ CS approval status: approved")
            
    def test_10_non_ceo_sees_approval_status_in_dashboard(self):
        """Test non-CEO users see approval_status field in dashboard"""
        token = self.login(SALES_EMAIL, SALES_PASSWORD)
        assert token, "Sales login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Non-CEO view should include approval_status field
        assert "approval_status" in data, "Non-CEO view should include 'approval_status' field"
        print(f"✓ Sales executive sees approval_status: {data.get('approval_status')}")
        
    def test_11_cs_agent_sees_approval_status_in_dashboard(self):
        """Test CS Agent sees approval_status field in dashboard"""
        token = self.login(CS_AGENT_EMAIL, CS_AGENT_PASSWORD)
        assert token, "CS Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Non-CEO view should include approval_status field
        assert "approval_status" in data, "CS Agent view should include 'approval_status' field"
        print(f"✓ CS Agent sees approval_status: {data.get('approval_status')}")
        
    def test_12_ceo_can_revoke_sales_approval(self):
        """Test CEO can revoke sales commission approval"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "sales", "month": current_month, "action": "revoke"}
        )
        assert response.status_code == 200, f"Revoke failed: {response.text}"
        data = response.json()
        assert "revoked" in data.get("message", "").lower(), f"Unexpected message: {data}"
        print(f"✓ CEO revoked sales approval: {data.get('message')}")
        
    def test_13_ceo_can_revoke_cs_approval(self):
        """Test CEO can revoke CS commission approval"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "cs", "month": current_month, "action": "revoke"}
        )
        assert response.status_code == 200, f"Revoke failed: {response.text}"
        data = response.json()
        assert "revoked" in data.get("message", "").lower(), f"Unexpected message: {data}"
        print(f"✓ CEO revoked CS approval: {data.get('message')}")
        
    def test_14_after_revoke_status_is_pending(self):
        """Test after revoke, approval status is pending"""
        token = self.login(SALES_EMAIL, SALES_PASSWORD)
        assert token, "Sales login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # After revoke, status should be pending
        assert data.get("approval_status") == "pending", f"Expected pending, got {data.get('approval_status')}"
        print(f"✓ After revoke, sales approval_status is pending")
        
    def test_15_invalid_department_rejected(self):
        """Test invalid department is rejected"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "invalid", "month": current_month, "action": "approve"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Invalid department correctly rejected")
        
    def test_16_missing_params_rejected(self):
        """Test missing parameters are rejected"""
        token = self.login(CEO_EMAIL, CEO_PASSWORD)
        assert token, "CEO login failed"
        
        response = self.session.post(
            f"{BASE_URL}/api/commissions/approve",
            headers={"Authorization": f"Bearer {token}"},
            json={"department": "sales"}  # Missing month
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Missing month parameter correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
