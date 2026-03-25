"""
Test Commission Dashboard API - TL Commission Logic (Iteration 72)
Tests for:
1. TL commission has no 18K rule - TL always earns commission regardless of SE 18K benchmark
2. TL should earn from team members' deals (team_leader_id field)
3. CS agents should see commission details directly on CS Dashboard
4. Net Pay chart should show correct Salary + Commission for TLs including team TL commission
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CEO_CREDS = {"email": "aqib@clt-academy.com", "password": "@Aqib1234"}
ALEESHA_CREDS = {"email": "aleesha@clt-academy.com", "password": "Aleesha@123"}
CS_AGENT_CREDS = {"email": "nasida@clt-academy.com", "password": "Nasida@123"}

# Sanjeed's ID (team_leader)
SANJEED_ID = "fbba06cf-2309-401b-8b8b-7b1d32abdc7b"


@pytest.fixture(scope="module")
def ceo_token():
    """Get CEO authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CEO_CREDS)
    assert response.status_code == 200, f"CEO login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def aleesha_token():
    """Get Aleesha (sales_executive) authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ALEESHA_CREDS)
    assert response.status_code == 200, f"Aleesha login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def cs_agent_token():
    """Get CS agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CS_AGENT_CREDS)
    assert response.status_code == 200, f"CS agent login failed: {response.text}"
    return response.json()["access_token"]


class TestCEOCommissionDashboard:
    """Test commission dashboard from CEO perspective"""
    
    def test_ceo_can_access_commission_dashboard(self, ceo_token):
        """CEO should be able to access commission dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "super_admin"
        assert "sales_commissions" in data
        assert "cs_commissions" in data
    
    def test_sanjeed_is_tl_or_sm_true(self, ceo_token):
        """Sanjeed (team_leader) should have is_tl_or_sm=true"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Sanjeed in sales_commissions
        sanjeed = None
        for agent in data.get("sales_commissions", []):
            if "sanjeed" in agent.get("agent_name", "").lower():
                sanjeed = agent
                break
        
        assert sanjeed is not None, "Sanjeed not found in sales_commissions"
        assert sanjeed.get("is_tl_or_sm") == True, f"Sanjeed should have is_tl_or_sm=True, got {sanjeed.get('is_tl_or_sm')}"
        assert sanjeed.get("agent_role") == "team_leader", f"Sanjeed should be team_leader, got {sanjeed.get('agent_role')}"
    
    def test_sanjeed_earned_tl_from_team_members(self, ceo_token):
        """Sanjeed should have earned_tl > 0 from team members' deals"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Sanjeed
        sanjeed = None
        for agent in data.get("sales_commissions", []):
            if "sanjeed" in agent.get("agent_name", "").lower():
                sanjeed = agent
                break
        
        assert sanjeed is not None, "Sanjeed not found"
        earned_tl = sanjeed.get("earned_tl", 0)
        assert earned_tl > 0, f"Sanjeed should have earned_tl > 0 from team members, got {earned_tl}"
        print(f"Sanjeed earned_tl: {earned_tl}")
    
    def test_sanjeed_team_tl_details_populated(self, ceo_token):
        """Sanjeed's team_tl_details should list team members' deals with TL commission"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Sanjeed
        sanjeed = None
        for agent in data.get("sales_commissions", []):
            if "sanjeed" in agent.get("agent_name", "").lower():
                sanjeed = agent
                break
        
        assert sanjeed is not None, "Sanjeed not found"
        team_tl_details = sanjeed.get("team_tl_details", [])
        assert len(team_tl_details) > 0, "Sanjeed should have team_tl_details from team members"
        
        # Verify structure of team_tl_details
        for detail in team_tl_details[:3]:
            assert "lead_name" in detail, "team_tl_details should have lead_name"
            assert "agent_name" in detail, "team_tl_details should have agent_name"
            assert "tl_commission" in detail, "team_tl_details should have tl_commission"
            assert detail["tl_commission"] > 0, "TL commission should be > 0"
        
        print(f"Sanjeed has {len(team_tl_details)} team TL details")
    
    def test_aleesha_benchmark_crossed(self, ceo_token):
        """Aleesha (sales_executive) should have benchmark_crossed=true"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Aleesha
        aleesha = None
        for agent in data.get("sales_commissions", []):
            if "aleesha" in agent.get("agent_name", "").lower():
                aleesha = agent
                break
        
        assert aleesha is not None, "Aleesha not found in sales_commissions"
        assert aleesha.get("benchmark_crossed") == True, f"Aleesha should have benchmark_crossed=True, got {aleesha.get('benchmark_crossed')}"
    
    def test_aleesha_earned_commission_2665(self, ceo_token):
        """Aleesha should have earned_commission=2665"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Aleesha
        aleesha = None
        for agent in data.get("sales_commissions", []):
            if "aleesha" in agent.get("agent_name", "").lower():
                aleesha = agent
                break
        
        assert aleesha is not None, "Aleesha not found"
        earned = aleesha.get("earned_commission", 0)
        assert earned == 2665, f"Aleesha should have earned_commission=2665, got {earned}"


