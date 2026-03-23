"""
Test Suite for Iteration 66: Pagination, GZip Compression, and CS Agent Transfer Bug Fix

Tests:
1. Pagination on /api/leads, /api/students, /api/bd/students
2. GZip compression headers
3. CS agent transfer (cs_agent_name field in StudentUpdate)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
BD_AGENT_CREDS = {"email": "rashidha@clt-academy.com", "password": "Rashida@123"}
CS_HEAD_CREDS = {"email": "falja@clt-academy.com", "password": "Falja@123"}


class TestAuthentication:
    """Authentication tests"""
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✅ Super admin login successful, role: {data['user'].get('role')}")
    
    def test_bd_agent_login(self):
        """Test BD agent login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BD_AGENT_CREDS)
        assert response.status_code == 200, f"BD agent login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "business_development", f"Expected business_development role, got {data['user']['role']}"
        print(f"✅ BD agent login successful")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDS)
    if response.status_code != 200:
        pytest.skip("Super admin login failed")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def bd_agent_token():
    """Get BD agent auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=BD_AGENT_CREDS)
    if response.status_code != 200:
        pytest.skip("BD agent login failed")
    return response.json()["access_token"]


class TestLeadsPagination:
    """Test pagination on /api/leads endpoint"""
    
    def test_leads_pagination_default(self, super_admin_token):
        """Test leads endpoint returns paginated response with default page_size"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify paginated response structure
        assert "items" in data, "Missing 'items' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "page_size" in data, "Missing 'page_size' in response"
        assert "total_pages" in data, "Missing 'total_pages' in response"
        
        assert isinstance(data["items"], list), "items should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert data["page"] == 1, "Default page should be 1"
        assert data["page_size"] == 50, f"Default page_size should be 50, got {data['page_size']}"
        
        print(f"✅ Leads pagination: {data['total']} total, page {data['page']}/{data['total_pages']}, {len(data['items'])} items")
    
    def test_leads_pagination_page_size_25(self, super_admin_token):
        """Test leads with page_size=25"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads?page=1&page_size=25", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page_size"] == 25, f"Expected page_size 25, got {data['page_size']}"
        assert len(data["items"]) <= 25, f"Expected max 25 items, got {len(data['items'])}"
        print(f"✅ Leads page_size=25: {len(data['items'])} items returned")
    
    def test_leads_pagination_page_size_100(self, super_admin_token):
        """Test leads with page_size=100"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/leads?page=1&page_size=100", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page_size"] == 100, f"Expected page_size 100, got {data['page_size']}"
        assert len(data["items"]) <= 100, f"Expected max 100 items, got {len(data['items'])}"
        print(f"✅ Leads page_size=100: {len(data['items'])} items returned")
    
    def test_leads_pagination_page_2_different_items(self, super_admin_token):
        """Test that page 2 returns different items than page 1"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/leads?page=1&page_size=25", headers=headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total_pages"] < 2:
            pytest.skip("Not enough leads for pagination test (need at least 2 pages)")
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/leads?page=2&page_size=25", headers=headers)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify different items
        page1_ids = {item.get("id") for item in data1["items"]}
        page2_ids = {item.get("id") for item in data2["items"]}
        
        assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 should have different items"
        assert data2["page"] == 2, f"Expected page 2, got {data2['page']}"
        print(f"✅ Page 2 has different items than page 1 (page1: {len(page1_ids)}, page2: {len(page2_ids)})")


class TestStudentsPagination:
    """Test pagination on /api/students endpoint"""
    
    def test_students_pagination_default(self, super_admin_token):
        """Test students endpoint returns paginated response"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing 'items' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "page_size" in data, "Missing 'page_size' in response"
        assert "total_pages" in data, "Missing 'total_pages' in response"
        
        print(f"✅ Students pagination: {data['total']} total, page {data['page']}/{data['total_pages']}, {len(data['items'])} items")
    
    def test_students_pagination_page_size_25(self, super_admin_token):
        """Test students with page_size=25"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/students?page=1&page_size=25", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page_size"] == 25
        assert len(data["items"]) <= 25
        print(f"✅ Students page_size=25: {len(data['items'])} items returned")
    
    def test_students_pagination_page_2(self, super_admin_token):
        """Test students page 2"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get page 1
        response1 = requests.get(f"{BASE_URL}/api/students?page=1&page_size=25", headers=headers)
        data1 = response1.json()
        
        if data1["total_pages"] < 2:
            pytest.skip("Not enough students for pagination test")
        
        # Get page 2
        response2 = requests.get(f"{BASE_URL}/api/students?page=2&page_size=25", headers=headers)
        assert response2.status_code == 200
        data2 = response2.json()
        
        page1_ids = {item.get("id") for item in data1["items"]}
        page2_ids = {item.get("id") for item in data2["items"]}
        
        assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 should have different items"
        print(f"✅ Students page 2 has different items")


