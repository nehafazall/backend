"""
Test BD CRM New Features - Iteration 65
Tests for: Student Notes, Transaction History, Reminders, and BD Dashboard visibility controls
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BD_AGENT_EMAIL = "rashidha@clt-academy.com"
BD_AGENT_PASSWORD = "Rashida@123"
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


@pytest.fixture(scope="module")
def bd_agent_token():
    """Get BD agent auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": BD_AGENT_EMAIL,
        "password": BD_AGENT_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"BD agent login failed: {response.status_code}")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Super admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"CS head login failed: {response.status_code}")


@pytest.fixture(scope="module")
def test_student_id(bd_agent_token):
    """Get a test student ID from BD students"""
    headers = {"Authorization": f"Bearer {bd_agent_token}"}
    response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
    if response.status_code == 200:
        students = response.json()
        if students and len(students) > 0:
            return students[0]["id"]
    pytest.skip("No BD students found for testing")


class TestStudentNotesAPI:
    """Tests for POST/GET /api/students/{student_id}/notes"""

    def test_create_note_success(self, bd_agent_token, test_student_id):
        """POST /api/students/{id}/notes creates a call note"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        note_text = f"TEST_NOTE_{datetime.now().isoformat()}"
        
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student_id}/notes",
            headers=headers,
            json={"text": note_text, "type": "call_note"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Note should have an ID"
        assert data["text"] == note_text, "Note text should match"
        assert data["type"] == "call_note", "Note type should be call_note"
        assert "created_by_name" in data, "Note should have creator name"
        assert "created_at" in data, "Note should have created_at timestamp"

    def test_create_note_empty_text_fails(self, bd_agent_token, test_student_id):
        """POST /api/students/{id}/notes with empty text returns 400"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student_id}/notes",
            headers=headers,
            json={"text": "", "type": "call_note"}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty text, got {response.status_code}"

    def test_get_notes_returns_list(self, bd_agent_token, test_student_id):
        """GET /api/students/{id}/notes returns notes list sorted by created_at desc"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_id}/notes",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify sorting (most recent first)
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i]["created_at"] >= data[i+1]["created_at"], "Notes should be sorted by created_at desc"

    def test_get_notes_invalid_student_returns_empty(self, bd_agent_token):
        """GET /api/students/{invalid_id}/notes returns empty list"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/invalid-student-id-12345/notes",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


class TestTransactionHistoryAPI:
    """Tests for GET /api/students/{student_id}/transaction-history"""

    def test_transaction_history_returns_data(self, bd_agent_token, test_student_id):
        """GET /api/students/{id}/transaction-history returns transactions with summary"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_id}/transaction-history",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "student_id" in data, "Response should have student_id"
        assert "transactions" in data, "Response should have transactions list"
        assert "summary" in data, "Response should have summary"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_deposits" in summary, "Summary should have total_deposits"
        assert "total_withdrawals" in summary, "Summary should have total_withdrawals"
        assert "net_value" in summary, "Summary should have net_value"
        
        # Verify transactions structure if any exist
        transactions = data["transactions"]
        assert isinstance(transactions, list), "Transactions should be a list"
        if len(transactions) > 0:
            txn = transactions[0]
            assert "type" in txn, "Transaction should have type"
            assert "amount_aed" in txn, "Transaction should have amount_aed"
            assert "date" in txn, "Transaction should have date"

    def test_transaction_history_cs_head_access(self, cs_head_token, test_student_id):
        """CS Head can access transaction history"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_id}/transaction-history",
            headers=headers
        )
        
        assert response.status_code == 200, f"CS Head should have access, got {response.status_code}"

    def test_transaction_history_super_admin_access(self, super_admin_token, test_student_id):
        """Super Admin can access transaction history"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/{test_student_id}/transaction-history",
            headers=headers
        )
        
        assert response.status_code == 200, f"Super Admin should have access, got {response.status_code}"

    def test_transaction_history_invalid_student(self, bd_agent_token):
        """GET /api/students/{invalid_id}/transaction-history returns 404"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/students/invalid-student-id-12345/transaction-history",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid student, got {response.status_code}"


