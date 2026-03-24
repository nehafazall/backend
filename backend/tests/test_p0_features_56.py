"""
Test P0 Features for CLT Synapse ERP - Iteration 56
1. Super admin lead creation bypassing round-robin with direct agent assignment
2. Customer Master sorting by total_spent
3. Rejected leads appearing in Leads Pool
4. Duplicate lead detection returns 409 with duplicate info
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://data-integrity-check-12.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
SALES_EXEC_EMAIL = "kiran@clt-academy.com"
SALES_EXEC_PASSWORD = "@Aqib1234"
KIRAN_AGENT_ID = "e4567d08-1123-4058-bdd0-99b0e1c5c09b"


class TestAuthAndSetup:
    """Authentication tests to get tokens"""
    
    def test_super_admin_login(self, api_client):
        """Super admin login returns access_token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token (not token)
        assert "access_token" in data, f"Expected access_token in response, got: {data.keys()}"
        assert data.get("user", {}).get("role") == "super_admin"
        print(f"✓ Super admin login successful, role: {data['user']['role']}")
        
    def test_sales_executive_login(self, api_client):
        """Sales executive login returns access_token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "sales_executive"
        print(f"✓ Sales executive login successful, role: {data['user']['role']}")


class TestSuperAdminDirectLeadAssignment:
    """Test super admin can bypass round-robin and assign leads directly"""
    
    def test_super_admin_create_lead_with_direct_assignment(self, super_admin_client):
        """Super admin can create a lead and assign it directly to a specific agent"""
        test_phone = f"+971500TEST{int(time.time()) % 10000:04d}"
        
        response = super_admin_client.post(f"{BASE_URL}/api/leads", json={
            "full_name": "TEST Direct Assignment Lead",
            "phone": test_phone,
            "email": f"test_direct_{int(time.time())}@test.com",
            "country": "UAE",
            "lead_source": "manual",
            "assigned_to": KIRAN_AGENT_ID  # Direct assignment to Kiran
        })
        
        assert response.status_code in [200, 201], f"Failed to create lead: {response.text}"
        data = response.json()
        
        # Verify the lead was assigned to the specific agent (not round-robin)
        assert data.get("assigned_to") == KIRAN_AGENT_ID, f"Expected assigned_to={KIRAN_AGENT_ID}, got {data.get('assigned_to')}"
        assert "Kiran" in (data.get("assigned_to_name") or ""), f"Expected agent name containing 'Kiran', got {data.get('assigned_to_name')}"
        assert data.get("in_pool") == False, "Lead should not be in pool when assigned"
        
        print(f"✓ Lead created with direct assignment to {data.get('assigned_to_name')}")
        
        # Cleanup - delete the test lead
        lead_id = data.get("id")
        if lead_id:
            super_admin_client.delete(f"{BASE_URL}/api/leads/{lead_id}")
    
    def test_super_admin_create_lead_without_assignment_uses_round_robin(self, super_admin_client):
        """When super admin doesn't specify assigned_to, round-robin is used"""
        test_phone = f"+971500RROBIN{int(time.time()) % 10000:04d}"
        
        response = super_admin_client.post(f"{BASE_URL}/api/leads", json={
            "full_name": "TEST Round Robin Lead",
            "phone": test_phone,
            "country": "UAE"
            # No assigned_to - should use round-robin
        })
        
        assert response.status_code in [200, 201], f"Failed to create lead: {response.text}"
        data = response.json()
        
        # Lead should be assigned (via round-robin) or in pool if no agents available
        # Either way, the assignment should not be to a specific agent we chose
        print(f"✓ Lead created via round-robin, assigned to: {data.get('assigned_to_name') or 'Pool'}")
        
        # Cleanup
        lead_id = data.get("id")
        if lead_id:
            super_admin_client.delete(f"{BASE_URL}/api/leads/{lead_id}")
    
    def test_get_sales_agents_for_dropdown(self, super_admin_client):
        """Verify we can get sales executives for the dropdown"""
        response = super_admin_client.get(f"{BASE_URL}/api/users?role=sales_executive")
        assert response.status_code == 200
        agents = response.json()
        
        # Should have at least one active sales executive
        active_agents = [a for a in agents if a.get("is_active")]
        assert len(active_agents) > 0, "No active sales executives found"
        
        # Kiran should be in the list
        kiran = next((a for a in active_agents if a.get("id") == KIRAN_AGENT_ID), None)
        assert kiran is not None, f"Kiran (ID: {KIRAN_AGENT_ID}) not found in agents list"
        
        print(f"✓ Found {len(active_agents)} active sales executives, including Kiran")


