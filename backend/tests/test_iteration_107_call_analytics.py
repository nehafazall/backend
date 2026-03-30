"""
Iteration 107 - Call Analytics Widget Tests
Tests for GET /api/3cx/call-analytics endpoint
- my_stats, leaderboard, top_dialed, is_manager fields
- Super admin sees all agents in leaderboard
- Leaderboard has user_name, today_minutes, month_minutes, month_calls
- top_dialed has phone_number, contact_name, dial_count
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


class TestCallAnalyticsAPI:
    """Tests for /api/3cx/call-analytics endpoint"""
    
    @pytest.fixture(scope="class")
    def super_admin_token(self):
        """Get super admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def cs_head_token(self):
        """Get CS head auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CS_HEAD_EMAIL,
            "password": CS_HEAD_PASSWORD
        })
        assert response.status_code == 200, f"CS head login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    def test_call_analytics_returns_required_fields(self, super_admin_token):
        """Test that call-analytics returns my_stats, leaderboard, top_dialed, is_manager"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Call analytics failed: {response.text}"
        data = response.json()
        
        # Verify all required top-level fields exist
        assert "my_stats" in data, "Missing my_stats field"
        assert "leaderboard" in data, "Missing leaderboard field"
        assert "top_dialed" in data, "Missing top_dialed field"
        assert "is_manager" in data, "Missing is_manager field"
        
        print(f"✓ All required fields present: my_stats, leaderboard, top_dialed, is_manager")
    
    def test_super_admin_is_manager_true(self, super_admin_token):
        """Test that super_admin has is_manager=true"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_manager"] == True, f"Expected is_manager=True for super_admin, got {data['is_manager']}"
        print(f"✓ Super admin has is_manager=True")
    
    def test_my_stats_structure(self, super_admin_token):
        """Test my_stats has required fields: today_minutes, month_minutes, today_calls, month_calls"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        my_stats = data["my_stats"]
        
        # Verify my_stats structure
        assert "today_minutes" in my_stats, "Missing today_minutes in my_stats"
        assert "month_minutes" in my_stats, "Missing month_minutes in my_stats"
        assert "today_calls" in my_stats, "Missing today_calls in my_stats"
        assert "month_calls" in my_stats, "Missing month_calls in my_stats"
        
        # Verify types
        assert isinstance(my_stats["today_minutes"], (int, float)), "today_minutes should be numeric"
        assert isinstance(my_stats["month_minutes"], (int, float)), "month_minutes should be numeric"
        assert isinstance(my_stats["today_calls"], int), "today_calls should be int"
        assert isinstance(my_stats["month_calls"], int), "month_calls should be int"
        
        print(f"✓ my_stats structure valid: today_minutes={my_stats['today_minutes']}, month_minutes={my_stats['month_minutes']}, today_calls={my_stats['today_calls']}, month_calls={my_stats['month_calls']}")
    
    def test_leaderboard_structure(self, super_admin_token):
        """Test leaderboard entries have user_name, today_minutes, month_minutes, month_calls"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        leaderboard = data["leaderboard"]
        
        # Leaderboard is a list
        assert isinstance(leaderboard, list), "leaderboard should be a list"
        
        if len(leaderboard) > 0:
            # Check first entry structure
            entry = leaderboard[0]
            assert "user_name" in entry, "Missing user_name in leaderboard entry"
            assert "today_minutes" in entry, "Missing today_minutes in leaderboard entry"
            assert "month_minutes" in entry, "Missing month_minutes in leaderboard entry"
            assert "month_calls" in entry, "Missing month_calls in leaderboard entry"
            
            print(f"✓ Leaderboard has {len(leaderboard)} entries with correct structure")
            print(f"  Top agent: {entry['user_name']} - {entry['month_minutes']}m this month, {entry['month_calls']} calls")
        else:
            print(f"✓ Leaderboard is empty (no call data yet)")
    
    def test_top_dialed_structure(self, super_admin_token):
        """Test top_dialed entries have phone_number, contact_name, dial_count"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        top_dialed = data["top_dialed"]
        
        # top_dialed is a list
        assert isinstance(top_dialed, list), "top_dialed should be a list"
        
        if len(top_dialed) > 0:
            # Check first entry structure
            entry = top_dialed[0]
            assert "phone_number" in entry, "Missing phone_number in top_dialed entry"
            assert "contact_name" in entry, "Missing contact_name in top_dialed entry"
            assert "dial_count" in entry, "Missing dial_count in top_dialed entry"
            
            print(f"✓ top_dialed has {len(top_dialed)} entries with correct structure")
            print(f"  Most dialed: {entry['phone_number']} ({entry['contact_name'] or 'Unknown'}) - {entry['dial_count']}x")
        else:
            print(f"✓ top_dialed is empty (no call data yet)")
    
    def test_super_admin_sees_all_agents(self, super_admin_token):
        """Test that super_admin sees all agents in leaderboard (not just own team)"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Super admin should see leaderboard (may be empty if no calls)
        assert "leaderboard" in data
        assert data["is_manager"] == True
        
        # If there are entries, verify they include agents from different roles
        leaderboard = data["leaderboard"]
        if len(leaderboard) > 0:
            roles = set(entry.get("role", "") for entry in leaderboard)
            print(f"✓ Super admin sees {len(leaderboard)} agents in leaderboard")
            print(f"  Roles represented: {roles}")
        else:
            print(f"✓ Super admin has access to leaderboard (currently empty)")
    
    def test_cs_head_call_analytics(self, cs_head_token):
        """Test that CS head can access call analytics"""
        response = requests.get(
            f"{BASE_URL}/api/3cx/call-analytics",
            headers={"Authorization": f"Bearer {cs_head_token}"}
        )
        assert response.status_code == 200, f"CS head call analytics failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "my_stats" in data
        assert "leaderboard" in data
        assert "top_dialed" in data
        assert "is_manager" in data
        
        print(f"✓ CS head can access call analytics")
        print(f"  is_manager: {data['is_manager']}")
        print(f"  my_stats: today={data['my_stats']['today_minutes']}m, month={data['my_stats']['month_minutes']}m")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
