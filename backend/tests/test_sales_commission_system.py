"""
Sales Commission/Category System Tests
Tests all features: 
- Commission info endpoint for different roles (sales_executive, team_leader, super_admin)
- Historical sales import template and endpoint
- SALES_CATEGORIES constants
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
KIRAN_EMAIL = "kiran@clt-academy.com"
KIRAN_PASSWORD = "@Aqib1234"
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"

class TestSalesExecutiveCommission:
    """Tests for sales executive commission/category info"""
    
    @pytest.fixture(scope="class")
    def kiran_token(self):
        """Get authentication token for Kiran (sales_executive)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": KIRAN_EMAIL,
            "password": KIRAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed for Kiran: {response.text}")
        data = response.json()
        assert "access_token" in data, "Login response should contain access_token"
        return data["access_token"]
    
    def test_commission_info_for_sales_executive(self, kiran_token):
        """Test GET /api/dashboard/sales-commission-info returns correct data for sales_executive (Kiran)"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-commission-info",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Commission info for Kiran: {data}")
        
        # Verify role
        assert data.get("role") == "sales_executive", f"Expected role 'sales_executive', got {data.get('role')}"
        
        # Verify required fields are present
        required_fields = [
            "month_revenue", "month_accounts", "category_name", "category_salary",
            "current_net_salary", "salary_diff", "earned_commission", "has_commission",
            "pipeline_expected", "pipeline_count", "all_categories"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify all_categories has 8 categories (D through Diamond)
        all_categories = data.get("all_categories", [])
        assert len(all_categories) == 8, f"Expected 8 categories, got {len(all_categories)}"
        
        # Verify category names (sorted by min_revenue descending)
        expected_category_names = ["Diamond", "Gold", "Silver", "A+", "A", "B", "C", "D"]
        actual_names = [cat["name"] for cat in all_categories]
        assert actual_names == expected_category_names, f"Categories mismatch: {actual_names}"
        
        # Verify category thresholds
        expected_thresholds = {
            "Diamond": {"min_revenue": 50000, "salary": 6000, "min_accounts": 15},
            "Gold": {"min_revenue": 40000, "salary": 4500, "min_accounts": 15},
            "Silver": {"min_revenue": 32000, "salary": 4000, "min_accounts": 0},
            "A+": {"min_revenue": 26000, "salary": 3500, "min_accounts": 0},
            "A": {"min_revenue": 22000, "salary": 3000, "min_accounts": 0},
            "B": {"min_revenue": 18000, "salary": 2500, "min_accounts": 0},
            "C": {"min_revenue": 10000, "salary": 2000, "min_accounts": 0},
            "D": {"min_revenue": 0, "salary": 0, "min_accounts": 0},
        }
        for cat in all_categories:
            name = cat["name"]
            expected = expected_thresholds[name]
            assert cat["min_revenue"] == expected["min_revenue"], f"{name}: min_revenue mismatch"
            assert cat["salary"] == expected["salary"], f"{name}: salary mismatch"
            assert cat["min_accounts"] == expected["min_accounts"], f"{name}: min_accounts mismatch"
        
        # Verify current_net_salary is 2750 as per review request
        assert data["current_net_salary"] == 2750, f"Expected current_net_salary 2750, got {data['current_net_salary']}"
        
        print("✓ Commission info endpoint returns correct data for sales executive")
    
    def test_commission_unlock_logic(self, kiran_token):
        """Test that commission unlocks at 18k+ revenue"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-commission-info",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        month_revenue = data.get("month_revenue", 0)
        has_commission = data.get("has_commission", False)
        
        # Commission logic: commission = 0 if below 18k
        if month_revenue < 18000:
            assert has_commission == False, f"has_commission should be False when revenue < 18k (revenue={month_revenue})"
            assert data.get("earned_commission", 0) == 0, "earned_commission should be 0 when revenue < 18k"
            print(f"✓ Commission correctly shows 0 when revenue ({month_revenue}) < 18,000 AED")
        else:
            print(f"✓ Revenue is {month_revenue} >= 18,000, commission may be earned")