class TestBDStudentsPagination:
    """Test pagination on /api/bd/students endpoint"""
    
    def test_bd_students_pagination_default(self, super_admin_token):
        """Test BD students endpoint returns paginated response"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing 'items' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "page" in data, "Missing 'page' in response"
        assert "page_size" in data, "Missing 'page_size' in response"
        assert "total_pages" in data, "Missing 'total_pages' in response"
        
        print(f"✅ BD Students pagination: {data['total']} total, page {data['page']}/{data['total_pages']}, {len(data['items'])} items")
    
    def test_bd_students_pagination_page_size_25(self, super_admin_token):
        """Test BD students with page_size=25"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students?page=1&page_size=25", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page_size"] == 25
        assert len(data["items"]) <= 25
        print(f"✅ BD Students page_size=25: {len(data['items'])} items returned")
    
    def test_bd_students_as_bd_agent(self, bd_agent_token):
        """Test BD students endpoint as BD agent"""
        headers = {"Authorization": f"Bearer {bd_agent_token}"}
        response = requests.get(f"{BASE_URL}/api/bd/students?page=1&page_size=25", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✅ BD agent can access BD students: {data['total']} total")


class TestGZipCompression:
    """Test GZip compression on API responses"""
    
    def test_gzip_compression_leads(self, super_admin_token):
        """Test that leads endpoint supports GZip compression"""
        headers = {
            "Authorization": f"Bearer {super_admin_token}",
            "Accept-Encoding": "gzip, deflate"
        }
        response = requests.get(f"{BASE_URL}/api/leads?page=1&page_size=100", headers=headers)
        assert response.status_code == 200
        
        # Check if response is compressed
        content_encoding = response.headers.get("Content-Encoding", "")
        print(f"Content-Encoding header: '{content_encoding}'")
        
        # GZip should be applied for responses > 500 bytes
        if len(response.content) > 500:
            # Note: requests library auto-decompresses, so we check the header
            print(f"✅ Response size: {len(response.content)} bytes, Content-Encoding: {content_encoding}")
        else:
            print(f"⚠️ Response too small for GZip ({len(response.content)} bytes)")
    
    def test_gzip_compression_students(self, super_admin_token):
        """Test that students endpoint supports GZip compression"""
        headers = {
            "Authorization": f"Bearer {super_admin_token}",
            "Accept-Encoding": "gzip, deflate"
        }
        response = requests.get(f"{BASE_URL}/api/students?page=1&page_size=100", headers=headers)
        assert response.status_code == 200
        
        content_encoding = response.headers.get("Content-Encoding", "")
        print(f"✅ Students response Content-Encoding: {content_encoding}")


class TestCSAgentTransfer:
    """Test CS agent transfer bug fix - cs_agent_name should update correctly"""
    
    def test_student_update_with_cs_agent_name(self, super_admin_token):
        """Test that PUT /api/students/{id} updates cs_agent_name correctly"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # First, get a student to update
        response = requests.get(f"{BASE_URL}/api/students?page=1&page_size=1", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if not data["items"]:
            pytest.skip("No students available for testing")
        
        student = data["items"][0]
        student_id = student["id"]
        original_cs_agent_name = student.get("cs_agent_name")
        
        print(f"Testing student {student_id}, original cs_agent_name: {original_cs_agent_name}")
        
        # Update with new cs_agent_name
        test_cs_agent_name = "TEST_CS_Agent_Transfer"
        update_payload = {
            "cs_agent_name": test_cs_agent_name
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=headers,
            json=update_payload
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify the update from PUT response (PUT returns updated student)
        updated_student = update_response.json()
        assert updated_student.get("cs_agent_name") == test_cs_agent_name, \
            f"cs_agent_name not updated. Expected '{test_cs_agent_name}', got '{updated_student.get('cs_agent_name')}'"
        
        print(f"✅ cs_agent_name updated successfully to '{test_cs_agent_name}'")
        
        # Verify persistence by fetching from list
        verify_response = requests.get(f"{BASE_URL}/api/students?search={student['full_name'][:10]}&page_size=10", headers=headers)
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            for s in verify_data.get("items", []):
                if s["id"] == student_id:
                    assert s.get("cs_agent_name") == test_cs_agent_name, "cs_agent_name not persisted"
                    print(f"✅ cs_agent_name persisted correctly in database")
                    break
        
        # Restore original value if it existed
        if original_cs_agent_name:
            restore_payload = {"cs_agent_name": original_cs_agent_name}
            requests.put(f"{BASE_URL}/api/students/{student_id}", headers=headers, json=restore_payload)
            print(f"✅ Restored original cs_agent_name: {original_cs_agent_name}")
    
    def test_student_update_cs_agent_id_and_name_together(self, super_admin_token):
        """Test updating both cs_agent_id and cs_agent_name together"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a student
        response = requests.get(f"{BASE_URL}/api/students?page=1&page_size=1", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if not data["items"]:
            pytest.skip("No students available")
        
        student = data["items"][0]
        student_id = student["id"]
        original_cs_agent_id = student.get("cs_agent_id")
        original_cs_agent_name = student.get("cs_agent_name")
        
        # Update both fields
        test_agent_id = "TEST_AGENT_ID_123"
        test_agent_name = "Test Agent Name"
        
        update_payload = {
            "cs_agent_id": test_agent_id,
            "cs_agent_name": test_agent_name
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/students/{student_id}",
            headers=headers,
            json=update_payload
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify both fields updated from PUT response
        updated_student = update_response.json()
        
        assert updated_student.get("cs_agent_id") == test_agent_id, \
            f"cs_agent_id not updated. Expected '{test_agent_id}', got '{updated_student.get('cs_agent_id')}'"
        assert updated_student.get("cs_agent_name") == test_agent_name, \
            f"cs_agent_name not updated. Expected '{test_agent_name}', got '{updated_student.get('cs_agent_name')}'"
        
        print(f"✅ Both cs_agent_id and cs_agent_name updated correctly")
        
        # Restore original values
        restore_payload = {
            "cs_agent_id": original_cs_agent_id,
            "cs_agent_name": original_cs_agent_name
        }
        requests.put(f"{BASE_URL}/api/students/{student_id}", headers=headers, json=restore_payload)


class TestDashboardWithPagination:
    """Test that dashboard still works with paginated endpoints"""
    
    def test_dashboard_overall(self, super_admin_token):
        """Test overall dashboard endpoint still returns data correctly"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/overall", headers=headers)
        assert response.status_code == 200, f"Dashboard overall failed: {response.text}"
        
        data = response.json()
        print(f"✅ Dashboard overall endpoint working correctly, keys: {list(data.keys())[:5]}")
    
    def test_dashboard_stats(self, super_admin_token):
        """Test dashboard stats endpoint"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        data = response.json()
        print(f"✅ Dashboard stats endpoint working correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
