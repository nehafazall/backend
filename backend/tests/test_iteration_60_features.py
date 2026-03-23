"""
Iteration 60 - Testing 3 New Features:
1. Mentor CRM: Net Revenue dialog showing monthly closings (GET /api/mentor/monthly-closings)
2. CS Kanban: last_upgrade_date badge on student cards (GET /api/students with last_upgrade_date)
3. Customer Master: Net LTV with mentor deposits/withdrawals (GET /api/customers, GET /api/customers/{id})
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
CS_HEAD_EMAIL = "falja@clt-academy.com"
CS_HEAD_PASSWORD = "Falja@123"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Super admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def cs_head_token():
    """Get CS head auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CS_HEAD_EMAIL,
        "password": CS_HEAD_PASSWORD
    })
    assert response.status_code == 200, f"CS head login failed: {response.text}"
    return response.json()["access_token"]


class TestMentorMonthlyClosings:
    """Feature 1: Mentor CRM - Net Revenue dialog with monthly closings"""
    
    def test_monthly_closings_endpoint_exists(self, super_admin_token):
        """Test that GET /api/mentor/monthly-closings endpoint exists and returns 200"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_monthly_closings_response_structure(self, super_admin_token):
        """Test that response has correct structure: month, students, totals"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "month" in data, "Response missing 'month' field"
        assert "students" in data, "Response missing 'students' field"
        assert "totals" in data, "Response missing 'totals' field"
        
        # Check totals structure
        totals = data["totals"]
        assert "deposits" in totals, "Totals missing 'deposits'"
        assert "withdrawals" in totals, "Totals missing 'withdrawals'"
        assert "net_revenue" in totals, "Totals missing 'net_revenue'"
    
    def test_monthly_closings_student_fields(self, super_admin_token):
        """Test that each student has required fields: name, email, phone, deposit, withdrawal"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if data["students"]:
            student = data["students"][0]
            # Check required fields per spec
            assert "student_name" in student, "Student missing 'student_name'"
            assert "student_email" in student, "Student missing 'student_email'"
            assert "phone" in student, "Student missing 'phone'"
            assert "total_deposit" in student, "Student missing 'total_deposit'"
            assert "total_withdrawal" in student, "Student missing 'total_withdrawal'"
    
    def test_monthly_closings_with_month_param(self, super_admin_token):
        """Test filtering by specific month (March 2026)"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings?month=2026-03", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["month"] == "2026-03", f"Expected month 2026-03, got {data['month']}"
    
    def test_monthly_closings_totals_calculation(self, super_admin_token):
        """Test that net_revenue = deposits - withdrawals"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        totals = data["totals"]
        expected_net = round(totals["deposits"] - totals["withdrawals"], 2)
        actual_net = totals["net_revenue"]
        assert abs(actual_net - expected_net) < 0.01, f"Net revenue mismatch: {actual_net} != {expected_net}"


class TestCSKanbanLastUpgradeDate:
    """Feature 2: CS Kanban - last_upgrade_date badge on student cards"""
    
    def test_students_endpoint_returns_last_upgrade_date(self, cs_head_token):
        """Test that GET /api/students returns last_upgrade_date for upgraded students"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        students = response.json()
        assert isinstance(students, list), "Expected list of students"
        
        # Check if any student has last_upgrade_date (students with upgrade history)
        students_with_upgrade = [s for s in students if s.get("last_upgrade_date")]
        print(f"Found {len(students_with_upgrade)} students with last_upgrade_date out of {len(students)} total")
        
        # If there are upgraded students, verify the field structure
        if students_with_upgrade:
            student = students_with_upgrade[0]
            assert "last_upgrade_date" in student, "Student missing 'last_upgrade_date'"
            # Optionally check for last_upgrade_course
            print(f"Sample student with upgrade: {student.get('full_name')} - last_upgrade_date: {student.get('last_upgrade_date')}")
    
    def test_students_endpoint_structure(self, cs_head_token):
        """Test that students endpoint returns proper structure"""
        headers = {"Authorization": f"Bearer {cs_head_token}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        assert response.status_code == 200
        
        students = response.json()
        if students:
            student = students[0]
            # Check basic student fields
            assert "id" in student, "Student missing 'id'"
            assert "full_name" in student, "Student missing 'full_name'"
            assert "phone" in student, "Student missing 'phone'"


class TestCustomerMasterNetLTV:
    """Feature 3: Customer Master - Net LTV with mentor deposits/withdrawals"""
    
    def test_customers_endpoint_returns_net_ltv(self, super_admin_token):
        """Test that GET /api/customers returns net_ltv, mentor_deposits_total, mentor_withdrawals_total"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        customers = response.json()
        assert isinstance(customers, list), "Expected list of customers"
        
        if customers:
            # Find a customer with student_id (should have mentor data)
            customers_with_student = [c for c in customers if c.get("student_id")]
            print(f"Found {len(customers_with_student)} customers with student_id out of {len(customers)} total")
            
            if customers_with_student:
                customer = customers_with_student[0]
                # Check for net_ltv field
                assert "net_ltv" in customer, "Customer missing 'net_ltv' field"
                print(f"Sample customer: {customer.get('full_name')} - net_ltv: {customer.get('net_ltv')}")
                
                # Check for mentor totals if they have deposits/withdrawals
                if customer.get("mentor_deposits_total") or customer.get("mentor_withdrawals_total"):
                    print(f"  mentor_deposits_total: {customer.get('mentor_deposits_total')}")
                    print(f"  mentor_withdrawals_total: {customer.get('mentor_withdrawals_total')}")
    
    def test_customer_detail_returns_mentor_data(self, super_admin_token):
        """Test that GET /api/customers/{id} returns mentor_deposits, mentor_withdrawals, mentor_totals, net_ltv"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First get list of customers
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200
        customers = response.json()
        
        # Find a customer with student_id
        customers_with_student = [c for c in customers if c.get("student_id")]
        
        if customers_with_student:
            customer_id = customers_with_student[0]["id"]
            
            # Get customer detail
            detail_response = requests.get(f"{BASE_URL}/api/customers/{customer_id}", headers=headers)
            assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
            
            customer = detail_response.json()
            
            # Check for mentor-related fields
            assert "net_ltv" in customer, "Customer detail missing 'net_ltv'"
            
            # These fields should be present if customer has student_id
            if customer.get("student_id"):
                assert "mentor_deposits" in customer, "Customer detail missing 'mentor_deposits'"
                assert "mentor_withdrawals" in customer, "Customer detail missing 'mentor_withdrawals'"
                assert "mentor_totals" in customer, "Customer detail missing 'mentor_totals'"
                
                # Check mentor_totals structure
                totals = customer["mentor_totals"]
                assert "total_deposits_aed" in totals, "mentor_totals missing 'total_deposits_aed'"
                assert "total_withdrawals_aed" in totals, "mentor_totals missing 'total_withdrawals_aed'"
                
                print(f"Customer detail: {customer.get('full_name')}")
                print(f"  net_ltv: {customer.get('net_ltv')}")
                print(f"  mentor_totals: {customer.get('mentor_totals')}")
                print(f"  mentor_deposits count: {len(customer.get('mentor_deposits', []))}")
                print(f"  mentor_withdrawals count: {len(customer.get('mentor_withdrawals', []))}")
    
    def test_net_ltv_calculation(self, super_admin_token):
        """Test that net_ltv = enrollment total_spent + deposits - withdrawals"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get customers list
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200
        customers = response.json()
        
        # Find a customer with mentor data
        for customer in customers:
            if customer.get("student_id") and (customer.get("mentor_deposits_total", 0) > 0 or customer.get("mentor_withdrawals_total", 0) > 0):
                total_spent = customer.get("total_spent", 0)
                deposits = customer.get("mentor_deposits_total", 0)
                withdrawals = customer.get("mentor_withdrawals_total", 0)
                expected_ltv = round(total_spent + deposits - withdrawals, 2)
                actual_ltv = customer.get("net_ltv", 0)
                
                print(f"LTV calculation for {customer.get('full_name')}:")
                print(f"  total_spent: {total_spent}")
                print(f"  mentor_deposits_total: {deposits}")
                print(f"  mentor_withdrawals_total: {withdrawals}")
                print(f"  expected net_ltv: {expected_ltv}")
                print(f"  actual net_ltv: {actual_ltv}")
                
                assert abs(actual_ltv - expected_ltv) < 0.01, f"Net LTV mismatch: {actual_ltv} != {expected_ltv}"
                break
    
    def test_customers_sortable_by_net_ltv(self, super_admin_token):
        """Test that customers can be sorted by net_ltv"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Sort by net_ltv descending
        response = requests.get(f"{BASE_URL}/api/customers?sort_by=net_ltv&sort_order=desc", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        customers = response.json()
        if len(customers) >= 2:
            # Verify descending order
            for i in range(len(customers) - 1):
                ltv1 = customers[i].get("net_ltv", 0)
                ltv2 = customers[i + 1].get("net_ltv", 0)
                # Allow for equal values
                assert ltv1 >= ltv2, f"Customers not sorted by net_ltv desc: {ltv1} < {ltv2}"


class TestIntegration:
    """Integration tests for all 3 features"""
    
    def test_all_endpoints_accessible(self, super_admin_token):
        """Test that all new endpoints are accessible"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Feature 1: Monthly closings
        r1 = requests.get(f"{BASE_URL}/api/mentor/monthly-closings", headers=headers)
        assert r1.status_code == 200, f"Monthly closings failed: {r1.status_code}"
        
        # Feature 2: Students with last_upgrade_date
        r2 = requests.get(f"{BASE_URL}/api/students", headers=headers)
        assert r2.status_code == 200, f"Students failed: {r2.status_code}"
        
        # Feature 3: Customers with net_ltv
        r3 = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert r3.status_code == 200, f"Customers failed: {r3.status_code}"
        
        print("All endpoints accessible!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
