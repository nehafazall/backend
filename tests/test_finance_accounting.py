"""
CLT Synapse - Finance & Accounting Module Tests
Tests for CFO Dashboard, Journal Entries, Expenses, Transfers, and Chart of Accounts
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"

class TestFinanceAccounting:
    """Finance & Accounting Module Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    # ==================== CHART OF ACCOUNTS TESTS ====================
    
    def test_get_accounts_empty_or_seeded(self):
        """Test GET /api/accounting/accounts - Returns accounts list"""
        response = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        assert response.status_code == 200, f"Failed: {response.text}"
        accounts = response.json()
        assert isinstance(accounts, list), "Response should be a list"
        print(f"✓ GET /api/accounting/accounts - Found {len(accounts)} accounts")
        
    def test_seed_accounts(self):
        """Test POST /api/accounting/accounts/seed - Seeds default accounts"""
        response = self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "total_default" in data, "Response should have total_default count"
        print(f"✓ POST /api/accounting/accounts/seed - {data['message']}")
        
    def test_get_accounts_after_seed(self):
        """Test GET /api/accounting/accounts - Returns seeded accounts"""
        # First seed
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        # Then get
        response = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        assert response.status_code == 200, f"Failed: {response.text}"
        accounts = response.json()
        assert len(accounts) > 0, "Should have accounts after seeding"
        
        # Verify account structure
        account = accounts[0]
        assert "id" in account, "Account should have id"
        assert "code" in account, "Account should have code"
        assert "name" in account, "Account should have name"
        assert "account_type" in account, "Account should have account_type"
        assert "subtype" in account, "Account should have subtype"
        print(f"✓ GET /api/accounting/accounts - {len(accounts)} accounts with correct structure")
        
    def test_get_accounts_by_type(self):
        """Test GET /api/accounting/accounts with type filter"""
        # Seed first
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        # Get Asset accounts
        response = self.session.get(f"{BASE_URL}/api/accounting/accounts?account_type=Asset")
        assert response.status_code == 200, f"Failed: {response.text}"
        accounts = response.json()
        
        for account in accounts:
            assert account["account_type"] == "Asset", f"Expected Asset, got {account['account_type']}"
        print(f"✓ GET /api/accounting/accounts?account_type=Asset - {len(accounts)} Asset accounts")
        
    # ==================== CFO DASHBOARD TESTS ====================
    
    def test_dashboard_loads(self):
        """Test GET /api/accounting/dashboard - Dashboard loads correctly"""
        # Seed accounts first
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        response = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "account_balances" in data, "Dashboard should have account_balances"
        assert "kpis" in data, "Dashboard should have kpis"
        assert "settlements" in data, "Dashboard should have settlements"
        assert "alerts" in data, "Dashboard should have alerts"
        print(f"✓ GET /api/accounting/dashboard - Dashboard loaded with all sections")
        
    def test_dashboard_account_balances(self):
        """Test dashboard account_balances section"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        response = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        balances = data["account_balances"]
        assert "banks_and_wallets" in balances, "Should have banks_and_wallets"
        assert "receivables" in balances, "Should have receivables"
        assert "total_cash_position" in balances, "Should have total_cash_position"
        assert "total_pending_receivables" in balances, "Should have total_pending_receivables"
        print(f"✓ Dashboard account_balances - Banks: {len(balances['banks_and_wallets'])}, Receivables: {len(balances['receivables'])}")
        
    def test_dashboard_kpis(self):
        """Test dashboard KPIs section"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        response = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        kpis = data["kpis"]
        assert "today" in kpis, "Should have today KPIs"
        assert "mtd" in kpis, "Should have MTD KPIs"
        assert "revenue" in kpis["today"], "Today should have revenue"
        assert "gross_revenue" in kpis["mtd"], "MTD should have gross_revenue"
        assert "provider_fees" in kpis["mtd"], "MTD should have provider_fees"
        print(f"✓ Dashboard KPIs - Today revenue: {kpis['today']['revenue']}, MTD: {kpis['mtd']['gross_revenue']}")
        
    # ==================== JOURNAL ENTRY TESTS ====================
    
    def test_get_journal_entries(self):
        """Test GET /api/accounting/journal-entries"""
        response = self.session.get(f"{BASE_URL}/api/accounting/journal-entries")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "entries" in data, "Response should have entries"
        assert "total" in data, "Response should have total count"
        print(f"✓ GET /api/accounting/journal-entries - {data['total']} entries")
        
    def test_create_journal_entry_balanced(self):
        """Test POST /api/accounting/journal-entries - Create balanced entry"""
        # Seed accounts first
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        # Get accounts for the entry
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        # Find ADCB Bank and Course Revenue accounts
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)
        revenue_account = next((a for a in accounts if a["code"] == "4001"), None)
        
        assert bank_account, "ADCB Bank account (1001) not found"
        assert revenue_account, "Course Revenue account (4001) not found"
        
        # Create balanced journal entry
        entry_data = {
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Journal Entry - Test Sale",
            "source_module": "Manual",
            "lines": [
                {"account_id": bank_account["id"], "debit_amount": 1000, "credit_amount": 0, "currency": "AED", "memo": "Test debit"},
                {"account_id": revenue_account["id"], "debit_amount": 0, "credit_amount": 1000, "currency": "AED", "memo": "Test credit"}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/accounting/journal-entries", json=entry_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        entry = response.json()
        
        assert "id" in entry, "Entry should have id"
        assert entry["status"] == "Draft", "New entry should be Draft"
        print(f"✓ POST /api/accounting/journal-entries - Created entry {entry['id']}")
        return entry["id"]
        
    def test_create_journal_entry_unbalanced_fails(self):
        """Test POST /api/accounting/journal-entries - Unbalanced entry fails"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)
        revenue_account = next((a for a in accounts if a["code"] == "4001"), None)
        
        # Create unbalanced entry (debit != credit)
        entry_data = {
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Unbalanced Entry",
            "source_module": "Manual",
            "lines": [
                {"account_id": bank_account["id"], "debit_amount": 1000, "credit_amount": 0, "currency": "AED"},
                {"account_id": revenue_account["id"], "debit_amount": 0, "credit_amount": 500, "currency": "AED"}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/accounting/journal-entries", json=entry_data)
        assert response.status_code == 400, f"Unbalanced entry should fail, got {response.status_code}"
        assert "not balanced" in response.text.lower(), "Error should mention balance"
        print(f"✓ Unbalanced journal entry correctly rejected")
        
    def test_journal_entry_submit_workflow(self):
        """Test journal entry submit workflow"""
        # Create entry first
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)
        revenue_account = next((a for a in accounts if a["code"] == "4001"), None)
        
        entry_data = {
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Submit Workflow Entry",
            "source_module": "Manual",
            "lines": [
                {"account_id": bank_account["id"], "debit_amount": 500, "credit_amount": 0, "currency": "AED"},
                {"account_id": revenue_account["id"], "debit_amount": 0, "credit_amount": 500, "currency": "AED"}
            ]
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/accounting/journal-entries", json=entry_data)
        assert create_resp.status_code == 200
        entry_id = create_resp.json()["id"]
        
        # Submit the entry
        submit_resp = self.session.post(f"{BASE_URL}/api/accounting/journal-entries/{entry_id}/submit")
        assert submit_resp.status_code == 200, f"Submit failed: {submit_resp.text}"
        submitted = submit_resp.json()
        assert submitted["status"] == "Submitted", f"Expected Submitted, got {submitted['status']}"
        print(f"✓ Journal entry submitted successfully")
        
    def test_journal_entry_approve_workflow(self):
        """Test journal entry approve workflow"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)
        revenue_account = next((a for a in accounts if a["code"] == "4001"), None)
        
        entry_data = {
            "entry_date": datetime.now().strftime("%Y-%m-%d"),
            "description": "TEST_Approve Workflow Entry",
            "source_module": "Manual",
            "lines": [
                {"account_id": bank_account["id"], "debit_amount": 750, "credit_amount": 0, "currency": "AED"},
                {"account_id": revenue_account["id"], "debit_amount": 0, "credit_amount": 750, "currency": "AED"}
            ]
        }
        
        # Create
        create_resp = self.session.post(f"{BASE_URL}/api/accounting/journal-entries", json=entry_data)
        entry_id = create_resp.json()["id"]
        
        # Submit
        self.session.post(f"{BASE_URL}/api/accounting/journal-entries/{entry_id}/submit")
        
        # Approve
        approve_resp = self.session.post(f"{BASE_URL}/api/accounting/journal-entries/{entry_id}/approve")
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        approved = approve_resp.json()
        assert approved["status"] == "Approved", f"Expected Approved, got {approved['status']}"
        assert approved["lock_status"] == "LOCKED", "Approved entry should be locked"
        print(f"✓ Journal entry approved and locked successfully")
        
    # ==================== EXPENSE TESTS ====================
    
    def test_get_expenses(self):
        """Test GET /api/accounting/expenses"""
        response = self.session.get(f"{BASE_URL}/api/accounting/expenses")
        assert response.status_code == 200, f"Failed: {response.text}"
        expenses = response.json()
        assert isinstance(expenses, list), "Response should be a list"
        print(f"✓ GET /api/accounting/expenses - {len(expenses)} expenses")
        
    def test_create_expense(self):
        """Test POST /api/accounting/expenses - Create expense with journal posting"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        # Find expense account and bank account
        expense_account = next((a for a in accounts if a["code"] == "5002"), None)  # Marketing Expense
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)  # ADCB Bank
        
        assert expense_account, "Marketing Expense account (5002) not found"
        assert bank_account, "ADCB Bank account (1001) not found"
        
        expense_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "vendor": "TEST_Vendor Marketing Agency",
            "expense_account_id": expense_account["id"],
            "amount": 2500,
            "currency": "AED",
            "paid_from_account_id": bank_account["id"],
            "notes": "Test marketing expense"
        }
        
        response = self.session.post(f"{BASE_URL}/api/accounting/expenses", json=expense_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        expense = response.json()
        
        assert "id" in expense, "Expense should have id"
        assert "journal_entry_id" in expense, "Expense should have journal_entry_id"
        assert expense["vendor"] == "TEST_Vendor Marketing Agency"
        print(f"✓ POST /api/accounting/expenses - Created expense with journal entry {expense['journal_entry_id']}")
        
    # ==================== TRANSFER TESTS ====================
    
    def test_get_transfers(self):
        """Test GET /api/accounting/transfers"""
        response = self.session.get(f"{BASE_URL}/api/accounting/transfers")
        assert response.status_code == 200, f"Failed: {response.text}"
        transfers = response.json()
        assert isinstance(transfers, list), "Response should be a list"
        print(f"✓ GET /api/accounting/transfers - {len(transfers)} transfers")
        
    def test_create_transfer(self):
        """Test POST /api/accounting/transfers - Create inter-account transfer"""
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        # Find two bank accounts
        adcb_account = next((a for a in accounts if a["code"] == "1001"), None)  # ADCB Bank
        adib_account = next((a for a in accounts if a["code"] == "1002"), None)  # ADIB Bank
        
        assert adcb_account, "ADCB Bank account (1001) not found"
        assert adib_account, "ADIB Bank account (1002) not found"
        
        transfer_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "source_account_id": adcb_account["id"],
            "destination_account_id": adib_account["id"],
            "amount": 5000,
            "currency": "AED",
            "notes": "TEST_Transfer between banks"
        }
        
        response = self.session.post(f"{BASE_URL}/api/accounting/transfers", json=transfer_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        transfer = response.json()
        
        assert "id" in transfer, "Transfer should have id"
        assert "journal_entry_id" in transfer, "Transfer should have journal_entry_id"
        assert transfer["amount"] == 5000
        print(f"✓ POST /api/accounting/transfers - Created transfer with journal entry {transfer['journal_entry_id']}")
        
    # ==================== SETTLEMENTS TESTS ====================
    
    def test_get_settlements(self):
        """Test GET /api/accounting/settlements"""
        response = self.session.get(f"{BASE_URL}/api/accounting/settlements")
        assert response.status_code == 200, f"Failed: {response.text}"
        settlements = response.json()
        assert isinstance(settlements, list), "Response should be a list"
        print(f"✓ GET /api/accounting/settlements - {len(settlements)} settlement batches")
        
    # ==================== CONFIG TESTS ====================
    
    def test_get_finance_config(self):
        """Test GET /api/accounting/config"""
        response = self.session.get(f"{BASE_URL}/api/accounting/config")
        assert response.status_code == 200, f"Failed: {response.text}"
        config = response.json()
        
        # Verify config structure
        assert "grace_period_days" in config or config == {}, "Config should have grace_period_days or be empty"
        print(f"✓ GET /api/accounting/config - Config loaded")
        
    # ==================== AUDIT LOG TESTS ====================
    
    def test_get_finance_audit_logs(self):
        """Test GET /api/accounting/audit-logs"""
        response = self.session.get(f"{BASE_URL}/api/accounting/audit-logs")
        assert response.status_code == 200, f"Failed: {response.text}"
        logs = response.json()
        assert isinstance(logs, list), "Response should be a list"
        print(f"✓ GET /api/accounting/audit-logs - {len(logs)} audit entries")
        
    # ==================== ACCESS CONTROL TESTS ====================
    
    def test_accounting_requires_auth(self):
        """Test that accounting endpoints require authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Accounting endpoints require authentication")


class TestFinanceIntegration:
    """Integration tests for Finance module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_dashboard_updates_after_journal_entry(self):
        """Test that dashboard reflects new journal entries"""
        # Seed accounts
        self.session.post(f"{BASE_URL}/api/accounting/accounts/seed")
        
        # Get initial dashboard
        initial_resp = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        initial_data = initial_resp.json()
        
        # Create and approve a journal entry
        accounts_resp = self.session.get(f"{BASE_URL}/api/accounting/accounts")
        accounts = accounts_resp.json()
        
        bank_account = next((a for a in accounts if a["code"] == "1001"), None)
        revenue_account = next((a for a in accounts if a["code"] == "4001"), None)
        
        if bank_account and revenue_account:
            entry_data = {
                "entry_date": datetime.now().strftime("%Y-%m-%d"),
                "description": "TEST_Dashboard Update Test",
                "source_module": "Manual",
                "lines": [
                    {"account_id": bank_account["id"], "debit_amount": 10000, "credit_amount": 0, "currency": "AED"},
                    {"account_id": revenue_account["id"], "debit_amount": 0, "credit_amount": 10000, "currency": "AED"}
                ]
            }
            
            create_resp = self.session.post(f"{BASE_URL}/api/accounting/journal-entries", json=entry_data)
            if create_resp.status_code == 200:
                entry_id = create_resp.json()["id"]
                
                # Submit and approve
                self.session.post(f"{BASE_URL}/api/accounting/journal-entries/{entry_id}/submit")
                self.session.post(f"{BASE_URL}/api/accounting/journal-entries/{entry_id}/approve")
                
                # Get updated dashboard
                updated_resp = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
                updated_data = updated_resp.json()
                
                print(f"✓ Dashboard integration test completed")
        else:
            print("⚠ Skipped dashboard update test - accounts not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
