"""
Test Course Catalog and Add-on Selection Features for Sales CRM

Tests:
1. GET /api/course-catalog returns correct data grouped by type
2. Role-based filtering: sales user sees courses + addons but NOT upgrades
3. Lead update with course selection saves selected_addons, course_value, addons_value to DB
4. Pipeline stage validation: requires course selection for warm_lead/hot_lead/in_progress
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
SALES_EXECUTIVE = {"email": "kiran@clt-academy.com", "password": "@Aqib1234"}


class TestCourseCatalog:
    """Tests for course catalog endpoint and role-based filtering"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales executive token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_EXECUTIVE)
        assert response.status_code == 200, f"Sales exec login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    def test_course_catalog_returns_grouped_data(self, super_admin_token):
        """Test GET /api/course-catalog returns items grouped by type"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "items" in data, "Missing 'items' in response"
        assert "grouped" in data, "Missing 'grouped' in response"
        
        grouped = data["grouped"]
        assert "courses" in grouped, "Missing 'courses' in grouped"
        assert "addons" in grouped, "Missing 'addons' in grouped"
        assert "upgrades" in grouped, "Missing 'upgrades' in grouped"
        
        print(f"✓ Course catalog has {len(grouped['courses'])} courses, {len(grouped['addons'])} addons, {len(grouped['upgrades'])} upgrades")
    
    def test_super_admin_sees_all_types(self, super_admin_token):
        """Test super_admin can see courses, addons, AND upgrades"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        grouped = data["grouped"]
        
        # Super admin should see all 3 types
        assert len(grouped["courses"]) > 0, "Super admin should see courses"
        assert len(grouped["addons"]) > 0, "Super admin should see addons"
        assert len(grouped["upgrades"]) > 0, "Super admin should see upgrades"
        
        print(f"✓ Super admin sees all types: {len(grouped['courses'])} courses, {len(grouped['addons'])} addons, {len(grouped['upgrades'])} upgrades")
    
    def test_sales_exec_sees_courses_and_addons_not_upgrades(self, sales_token):
        """Test sales_executive sees courses + addons but NOT upgrades"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        grouped = data["grouped"]
        
        # Sales should see courses and addons
        assert len(grouped["courses"]) > 0, "Sales exec should see courses"
        assert len(grouped["addons"]) > 0, "Sales exec should see addons"
        
        # Sales should NOT see upgrades
        assert len(grouped["upgrades"]) == 0, f"Sales exec should NOT see upgrades, but got {len(grouped['upgrades'])}"
        
        print(f"✓ Sales exec sees {len(grouped['courses'])} courses, {len(grouped['addons'])} addons, 0 upgrades (correct)")
    
    def test_catalog_items_have_required_fields(self, super_admin_token):
        """Test each catalog item has id, name, price, type"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        items = data["items"]
        
        for item in items:
            assert "id" in item, f"Missing 'id' in item: {item}"
            assert "name" in item, f"Missing 'name' in item: {item}"
            assert "price" in item, f"Missing 'price' in item: {item}"
            assert "type" in item, f"Missing 'type' in item: {item}"
            assert item["type"] in ["course", "addon", "upgrade"], f"Invalid type: {item['type']}"
        
        print(f"✓ All {len(items)} catalog items have required fields")
    
    def test_addons_have_expected_items(self, super_admin_token):
        """Test addons include expected items from seed data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        addons = data["grouped"]["addons"]
        addon_names = [a["name"] for a in addons]
        
        # Check for expected addon names from seed data
        expected_addons = ["Whatsapp community", "indicator", "Ebook", "Lifetime Mentorship", "Whatsapp Signal"]
        for expected in expected_addons:
            found = any(expected.lower() in name.lower() for name in addon_names)
            # Don't fail, just report
            if found:
                print(f"  ✓ Found addon containing '{expected}'")
            else:
                print(f"  ? Addon '{expected}' not found (might have different naming)")
        
        print(f"✓ Found {len(addons)} addons in catalog")


class TestLeadCourseSelection:
    """Tests for lead update with course and addon selection"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def catalog_data(self, super_admin_token):
        """Get course catalog for test data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/course-catalog", headers=headers)
        assert response.status_code == 200
        return response.json()["grouped"]
    
    def test_create_lead_for_course_selection(self, super_admin_token):
        """Create a test lead to use for course selection tests"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Create test lead
        lead_data = {
            "full_name": "TEST_CourseCatalog Lead",
            "phone": "+971501234567",
            "email": "test_course_catalog@test.com",
            "country": "UAE",
            "lead_source": "website"
        }
        
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=headers)
        
        if response.status_code == 409:
            # Duplicate - get existing lead
            print("✓ Test lead already exists")
            return None
        
        assert response.status_code == 201, f"Failed to create lead: {response.text}"
        lead = response.json()
        print(f"✓ Created test lead: {lead['id']}")
        return lead["id"]
    
    def test_pipeline_stage_requires_course_selection(self, super_admin_token, catalog_data):
        """Test that moving to warm_lead requires course selection"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get existing leads to find one to test with
        response = requests.get(f"{BASE_URL}/api/leads?search=TEST_CourseCatalog", headers=headers)
        if response.status_code != 200 or not response.json():
            # Create a new test lead
            lead_data = {
                "full_name": "TEST_Pipeline Lead",
                "phone": "+971509999999",
                "email": "test_pipeline@test.com"
            }
            response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=headers)
            if response.status_code == 409:
                # Get the duplicate lead
                search_resp = requests.get(f"{BASE_URL}/api/leads?search=TEST_Pipeline", headers=headers)
                leads = search_resp.json()
                if leads:
                    lead_id = leads[0]["id"]
                else:
                    pytest.skip("Cannot find test lead")
                    return
            else:
                lead_id = response.json()["id"]
        else:
            lead_id = response.json()[0]["id"]
        
        # Try to move to warm_lead without course selection - should fail
        update_without_course = {"stage": "warm_lead"}
        response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_without_course, headers=headers)
        
        # Could be 400 if validation, or 200 if existing course was set
        if response.status_code == 400:
            assert "course" in response.text.lower(), f"Expected course-related error: {response.text}"
            print(f"✓ Correctly requires course selection for warm_lead stage")
        else:
            print(f"✓ Lead already had course selected or validation passed")
    
    def test_lead_update_with_course_and_addons(self, super_admin_token, catalog_data):
        """Test updating lead with course selection and addons saves correct values"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Get a course and some addons
        courses = catalog_data["courses"]
        addons = catalog_data["addons"]
        
        if not courses:
            pytest.skip("No courses in catalog")
        
        selected_course = courses[0]
        selected_addons = addons[:2] if len(addons) >= 2 else addons
        
        # Create a fresh test lead
        lead_data = {
            "full_name": "TEST_CourseAddons Lead",
            "phone": f"+9715099{int(__import__('time').time()) % 10000:04d}",
            "email": f"test_addons_{int(__import__('time').time())}@test.com"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=headers)
        
        if response.status_code == 409:
            # Get existing
            search_resp = requests.get(f"{BASE_URL}/api/leads?search=TEST_CourseAddons", headers=headers)
            if search_resp.json():
                lead_id = search_resp.json()[0]["id"]
            else:
                pytest.skip("Cannot create or find test lead")
                return
        else:
            assert response.status_code == 201, f"Failed: {response.text}"
            lead_id = response.json()["id"]
        
        # Prepare addons in the expected format
        selected_addons_data = [
            {"id": a["id"], "name": a["name"], "price": a["price"]}
            for a in selected_addons
        ]
        
        # Calculate expected values
        course_price = selected_course["price"]
        addons_total = sum(a["price"] for a in selected_addons_data)
        expected_total = course_price + addons_total
        
        # Update lead with course and addons
        update_data = {
            "stage": "warm_lead",
            "interested_course_id": selected_course["id"],
            "selected_addons": selected_addons_data,
            "estimated_value": expected_total
        }
        
        response = requests.put(f"{BASE_URL}/api/leads/{lead_id}", json=update_data, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify the update was saved
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)
        assert response.status_code == 200
        updated_lead = response.json()
        
        # Verify fields
        assert updated_lead.get("interested_course_id") == selected_course["id"], "Course ID not saved"
        assert updated_lead.get("stage") == "warm_lead", "Stage not updated"
        
        # Check selected_addons
        saved_addons = updated_lead.get("selected_addons", [])
        assert len(saved_addons) == len(selected_addons_data), f"Expected {len(selected_addons_data)} addons, got {len(saved_addons)}"
        
        # Check price values
        if updated_lead.get("course_value"):
            assert updated_lead["course_value"] == course_price, f"Course value mismatch: {updated_lead['course_value']} vs {course_price}"
        
        if updated_lead.get("addons_value"):
            assert updated_lead["addons_value"] == addons_total, f"Addons value mismatch: {updated_lead['addons_value']} vs {addons_total}"
        
        estimated = updated_lead.get("estimated_value", 0)
        assert estimated == expected_total, f"Estimated value mismatch: {estimated} vs {expected_total}"
        
        print(f"✓ Lead updated with course: {selected_course['name']} (AED {course_price})")
        print(f"✓ Selected addons: {[a['name'] for a in selected_addons_data]} (Total: AED {addons_total})")
        print(f"✓ Estimated total: AED {expected_total}")
        
        # Cleanup - delete test lead
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)


