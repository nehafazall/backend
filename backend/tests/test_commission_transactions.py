"""
Test Commission Transaction Approval Workflow
Tests for:
- POST /api/commissions/generate-transactions - generates commission transactions
- GET /api/commissions/transactions - returns list of transactions with filtering
- POST /api/commissions/transactions/{id}/approve - approves a single transaction
- POST /api/commissions/transactions/bulk-approve - bulk approves all pending
- PUT /api/commissions/transactions/{id} - CEO edits commission amount and notes
- TL commission duplication fix - total_tl_earned only sums from TL/SM roles
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SE_EMAIL = "aleesha@clt-academy.com"
SE_PASSWORD = "Aleesha@123"


class TestCommissionTransactions:
    """Commission Transaction CRUD and Approval Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.current_month = datetime.now().strftime("%Y-%m")
    
    def login_ceo(self):
        """Login as CEO and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        data = response.json()
        token = data.get("access_token")
        assert token, "No access_token in response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return data
    
    def login_se(self):
        """Login as Sales Executive and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SE_EMAIL,
            "password": SE_PASSWORD
        })
        assert response.status_code == 200, f"SE login failed: {response.text}"
        data = response.json()
        token = data.get("access_token")
        assert token, "No access_token in response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return data
    
    # ==================== GENERATE TRANSACTIONS ====================
    
    def test_generate_transactions_ceo_only(self):
        """Test that only CEO can generate transactions"""
        # Login as SE first
        self.login_se()
        response = self.session.post(f"{BASE_URL}/api/commissions/generate-transactions", json={
            "month": self.current_month
        })
        assert response.status_code == 403, f"SE should not be able to generate transactions: {response.text}"
    
    def test_generate_transactions_success(self):
        """Test CEO can generate transactions"""
        self.login_ceo()
        response = self.session.post(f"{BASE_URL}/api/commissions/generate-transactions", json={
            "month": self.current_month
        }, timeout=60)  # Long timeout as this can take time
        assert response.status_code == 200, f"Generate transactions failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "created" in data
        print(f"Generated {data['created']} transactions for {self.current_month}")
    
    # ==================== GET TRANSACTIONS ====================
    
    def test_get_transactions_ceo(self):
        """Test CEO can get all transactions"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        assert response.status_code == 200, f"Get transactions failed: {response.text}"
        data = response.json()
        assert "transactions" in data
        assert "summary" in data
        assert "total" in data["summary"]
        assert "pending_count" in data["summary"]
        assert "approved_count" in data["summary"]
        print(f"Found {data['summary']['total']} transactions, {data['summary']['pending_count']} pending, {data['summary']['approved_count']} approved")
    
    def test_get_transactions_filter_by_department(self):
        """Test filtering transactions by department"""
        self.login_ceo()
        # Test sales filter
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}&department=sales")
        assert response.status_code == 200
        data = response.json()
        for txn in data["transactions"]:
            assert txn["department"] == "sales", f"Expected sales department, got {txn['department']}"
        
        # Test CS filter
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}&department=cs")
        assert response.status_code == 200
        data = response.json()
        for txn in data["transactions"]:
            assert txn["department"] == "cs", f"Expected cs department, got {txn['department']}"
    
    def test_get_transactions_filter_by_status(self):
        """Test filtering transactions by status"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}&status=pending")
        assert response.status_code == 200
        data = response.json()
        for txn in data["transactions"]:
            assert txn["status"] == "pending", f"Expected pending status, got {txn['status']}"
    
    def test_get_transactions_non_ceo_sees_own_only(self):
        """Test that non-CEO users only see their own transactions"""
        login_data = self.login_se()
        user_id = login_data["user"]["id"]
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        assert response.status_code == 200
        data = response.json()
        # All transactions should belong to this user
        for txn in data["transactions"]:
            assert txn["agent_id"] == user_id, f"SE should only see own transactions"
    
    # ==================== APPROVE SINGLE TRANSACTION ====================
    
    def test_approve_single_transaction_ceo_only(self):
        """Test that only CEO can approve transactions"""
        # First get a transaction ID as CEO
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}&status=pending")
        assert response.status_code == 200
        data = response.json()
        
        if not data["transactions"]:
            pytest.skip("No pending transactions to test")
        
        txn_id = data["transactions"][0]["id"]
        
        # Now try to approve as SE
        self.login_se()
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/{txn_id}/approve")
        assert response.status_code == 403, f"SE should not be able to approve: {response.text}"
    
    def test_approve_single_transaction_success(self):
        """Test CEO can approve a single transaction"""
        self.login_ceo()
        # Get a pending transaction
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}&status=pending")
        assert response.status_code == 200
        data = response.json()
        
        if not data["transactions"]:
            pytest.skip("No pending transactions to test")
        
        txn_id = data["transactions"][0]["id"]
        
        # Approve it
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/{txn_id}/approve")
        assert response.status_code == 200, f"Approve failed: {response.text}"
        result = response.json()
        assert result["id"] == txn_id
        assert "approved" in result["message"].lower()
        
        # Verify it's now approved
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        data = response.json()
        approved_txn = next((t for t in data["transactions"] if t["id"] == txn_id), None)
        assert approved_txn is not None
        assert approved_txn["status"] == "approved"
    
    def test_approve_nonexistent_transaction(self):
        """Test approving a non-existent transaction returns 404"""
        self.login_ceo()
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/nonexistent-id-12345/approve")
        assert response.status_code == 404
    
    # ==================== BULK APPROVE ====================
    
    def test_bulk_approve_ceo_only(self):
        """Test that only CEO can bulk approve"""
        self.login_se()
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/bulk-approve", json={
            "month": self.current_month
        })
        assert response.status_code == 403
    
    def test_bulk_approve_by_department(self):
        """Test CEO can bulk approve by department"""
        self.login_ceo()
        
        # First generate some transactions to ensure we have data
        self.session.post(f"{BASE_URL}/api/commissions/generate-transactions", json={
            "month": self.current_month
        }, timeout=60)
        
        # Bulk approve sales
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/bulk-approve", json={
            "month": self.current_month,
            "department": "sales"
        })
        assert response.status_code == 200, f"Bulk approve failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Bulk approve result: {data['message']}")
    
    def test_bulk_approve_all_pending(self):
        """Test CEO can bulk approve all pending transactions"""
        self.login_ceo()
        response = self.session.post(f"{BASE_URL}/api/commissions/transactions/bulk-approve", json={
            "month": self.current_month
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    # ==================== EDIT TRANSACTION ====================
    
    def test_edit_transaction_ceo_only(self):
        """Test that only CEO can edit transactions"""
        # Get a transaction ID as CEO
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        data = response.json()
        
        if not data["transactions"]:
            pytest.skip("No transactions to test")
        
        txn_id = data["transactions"][0]["id"]
        
        # Try to edit as SE
        self.login_se()
        response = self.session.put(f"{BASE_URL}/api/commissions/transactions/{txn_id}", json={
            "final_commission": 500,
            "ceo_notes": "Test edit"
        })
        assert response.status_code == 403
    
    def test_edit_transaction_success(self):
        """Test CEO can edit commission amount and notes"""
        self.login_ceo()
        
        # Generate transactions first
        self.session.post(f"{BASE_URL}/api/commissions/generate-transactions", json={
            "month": self.current_month
        }, timeout=60)
        
        # Get a transaction
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        data = response.json()
        
        if not data["transactions"]:
            pytest.skip("No transactions to test")
        
        txn = data["transactions"][0]
        txn_id = txn["id"]
        original_commission = txn.get("final_commission", txn.get("calculated_commission", 0))
        
        # Edit it
        new_commission = 999.99
        response = self.session.put(f"{BASE_URL}/api/commissions/transactions/{txn_id}", json={
            "final_commission": new_commission,
            "ceo_notes": "CEO adjusted commission for testing",
            "approve": True
        })
        assert response.status_code == 200, f"Edit failed: {response.text}"
        
        # Verify the edit
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        data = response.json()
        edited_txn = next((t for t in data["transactions"] if t["id"] == txn_id), None)
        assert edited_txn is not None
        assert edited_txn["final_commission"] == new_commission
        assert edited_txn["ceo_notes"] == "CEO adjusted commission for testing"
        assert edited_txn["status"] == "approved"
        assert edited_txn.get("original_commission") is not None
    
    def test_edit_nonexistent_transaction(self):
        """Test editing a non-existent transaction returns 404"""
        self.login_ceo()
        response = self.session.put(f"{BASE_URL}/api/commissions/transactions/nonexistent-id-12345", json={
            "final_commission": 500
        })
        assert response.status_code == 404


class TestTLCommissionDuplicationFix:
    """Test TL commission duplication fix - total_tl_earned should only sum from TL/SM roles"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.current_month = datetime.now().strftime("%Y-%m")
    
    def login_ceo(self):
        """Login as CEO and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return data
    
    def test_ceo_dashboard_tl_earned_only_from_tl_sm(self):
        """Test that total_tl_earned only sums from TL/SM roles, not SE rows"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/dashboard?month={self.current_month}")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # CEO should see sales_commissions with is_tl_or_sm flag
        assert "sales_commissions" in data, "CEO dashboard should have sales_commissions"
        
        # Verify total_tl_earned calculation
        sales_data = data.get("sales_commissions", [])
        
        # Calculate expected TL earned (only from TL/SM rows)
        expected_tl_earned = sum(
            s.get("earned_tl", 0) 
            for s in sales_data 
            if s.get("is_tl_or_sm") == True
        )
        
        # Calculate what it would be if we summed ALL rows (the bug)
        buggy_tl_earned = sum(s.get("earned_tl", 0) for s in sales_data)
        
        actual_tl_earned = data.get("total_tl_earned", 0)
        
        print(f"Expected TL earned (TL/SM only): {expected_tl_earned}")
        print(f"Buggy TL earned (all rows): {buggy_tl_earned}")
        print(f"Actual TL earned from API: {actual_tl_earned}")
        
        # The actual should match expected (TL/SM only), not the buggy calculation
        assert actual_tl_earned == expected_tl_earned, \
            f"TL earned should only sum from TL/SM rows. Expected {expected_tl_earned}, got {actual_tl_earned}"
    
    def test_sales_commissions_have_is_tl_or_sm_flag(self):
        """Test that sales_commissions rows have is_tl_or_sm flag"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/dashboard?month={self.current_month}")
        assert response.status_code == 200
        data = response.json()
        
        sales_data = data.get("sales_commissions", [])
        if not sales_data:
            pytest.skip("No sales commissions data")
        
        # Check that is_tl_or_sm flag exists
        for s in sales_data:
            assert "is_tl_or_sm" in s, f"Missing is_tl_or_sm flag in sales commission row: {s.get('agent_name')}"
            # Verify the flag is boolean
            assert isinstance(s["is_tl_or_sm"], bool), f"is_tl_or_sm should be boolean"
    
    def test_tl_pending_only_from_tl_sm(self):
        """Test that total_tl_pending only sums from TL/SM roles"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/dashboard?month={self.current_month}")
        assert response.status_code == 200
        data = response.json()
        
        sales_data = data.get("sales_commissions", [])
        
        # Calculate expected TL pending (only from TL/SM rows)
        expected_tl_pending = sum(
            s.get("pending_tl", 0) 
            for s in sales_data 
            if s.get("is_tl_or_sm") == True
        )
        
        actual_tl_pending = data.get("total_tl_pending", 0)
        
        assert actual_tl_pending == expected_tl_pending, \
            f"TL pending should only sum from TL/SM rows. Expected {expected_tl_pending}, got {actual_tl_pending}"


class TestTransactionDataStructure:
    """Test transaction data structure and fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.current_month = datetime.now().strftime("%Y-%m")
    
    def login_ceo(self):
        """Login as CEO"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        data = response.json()
        token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_transaction_has_required_fields(self):
        """Test that transactions have all required fields"""
        self.login_ceo()
        
        # Generate transactions first
        self.session.post(f"{BASE_URL}/api/commissions/generate-transactions", json={
            "month": self.current_month
        }, timeout=60)
        
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        assert response.status_code == 200
        data = response.json()
        
        if not data["transactions"]:
            pytest.skip("No transactions to test")
        
        txn = data["transactions"][0]
        
        # Required fields
        required_fields = [
            "id", "source_id", "source_type", "department", "commission_type",
            "agent_id", "agent_name", "student_name", "amount", "course_matched",
            "calculated_commission", "final_commission", "month", "status"
        ]
        
        for field in required_fields:
            assert field in txn, f"Missing required field: {field}"
        
        # Verify types
        assert isinstance(txn["id"], str)
        assert isinstance(txn["amount"], (int, float))
        assert isinstance(txn["final_commission"], (int, float))
        assert txn["status"] in ["pending", "approved"]
        assert txn["department"] in ["sales", "cs"]
    
    def test_transaction_summary_structure(self):
        """Test that transaction summary has correct structure"""
        self.login_ceo()
        response = self.session.get(f"{BASE_URL}/api/commissions/transactions?month={self.current_month}")
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert "total" in summary
        assert "pending_count" in summary
        assert "approved_count" in summary
        assert "total_pending_amount" in summary
        assert "total_approved_amount" in summary
        
        # Verify counts match
        txns = data["transactions"]
        assert summary["total"] == len(txns)
        assert summary["pending_count"] == sum(1 for t in txns if t["status"] == "pending")
        assert summary["approved_count"] == sum(1 for t in txns if t["status"] == "approved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
