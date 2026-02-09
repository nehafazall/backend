#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class CLTAcademyERPTester:
    def __init__(self, base_url="https://clt-dashboard.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            details = f"Status: {response.status_code} (expected {expected_status})"
            if not success:
                details += f" | Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_authentication(self):
        """Test authentication flow"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with Super Admin credentials
        login_data = {
            "email": "aqib@clt-academy.com",
            "password": "A@qib1234"
        }
        
        success, response = self.run_test(
            "Super Admin Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            self.log_test("Token Extraction", True, f"Role: {self.user_data.get('role')}")
        else:
            self.log_test("Token Extraction", False, "No access token in response")
            return False
        
        # Test /auth/me endpoint
        self.run_test("Get Current User", "GET", "auth/me", 200)
        
        return True

    def test_user_management(self):
        """Test user management endpoints"""
        print("\n👥 Testing User Management...")
        
        if not self.token:
            self.log_test("User Management", False, "No authentication token")
            return
        
        # Get all users
        self.run_test("Get All Users", "GET", "users", 200)
        
        # Create a test user
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@clt-academy.com",
            "password": "TestPass123!",
            "full_name": "Test User",
            "role": "sales_executive",
            "department": "Sales",
            "region": "UAE",
            "is_active": True
        }
        
        success, response = self.run_test(
            "Create Test User", 
            "POST", 
            "users", 
            200, 
            test_user_data
        )
        
        if success and 'id' in response:
            user_id = response['id']
            
            # Update the user
            update_data = {
                "full_name": "Updated Test User",
                "department": "Marketing"
            }
            self.run_test(
                "Update Test User", 
                "PUT", 
                f"users/{user_id}", 
                200, 
                update_data
            )
            
            # Delete the user (only super_admin can delete)
            if self.user_data.get('role') == 'super_admin':
                self.run_test("Delete Test User", "DELETE", f"users/{user_id}", 200)

    def test_leads_management(self):
        """Test leads (Sales CRM) endpoints"""
        print("\n📊 Testing Sales CRM (Leads)...")
        
        if not self.token:
            self.log_test("Leads Management", False, "No authentication token")
            return
        
        # Get all leads
        self.run_test("Get All Leads", "GET", "leads", 200)
        
        # Create a test lead
        test_lead_data = {
            "full_name": f"Test Lead {datetime.now().strftime('%H%M%S')}",
            "phone": f"+971501234{datetime.now().strftime('%S')}",
            "email": f"testlead_{datetime.now().strftime('%H%M%S')}@example.com",
            "country": "UAE",
            "lead_source": "manual",
            "course_of_interest": "basic_trading",
            "notes": "Test lead created by automated testing"
        }
        
        success, response = self.run_test(
            "Create Test Lead", 
            "POST", 
            "leads", 
            200, 
            test_lead_data
        )
        
        if success and 'id' in response:
            lead_id = response['id']
            
            # Update lead stage
            update_data = {
                "stage": "warm_lead",
                "call_notes": "Test call notes from automated testing"
            }
            self.run_test(
                "Update Lead Stage", 
                "PUT", 
                f"leads/{lead_id}", 
                200, 
                update_data
            )
            
            # Test lead enrollment (creates student)
            enroll_data = {
                "stage": "enrolled",
                "call_notes": "Lead enrolled successfully"
            }
            self.run_test(
                "Enroll Lead", 
                "PUT", 
                f"leads/{lead_id}", 
                200, 
                enroll_data
            )

    def test_students_management(self):
        """Test students (CS & Mentor CRM) endpoints"""
        print("\n🎓 Testing Customer Service & Mentor CRM (Students)...")
        
        if not self.token:
            self.log_test("Students Management", False, "No authentication token")
            return
        
        # Get all students
        self.run_test("Get All Students", "GET", "students", 200)
        
        # Get students by stage
        self.run_test("Get New Students", "GET", "students?stage=new_student", 200)
        
        # Get students by mentor stage
        self.run_test("Get Students by Mentor Stage", "GET", "students?mentor_stage=new_student", 200)

    def test_payments_management(self):
        """Test payments (Finance) endpoints"""
        print("\n💰 Testing Finance (Payments)...")
        
        if not self.token:
            self.log_test("Payments Management", False, "No authentication token")
            return
        
        # Get all payments
        self.run_test("Get All Payments", "GET", "payments", 200)
        
        # Create a test payment
        test_payment_data = {
            "amount": 1500.00,
            "currency": "AED",
            "payment_method": "stripe",
            "transaction_id": f"TXN-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "product_course": "basic_trading",
            "payment_type": "fresh"
        }
        
        success, response = self.run_test(
            "Create Test Payment", 
            "POST", 
            "payments", 
            200, 
            test_payment_data
        )
        
        if success and 'id' in response:
            payment_id = response['id']
            
            # Update payment stage
            update_data = {
                "stage": "verified",
                "notes": "Payment verified by automated testing"
            }
            self.run_test(
                "Verify Payment", 
                "PUT", 
                f"payments/{payment_id}", 
                200, 
                update_data
            )

    def test_dashboard_endpoints(self):
        """Test dashboard and analytics endpoints"""
        print("\n📈 Testing Dashboard & Analytics...")
        
        if not self.token:
            self.log_test("Dashboard Endpoints", False, "No authentication token")
            return
        
        # Get dashboard stats
        self.run_test("Get Dashboard Stats", "GET", "dashboard/stats", 200)
        
        # Get lead funnel
        self.run_test("Get Lead Funnel", "GET", "dashboard/lead-funnel", 200)
        
        # Get payment summary
        self.run_test("Get Payment Summary", "GET", "dashboard/payment-summary", 200)

    def test_notifications(self):
        """Test notifications system"""
        print("\n🔔 Testing Notifications...")
        
        if not self.token:
            self.log_test("Notifications", False, "No authentication token")
            return
        
        # Get notifications
        self.run_test("Get All Notifications", "GET", "notifications", 200)
        
        # Get unread notifications
        self.run_test("Get Unread Notifications", "GET", "notifications?unread_only=true", 200)

    def test_activity_logs(self):
        """Test activity logs"""
        print("\n📝 Testing Activity Logs...")
        
        if not self.token:
            self.log_test("Activity Logs", False, "No authentication token")
            return
        
        # Get activity logs
        self.run_test("Get Activity Logs", "GET", "activity-logs", 200)
        
        # Get activity logs by entity type
        self.run_test("Get Lead Activity Logs", "GET", "activity-logs?entity_type=lead", 200)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting CLT Academy ERP API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites in order
        self.test_health_check()
        
        if self.test_authentication():
            self.test_user_management()
            self.test_leads_management()
            self.test_students_management()
            self.test_payments_management()
            self.test_dashboard_endpoints()
            self.test_notifications()
            self.test_activity_logs()
        else:
            print("\n❌ Authentication failed - skipping remaining tests")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = CLTAcademyERPTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'failed_tests': tester.tests_run - tester.tests_passed,
                'success_rate': (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())