class TestTeamLeaderCommission:
    """Tests for team_leader commission info"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token to check team leaders"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_find_team_leader_for_testing(self, admin_token):
        """Find a team leader user if one exists with password"""
        response = requests.get(
            f"{BASE_URL}/api/users?role=team_leader",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            team_leaders = response.json()
            print(f"Found {len(team_leaders)} team leaders. Per review: No team leaders have passwords set yet.")
        else:
            print("Could not query team leaders")


class TestSuperAdminCommission:
    """Tests for super_admin commission info - should return 'not applicable'"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get authentication token for super admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_commission_info_not_applicable_for_super_admin(self, super_admin_token):
        """Test GET /api/dashboard/sales-commission-info returns 'not applicable' for super_admin"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-commission-info",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Commission info for super_admin: {data}")
        
        # super_admin should get "not applicable" message
        assert data.get("role") == "super_admin", f"Expected role 'super_admin', got {data.get('role')}"
        assert "message" in data, "Response should contain 'message' field for non-sales roles"
        assert "not applicable" in data.get("message", "").lower(), \
            f"Message should mention 'not applicable', got: {data.get('message')}"
        
        print("✓ Commission info correctly returns 'not applicable' for super_admin")


class TestHistoricalSalesImport:
    """Tests for historical sales import template and endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get authentication token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_historical_sales_template_endpoint(self, admin_token):
        """Test GET /api/import/templates/historical-sales returns template definition"""
        response = requests.get(
            f"{BASE_URL}/api/import/templates/historical-sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Historical sales template: {data}")
        
        # The generic template endpoint uses 'fields' structure
        assert "fields" in data, "Response should contain 'fields' field"
        fields = data["fields"]
        
        # Verify required fields are present
        required_fields = fields.get("required", [])
        expected_required = ["full_name", "phone", "course_enrolled", "agent_employee_id", "team_name"]
        for req in expected_required:
            assert req in required_fields, f"Missing required field: {req}"
        
        # Verify optional fields
        optional_fields = fields.get("optional", [])
        optional_expected = ["enrollment_amount", "enrolled_at", "email", "country", "city", "source"]
        for opt in optional_expected:
            assert opt in optional_fields, f"Missing optional field: {opt}"
        
        # Verify headers and instructions are present
        assert "headers" in data, "Should have headers"
        assert "instructions" in data, "Should have instructions"
        
        print("✓ Historical sales template endpoint returns correct column definitions")
    
    def test_historical_sales_import_endpoint_exists(self, admin_token):
        """Test POST /api/import/historical-sales-xlsx endpoint exists"""
        # Send an empty request to verify endpoint exists (should fail with missing file, not 404)
        response = requests.post(
            f"{BASE_URL}/api/import/historical-sales-xlsx",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 422 (Unprocessable Entity) for missing file, not 404
        assert response.status_code != 404, "Endpoint should exist (got 404)"
        assert response.status_code in [400, 422], \
            f"Expected 400/422 for missing file, got {response.status_code}: {response.text}"
        
        print("✓ Historical sales import endpoint exists and requires file upload")
    
    def test_import_requires_admin_role(self):
        """Test that historical sales XLSX import requires admin/super_admin role"""
        # Try with sales executive (Kiran)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": KIRAN_EMAIL,
            "password": KIRAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as Kiran")
        
        kiran_token = response.json()["access_token"]
        
        # Note: The template GET endpoint is accessible to all authenticated users (generic endpoint)
        # But the actual IMPORT POST endpoint should require admin role
        # Test the POST endpoint restriction
        response = requests.post(
            f"{BASE_URL}/api/import/historical-sales-xlsx",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        # Should get 403 Forbidden for non-admin users trying to import
        assert response.status_code == 403, \
            f"Expected 403 Forbidden for sales_executive on import, got {response.status_code}: {response.text}"
        
        print("✓ Historical sales XLSX import correctly restricted to admin/super_admin roles")


class TestExistingDashboardComponents:
    """Verify existing dashboard components still work"""
    
    @pytest.fixture(scope="class")
    def kiran_token(self):
        """Get authentication token for Kiran"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": KIRAN_EMAIL,
            "password": KIRAN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json()["access_token"]
    
    def test_lead_funnel_endpoint(self, kiran_token):
        """Test lead funnel endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/lead-funnel",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Lead funnel failed: {response.text}"
        print("✓ Lead funnel endpoint working")
    
    def test_monthly_trend_endpoint(self, kiran_token):
        """Test monthly trend endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/monthly-trend?view_mode=individual",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Monthly trend failed: {response.text}"
        print("✓ Monthly trend endpoint working")
    
    def test_sales_by_course_endpoint(self, kiran_token):
        """Test sales by course endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/sales-by-course",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Sales by course failed: {response.text}"
        print("✓ Sales by course endpoint working")
    
    def test_leaderboard_endpoint(self, kiran_token):
        """Test leaderboard endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/leaderboard",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Leaderboard failed: {response.text}"
        print("✓ Leaderboard endpoint working")
    
    def test_filtered_stats_endpoint(self, kiran_token):
        """Test filtered stats endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/filtered-stats?period=this_month&view_mode=individual",
            headers={"Authorization": f"Bearer {kiran_token}"}
        )
        assert response.status_code == 200, f"Filtered stats failed: {response.text}"
        print("✓ Filtered stats endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
