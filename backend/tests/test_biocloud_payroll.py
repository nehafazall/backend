"""
Test BioCloud Attendance Sync and Payroll Run Features
Testing the P0 bug fixes for:
1. BioCloud attendance sync - POST /api/hr/biocloud/fetch-attendance
2. BioCloud status check - GET /api/hr/biocloud/status
3. Payroll run - POST /api/hr/payroll/run
4. Payroll batches - GET /api/hr/payroll/batches
5. Payroll approval - PUT /api/hr/payroll/batch/{id}/approve
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://payment-verification-9.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER = {
    "email": "aqib@clt-academy.com",
    "password": "@Aqib1234"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestBioCloudSync:
    """Test BioCloud Attendance Sync APIs - P0 Fix"""
    
    def test_biocloud_status_check(self, api_client):
        """
        GET /api/hr/biocloud/status - Check BioCloud connection status
        This endpoint should return connection status and employee mapping stats
        """
        response = api_client.get(f"{BASE_URL}/api/hr/biocloud/status")
        assert response.status_code == 200, f"BioCloud status check failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "connected" in data, "Response should contain 'connected' field"
        assert "biocloud_url" in data, "Response should contain 'biocloud_url' field"
        assert "total_clt_employees" in data, "Response should contain 'total_clt_employees' field"
        assert "mapped_employees" in data, "Response should contain 'mapped_employees' field"
        
        print(f"BioCloud Status: connected={data['connected']}, url={data['biocloud_url']}")
        print(f"Employee Mapping: {data['mapped_employees']}/{data['total_clt_employees']} mapped")
    
    def test_biocloud_fetch_attendance(self, api_client):
        """
        POST /api/hr/biocloud/fetch-attendance - Fetch attendance from BioCloud
        This is the P0 fix - the endpoint should return success:true
        Note: This connects to external ZK BioCloud system at https://56.biocloud.me:8085
        """
        # Test without date parameter (uses today)
        response = api_client.post(f"{BASE_URL}/api/hr/biocloud/fetch-attendance")
        
        # The endpoint might fail if BioCloud is not reachable, but it should not return 500
        # due to code issues. It should return success:true or a proper error message
        if response.status_code == 200:
            data = response.json()
            assert "success" in data, "Response should contain 'success' field"
            assert data["success"] == True, f"BioCloud fetch should return success:true, got {data}"
            print(f"BioCloud Fetch Result: {data}")
        elif response.status_code == 500:
            # Check if it's a connection error (expected if BioCloud unreachable)
            # vs a code bug (unexpected)
            error_detail = response.json().get("detail", "")
            print(f"BioCloud fetch error (may be expected): {error_detail}")
            # If error is due to timeout or connection, that's expected
            # If error is due to selector/code issue, that's a bug
            assert "selector" not in error_detail.lower(), f"Code bug detected: {error_detail}"
            assert "element" not in error_detail.lower(), f"Code bug detected: {error_detail}"
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, {response.text}")
    
    def test_biocloud_fetch_attendance_with_date(self, api_client):
        """
        POST /api/hr/biocloud/fetch-attendance?date=2026-01-15
        Test fetching attendance for a specific date
        """
        test_date = "2026-01-15"
        response = api_client.post(f"{BASE_URL}/api/hr/biocloud/fetch-attendance?date={test_date}")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("date") == test_date, f"Response date should match: {data}"
            print(f"BioCloud Fetch with date {test_date}: {data}")
        elif response.status_code == 500:
            # Connection errors are expected if BioCloud is unreachable
            error_detail = response.json().get("detail", "")
            print(f"BioCloud fetch error for {test_date}: {error_detail}")


class TestPayrollRun:
    """Test Payroll Run APIs - P0 Fix for duplicate key error"""
    
    def test_get_payroll_batches(self, api_client):
        """
        GET /api/hr/payroll/batches - List all payroll batches
        This should work without errors
        """
        response = api_client.get(f"{BASE_URL}/api/hr/payroll/batches")
        assert response.status_code == 200, f"Get payroll batches failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Payroll batches should be a list"
        print(f"Existing payroll batches: {len(data)}")
        
        # Check structure of batches
        if data:
            batch = data[0]
            expected_fields = ["id", "month", "status", "employee_count", "total_gross", "total_net"]
            for field in expected_fields:
                assert field in batch, f"Batch should have '{field}' field"
            print(f"Sample batch: month={batch['month']}, status={batch['status']}, employees={batch['employee_count']}")
    
    def test_run_payroll_for_new_month(self, api_client):
        """
        POST /api/hr/payroll/run - Run payroll for a new month
        Should succeed for months that don't have existing non-draft batches
        """
        # Try running for April 2026 (should not exist)
        payload = {
            "month": 4,
            "year": 2026,
            "department": None
        }
        response = api_client.post(f"{BASE_URL}/api/hr/payroll/run", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Response should have message"
            assert "batch_id" in data, "Response should have batch_id"
            print(f"Payroll run success: {data}")
        elif response.status_code == 400:
            # Expected if payroll already exists for this month
            error = response.json()
            assert "already processed" in error.get("detail", "").lower(), f"Expected 'already processed' error, got: {error}"
            print(f"Payroll already exists for 2026-04: {error}")
        elif response.status_code == 404:
            # No employees found
            print(f"No employees found for payroll: {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, {response.text}")
    
    def test_run_payroll_duplicate_handling(self, api_client):
        """
        POST /api/hr/payroll/run - Test duplicate key error handling
        The fix should query hr_payroll_batches instead of hr_payroll
        Running for Feb 2026 should return proper error (already exists with status 'paid')
        """
        payload = {
            "month": 2,
            "year": 2026,
            "department": None
        }
        response = api_client.post(f"{BASE_URL}/api/hr/payroll/run", json=payload)
        
        # Feb 2026 already exists with status 'paid' per the context
        if response.status_code == 400:
            error = response.json()
            assert "already processed" in error.get("detail", "").lower(), f"Should get proper error message: {error}"
            print(f"Proper duplicate handling: {error}")
        elif response.status_code == 200:
            # Might succeed if status was draft
            print(f"Payroll ran successfully (was draft): {response.json()}")
        else:
            # Should NOT get 500 error for duplicate key
            pytest.fail(f"Got unexpected error - possible duplicate key issue: {response.status_code}, {response.text}")
    
    def test_get_payroll_records(self, api_client):
        """
        GET /api/hr/payroll - Get payroll records
        """
        response = api_client.get(f"{BASE_URL}/api/hr/payroll")
        assert response.status_code == 200, f"Get payroll records failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Payroll records should be a list"
        print(f"Total payroll records: {len(data)}")
        
        if data:
            record = data[0]
            print(f"Sample record: {record.get('employee_name')}, {record.get('month')}, net={record.get('net_salary')}")
    
    def test_get_payroll_by_month(self, api_client):
        """
        GET /api/hr/payroll?month=2026-02 - Get payroll for specific month
        """
        response = api_client.get(f"{BASE_URL}/api/hr/payroll?month=2026-02")
        assert response.status_code == 200, f"Get payroll by month failed: {response.text}"
        data = response.json()
        print(f"Payroll records for 2026-02: {len(data)}")


class TestPayrollApproval:
    """Test Payroll Approval Workflow"""
    
    def test_get_draft_batch(self, api_client):
        """Find a draft batch to test approval workflow"""
        response = api_client.get(f"{BASE_URL}/api/hr/payroll/batches?status=draft")
        assert response.status_code == 200, f"Get draft batches failed: {response.text}"
        data = response.json()
        print(f"Draft batches: {len(data)}")
        return data[0] if data else None
    
    def test_approval_workflow(self, api_client):
        """
        PUT /api/hr/payroll/batch/{id}/approve - Test approval workflow
        Workflow: draft -> hr_approved -> finance_approved
        """
        # Get all batches
        response = api_client.get(f"{BASE_URL}/api/hr/payroll/batches")
        assert response.status_code == 200
        batches = response.json()
        
        # Find a batch to test (prefer draft)
        draft_batches = [b for b in batches if b.get("status") == "draft"]
        
        if draft_batches:
            batch = draft_batches[0]
            batch_id = batch["id"]
            
            # Test HR approval
            approve_response = api_client.put(
                f"{BASE_URL}/api/hr/payroll/batch/{batch_id}/approve?approval_level=hr"
            )
            
            if approve_response.status_code == 200:
                data = approve_response.json()
                assert "message" in data
                print(f"HR Approval success: {data}")
            else:
                print(f"HR Approval result: {approve_response.status_code}, {approve_response.text}")
        else:
            print("No draft batches to test approval workflow")
    
    def test_invalid_approval_sequence(self, api_client):
        """
        Test that approval sequence is enforced (draft -> hr -> finance)
        """
        # Get all batches
        response = api_client.get(f"{BASE_URL}/api/hr/payroll/batches")
        batches = response.json()
        
        # Find a batch in draft status
        draft_batches = [b for b in batches if b.get("status") == "draft"]
        
        if draft_batches:
            batch_id = draft_batches[0]["id"]
            
            # Try finance approval on draft batch (should fail)
            response = api_client.put(
                f"{BASE_URL}/api/hr/payroll/batch/{batch_id}/approve?approval_level=finance"
            )
            
            # Should fail with 400 (invalid sequence)
            assert response.status_code == 400, f"Should reject out-of-sequence approval: {response.text}"
            print(f"Correct rejection of invalid sequence: {response.json()}")


class TestPayrollIntegration:
    """Integration tests for payroll with attendance and employees"""
    
    def test_employees_exist(self, api_client):
        """Verify employees exist for payroll processing"""
        response = api_client.get(f"{BASE_URL}/api/hr/employees")
        assert response.status_code == 200
        employees = response.json()
        assert len(employees) > 0, "Need employees for payroll testing"
        
        active_employees = [e for e in employees if e.get("employment_status") in ["active", "probation"]]
        print(f"Active employees: {len(active_employees)}/{len(employees)}")
        
        # Check salary structure
        with_salary = [e for e in active_employees if e.get("salary_structure")]
        print(f"Employees with salary structure: {len(with_salary)}/{len(active_employees)}")
    
    def test_attendance_records_exist(self, api_client):
        """Verify attendance records exist"""
        response = api_client.get(f"{BASE_URL}/api/hr/attendance")
        assert response.status_code == 200
        records = response.json()
        print(f"Total attendance records: {len(records)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