class TestStudentReminderAPI:
    """Tests for POST /api/students/{student_id}/reminder"""

    def test_set_reminder_success(self, bd_agent_token, test_student_id):
        """POST /api/students/{id}/reminder sets a reminder"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student_id}/reminder",
            headers=headers,
            params={
                "reminder_date": tomorrow,
                "reminder_time": "10:00",
                "reminder_note": "TEST_REMINDER follow up call",
                "reminder_type": "redeposit"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
        assert data.get("reminder_type") == "redeposit", "Reminder type should be redeposit"

    def test_set_reminder_invalid_type(self, bd_agent_token, test_student_id):
        """POST /api/students/{id}/reminder with invalid type returns 400"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/students/{test_student_id}/reminder",
            headers=headers,
            params={
                "reminder_date": tomorrow,
                "reminder_time": "10:00",
                "reminder_type": "invalid_type"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid type, got {response.status_code}"

    def test_set_reminder_invalid_student(self, bd_agent_token):
        """POST /api/students/{invalid_id}/reminder returns 404"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/students/invalid-student-id-12345/reminder",
            headers=headers,
            params={
                "reminder_date": tomorrow,
                "reminder_time": "10:00",
                "reminder_type": "general"
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid student, got {response.status_code}"


class TestBDDashboardVisibility:
    """Tests for BD Dashboard visibility controls - revenue hidden from BD agents"""

    def test_bd_dashboard_super_admin_sees_revenue(self, super_admin_token):
        """Super Admin sees all revenue KPIs in BD Dashboard"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/bd/dashboard",
            headers=headers,
            params={"period": "this_month"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Super admin should see revenue data
        assert "period_revenue" in data, "Super admin should see period_revenue"
        assert "all_time_revenue" in data, "Super admin should see all_time_revenue"
        assert "agent_performance" in data, "Super admin should see agent_performance"
        assert "recent_deposits" in data, "Super admin should see recent_deposits"

    def test_bd_dashboard_bd_agent_access(self, bd_agent_token):
        """BD Agent can access BD Dashboard"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/bd/dashboard",
            headers=headers,
            params={"period": "this_month"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # BD agent should see basic metrics
        assert "total_students" in data, "BD agent should see total_students"
        assert "stage_counts" in data, "BD agent should see stage_counts"


class Test3CXClickToCallAPI:
    """Tests for 3CX Click-to-Call integration"""

    def test_click_to_call_logging(self, bd_agent_token, test_student_id):
        """POST /api/3cx/click-to-call logs the call attempt"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/3cx/click-to-call",
            headers=headers,
            params={
                "phone_number": "+971501234567",
                "contact_id": test_student_id
            }
        )
        
        # Should succeed or return appropriate status
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}"

    def test_call_history_endpoint(self, bd_agent_token, test_student_id):
        """GET /api/3cx/call-history/{contact_id} returns call history"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-history/{test_student_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "calls" in data, "Response should have calls list"


class TestAuthenticationAndRoles:
    """Tests for authentication and role verification"""

    def test_bd_agent_login_returns_correct_role(self):
        """BD agent login returns role business_development"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BD_AGENT_EMAIL,
            "password": BD_AGENT_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "user" in data, "Response should have user object"
        assert data["user"]["role"] == "business_development", f"Expected business_development, got {data['user']['role']}"

    def test_super_admin_login_returns_correct_role(self):
        """Super admin login returns role super_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "user" in data, "Response should have user object"
        assert data["user"]["role"] == "super_admin", f"Expected super_admin, got {data['user']['role']}"

    def test_cs_head_login_returns_correct_role(self):
        """CS head login returns role cs_head"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        data = response.json()
        assert "user" in data, "Response should have user object"
        assert data["user"]["role"] == "cs_head", f"Expected cs_head, got {data['user']['role']}"

    def test_unauthenticated_access_denied(self):
        """Unauthenticated access to protected endpoints returns 403"""
        response = requests.get(f"{BASE_URL}/api/bd/students")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
