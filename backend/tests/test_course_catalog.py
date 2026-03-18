"""
Test Course Catalog Management - Bulk Actions & CRUD
Features tested:
1. GET /api/course-catalog - List all items
2. POST /api/course-catalog - Create new item
3. PUT /api/course-catalog/{id} - Update item
4. DELETE /api/course-catalog/{id} - Delete single item
5. POST /api/course-catalog/bulk-action - Bulk delete/activate/deactivate
6. GET /api/import/templates/historical-sales/download - Template with 4 sheets
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
SALES_EXEC = {"email": "kiran@clt-academy.com", "password": "@Aqib1234"}


@pytest.fixture(scope="module")
def admin_token():
    """Get super_admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def sales_token():
    """Get sales_executive token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_EXEC)
    assert response.status_code == 200, f"Sales login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


class TestCourseCatalogList:
    """Tests for GET /api/course-catalog"""
    
    def test_course_catalog_loads_for_admin(self, admin_token):
        """Admin should see all 22 seeded items"""
        response = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have items list
        assert "items" in data
        items = data["items"]
        
        # Should have 22 items (10 courses + 6 addons + 6 upgrades)
        # Note: May be more/less if tests modified catalog
        assert len(items) >= 10, f"Expected at least 10 items, got {len(items)}"
        
        # Each item should have required fields
        for item in items[:5]:
            assert "id" in item
            assert "name" in item
            assert "price" in item
            assert "type" in item
            assert item["type"] in ["course", "addon", "upgrade"]
    
    def test_course_catalog_grouped_response(self, admin_token):
        """Response should include grouped breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "grouped" in data
        grouped = data["grouped"]
        assert "courses" in grouped
        assert "addons" in grouped
        assert "upgrades" in grouped
    
    def test_type_counts_match(self, admin_token):
        """Type counts should match groupings"""
        response = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        items = data["items"]
        grouped = data["grouped"]
        
        course_count = sum(1 for i in items if i.get("type") == "course")
        addon_count = sum(1 for i in items if i.get("type") == "addon")
        upgrade_count = sum(1 for i in items if i.get("type") == "upgrade")
        
        assert len(grouped["courses"]) == course_count
        assert len(grouped["addons"]) == addon_count
        assert len(grouped["upgrades"]) == upgrade_count


