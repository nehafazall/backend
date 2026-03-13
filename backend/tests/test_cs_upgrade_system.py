"""
CS Upgrade Pricing and Commission System Tests
Tests: GET /api/cs/upgrade-packages, POST /api/cs/pitch-upgrade/{id}, POST /api/cs/confirm-upgrade/{id}, 
       PATCH /api/students/{id}/student-code
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "aqib@clt-academy.com",
        "password": "@Aqib1234"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCSUpgradePackages:
    """Tests for GET /api/cs/upgrade-packages endpoint"""
    
    def test_get_upgrade_packages_returns_all_paths(self, api_client):
        """Test that endpoint returns all 3 upgrade paths"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have 3 upgrade paths
        assert "basic_to_intermediate" in data
        assert "intermediate_to_advanced" in data
        assert "basic_to_advanced" in data
        
    def test_basic_to_intermediate_prices_and_commissions(self, api_client):
        """Test Basic/Intermediate path prices: 1600/1999/2105 with correct commissions"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        data = response.json()
        
        path = data["basic_to_intermediate"]
        assert path["label"] == "Basic / Intermediate"
        assert len(path["prices"]) == 3
        
        # Verify prices and agent commissions
        prices = path["prices"]
        # 1600 → 75 AED
        assert prices[0]["amount"] == 1600
        assert prices[0]["agent_commission"] == 75
        assert prices[0]["head_commission"] == 30
        
        # 1999 → 100 AED
        assert prices[1]["amount"] == 1999
        assert prices[1]["agent_commission"] == 100
        assert prices[1]["head_commission"] == 30
        
        # 2105 → 150 AED
        assert prices[2]["amount"] == 2105
        assert prices[2]["agent_commission"] == 150
        assert prices[2]["head_commission"] == 30
        
    def test_intermediate_to_advanced_prices_and_commissions(self, api_client):
        """Test Intermediate to Advanced path prices: 3599/3899/4100 with correct commissions"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        data = response.json()
        
        path = data["intermediate_to_advanced"]
        assert path["label"] == "Intermediate to Advanced"
        assert len(path["prices"]) == 3
        
        prices = path["prices"]
        # 3599 → 75 AED
        assert prices[0]["amount"] == 3599
        assert prices[0]["agent_commission"] == 75
        assert prices[0]["head_commission"] == 30
        
        # 3899 → 150 AED
        assert prices[1]["amount"] == 3899
        assert prices[1]["agent_commission"] == 150
        assert prices[1]["head_commission"] == 30
        
        # 4100 → 200 AED
        assert prices[2]["amount"] == 4100
        assert prices[2]["agent_commission"] == 200
        assert prices[2]["head_commission"] == 30
        
    def test_basic_to_advanced_prices_and_commissions(self, api_client):
        """Test Basic to Advanced path prices: 5600/6000/6500 with correct commissions"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        data = response.json()
        
        path = data["basic_to_advanced"]
        assert path["label"] == "Basic to Advanced"
        assert len(path["prices"]) == 3
        
        prices = path["prices"]
        # 5600 → 150 AED, head: 60 AED
        assert prices[0]["amount"] == 5600
        assert prices[0]["agent_commission"] == 150
        assert prices[0]["head_commission"] == 60
        
        # 6000 → 250 AED, head: 60 AED
        assert prices[1]["amount"] == 6000
        assert prices[1]["agent_commission"] == 250
        assert prices[1]["head_commission"] == 60
        
        # 6500 → 350 AED, head: 60 AED
        assert prices[2]["amount"] == 6500
        assert prices[2]["agent_commission"] == 350
        assert prices[2]["head_commission"] == 60
        
    def test_head_commission_structure(self, api_client):
        """Test CS Head commission: 30 AED for basic/intermediate paths, 60 AED for basic_to_advanced"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        data = response.json()
        
        # basic_to_intermediate: 30 AED head commission
        for price in data["basic_to_intermediate"]["prices"]:
            assert price["head_commission"] == 30, f"basic_to_intermediate head commission should be 30, got {price['head_commission']}"
            
        # intermediate_to_advanced: 30 AED head commission
        for price in data["intermediate_to_advanced"]["prices"]:
            assert price["head_commission"] == 30, f"intermediate_to_advanced head commission should be 30, got {price['head_commission']}"
            
        # basic_to_advanced: 60 AED head commission
        for price in data["basic_to_advanced"]["prices"]:
            assert price["head_commission"] == 60, f"basic_to_advanced head commission should be 60, got {price['head_commission']}"


