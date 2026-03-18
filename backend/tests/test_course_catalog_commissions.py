"""
Test Course Catalog with Commission Fields and Bulk Actions
Tests: commission_sales_executive, commission_team_leader, commission_sales_manager
Tests: bulk-action endpoint for delete, activate, deactivate
Tests: Historical import template structure and sheets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_CREDENTIALS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
SALES_EXEC_CREDENTIALS = {"email": "kiran@clt-academy.com", "password": "@Aqib1234"}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN_CREDENTIALS)
    assert response.status_code == 200, f"Super admin login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def sales_exec_token():
    """Get sales executive authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC_CREDENTIALS)
    assert response.status_code == 200, f"Sales exec login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================== GET COURSE CATALOG TESTS ====================

class TestGetCourseCatalog:
    """Tests for GET /api/course-catalog with commission fields"""

    def test_get_course_catalog_returns_items(self, api_client, super_admin_token):
        """Test GET /api/course-catalog returns items with commission fields"""
        response = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should return items array
        assert "items" in data, "Response should contain 'items' key"
        items = data["items"]
        assert isinstance(items, list), "items should be a list"
        
        print(f"Total items in course catalog: {len(items)}")

    def test_course_catalog_items_have_commission_fields(self, api_client, super_admin_token):
        """Test that course catalog items have commission fields"""
        response = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        assert len(items) > 0, "Should have at least one item in course catalog"
        
        # Check first item has commission fields
        first_item = items[0]
        assert "commission_sales_executive" in first_item, "Item should have commission_sales_executive field"
        assert "commission_team_leader" in first_item, "Item should have commission_team_leader field"
        assert "commission_sales_manager" in first_item, "Item should have commission_sales_manager field"
        
        print(f"First item: {first_item['name']}")
        print(f"  - SE Commission: {first_item.get('commission_sales_executive')}")
        print(f"  - TL Commission: {first_item.get('commission_team_leader')}")
        print(f"  - SM Commission: {first_item.get('commission_sales_manager')}")


# ==================== POST COURSE CATALOG TESTS ====================