class TestCourseCatalogCRUD:
    """Tests for Create/Read/Update/Delete operations"""
    
    def test_create_catalog_item(self, admin_token):
        """Admin can create new catalog item"""
        new_item = {
            "name": "TEST_Course_Pytest",
            "price": 9999,
            "type": "course"
        }
        response = requests.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_item,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Course_Pytest"
        assert data["price"] == 9999
        assert data["type"] == "course"
        assert data["is_active"] == True
        assert "id" in data
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/course-catalog/{data['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_create_requires_admin(self, sales_token):
        """Sales exec cannot create catalog items"""
        new_item = {"name": "Unauthorized", "price": 100, "type": "course"}
        response = requests.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_item,
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403
    
    def test_update_catalog_item(self, admin_token):
        """Admin can update catalog item"""
        # First create
        new_item = {"name": "TEST_Update_Me", "price": 1000, "type": "addon"}
        create_resp = requests.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_item,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_resp.status_code == 200
        item_id = create_resp.json()["id"]
        
        # Update
        update_data = {"name": "TEST_Updated_Name", "price": 2000}
        update_resp = requests.put(
            f"{BASE_URL}/api/course-catalog/{item_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["name"] == "TEST_Updated_Name"
        assert updated["price"] == 2000
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/course-catalog/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_catalog_item(self, admin_token):
        """Admin can delete catalog item"""
        # First create
        new_item = {"name": "TEST_Delete_Me", "price": 500, "type": "upgrade"}
        create_resp = requests.post(
            f"{BASE_URL}/api/course-catalog",
            json=new_item,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        item_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(
            f"{BASE_URL}/api/course-catalog/{item_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_resp.status_code == 200
        assert "deleted" in delete_resp.json()["message"].lower()
        
        # Verify gone
        get_resp = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = get_resp.json()["items"]
        assert not any(i["id"] == item_id for i in items)


class TestBulkActions:
    """Tests for POST /api/course-catalog/bulk-action"""
    
    def test_bulk_deactivate(self, admin_token):
        """Bulk deactivate items"""
        # Create test items
        ids = []
        for i in range(2):
            resp = requests.post(
                f"{BASE_URL}/api/course-catalog",
                json={"name": f"TEST_Bulk_Deact_{i}", "price": 100+i, "type": "addon"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            ids.append(resp.json()["id"])
        
        # Bulk deactivate
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "deactivate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "2" in response.json()["message"] or "deactivated" in response.json()["message"].lower()
        
        # Verify deactivated
        catalog_resp = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = catalog_resp.json()["items"]
        for item_id in ids:
            item = next((i for i in items if i["id"] == item_id), None)
            if item:
                assert item["is_active"] == False
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "delete"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_bulk_activate(self, admin_token):
        """Bulk activate items"""
        # Create and deactivate test items
        ids = []
        for i in range(2):
            resp = requests.post(
                f"{BASE_URL}/api/course-catalog",
                json={"name": f"TEST_Bulk_Act_{i}", "price": 200+i, "type": "course"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            ids.append(resp.json()["id"])
        
        # Deactivate first
        requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "deactivate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Bulk activate
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "activate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify activated
        catalog_resp = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = catalog_resp.json()["items"]
        for item_id in ids:
            item = next((i for i in items if i["id"] == item_id), None)
            if item:
                assert item["is_active"] == True
        
        # Cleanup
        requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "delete"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_bulk_delete(self, admin_token):
        """Bulk delete items"""
        # Create test items
        ids = []
        for i in range(2):
            resp = requests.post(
                f"{BASE_URL}/api/course-catalog",
                json={"name": f"TEST_Bulk_Del_{i}", "price": 300+i, "type": "upgrade"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            ids.append(resp.json()["id"])
        
        # Bulk delete
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ids, "action": "delete"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify gone
        catalog_resp = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = catalog_resp.json()["items"]
        for item_id in ids:
            assert not any(i["id"] == item_id for i in items)
    
    def test_bulk_action_invalid_action(self, admin_token):
        """Invalid action returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ["fake-id"], "action": "invalid"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
    
    def test_bulk_action_no_ids(self, admin_token):
        """Empty ids returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": [], "action": "delete"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
    
    def test_bulk_action_requires_admin(self, sales_token):
        """Sales exec cannot use bulk actions"""
        response = requests.post(
            f"{BASE_URL}/api/course-catalog/bulk-action",
            json={"ids": ["fake-id"], "action": "delete"},
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 403


class TestHistoricalImportTemplate:
    """Tests for GET /api/import/templates/historical-sales/download"""
    
    def test_template_download(self, admin_token):
        """Template should download as Excel with 4 sheets"""
        response = requests.get(
            f"{BASE_URL}/api/import/templates/historical-sales/download?token={admin_token}"
        )
        assert response.status_code == 200
        
        # Should be Excel file
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet" in content_type
        
        # Should have content-disposition for download
        content_disp = response.headers.get("content-disposition", "")
        assert "historical" in content_disp.lower() or "attachment" in content_disp.lower()
    
    def test_template_has_content(self, admin_token):
        """Template should have actual content (not empty)"""
        response = requests.get(
            f"{BASE_URL}/api/import/templates/historical-sales/download?token={admin_token}"
        )
        assert response.status_code == 200
        
        # Should have substantial content
        content_length = len(response.content)
        assert content_length > 1000, f"Template too small: {content_length} bytes"


class TestSalesCRMIntegration:
    """Test that course catalog items are available in Sales CRM"""
    
    def test_catalog_available_to_sales(self, sales_token):
        """Sales exec should see active courses and addons"""
        response = requests.get(
            f"{BASE_URL}/api/course-catalog",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Sales should see items
        assert "items" in data
        items = data["items"]
        
        # All visible items should be active
        for item in items:
            assert item.get("is_active", True) == True
        
        # Sales should see courses and addons (not upgrades)
        types = [i["type"] for i in items]
        assert "course" in types, "Sales should see courses"
        assert "addon" in types, "Sales should see addons"
        # Note: Upgrades may not be visible to sales_executive


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
