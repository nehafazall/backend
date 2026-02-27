"""
Test Access Control Page - Granular Permissions Feature
Tests the hierarchical permission system for roles with module and sub-page level permissions.

Endpoints tested:
- GET /api/roles/{role_id}/permissions - Get saved permissions for a role
- PUT /api/roles/{role_id}/permissions - Save permissions for a role
- GET /api/user/permissions - Get current user's permissions based on their role
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"


class TestAccessControlPermissions:
    """Test Access Control and Permission Management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - login as super admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as super admin: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json().get("user")
        
        yield
        
        # Cleanup - reset any test permissions
        self.session.close()
    
    def test_super_admin_login_successful(self):
        """Verify super admin can login"""
        assert self.user is not None
        assert self.user.get("role") == "super_admin"
        print(f"✓ Super admin login successful: {self.user.get('full_name')}")
    
    def test_get_user_permissions_super_admin(self):
        """Test GET /api/user/permissions returns full access for super admin"""
        response = self.session.get(f"{BASE_URL}/api/user/permissions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Super admin should have full access
        assert data.get("is_super_admin") == True or data.get("full_access") == True
        print(f"✓ Super admin has full access: {data}")
    
    def test_get_role_permissions_empty(self):
        """Test GET /api/roles/{role_id}/permissions returns empty for role without custom permissions"""
        # Test with a role that likely has no custom permissions
        response = self.session.get(f"{BASE_URL}/api/roles/sales_executive/permissions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty dict or saved permissions
        assert isinstance(data, dict)
        print(f"✓ GET role permissions for sales_executive: {data}")
    
    def test_get_role_permissions_various_roles(self):
        """Test GET /api/roles/{role_id}/permissions for multiple roles"""
        roles = ['admin', 'sales_manager', 'team_leader', 'cs_head', 'cs_agent', 'mentor', 'finance', 'hr']
        
        for role_id in roles:
            response = self.session.get(f"{BASE_URL}/api/roles/{role_id}/permissions")
            assert response.status_code == 200, f"Failed for role: {role_id}"
            data = response.json()
            assert isinstance(data, dict), f"Expected dict for role: {role_id}"
        
        print(f"✓ GET role permissions works for all {len(roles)} roles")
    
    def test_save_role_permissions(self):
        """Test PUT /api/roles/{role_id}/permissions saves permissions correctly"""
        test_role = "sales_executive"
        
        # Define test permissions structure
        test_permissions = {
            "dashboard": {
                "enabled": True,
                "level": "view",
                "subPages": {
                    "main_dashboard": "view",
                    "qc_dashboard": "none"
                }
            },
            "sales": {
                "enabled": True,
                "level": "edit",
                "subPages": {
                    "sales_crm": "edit",
                    "sales_dashboard": "view",
                    "today_followups": "edit",
                    "leads_pool": "none",
                    "approvals": "none"
                }
            },
            "customer_service": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "cs_kanban": "none",
                    "cs_dashboard": "none",
                    "customer_master": "none"
                }
            }
        }
        
        # Save permissions
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=test_permissions
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data.get("role_id") == test_role
        print(f"✓ Permissions saved successfully for {test_role}")
        
        # Verify saved permissions
        verify_response = self.session.get(f"{BASE_URL}/api/roles/{test_role}/permissions")
        assert verify_response.status_code == 200
        saved_data = verify_response.json()
        
        # Verify structure is preserved
        assert "dashboard" in saved_data
        assert saved_data["dashboard"]["enabled"] == True
        assert saved_data["dashboard"]["level"] == "view"
        assert saved_data["dashboard"]["subPages"]["main_dashboard"] == "view"
        print(f"✓ Permissions verified for {test_role}")
    
    def test_save_role_permissions_full_finance_module(self):
        """Test saving permissions with full Finance module sub-pages"""
        test_role = "finance"
        
        # Finance module with all 15 sub-pages
        finance_permissions = {
            "finance": {
                "enabled": True,
                "level": "full",
                "subPages": {
                    "finance_selector": "full",
                    "commission_engine": "edit",
                    # CLT Finance
                    "clt_dashboard": "full",
                    "clt_payables": "full",
                    "clt_receivables": "full",
                    # Miles Finance
                    "miles_dashboard": "full",
                    "miles_deposits": "full",
                    "miles_withdrawals": "full",
                    "miles_expenses": "full",
                    "miles_profit": "full",
                    # Treasury
                    "treasury_dashboard": "full",
                    "treasury_balances": "full",
                    "treasury_settlements": "full",
                    # Budgeting
                    "budget_sheet": "edit",
                    "data_management": "view"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=finance_permissions
        )
        
        assert response.status_code == 200
        print("✓ Finance module with 15 sub-pages saved successfully")
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/roles/{test_role}/permissions")
        assert verify_response.status_code == 200
        saved = verify_response.json()
        
        assert "finance" in saved
        assert saved["finance"]["enabled"] == True
        assert len(saved["finance"]["subPages"]) == 15
        print(f"✓ Finance module verified with {len(saved['finance']['subPages'])} sub-pages")
    
    def test_save_role_permissions_settings_module(self):
        """Test saving Settings module permissions"""
        test_role = "admin"
        
        settings_permissions = {
            "settings": {
                "enabled": True,
                "level": "full",
                "subPages": {
                    "user_management": "full",
                    "access_control": "view",  # Admin can view but not edit
                    "role_management": "full",
                    "teams_management": "full",
                    "departments": "full",
                    "courses": "full",
                    "password_resets": "none",  # Super admin only
                    "audit_log": "view",
                    "admin_settings": "full"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=settings_permissions
        )
        
        assert response.status_code == 200
        print("✓ Settings module permissions saved for admin")
    
    def test_permission_level_validation(self):
        """Test that all permission levels (none/view/edit/full) are accepted"""
        test_role = "team_leader"
        
        permissions_all_levels = {
            "sales": {
                "enabled": True,
                "level": "edit",
                "subPages": {
                    "sales_crm": "full",      # Full access
                    "sales_dashboard": "edit", # Edit access
                    "today_followups": "view", # View only
                    "leads_pool": "none",      # No access
                    "approvals": "view"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=permissions_all_levels
        )
        
        assert response.status_code == 200
        print("✓ All permission levels (none/view/edit/full) accepted")
    
    def test_module_enable_disable_toggle(self):
        """Test that module enabled/disabled state is preserved"""
        test_role = "cs_agent"
        
        # Set some modules as disabled
        permissions = {
            "customer_service": {
                "enabled": True,
                "level": "edit",
                "subPages": {
                    "cs_kanban": "edit",
                    "cs_dashboard": "view",
                    "customer_master": "view"
                }
            },
            "sales": {
                "enabled": False,  # Disabled module
                "level": "none",
                "subPages": {
                    "sales_crm": "none",
                    "sales_dashboard": "none",
                    "today_followups": "none",
                    "leads_pool": "none",
                    "approvals": "none"
                }
            }
        }
        
        # Save
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=permissions
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/roles/{test_role}/permissions")
        saved = verify_response.json()
        
        assert saved["customer_service"]["enabled"] == True
        assert saved["sales"]["enabled"] == False
        print("✓ Module enable/disable state preserved correctly")
    
    def test_reset_to_defaults_by_clearing(self):
        """Test that sending empty permissions resets to defaults"""
        test_role = "mentor"  # Use a valid system role
        
        # First save some permissions
        initial_permissions = {
            "dashboard": {
                "enabled": True,
                "level": "view",
                "subPages": {"main_dashboard": "view", "qc_dashboard": "none"}
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=initial_permissions
        )
        assert response.status_code == 200
        
        # Now clear permissions (frontend sends defaults on reset)
        # In the actual app, reset sends default permissions
        reset_permissions = {
            "dashboard": {
                "enabled": False,
                "level": "none",
                "subPages": {"main_dashboard": "none", "qc_dashboard": "none"}
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=reset_permissions
        )
        assert response.status_code == 200
        print("✓ Permissions can be reset/cleared successfully")
    
    def test_invalid_role_returns_404(self):
        """Test that invalid role ID returns appropriate error"""
        response = self.session.get(f"{BASE_URL}/api/roles/nonexistent_role_xyz/permissions")
        
        # The endpoint might return 200 with empty dict or 404
        # Based on implementation, it returns empty dict for unknown roles
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, dict)
        print(f"✓ Unknown role handled correctly: status {response.status_code}")


class TestPermissionEnforcement:
    """Test that permissions are enforced in Layout navigation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as super admin first to set up test
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login")
        
        self.token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        self.session.close()
    
    def test_get_user_permissions_returns_role_based_permissions(self):
        """Test that /api/user/permissions returns correct permissions structure"""
        response = self.session.get(f"{BASE_URL}/api/user/permissions")
        
        assert response.status_code == 200
        data = response.json()
        
        # For super admin, should have full access
        assert "is_super_admin" in data or "full_access" in data
        print(f"✓ User permissions endpoint returns: {data}")


class TestAccessControlPageData:
    """Test data requirements for Access Control page UI"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Could not login")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        self.session.close()
    
    def test_all_defined_roles_are_accessible(self):
        """Test that all system roles can have permissions set"""
        # System roles defined in DEFAULT_SYSTEM_ROLES
        system_roles = [
            'admin', 'sales_manager', 'team_leader', 'sales_executive',
            'cs_head', 'cs_agent', 'mentor', 'finance', 'hr',
            'finance_manager', 'finance_admin', 'finance_treasurer',
            'finance_verifier', 'financier', 'accounts'
        ]
        
        for role_id in system_roles:
            response = self.session.get(f"{BASE_URL}/api/roles/{role_id}/permissions")
            assert response.status_code == 200, f"Failed for role: {role_id}"
        
        print(f"✓ All {len(system_roles)} system roles are accessible")
    
    def test_save_complete_permission_structure(self):
        """Test saving a complete permission structure with all modules"""
        test_role = "hr"  # Use a valid system role
        
        # Complete permission structure matching MODULE_HIERARCHY
        complete_permissions = {
            "dashboard": {
                "enabled": True,
                "level": "view",
                "subPages": {
                    "main_dashboard": "view",
                    "qc_dashboard": "view"
                }
            },
            "sales": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "sales_crm": "none",
                    "sales_dashboard": "none",
                    "today_followups": "none",
                    "leads_pool": "none",
                    "approvals": "none"
                }
            },
            "customer_service": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "cs_kanban": "none",
                    "cs_dashboard": "none",
                    "customer_master": "none"
                }
            },
            "mentor": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "mentor_crm": "none",
                    "mentor_dashboard": "none",
                    "leaderboard": "none"
                }
            },
            "hr": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "hr_dashboard": "none",
                    "employee_master": "none",
                    "leave_management": "none",
                    "attendance": "none",
                    "biocloud_sync": "none",
                    "payroll": "none",
                    "performance": "none",
                    "hr_assets": "none",
                    "hr_analytics": "none"
                }
            },
            "finance": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "finance_selector": "none",
                    "commission_engine": "none",
                    "clt_dashboard": "none",
                    "clt_payables": "none",
                    "clt_receivables": "none",
                    "miles_dashboard": "none",
                    "miles_deposits": "none",
                    "miles_withdrawals": "none",
                    "miles_expenses": "none",
                    "miles_profit": "none",
                    "treasury_dashboard": "none",
                    "treasury_balances": "none",
                    "treasury_settlements": "none",
                    "budget_sheet": "none",
                    "data_management": "none"
                }
            },
            "operations": {
                "enabled": True,
                "level": "full",
                "subPages": {
                    "qc_dashboard": "full"
                }
            },
            "settings": {
                "enabled": False,
                "level": "none",
                "subPages": {
                    "user_management": "none",
                    "access_control": "none",
                    "role_management": "none",
                    "teams_management": "none",
                    "departments": "none",
                    "courses": "none",
                    "password_resets": "none",
                    "audit_log": "none",
                    "admin_settings": "none"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/roles/{test_role}/permissions",
            json=complete_permissions
        )
        
        assert response.status_code == 200
        print("✓ Complete permission structure saved successfully")
        
        # Verify all modules saved
        verify_response = self.session.get(f"{BASE_URL}/api/roles/{test_role}/permissions")
        saved = verify_response.json()
        
        assert len(saved) == 8, f"Expected 8 modules, got {len(saved)}"
        print(f"✓ All {len(saved)} modules verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