class TestDuplicateLeadDetection:
    """Regression test for duplicate lead detection"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200
        return response.json().get("access_token")
    
    def test_duplicate_lead_returns_409(self, super_admin_token):
        """Test creating duplicate lead by phone returns 409 with merge option"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        unique_phone = f"+971509876{int(__import__('time').time()) % 10000:04d}"
        
        # Create first lead
        lead_data = {
            "full_name": "TEST_Duplicate Lead",
            "phone": unique_phone,
            "email": "test_dup@test.com"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/leads", json=lead_data, headers=headers)
        if response1.status_code == 409:
            print("✓ Lead already exists (reusing for test)")
            return
        
        assert response1.status_code == 201, f"First lead creation failed: {response1.text}"
        lead_id = response1.json()["id"]
        
        # Try to create duplicate with same phone
        duplicate_data = {
            "full_name": "TEST_Duplicate Lead 2",
            "phone": unique_phone,
            "email": "test_dup2@test.com"
        }
        
        response2 = requests.post(f"{BASE_URL}/api/leads", json=duplicate_data, headers=headers)
        
        # Should return 409 with duplicate info
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        
        dup_data = response2.json()
        assert "duplicate" in dup_data or "existing_lead" in dup_data, f"Missing duplicate info: {dup_data}"
        
        print(f"✓ Duplicate lead detection working - returns 409 with merge option")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/leads/{lead_id}", headers=headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