class TestPitchUpgrade:
    """Tests for POST /api/cs/pitch-upgrade/{student_id} endpoint"""
    
    def test_pitch_upgrade_requires_student(self, api_client):
        """Test pitching upgrade for non-existent student returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{fake_id}", json={
            "upgrade_path": "basic_to_intermediate",
            "selected_price": 1600
        })
        assert response.status_code == 404
        
    def test_pitch_upgrade_requires_valid_path(self, api_client):
        """Test pitching with invalid path returns 400"""
        # First get a real student
        students_response = api_client.get(f"{BASE_URL}/api/students")
        if students_response.status_code != 200 or not students_response.json():
            pytest.skip("No students available for testing")
            
        student = students_response.json()[0]
        
        response = api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{student['id']}", json={
            "upgrade_path": "invalid_path",
            "selected_price": 1600
        })
        assert response.status_code == 400
        assert "Invalid upgrade path" in response.text
        
    def test_pitch_upgrade_requires_valid_price(self, api_client):
        """Test pitching with invalid price returns 400"""
        students_response = api_client.get(f"{BASE_URL}/api/students")
        if students_response.status_code != 200 or not students_response.json():
            pytest.skip("No students available for testing")
            
        student = students_response.json()[0]
        
        response = api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{student['id']}", json={
            "upgrade_path": "basic_to_intermediate",
            "selected_price": 9999  # Invalid price
        })
        assert response.status_code == 400
        assert "Invalid price" in response.text
        
    def test_pitch_upgrade_success_and_stage_update(self, api_client):
        """Test successful pitch updates student to pitched_for_upgrade stage"""
        # Find student in 'activated' stage
        students_response = api_client.get(f"{BASE_URL}/api/students?search=Samidha")
        students = students_response.json()
        
        # Find any activated student or use first available
        test_student = None
        if students:
            for s in students:
                if s.get("stage") == "activated":
                    test_student = s
                    break
            if not test_student:
                test_student = students[0]
        
        if not test_student:
            pytest.skip("No students available for testing")
            
        # Pitch the upgrade
        response = api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{test_student['id']}", json={
            "upgrade_path": "basic_to_intermediate",
            "selected_price": 1999
        })
        
        assert response.status_code == 200, f"Pitch upgrade failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert data["student"]["stage"] == "pitched_for_upgrade"
        assert data["student"]["pitched_upgrade_path"] == "basic_to_intermediate"
        assert data["student"]["pitched_upgrade_price"] == 1999
        assert data["student"]["pitched_upgrade_label"] == "Basic / Intermediate"


class TestConfirmUpgrade:
    """Tests for POST /api/cs/confirm-upgrade/{student_id} endpoint"""
    
    def test_confirm_upgrade_creates_verification_record(self, api_client):
        """Test confirm-upgrade creates finance verification record"""
        # Get a pitched student
        students_response = api_client.get(f"{BASE_URL}/api/students")
        students = students_response.json()
        
        pitched_student = None
        for s in students:
            if s.get("stage") == "pitched_for_upgrade" and s.get("pitched_upgrade_path"):
                pitched_student = s
                break
                
        if not pitched_student:
            pytest.skip("No pitched student available for testing")
            
        # Confirm the upgrade
        response = api_client.post(f"{BASE_URL}/api/cs/confirm-upgrade/{pitched_student['id']}", json={
            "upgrade_path": pitched_student["pitched_upgrade_path"],
            "selected_price": pitched_student["pitched_upgrade_price"],
            "payment_method": "bank_transfer",
            "change_type": "same"
        })
        
        assert response.status_code == 200, f"Confirm upgrade failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert "verification_id" in data
        assert "commissions" in data
        assert "agent" in data["commissions"]
        assert "head" in data["commissions"]
        
    def test_confirm_upgrade_creates_commissions(self, api_client):
        """Test confirm-upgrade creates CS commissions for agent and head"""
        # First pitch a student
        students_response = api_client.get(f"{BASE_URL}/api/students?stage=activated")
        students = students_response.json()
        
        if not students:
            # Try getting any student and pitch them
            students_response = api_client.get(f"{BASE_URL}/api/students")
            students = students_response.json()
            
        if not students:
            pytest.skip("No students available for testing")
            
        test_student = students[0]
        
        # Pitch the upgrade first
        pitch_response = api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{test_student['id']}", json={
            "upgrade_path": "intermediate_to_advanced",
            "selected_price": 3899
        })
        
        if pitch_response.status_code != 200:
            pytest.skip("Could not pitch student")
            
        # Confirm the upgrade
        confirm_response = api_client.post(f"{BASE_URL}/api/cs/confirm-upgrade/{test_student['id']}", json={
            "upgrade_path": "intermediate_to_advanced",
            "selected_price": 3899,
            "payment_method": "credit_card",
            "change_type": "same"
        })
        
        assert confirm_response.status_code == 200, f"Confirm upgrade failed: {confirm_response.text}"
        data = confirm_response.json()
        
        # Verify commissions
        assert data["commissions"]["agent"]["amount"] == 150  # 3899 → 150 AED agent commission
        assert data["commissions"]["head"]["amount"] == 30    # 30 AED head commission
        
    def test_confirm_upgrade_moves_to_new_student(self, api_client):
        """Test confirm-upgrade moves student back to new_student stage"""
        students_response = api_client.get(f"{BASE_URL}/api/students")
        students = students_response.json()
        
        if not students:
            pytest.skip("No students available")
            
        test_student = students[0]
        
        # Pitch
        api_client.post(f"{BASE_URL}/api/cs/pitch-upgrade/{test_student['id']}", json={
            "upgrade_path": "basic_to_advanced",
            "selected_price": 6000
        })
        
        # Confirm
        response = api_client.post(f"{BASE_URL}/api/cs/confirm-upgrade/{test_student['id']}", json={
            "upgrade_path": "basic_to_advanced",
            "selected_price": 6000,
            "payment_method": "tabby",
            "change_type": "same"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify student moved to new_student
        assert data["student"]["stage"] == "new_student"
        assert data["student"]["is_upgraded_student"] == True
        assert data["student"]["last_upgrade_amount"] == 6000
        
        # Verify commissions for basic_to_advanced (higher head commission)
        assert data["commissions"]["agent"]["amount"] == 250  # 6000 → 250 AED
        assert data["commissions"]["head"]["amount"] == 60    # basic_to_advanced → 60 AED head


class TestStudentCodeUpdate:
    """Tests for PATCH /api/students/{student_id}/student-code endpoint"""
    
    def test_update_student_code(self, api_client):
        """Test updating student_code field"""
        students_response = api_client.get(f"{BASE_URL}/api/students")
        students = students_response.json()
        
        if not students:
            pytest.skip("No students available")
            
        test_student = students[0]
        new_code = f"TEST-{uuid.uuid4().hex[:8].upper()}"
        
        response = api_client.patch(f"{BASE_URL}/api/students/{test_student['id']}/student-code", json={
            "student_code": new_code
        })
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert data["student_code"] == new_code  # Returns student_code directly, not nested
        
    def test_student_code_can_be_cleared(self, api_client):
        """Test student_code can be set to empty string"""
        students_response = api_client.get(f"{BASE_URL}/api/students")
        students = students_response.json()
        
        if not students:
            pytest.skip("No students available")
            
        test_student = students[0]
        
        response = api_client.patch(f"{BASE_URL}/api/students/{test_student['id']}/student-code", json={
            "student_code": ""
        })
        
        assert response.status_code == 200
        
    def test_student_code_invalid_student(self, api_client):
        """Test updating student_code for non-existent student returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.patch(f"{BASE_URL}/api/students/{fake_id}/student-code", json={
            "student_code": "TEST-123"
        })
        
        assert response.status_code == 404