class TestCreateCourseCatalogItem:
    """Tests for POST /api/course-catalog with commission fields"""

    def test_create_item_with_commission_fields(self, api_client, super_admin_token):
        """Test creating a new course catalog item with commission fields"""
        new_item = {
            "name": "TEST_Course_With_Commission",
            "price": 5000,
            "type": "course",
            "commission_sales_executive": 150,
            "commission_team_leader": 100,
            "commission_sales_manager": 50
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_item,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == new_item["name"]
        assert data["price"] == new_item["price"]
        assert data["commission_sales_executive"] == new_item["commission_sales_executive"]
        assert data["commission_team_leader"] == new_item["commission_team_leader"]
        assert data["commission_sales_manager"] == new_item["commission_sales_manager"]
        
        print(f"Created item with ID: {data.get('id')}")
        
        # Store ID for cleanup
        TestCreateCourseCatalogItem.created_item_id = data.get("id")

    def test_create_addon_with_commission(self, api_client, super_admin_token):
        """Test creating an add-on with commission fields"""
        new_addon = {
            "name": "TEST_Addon_Premium_Support",
            "price": 299,
            "type": "addon",
            "commission_sales_executive": 25,
            "commission_team_leader": 15,
            "commission_sales_manager": 10
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_addon,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["type"] == "addon"
        assert data["commission_sales_executive"] == 25
        
        TestCreateCourseCatalogItem.created_addon_id = data.get("id")


# ==================== PUT COURSE CATALOG TESTS ====================

class TestUpdateCourseCatalogItem:
    """Tests for PUT /api/course-catalog/{id} updating commission fields"""

    def test_update_commission_fields(self, api_client, super_admin_token):
        """Test updating commission fields on an existing item"""
        # First get an existing item
        response = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        items = response.json().get("items", [])
        
        # Find our test item or any existing item
        test_item = None
        for item in items:
            if item["name"].startswith("TEST_"):
                test_item = item
                break
        
        if not test_item:
            # Create one if not found
            create_response = api_client.post(
                f"{BASE_URL}/api/course-catalog",
                json={"name": "TEST_Update_Commission_Item", "price": 1000, "type": "course"},
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            test_item = create_response.json()
        
        item_id = test_item["id"]
        
        # Update commission fields
        update_data = {
            "commission_sales_executive": 200,
            "commission_team_leader": 150,
            "commission_sales_manager": 75
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/course-catalog/{item_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update by fetching catalog again
        verify_response = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        updated_items = verify_response.json().get("items", [])
        updated_item = next((i for i in updated_items if i["id"] == item_id), None)
        
        assert updated_item is not None
        assert updated_item["commission_sales_executive"] == 200
        assert updated_item["commission_team_leader"] == 150
        assert updated_item["commission_sales_manager"] == 75
        
        print(f"Successfully updated commission fields for item: {item_id}")


# ==================== BULK ACTION TESTS ====================

class TestBulkActions:
    """Tests for POST /api/course-catalog/bulk-action"""

    @pytest.fixture(autouse=True)
    def setup_test_items(self, api_client, super_admin_token):
        """Create test items for bulk actions"""
        self.created_ids = []
        
        for i in range(3):
            response = api_client.post(
                f"{BASE_URL}/api/course-catalog",
                json={
                    "name": f"TEST_Bulk_Item_{i}",
                    "price": 1000 + i * 100,
                    "type": "course"
                },
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            if response.status_code == 201:
                self.created_ids.append(response.json().get("id"))
        
        yield
        
        # Cleanup - delete created items
        if self.created_ids:
            api_client.post(
                f"{BASE_URL}/api/course-catalog/bulk-action",
                json={"ids": self.created_ids, "action": "delete"},
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )

    def test_bulk_deactivate(self, api_client, super_admin_token):
        """Test bulk deactivate action"""
        if not self.created_ids:
            pytest.skip("No test items created")
        
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": self.created_ids, "action": "deactivate"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "deactivated" in data.get("message", "").lower() or "item" in data.get("message", "").lower()
        
        # Verify items are deactivated
        catalog = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        for item_id in self.created_ids:
            item = next((i for i in catalog.get("items", []) if i["id"] == item_id), None)
            if item:
                assert item["is_active"] == False, f"Item {item_id} should be deactivated"
        
        print(f"Successfully deactivated {len(self.created_ids)} items")

    def test_bulk_activate(self, api_client, super_admin_token):
        """Test bulk activate action"""
        if not self.created_ids:
            pytest.skip("No test items created")
        
        # First deactivate
        api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": self.created_ids, "action": "deactivate"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Then activate
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": self.created_ids, "action": "activate"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "activated" in data.get("message", "").lower() or "item" in data.get("message", "").lower()
        
        # Verify items are activated
        catalog = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        for item_id in self.created_ids:
            item = next((i for i in catalog.get("items", []) if i["id"] == item_id), None)
            if item:
                assert item["is_active"] == True, f"Item {item_id} should be activated"
        
        print(f"Successfully activated {len(self.created_ids)} items")

    def test_bulk_delete(self, api_client, super_admin_token):
        """Test bulk delete action"""
        # Create specific items for delete test
        delete_ids = []
        for i in range(2):
            response = api_client.post(
                f"{BASE_URL}/api/course-catalog",
                json={"name": f"TEST_Delete_Item_{i}", "price": 500, "type": "addon"},
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            if response.status_code == 201:
                delete_ids.append(response.json().get("id"))
        
        if not delete_ids:
            pytest.skip("Could not create items for delete test")
        
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": delete_ids, "action": "delete"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "deleted" in data.get("message", "").lower()
        
        # Verify items are deleted
        catalog = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        ).json()
        
        for item_id in delete_ids:
            item = next((i for i in catalog.get("items", []) if i["id"] == item_id), None)
            assert item is None, f"Item {item_id} should be deleted"
        
        print(f"Successfully deleted {len(delete_ids)} items")

    def test_bulk_action_invalid_action(self, api_client, super_admin_token):
        """Test bulk action with invalid action type"""
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ["test-id"], "action": "invalid_action"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400

    def test_bulk_action_empty_ids(self, api_client, super_admin_token):
        """Test bulk action with empty ids"""
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": [], "action": "delete"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400

    def test_bulk_action_requires_admin(self, api_client, sales_exec_token):
        """Test that bulk action requires admin/super_admin role"""
        response = api_client.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ["test-id"], "action": "delete"},
            headers={"Authorization": f"Bearer {sales_exec_token}"}
        )
        assert response.status_code == 403, "Sales executive should not be able to perform bulk actions"


# ==================== HISTORICAL TEMPLATE TESTS ====================

class TestHistoricalImportTemplate:
    """Tests for historical import template structure"""

    def test_template_download_returns_xlsx(self, api_client, super_admin_token):
        """Test that template download returns xlsx file"""
        response = api_client.get(
            f"{BASE_URL}/api/import/templates/historical-sales/download?token={super_admin_token}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "octet-stream" in content_type, \
            f"Expected spreadsheet content type, got: {content_type}"
        
        content_disposition = response.headers.get("content-disposition", "")
        assert "xlsx" in content_disposition, f"Expected xlsx file, got: {content_disposition}"
        
        print("Template download successful - returns xlsx file")

    def test_template_info_endpoint(self, api_client, super_admin_token):
        """Test GET /api/import/templates/historical-sales returns template info"""
        response = api_client.get(
            f"{BASE_URL}/api/import/templates/historical-sales",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields exist
        assert "headers" in data or "fields" in data, "Should have headers or fields info"
        
        print(f"Template info: {list(data.keys())}")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_items(self, api_client, super_admin_token):
        """Delete all TEST_ prefixed items"""
        response = api_client.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        if response.status_code == 200:
            items = response.json().get("items", [])
            test_ids = [i["id"] for i in items if i["name"].startswith("TEST_")]
            
            if test_ids:
                api_client.post(
                    f"{BASE_URL}/api/course-catalog/bulk-action",
                    json={"ids": test_ids, "action": "delete"},
                    headers={"Authorization": f"Bearer {super_admin_token}"}
                )
                print(f"Cleaned up {len(test_ids)} test items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
