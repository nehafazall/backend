"""
SSHR (Self-Service HR) Module Tests
Tests for: Company Documents CRUD, Payslips, HR Approval Queue
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


class TestAuthentication:
    """Authentication tests for getting token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token received")


class TestCompanyDocuments:
    """Company Documents CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_company_documents(self, headers):
        """GET /api/hr/company-documents returns list"""
        response = requests.get(f"{BASE_URL}/api/hr/company-documents", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/hr/company-documents returns {len(data)} documents")
    
    def test_create_company_document(self, headers):
        """POST /api/hr/company-documents creates document"""
        # Calculate dates
        today = datetime.now()
        issue_date = today.strftime("%Y-%m-%d")
        expiry_date = (today + timedelta(days=365)).strftime("%Y-%m-%d")
        
        payload = {
            "document_type": "trade_license",
            "document_name": "TEST_Trade License 2025",
            "description": "Test document for automated testing",
            "document_number": "TEST-TL-2025-001",
            "issue_date": issue_date,
            "expiry_date": expiry_date,
            "issuing_authority": "DED Dubai",
            "document_url": "https://example.com/test-doc.pdf",
            "reminder_days": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/hr/company-documents", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data, "No id in response"
        assert data.get("message") == "Document created successfully"
        
        # Verify document was created
        doc_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/hr/company-documents", headers=headers)
        assert get_response.status_code == 200
        docs = get_response.json()
        created_doc = next((d for d in docs if d.get("id") == doc_id), None)
        assert created_doc is not None, "Created document not found in list"
        assert created_doc["document_name"] == "TEST_Trade License 2025"
        assert created_doc["document_type"] == "trade_license"
        
        print(f"✓ POST /api/hr/company-documents creates document with id: {doc_id}")
        return doc_id
    
    def test_update_company_document(self, headers):
        """PUT /api/hr/company-documents/{id} updates document"""
        # First create a document
        today = datetime.now()
        payload = {
            "document_type": "insurance_certificate",
            "document_name": "TEST_Insurance Cert",
            "document_number": "TEST-INS-001",
            "issue_date": today.strftime("%Y-%m-%d"),
            "expiry_date": (today + timedelta(days=180)).strftime("%Y-%m-%d"),
            "issuing_authority": "Insurance Co",
            "reminder_days": 30
        }
        
        create_response = requests.post(f"{BASE_URL}/api/hr/company-documents", json=payload, headers=headers)
        assert create_response.status_code == 200
        doc_id = create_response.json()["id"]
        
        # Update document
        update_payload = {
            "document_type": "insurance_certificate",
            "document_name": "TEST_Insurance Cert UPDATED",
            "document_number": "TEST-INS-001-UPD",
            "issue_date": today.strftime("%Y-%m-%d"),
            "expiry_date": (today + timedelta(days=365)).strftime("%Y-%m-%d"),
            "issuing_authority": "New Insurance Co",
            "reminder_days": 45
        }
        
        update_response = requests.put(f"{BASE_URL}/api/hr/company-documents/{doc_id}", json=update_payload, headers=headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/hr/company-documents", headers=headers)
        docs = get_response.json()
        updated_doc = next((d for d in docs if d.get("id") == doc_id), None)
        assert updated_doc is not None
        assert updated_doc["document_name"] == "TEST_Insurance Cert UPDATED"
        assert updated_doc["document_number"] == "TEST-INS-001-UPD"
        
        print(f"✓ PUT /api/hr/company-documents/{doc_id} updates document successfully")
    
    def test_delete_company_document(self, headers):
        """DELETE /api/hr/company-documents/{id} deletes document"""
        # First create a document to delete
        today = datetime.now()
        payload = {
            "document_type": "other",
            "document_name": "TEST_Doc to Delete",
            "document_number": "TEST-DEL-001",
            "issue_date": today.strftime("%Y-%m-%d"),
            "expiry_date": (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "reminder_days": 7
        }
        
        create_response = requests.post(f"{BASE_URL}/api/hr/company-documents", json=payload, headers=headers)
        assert create_response.status_code == 200
        doc_id = create_response.json()["id"]
        
        # Delete document
        delete_response = requests.delete(f"{BASE_URL}/api/hr/company-documents/{doc_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/hr/company-documents", headers=headers)
        docs = get_response.json()
        deleted_doc = next((d for d in docs if d.get("id") == doc_id), None)
        assert deleted_doc is None, "Document still exists after deletion"
        
        print(f"✓ DELETE /api/hr/company-documents/{doc_id} deletes document successfully")
    
    def test_get_expiring_documents(self, headers):
        """GET /api/hr/company-documents/expiring returns expiring docs"""
        response = requests.get(f"{BASE_URL}/api/hr/company-documents/expiring?days=90", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "expired" in data, "No 'expired' key in response"
        assert "expiring_soon" in data, "No 'expiring_soon' key in response"
        assert "total_alerts" in data, "No 'total_alerts' key in response"
        assert isinstance(data["expired"], list)
        assert isinstance(data["expiring_soon"], list)
        
        print(f"✓ GET /api/hr/company-documents/expiring returns {data['total_alerts']} alerts")
    
    def test_invalid_document_update_404(self, headers):
        """PUT /api/hr/company-documents/{invalid_id} returns 404"""
        payload = {
            "document_type": "other",
            "document_name": "Test"
        }
        response = requests.put(f"{BASE_URL}/api/hr/company-documents/invalid-id-123", json=payload, headers=headers)
        assert response.status_code == 404
        print(f"✓ Invalid document ID returns 404 as expected")


class TestPayslips:
    """Payslips API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_payslips(self, headers):
        """GET /api/ess/payslips returns user's payslips"""
        response = requests.get(f"{BASE_URL}/api/ess/payslips", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/ess/payslips returns {len(data)} payslips")
    
    def test_get_payslips_with_year_filter(self, headers):
        """GET /api/ess/payslips?year=2025 filters by year"""
        response = requests.get(f"{BASE_URL}/api/ess/payslips?year=2025", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All payslips should be from 2025
        for payslip in data:
            if payslip.get("month"):
                assert payslip["month"].startswith("2025"), f"Payslip month {payslip['month']} not in 2025"
        print(f"✓ GET /api/ess/payslips with year filter works correctly")


class TestHRApprovalQueue:
    """HR Approval Queue tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_pending_approvals(self, headers):
        """GET /api/ess/pending-approvals returns pending items"""
        response = requests.get(f"{BASE_URL}/api/ess/pending-approvals", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "leave_requests" in data, "No 'leave_requests' in response"
        assert "regularization_requests" in data, "No 'regularization_requests' in response"
        assert isinstance(data["leave_requests"], list)
        assert isinstance(data["regularization_requests"], list)
        
        total_pending = len(data["leave_requests"]) + len(data["regularization_requests"])
        print(f"✓ GET /api/ess/pending-approvals returns {total_pending} pending items")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_cleanup_test_documents(self, headers):
        """Clean up TEST_ prefixed documents"""
        # Get all documents
        response = requests.get(f"{BASE_URL}/api/hr/company-documents", headers=headers)
        if response.status_code == 200:
            docs = response.json()
            test_docs = [d for d in docs if d.get("document_name", "").startswith("TEST_")]
            for doc in test_docs:
                requests.delete(f"{BASE_URL}/api/hr/company-documents/{doc['id']}", headers=headers)
            print(f"✓ Cleaned up {len(test_docs)} test documents")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
