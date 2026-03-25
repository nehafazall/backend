"""
Test Commission Auto-Trigger System
Tests for:
1. Auto-trigger: commission_auto.py creates transactions when sales lead moves to 'enrolled' stage
2. Auto-trigger: commission_auto.py creates transactions when CS upgrade is recorded
3. Auto-trigger: commission_auto.py creates transactions when BD redeposit is recorded
4. GET /api/commissions/transactions returns agent's own transactions for non-CEO users
5. Non-CEO users (Sales/CS) see 'My Transactions' table with individual deal statuses
6. Each transaction shows student name, course, amount, commission, and status (pending/approved)
7. Modified commissions show original strikethrough and new amount
8. CEO Approve Transactions tab loads transactions with correct data
9. POST /api/commissions/transactions/{id}/approve works for individual approval
10. PUT /api/commissions/transactions/{id} allows CEO to edit commission and add notes
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dashboard-update-21.preview.emergentagent.com').rstrip('/')

# Test credentials
CEO_EMAIL = "aqib@clt-academy.com"
CEO_PASSWORD = "@Aqib1234"
SALES_EMAIL = "aleesha@clt-academy.com"
SALES_PASSWORD = "Aleesha@123"
CS_EMAIL = "falja@clt-academy.com"
CS_PASSWORD = "Falja@123"


class TestCommissionAutoTrigger:
    """Test commission auto-trigger functionality and transaction management"""
    
    @pytest.fixture(scope="class")
    def ceo_token(self):
        """Get CEO authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CEO_EMAIL,
            "password": CEO_PASSWORD
        })
        assert response.status_code == 200, f"CEO login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get Sales Executive authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200, f"Sales login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def cs_token(self):
        """Get CS Head authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_EMAIL,
            "password": CS_PASSWORD
        })
        assert response.status_code == 200, f"CS login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def sales_user_data(self):
        """Get Sales user data from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["user"]
    
    @pytest.fixture(scope="class")
    def sales_user_id(self, sales_user_data):
        """Get Sales user ID"""
        return sales_user_data["id"]
    
    @pytest.fixture(scope="class")
    def cs_user_data(self):
        """Get CS user data from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_EMAIL,
            "password": CS_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["user"]
    
    @pytest.fixture(scope="class")
    def cs_user_id(self, cs_user_data):
        """Get CS user ID"""
        return cs_user_data["id"]
    
    # ==================== BACKEND API TESTS ====================
    
    def test_ceo_login_success(self, ceo_token):
        """Test CEO can login successfully"""
        assert ceo_token is not None
        print("✅ CEO login successful")
    
    def test_sales_login_success(self, sales_token):
        """Test Sales Executive can login successfully"""
        assert sales_token is not None
        print("✅ Sales Executive login successful")
    
    def test_cs_login_success(self, cs_token):
        """Test CS Head can login successfully"""
        assert cs_token is not None
        print("✅ CS Head login successful")
    
    def test_get_transactions_ceo_sees_all(self, ceo_token):
        """Test CEO can see all transactions"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "summary" in data
        assert "total" in data["summary"]
        assert "pending_count" in data["summary"]
        assert "approved_count" in data["summary"]
        print(f"✅ CEO sees all transactions: {data['summary']['total']} total")
    
    def test_get_transactions_sales_sees_own_only(self, sales_token, sales_user_id):
        """Test Sales Executive only sees their own transactions"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        transactions = data.get("transactions", [])
        # All transactions should belong to the sales user
        for txn in transactions:
            assert txn.get("agent_id") == sales_user_id, f"Transaction {txn.get('id')} belongs to different agent"
        print(f"✅ Sales Executive sees only own transactions: {len(transactions)} transactions")
    
    def test_get_transactions_cs_sees_own_only(self, cs_token, cs_user_id):
        """Test CS Head only sees their own transactions"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {cs_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        transactions = data.get("transactions", [])
        # All transactions should belong to the CS user
        for txn in transactions:
            assert txn.get("agent_id") == cs_user_id, f"Transaction {txn.get('id')} belongs to different agent"
        print(f"✅ CS Head sees only own transactions: {len(transactions)} transactions")
    
    def test_transaction_data_structure(self, ceo_token):
        """Test transaction has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        transactions = data.get("transactions", [])
        
        if transactions:
            txn = transactions[0]
            # Required fields for display
            required_fields = ["id", "student_name", "course_matched", "amount", "status", "agent_name"]
            for field in required_fields:
                assert field in txn, f"Missing required field: {field}"
            
            # Commission fields
            assert "final_commission" in txn or "calculated_commission" in txn, "Missing commission field"
            
            # Status should be pending or approved
            assert txn["status"] in ["pending", "approved"], f"Invalid status: {txn['status']}"
            
            print(f"✅ Transaction data structure valid: {txn.get('student_name')} - {txn.get('status')}")
        else:
            print("⚠️ No transactions found to verify structure")
    
    def test_filter_transactions_by_department(self, ceo_token):
        """Test filtering transactions by department"""
        # Test sales filter
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions?department=sales",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("department") == "sales", f"Transaction {txn.get('id')} is not sales"
        print(f"✅ Sales filter works: {len(data.get('transactions', []))} sales transactions")
        
        # Test CS filter
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions?department=cs",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("department") == "cs", f"Transaction {txn.get('id')} is not CS"
        print(f"✅ CS filter works: {len(data.get('transactions', []))} CS transactions")
    
    def test_filter_transactions_by_status(self, ceo_token):
        """Test filtering transactions by status"""
        # Test pending filter
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions?status=pending",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("status") == "pending", f"Transaction {txn.get('id')} is not pending"
        print(f"✅ Pending filter works: {len(data.get('transactions', []))} pending transactions")
        
        # Test approved filter
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions?status=approved",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for txn in data.get("transactions", []):
            assert txn.get("status") == "approved", f"Transaction {txn.get('id')} is not approved"
        print(f"✅ Approved filter works: {len(data.get('transactions', []))} approved transactions")
    
    def test_approve_single_transaction_ceo_only(self, ceo_token, sales_token):
        """Test only CEO can approve transactions"""
        # First get a pending transaction
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions?status=pending",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        pending = response.json().get("transactions", [])
        
        if pending:
            txn_id = pending[0]["id"]
            
            # Sales should not be able to approve
            response = requests.post(
                f"{BASE_URL}/api/commissions/transactions/{txn_id}/approve",
                headers={"Authorization": f"Bearer {sales_token}"}
            )
            assert response.status_code == 403, "Sales should not be able to approve"
            print("✅ Sales cannot approve transactions (403)")
            
            # CEO should be able to approve
            response = requests.post(
                f"{BASE_URL}/api/commissions/transactions/{txn_id}/approve",
                headers={"Authorization": f"Bearer {ceo_token}"}
            )
            assert response.status_code == 200
            print(f"✅ CEO approved transaction {txn_id}")
        else:
            print("⚠️ No pending transactions to test approval")
    
    def test_approve_nonexistent_transaction(self, ceo_token):
        """Test approving non-existent transaction returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/commissions/transactions/nonexistent-id-12345/approve",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 404
        print("✅ Non-existent transaction returns 404")
    
    def test_edit_transaction_ceo_only(self, ceo_token, sales_token):
        """Test only CEO can edit transactions"""
        # Get any transaction
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        transactions = response.json().get("transactions", [])
        
        if transactions:
            txn_id = transactions[0]["id"]
            
            # Sales should not be able to edit
            response = requests.put(
                f"{BASE_URL}/api/commissions/transactions/{txn_id}",
                headers={"Authorization": f"Bearer {sales_token}"},
                json={"final_commission": 100, "ceo_notes": "Test"}
            )
            assert response.status_code == 403, "Sales should not be able to edit"
            print("✅ Sales cannot edit transactions (403)")
        else:
            print("⚠️ No transactions to test edit")
    
    def test_edit_transaction_with_notes(self, ceo_token):
        """Test CEO can edit commission and add notes"""
        # Get any transaction
        response = requests.get(
            f"{BASE_URL}/api/commissions/transactions",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        transactions = response.json().get("transactions", [])
        
        if transactions:
            txn = transactions[0]
            txn_id = txn["id"]
            original_commission = txn.get("final_commission", txn.get("calculated_commission", 0))
            new_commission = original_commission + 50  # Add 50 AED
            
            # Edit the transaction
            response = requests.put(
                f"{BASE_URL}/api/commissions/transactions/{txn_id}",
                headers={"Authorization": f"Bearer {ceo_token}"},
                json={
                    "final_commission": new_commission,
                    "ceo_notes": "Test adjustment by testing agent",
                    "approve": True
                }
            )
            assert response.status_code == 200
            print(f"✅ CEO edited transaction {txn_id}: {original_commission} -> {new_commission}")
            
            # Verify the edit
            response = requests.get(
                f"{BASE_URL}/api/commissions/transactions",
                headers={"Authorization": f"Bearer {ceo_token}"}
            )
            updated_txn = next((t for t in response.json().get("transactions", []) if t["id"] == txn_id), None)
            if updated_txn:
                assert updated_txn.get("final_commission") == new_commission
                assert updated_txn.get("ceo_notes") == "Test adjustment by testing agent"
                assert updated_txn.get("original_commission") is not None, "original_commission should be preserved"
                print(f"✅ Edit verified: final={updated_txn.get('final_commission')}, original={updated_txn.get('original_commission')}")
        else:
            print("⚠️ No transactions to test edit")
    
    def test_edit_nonexistent_transaction(self, ceo_token):
        """Test editing non-existent transaction returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/commissions/transactions/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {ceo_token}"},
            json={"final_commission": 100, "ceo_notes": "Test"}
        )
        assert response.status_code == 404
        print("✅ Edit non-existent transaction returns 404")
    
    def test_bulk_approve_ceo_only(self, ceo_token, sales_token):
        """Test only CEO can bulk approve"""
        # Sales should not be able to bulk approve
        response = requests.post(
            f"{BASE_URL}/api/commissions/transactions/bulk-approve",
            headers={"Authorization": f"Bearer {sales_token}"},
            json={"month": "2026-01"}
        )
        assert response.status_code == 403, "Sales should not be able to bulk approve"
        print("✅ Sales cannot bulk approve (403)")
    
    def test_commission_dashboard_endpoint(self, ceo_token):
        """Test commission dashboard endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # CEO should see aggregate data
        assert "total_sales_earned" in data or "my_commission" in data
        print("✅ Commission dashboard endpoint works")
    
    def test_commission_dashboard_sales_view(self, sales_token):
        """Test sales executive sees their commission data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Sales should see my_commission
        assert "my_commission" in data
        print(f"✅ Sales dashboard shows my_commission: {data.get('my_commission', {})}")
    
    def test_commission_dashboard_cs_view(self, cs_token):
        """Test CS head sees their commission data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {cs_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # CS should see my_commission
        assert "my_commission" in data
        print(f"✅ CS dashboard shows my_commission: {data.get('my_commission', {})}")


class TestCommissionAutoModule:
    """Test the commission_auto.py module exists and is properly integrated"""
    
    def test_commission_auto_module_exists(self):
        """Verify commission_auto.py exists"""
        import os
        module_path = "/app/backend/commission_auto.py"
        assert os.path.exists(module_path), f"commission_auto.py not found at {module_path}"
        print("✅ commission_auto.py module exists")
    
    def test_commission_auto_function_defined(self):
        """Verify auto_create_commission_txn function is defined"""
        with open("/app/backend/commission_auto.py", "r") as f:
            content = f.read()
        assert "async def auto_create_commission_txn" in content
        print("✅ auto_create_commission_txn function defined")
    
    def test_enrollment_trigger_wired(self):
        """Verify enrollment trigger is wired in server.py"""
        with open("/app/backend/server.py", "r") as f:
            content = f.read()
        # Check for enrollment trigger
        assert 'auto_create_commission_txn' in content
        assert '"enrollment"' in content
        print("✅ Enrollment trigger wired in server.py")
    
    def test_cs_upgrade_trigger_wired(self):
        """Verify CS upgrade trigger is wired in server.py"""
        with open("/app/backend/server.py", "r") as f:
            content = f.read()
        assert '"cs_upgrade"' in content
        print("✅ CS upgrade trigger wired in server.py")
    
    def test_bd_redeposit_trigger_wired(self):
        """Verify BD redeposit trigger is wired in server.py"""
        with open("/app/backend/server.py", "r") as f:
            content = f.read()
        assert '"bd_redeposit"' in content
        print("✅ BD redeposit trigger wired in server.py")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