class TestCommissionValues:
    """Verify exact commission values as specified in requirements"""
    
    def test_all_commission_values_exact(self, api_client):
        """Verify all commission values match specification exactly"""
        response = api_client.get(f"{BASE_URL}/api/cs/upgrade-packages")
        data = response.json()
        
        # Expected commissions from requirements
        expected = {
            "basic_to_intermediate": [
                {"amount": 1600, "commission": 75},
                {"amount": 1999, "commission": 100},
                {"amount": 2105, "commission": 150},
            ],
            "intermediate_to_advanced": [
                {"amount": 3599, "commission": 75},
                {"amount": 3899, "commission": 150},
                {"amount": 4100, "commission": 200},
            ],
            "basic_to_advanced": [
                {"amount": 5600, "commission": 150},
                {"amount": 6000, "commission": 250},
                {"amount": 6500, "commission": 350},
            ]
        }
        
        for path_id, expected_prices in expected.items():
            path = data[path_id]
            for i, exp in enumerate(expected_prices):
                actual = path["prices"][i]
                assert actual["amount"] == exp["amount"], f"{path_id}: Expected amount {exp['amount']}, got {actual['amount']}"
                assert actual["agent_commission"] == exp["commission"], f"{path_id} {exp['amount']}: Expected commission {exp['commission']}, got {actual['agent_commission']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