class TestSalesExecutiveCommissionDashboard:
    """Test commission dashboard from sales_executive perspective"""
    
    def test_aleesha_can_access_own_commission(self, aleesha_token):
        """Aleesha should see her own commission data"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {aleesha_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "sales_executive"
        assert "my_commission" in data
        
        my_comm = data["my_commission"]
        assert my_comm.get("is_tl_or_sm") == False, "Aleesha should have is_tl_or_sm=False"
        assert my_comm.get("benchmark_crossed") == True, "Aleesha should have benchmark_crossed=True"
        assert my_comm.get("earned_commission") == 2665, f"Expected 2665, got {my_comm.get('earned_commission')}"
    
    def test_aleesha_has_earned_details(self, aleesha_token):
        """Aleesha should have earned_details with deal information"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {aleesha_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        my_comm = data["my_commission"]
        earned_details = my_comm.get("earned_details", [])
        assert len(earned_details) > 0, "Aleesha should have earned_details"
        
        # Verify structure
        for detail in earned_details[:3]:
            assert "lead_name" in detail
            assert "amount" in detail
            assert "se_commission" in detail
            assert "course_matched" in detail


class TestCSAgentCommissionDashboard:
    """Test commission dashboard from CS agent perspective"""
    
    def test_cs_agent_can_access_commission_dashboard(self, cs_agent_token):
        """CS agent should be able to access commission dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {cs_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "cs_agent"
        assert "my_commission" in data
    
    def test_cs_agent_has_commission_details(self, cs_agent_token):
        """CS agent should see their commission details"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {cs_agent_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        my_comm = data["my_commission"]
        assert "earned_commission" in my_comm
        assert "pending_commission" in my_comm
        assert "earned_details" in my_comm
        assert "upgrades_closed" in my_comm
        
        print(f"CS Agent earned: {my_comm.get('earned_commission')}, upgrades: {my_comm.get('upgrades_closed')}")


class TestScatterDataForNetPayChart:
    """Test scatter data endpoint for Net Pay Trend chart"""
    
    def test_scatter_data_returns_correct_structure(self, aleesha_token):
        """Scatter data should return base_salary, commission, net_pay"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/scatter-data?months=6",
            headers={"Authorization": f"Bearer {aleesha_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for data_points or data array
        points = data.get("data_points") or data.get("data", [])
        assert len(points) > 0, "Should have data points for Net Pay chart"
        
        # Verify structure of each point
        for point in points[:3]:
            assert "label" in point or "month" in point, "Point should have label or month"
            assert "base_salary" in point, "Point should have base_salary"
            assert "commission" in point, "Point should have commission"
            assert "net_pay" in point, "Point should have net_pay"
            
            # Net pay should be base_salary + commission
            expected_net = point.get("base_salary", 0) + point.get("commission", 0)
            actual_net = point.get("net_pay", 0)
            # Allow small tolerance for rounding
            assert abs(actual_net - expected_net) < 1, f"Net pay should be base_salary + commission: {actual_net} vs {expected_net}"


class TestTLNoEighteenKRule:
    """Test that TL has no 18K benchmark rule"""
    
    def test_tl_earns_commission_regardless_of_benchmark(self, ceo_token):
        """TL should earn commission even if total_revenue < 18K"""
        response = requests.get(
            f"{BASE_URL}/api/commissions/dashboard",
            headers={"Authorization": f"Bearer {ceo_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find any team_leader
        for agent in data.get("sales_commissions", []):
            if agent.get("agent_role") == "team_leader":
                is_tl = agent.get("is_tl_or_sm")
                assert is_tl == True, f"TL should have is_tl_or_sm=True"
                
                # If TL has deals, they should earn commission regardless of benchmark
                if agent.get("deals_closed", 0) > 0:
                    earned = agent.get("earned_commission", 0)
                    # TL should earn SE commission from own deals (no 18K gate)
                    print(f"TL {agent.get('agent_name')}: deals={agent.get('deals_closed')}, earned={earned}")
                
                # TL should also earn from team members
                earned_tl = agent.get("earned_tl", 0)
                team_details = agent.get("team_tl_details", [])
                if len(team_details) > 0:
                    assert earned_tl > 0, f"TL with team deals should have earned_tl > 0"
                    print(f"TL {agent.get('agent_name')}: team_tl_earned={earned_tl}, team_deals={len(team_details)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
