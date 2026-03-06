"""
Test Finance Settings CRUD endpoints and BioCloud sync endpoints
P0 Testing: ObjectId serialization fix verification + BioCloud sync reliability
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "aqib@clt-academy.com"
TEST_PASSWORD = "@Aqib1234"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # API returns access_token, not token
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAuthentication:
    """Test authentication works"""
    
    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("✅ Login successful")


class TestChartOfAccounts:
    """Chart of Accounts CRUD - Test ObjectId serialization fix"""
    
    def test_create_chart_of_account_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/chart-of-accounts - Should return JSON without _id"""
        test_code = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "code": test_code,
            "name": "Test Account for ObjectId Check",
            "type": "asset",
            "description": "Testing ObjectId serialization fix"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/chart-of-accounts",
            json=payload
        )
        
        # Should return 200/201 with valid JSON - no ObjectId serialization error
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field (ObjectId)"
        assert "id" in data, "Response should contain 'id' field"
        assert data["code"] == test_code
        assert data["name"] == "Test Account for ObjectId Check"
        print(f"✅ Chart of Account created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup - delete the test record
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/chart-of-accounts/{data['id']}")
    
    def test_get_chart_of_accounts(self, authenticated_client):
        """GET /api/finance/settings/chart-of-accounts"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/chart-of-accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET chart-of-accounts: {len(data)} records")


class TestCostCenters:
    """Cost Centers CRUD - Test ObjectId serialization fix"""
    
    def test_create_cost_center_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/cost-centers - Should return JSON without _id"""
        test_code = f"TEST_CC_{uuid.uuid4().hex[:8]}"
        payload = {
            "code": test_code,
            "name": "Test Cost Center",
            "department": "IT",
            "description": "Testing ObjectId serialization fix"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/cost-centers",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        assert data["code"] == test_code
        print(f"✅ Cost Center created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/cost-centers/{data['id']}")
    
    def test_get_cost_centers(self, authenticated_client):
        """GET /api/finance/settings/cost-centers"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/cost-centers")
        assert response.status_code == 200
        print(f"✅ GET cost-centers: {len(response.json())} records")


class TestPaymentMethods:
    """Payment Methods CRUD - Test ObjectId serialization fix"""
    
    def test_create_payment_method_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/payment-methods - Should return JSON without _id"""
        test_code = f"TEST_PM_{uuid.uuid4().hex[:8]}"
        payload = {
            "code": test_code,
            "name": "Test Payment Method",
            "type": "card",
            "description": "Testing ObjectId fix",
            "requires_proof": True
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/payment-methods",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        assert data["code"] == test_code
        print(f"✅ Payment Method created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/payment-methods/{data['id']}")
    
    def test_get_payment_methods(self, authenticated_client):
        """GET /api/finance/settings/payment-methods"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/payment-methods")
        assert response.status_code == 200
        print(f"✅ GET payment-methods: {len(response.json())} records")


class TestPaymentGateways:
    """Payment Gateways CRUD - Test ObjectId serialization fix"""
    
    def test_create_payment_gateway_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/payment-gateways - Should return JSON without _id"""
        test_code = f"TEST_PG_{uuid.uuid4().hex[:8]}"
        payload = {
            "code": test_code,
            "name": "Test Payment Gateway",
            "provider_type": "card_processor",
            "settlement_days": 2,
            "processing_fee_percent": 2.5,
            "currency": "AED"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/payment-gateways",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        assert data["code"] == test_code
        print(f"✅ Payment Gateway created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/payment-gateways/{data['id']}")
    
    def test_get_payment_gateways(self, authenticated_client):
        """GET /api/finance/settings/payment-gateways"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/payment-gateways")
        assert response.status_code == 200
        print(f"✅ GET payment-gateways: {len(response.json())} records")


class TestPSPBankMapping:
    """PSP Bank Mapping CRUD - Test ObjectId serialization fix"""
    
    def test_create_psp_bank_mapping_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/psp-bank-mapping - Should return JSON without _id"""
        payload = {
            "gateway_id": str(uuid.uuid4()),
            "gateway_name": "Test Gateway",
            "bank_name": "Test Bank",
            "bank_account_number": "1234567890",
            "bank_account_name": "Test Account",
            "currency": "AED"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/psp-bank-mapping",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        print(f"✅ PSP Bank Mapping created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/psp-bank-mapping/{data['id']}")
    
    def test_get_psp_bank_mappings(self, authenticated_client):
        """GET /api/finance/settings/psp-bank-mapping"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/psp-bank-mapping")
        assert response.status_code == 200
        print(f"✅ GET psp-bank-mapping: {len(response.json())} records")


class TestBankAccounts:
    """Bank Accounts CRUD - Test ObjectId serialization fix"""
    
    def test_create_bank_account_no_objectid_error(self, authenticated_client):
        """POST /api/finance/settings/bank-accounts - Should return JSON without _id"""
        test_account = f"TEST{uuid.uuid4().hex[:8]}"
        payload = {
            "account_name": "Test Bank Account",
            "bank_name": "Test Bank",
            "account_number": test_account,
            "iban": f"AE{uuid.uuid4().hex[:20]}",
            "swift_code": "TESTAEXX",
            "branch": "Test Branch",
            "currency": "AED",
            "account_type": "current",
            "opening_balance": 0
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/settings/bank-accounts",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        print(f"✅ Bank Account created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/settings/bank-accounts/{data['id']}")
    
    def test_get_bank_accounts(self, authenticated_client):
        """GET /api/finance/settings/bank-accounts"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/settings/bank-accounts")
        assert response.status_code == 200
        print(f"✅ GET bank-accounts: {len(response.json())} records")


class TestVendors:
    """Vendor Management - Test ObjectId serialization fix"""
    
    def test_create_vendor_no_objectid_error(self, authenticated_client):
        """POST /api/finance/vendors - Should return JSON without _id"""
        payload = {
            "name": f"Test Vendor {uuid.uuid4().hex[:6]}",
            "trading_name": "Test Trading Name",
            "category": "IT Services",
            "items_supplied": "Software, Hardware",
            "contact_person": "John Doe",
            "email": f"test_{uuid.uuid4().hex[:6]}@testvendor.com",
            "phone": "+971501234567",
            "city": "Dubai",
            "country": "UAE"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/finance/vendors",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "_id" not in data, "Response should NOT contain _id field"
        assert "id" in data
        print(f"✅ Vendor created successfully, no _id in response: {data.get('id')}")
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/finance/vendors/{data['id']}")
    
    def test_get_vendors(self, authenticated_client):
        """GET /api/finance/vendors"""
        response = authenticated_client.get(f"{BASE_URL}/api/finance/vendors")
        assert response.status_code == 200
        print(f"✅ GET vendors: {len(response.json())} records")


class TestBioCloudSync:
    """BioCloud Sync endpoints - Test improved reliability"""
    
    def test_biocloud_status(self, authenticated_client):
        """GET /api/hr/biocloud/status - Check connection status with last sync info"""
        response = authenticated_client.get(f"{BASE_URL}/api/hr/biocloud/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check response structure - should have these keys regardless of connection status
        assert "connected" in data or "error" in data, "Should have 'connected' or 'error' key"
        
        if data.get("connected"):
            # If connected, check for mapping stats
            assert "total_clt_employees" in data
            assert "mapped_employees" in data
            print(f"✅ BioCloud Status: Connected, {data.get('mapped_employees')}/{data.get('total_clt_employees')} employees mapped")
            if data.get("last_sync"):
                print(f"   Last sync: {data['last_sync'].get('timestamp')}, {data['last_sync'].get('records_synced')} records")
        else:
            print(f"⚠️ BioCloud Status: Not connected - {data.get('error', 'Unknown error')}")
    
    def test_biocloud_sync_history(self, authenticated_client):
        """GET /api/hr/biocloud/sync-history - Check sync history"""
        response = authenticated_client.get(f"{BASE_URL}/api/hr/biocloud/sync-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        print(f"✅ BioCloud Sync History: {len(data['history'])} records")
        
        # If there are records, verify structure
        if data["history"]:
            record = data["history"][0]
            # Check that no _id is in the response
            assert "_id" not in record, "History record should not contain _id"
            print(f"   Latest sync: {record.get('date')} - {record.get('synced', 0)} records synced")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
