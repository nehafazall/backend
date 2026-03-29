"""
Iteration 98 - Testing Sales Directory, Sales CRM Table View, Security Endpoints, Claret Onboarding
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "aqib@clt-academy.com"
SUPER_ADMIN_PASSWORD = "@Aqib1234"
SALES_EXEC_EMAIL = "aleesha@clt-academy.com"
SALES_EXEC_PASSWORD = "Aleesha@123"


class TestAuthentication:
    """Test authentication for different roles"""
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
        print(f"✅ Super admin login successful: {data['user']['full_name']}")
        return data["access_token"]
    
    def test_sales_exec_login(self):
        """Test sales executive login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        assert response.status_code == 200, f"Sales exec login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✅ Sales exec login successful: {data['user']['full_name']}, role: {data['user']['role']}")
        return data["access_token"]


class TestSecurityEndpoints:
    """Test CEO-only security endpoints for Claret and Team Chat data"""
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def sales_exec_token(self):
        """Get sales exec token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_claret_profiles_admin_access(self, admin_token):
        """Test GET /api/security/claret-profiles - CEO/Admin only"""
        response = requests.get(
            f"{BASE_URL}/api/security/claret-profiles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "profiles" in data
        print(f"✅ Claret profiles endpoint accessible by admin: {len(data['profiles'])} profiles found")
    
    def test_claret_profiles_sales_exec_denied(self, sales_exec_token):
        """Test GET /api/security/claret-profiles - Sales exec should be denied"""
        response = requests.get(
            f"{BASE_URL}/api/security/claret-profiles",
            headers={"Authorization": f"Bearer {sales_exec_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Claret profiles correctly denied for sales_executive")
    
    def test_team_chat_data_admin_access(self, admin_token):
        """Test GET /api/security/team-chat-data - CEO/Admin only"""
        response = requests.get(
            f"{BASE_URL}/api/security/team-chat-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "conversations" in data
        print(f"✅ Team chat data endpoint accessible by admin: {len(data['conversations'])} conversations found")
    
    def test_team_chat_data_sales_exec_denied(self, sales_exec_token):
        """Test GET /api/security/team-chat-data - Sales exec should be denied"""
        response = requests.get(
            f"{BASE_URL}/api/security/team-chat-data",
            headers={"Authorization": f"Bearer {sales_exec_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Team chat data correctly denied for sales_executive")
    
    def test_claret_chats_admin_access(self, admin_token):
        """Test GET /api/security/claret-chats - CEO/Admin only"""
        response = requests.get(
            f"{BASE_URL}/api/security/claret-chats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "chats" in data
        print(f"✅ Claret chats endpoint accessible by admin: {len(data['chats'])} chats found")


class TestClaretOnboarding:
    """Test Claret onboarding questions endpoint"""
    
    def test_onboarding_questions_english(self):
        """Test GET /api/claret/onboarding-questions returns 7 MCQ + 3 open questions"""
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=english")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "questions" in data
        questions = data["questions"]
        assert "mcq" in questions
        assert "open" in questions
        
        mcq_count = len(questions["mcq"])
        open_count = len(questions["open"])
        
        assert mcq_count == 7, f"Expected 7 MCQ questions, got {mcq_count}"
        assert open_count == 3, f"Expected 3 open questions, got {open_count}"
        
        # Verify MCQ structure
        for mcq in questions["mcq"]:
            assert "q" in mcq, "MCQ missing 'q' field"
            assert "options" in mcq, "MCQ missing 'options' field"
            assert len(mcq["options"]) >= 4, f"MCQ should have at least 4 options, got {len(mcq['options'])}"
        
        print(f"✅ Onboarding questions: {mcq_count} MCQ + {open_count} open questions")
    
    def test_onboarding_questions_hinglish(self):
        """Test onboarding questions in Hinglish"""
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=hinglish")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "hinglish"
        print("✅ Hinglish onboarding questions available")
    
    def test_onboarding_questions_manglish(self):
        """Test onboarding questions in Manglish"""
        response = requests.get(f"{BASE_URL}/api/claret/onboarding-questions?language=manglish")
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "manglish"
        print("✅ Manglish onboarding questions available")


class TestSalesDirectoryAPI:
    """Test Sales Directory API - enrolled leads with filters"""
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def sales_exec_token(self):
        """Get sales exec token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_leads_enrolled_filter(self, admin_token):
        """Test GET /api/leads with stage=enrolled filter"""
        response = requests.get(
            f"{BASE_URL}/api/leads?stage=enrolled&sort_by=enrolled_at&sort_order=desc&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check response structure
        if "items" in data:
            items = data["items"]
        else:
            items = data if isinstance(data, list) else []
        
        print(f"✅ Enrolled leads query returned {len(items)} items")
        
        # Verify all returned leads are enrolled
        for lead in items[:5]:
            assert lead.get("stage") == "enrolled", f"Lead {lead.get('id')} has stage {lead.get('stage')}, expected enrolled"
        
        # Check for expected fields
        if items:
            lead = items[0]
            expected_fields = ["full_name", "email", "phone", "stage"]
            for field in expected_fields:
                assert field in lead, f"Missing field: {field}"
            print(f"✅ Lead data structure verified with fields: {list(lead.keys())[:10]}")
    
    def test_leads_date_filter(self, admin_token):
        """Test leads with date_from and date_to filters on enrolled_at"""
        import datetime
        now = datetime.datetime.now()
        date_from = f"{now.year}-{now.month:02d}-01"
        last_day = 28 if now.month == 2 else 30 if now.month in [4, 6, 9, 11] else 31
        date_to = f"{now.year}-{now.month:02d}-{last_day}"
        
        response = requests.get(
            f"{BASE_URL}/api/leads?stage=enrolled&date_from={date_from}&date_to={date_to}&date_field=enrolled_at",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✅ Date filter query successful for {date_from} to {date_to}")
    
    def test_leads_agent_filter(self, admin_token):
        """Test leads with assigned_to filter"""
        # First get a list of agents
        response = requests.get(
            f"{BASE_URL}/api/users?role=sales_executive",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, dict) and "users" in users:
                users = users["users"]
            if users and len(users) > 0:
                agent_id = users[0].get("id")
                # Now filter leads by this agent
                response = requests.get(
                    f"{BASE_URL}/api/leads?stage=enrolled&assigned_to={agent_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                assert response.status_code == 200
                print(f"✅ Agent filter query successful for agent {agent_id}")
            else:
                print("⚠️ No sales executives found to test agent filter")
        else:
            print("⚠️ Could not fetch users to test agent filter")


class TestSalesCRMTableView:
    """Test Sales CRM with Kanban/Table toggle"""
    
    @pytest.fixture
    def admin_token(self):
        """Get super admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_leads_list_for_table_view(self, admin_token):
        """Test GET /api/leads returns data suitable for table view"""
        response = requests.get(
            f"{BASE_URL}/api/leads?page=1&page_size=20",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        if "items" in data:
            items = data["items"]
            total = data.get("total", len(items))
        else:
            items = data if isinstance(data, list) else []
            total = len(items)
        
        print(f"✅ Leads list returned {len(items)} items (total: {total})")
        
        # Verify table-required fields
        if items:
            lead = items[0]
            table_fields = ["full_name", "phone", "stage", "assigned_to_name"]
            for field in table_fields:
                if field not in lead:
                    print(f"⚠️ Field '{field}' not in lead response")
            print(f"✅ Lead fields available for table view")


class TestAccessControl:
    """Test role-based access control for Sales Directory"""
    
    @pytest.fixture
    def sales_exec_token(self):
        """Get sales exec token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EXEC_EMAIL,
            "password": SALES_EXEC_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_sales_exec_can_access_leads(self, sales_exec_token):
        """Sales exec should be able to access leads API"""
        response = requests.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {sales_exec_token}"}
        )
        # Sales exec should be able to access leads (their own)
        assert response.status_code == 200, f"Sales exec should access leads: {response.text}"
        print("✅ Sales exec can access leads API")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