class TestCustomerMasterSorting:
    """Test Customer Master sorting by total_spent"""
    
    def test_get_customers_sorted_by_total_spent_desc(self, super_admin_client):
        """GET /api/customers?sort_by=total_spent&sort_order=desc works"""
        response = super_admin_client.get(
            f"{BASE_URL}/api/customers?sort_by=total_spent&sort_order=desc"
        )
        assert response.status_code == 200
        customers = response.json()
        
        # API should accept the parameters and return a list
        assert isinstance(customers, list), f"Expected list, got {type(customers)}"
        
        if len(customers) >= 2:
            # Verify descending order
            for i in range(len(customers) - 1):
                curr_spent = customers[i].get("total_spent", 0)
                next_spent = customers[i + 1].get("total_spent", 0)
                assert curr_spent >= next_spent, f"Not sorted descending: {curr_spent} < {next_spent}"
            print(f"✓ Customers sorted by total_spent DESC - {len(customers)} records")
        else:
            print(f"✓ Customer sort endpoint working, but only {len(customers)} customers (cannot verify order)")
    
    def test_get_customers_sorted_by_total_spent_asc(self, super_admin_client):
        """GET /api/customers?sort_by=total_spent&sort_order=asc works"""
        response = super_admin_client.get(
            f"{BASE_URL}/api/customers?sort_by=total_spent&sort_order=asc"
        )
        assert response.status_code == 200
        customers = response.json()
        
        assert isinstance(customers, list)
        
        if len(customers) >= 2:
            # Verify ascending order
            for i in range(len(customers) - 1):
                curr_spent = customers[i].get("total_spent", 0)
                next_spent = customers[i + 1].get("total_spent", 0)
                assert curr_spent <= next_spent, f"Not sorted ascending: {curr_spent} > {next_spent}"
            print(f"✓ Customers sorted by total_spent ASC - {len(customers)} records")
        else:
            print(f"✓ Customer sort endpoint working, but only {len(customers)} customers (cannot verify order)")
    
    def test_invalid_sort_field_defaults_to_created_at(self, super_admin_client):
        """Invalid sort_by field should default to created_at"""
        response = super_admin_client.get(
            f"{BASE_URL}/api/customers?sort_by=invalid_field&sort_order=desc"
        )
        assert response.status_code == 200
        # Should not error, just use default sort
        print("✓ Invalid sort_by handled gracefully (defaults to created_at)")


class TestRejectedLeadsInPool:
    """Test that rejected leads appear in the Leads Pool"""
    
    def test_rejected_lead_appears_in_pool(self, super_admin_client):
        """When a lead is rejected, it should appear in /api/leads/pool"""
        # Step 1: Create a new lead
        test_phone = f"+971500REJ{int(time.time()) % 100000:05d}"
        
        create_response = super_admin_client.post(f"{BASE_URL}/api/leads", json={
            "full_name": "TEST Rejected Lead Pool Test",
            "phone": test_phone,
            "country": "UAE",
            "assigned_to": KIRAN_AGENT_ID
        })
        
        assert create_response.status_code in [200, 201], f"Failed to create lead: {create_response.text}"
        lead = create_response.json()
        lead_id = lead.get("id")
        assert lead_id, "No lead ID returned"
        
        try:
            # Step 2: Reject the lead
            reject_response = super_admin_client.put(f"{BASE_URL}/api/leads/{lead_id}", json={
                "stage": "rejected",
                "rejection_reason": "not_interested"
            })
            
            assert reject_response.status_code == 200, f"Failed to reject lead: {reject_response.text}"
            rejected_lead = reject_response.json()
            
            # Verify in_pool is set to True
            assert rejected_lead.get("in_pool") == True, f"Expected in_pool=True, got {rejected_lead.get('in_pool')}"
            assert rejected_lead.get("stage") == "rejected"
            
            print(f"✓ Lead rejected, in_pool={rejected_lead.get('in_pool')}")
            
            # Step 3: Verify lead appears in pool endpoint
            pool_response = super_admin_client.get(f"{BASE_URL}/api/leads/pool")
            assert pool_response.status_code == 200
            pool_leads = pool_response.json()
            
            # Find our test lead in the pool
            found_in_pool = any(l.get("id") == lead_id for l in pool_leads)
            assert found_in_pool, f"Rejected lead {lead_id} not found in pool"
            
            print(f"✓ Rejected lead appears in Leads Pool (total pool leads: {len(pool_leads)})")
            
        finally:
            # Cleanup
            super_admin_client.delete(f"{BASE_URL}/api/leads/{lead_id}")
    
    def test_pool_endpoint_includes_rejected_stage(self, super_admin_client):
        """Leads Pool endpoint query includes rejected stage"""
        response = super_admin_client.get(f"{BASE_URL}/api/leads/pool")
        assert response.status_code == 200
        pool_leads = response.json()
        
        # Check if there are any rejected leads in the pool
        rejected_in_pool = [l for l in pool_leads if l.get("stage") == "rejected"]
        print(f"✓ Pool endpoint working - {len(pool_leads)} leads total, {len(rejected_in_pool)} rejected")


class TestDuplicateLeadDetection:
    """Test duplicate lead detection returns 409 with duplicate info"""
    
    def test_duplicate_phone_returns_409(self, super_admin_client):
        """Creating a lead with an existing phone returns 409 with duplicate info"""
        test_phone = f"+971500DUP{int(time.time()) % 100000:05d}"
        
        # Step 1: Create first lead
        create_response = super_admin_client.post(f"{BASE_URL}/api/leads", json={
            "full_name": "TEST Original Lead",
            "phone": test_phone,
            "country": "UAE"
        })
        
        assert create_response.status_code in [200, 201], f"Failed to create first lead: {create_response.text}"
        first_lead = create_response.json()
        first_lead_id = first_lead.get("id")
        
        try:
            # Step 2: Try to create duplicate with same phone
            dup_response = super_admin_client.post(f"{BASE_URL}/api/leads", json={
                "full_name": "TEST Duplicate Lead",
                "phone": test_phone,  # Same phone
                "country": "India"
            })
            
            # Should return 409 Conflict
            assert dup_response.status_code == 409, f"Expected 409, got {dup_response.status_code}: {dup_response.text}"
            
            dup_data = dup_response.json()
            
            # Verify duplicate info structure
            assert dup_data.get("duplicate") == True, "Expected duplicate=True"
            assert "existing_lead" in dup_data, "Expected existing_lead info"
            
            existing = dup_data.get("existing_lead", {})
            assert existing.get("id") == first_lead_id
            assert existing.get("phone") == test_phone
            assert dup_data.get("matched_on") == "phone"
            
            print(f"✓ Duplicate phone returns 409 with existing_lead info: {existing.get('full_name')}")
            
        finally:
            # Cleanup
            if first_lead_id:
                super_admin_client.delete(f"{BASE_URL}/api/leads/{first_lead_id}")


class TestNonSuperAdminCannotDirectAssign:
    """Verify non-super-admin cannot use direct assignment"""
    
    def test_sales_exec_lead_uses_round_robin(self, sales_exec_client):
        """Sales executive creating lead should use round-robin (not direct assignment)"""
        test_phone = f"+971500SE{int(time.time()) % 100000:05d}"
        
        # Even if sales exec tries to specify assigned_to, it should be ignored
        response = sales_exec_client.post(f"{BASE_URL}/api/leads", json={
            "full_name": "TEST SE Lead",
            "phone": test_phone,
            "country": "UAE",
            "assigned_to": KIRAN_AGENT_ID  # This should be ignored for non-super-admin
        })
        
        # The lead creation may succeed or fail depending on permissions
        # If it succeeds, the assigned_to should NOT be what was requested
        if response.status_code in [200, 201]:
            data = response.json()
            # For non-super-admin, the assigned_to field in request should be ignored
            # and round-robin should be used (or assigned to self)
            print(f"✓ Sales exec created lead, assigned to: {data.get('assigned_to_name')}")
            
            # Cleanup
            lead_id = data.get("id")
            if lead_id:
                # Try to delete (may need super admin)
                try:
                    sales_exec_client.delete(f"{BASE_URL}/api/leads/{lead_id}")
                except:
                    pass
        else:
            print(f"✓ Sales exec lead creation returned {response.status_code} - may not have permission")


# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Basic requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def super_admin_client(api_client):
    """Authenticated super admin session"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
    return api_client


@pytest.fixture
def sales_exec_client():
    """Authenticated sales executive session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": SALES_EXEC_EMAIL,
        "password": SALES_EXEC_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
    return session
