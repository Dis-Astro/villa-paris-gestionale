"""
Villa Paris Gestionale - Backend API Tests (Iteration 18)
Tests for: Admin login, Presenze Villa CRUD, Appuntamenti API, Report pages
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:3000"

class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@villaparis.local"
        assert data["role"] == "ADMIN"
        assert "id" in data
        print(f"✅ Admin login successful: {data['email']} ({data['role']})")
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("✅ Wrong password correctly rejected")
    
    def test_admin_login_missing_fields(self):
        """Login with missing fields should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local"
        })
        assert response.status_code == 400
        print("✅ Missing password correctly rejected")


class TestPresenzeVillaAPI:
    """Test Presenze Villa CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        self.today = datetime.now().strftime("%Y-%m-%d")
    
    def test_get_presenze_empty(self):
        """GET presenze for today (may be empty)"""
        response = self.session.get(f"{BASE_URL}/api/presenze-villa", params={
            "date": self.today,
            "mode": "day"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "mode" in data
        assert data["mode"] == "day"
        print(f"✅ GET presenze-villa: {len(data['items'])} items")
    
    def test_create_presenza(self):
        """POST create new presenza"""
        payload = {
            "dataRiferimento": self.today,
            "nome": "TEST_Mario",
            "cognome": "TEST_Rossi",
            "azienda": "TEST_Azienda",
            "orarioIngresso": "09:00",
            "orarioUscita": "17:00",
            "motivoVisita": "TEST_Manutenzione",
            "mansioneSvolta": "TEST_Riparazione"
        }
        response = self.session.post(f"{BASE_URL}/api/presenze-villa", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["nome"] == "TEST_Mario"
        assert data["cognome"] == "TEST_Rossi"
        assert "id" in data
        self.created_id = data["id"]
        print(f"✅ POST presenze-villa: created id={data['id']}")
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/presenze-villa", params={
            "date": self.today,
            "mode": "day"
        })
        assert get_response.status_code == 200
        items = get_response.json()["items"]
        created_item = next((i for i in items if i["id"] == data["id"]), None)
        assert created_item is not None
        assert created_item["nome"] == "TEST_Mario"
        print("✅ GET verified created presenza")
        
        # Cleanup
        delete_response = self.session.delete(f"{BASE_URL}/api/presenze-villa", params={"id": data["id"]})
        assert delete_response.status_code == 200
        print(f"✅ DELETE presenze-villa: cleaned up id={data['id']}")
    
    def test_create_presenza_missing_field(self):
        """POST with missing required field should fail"""
        payload = {
            "dataRiferimento": self.today,
            "nome": "TEST_Mario",
            # Missing cognome and other required fields
        }
        response = self.session.post(f"{BASE_URL}/api/presenze-villa", json=payload)
        assert response.status_code == 400
        print("✅ Missing field correctly rejected")
    
    def test_delete_nonexistent_presenza(self):
        """DELETE non-existent presenza should return 404"""
        response = self.session.delete(f"{BASE_URL}/api/presenze-villa", params={"id": 999999})
        assert response.status_code == 404
        print("✅ Delete non-existent correctly returns 404")
    
    def test_get_presenze_week_mode(self):
        """GET presenze in week mode"""
        response = self.session.get(f"{BASE_URL}/api/presenze-villa", params={
            "date": self.today,
            "mode": "week"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "week"
        print(f"✅ GET presenze-villa week mode: {len(data['items'])} items")


class TestAppuntamentiAPI:
    """Test Appuntamenti API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_get_appuntamenti_list(self):
        """GET list of appuntamenti"""
        response = self.session.get(f"{BASE_URL}/api/appuntamenti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET appuntamenti: {len(data)} items")
        
        # Check structure of first item if exists
        if len(data) > 0:
            item = data[0]
            assert "id" in item
            assert "clientePrincipale" in item
            assert "dataAppuntamento" in item
            print(f"✅ Appuntamento structure verified")
    
    def test_get_appuntamento_detail(self):
        """GET single appuntamento detail"""
        # First get list
        list_response = self.session.get(f"{BASE_URL}/api/appuntamenti")
        data = list_response.json()
        if len(data) > 0:
            app_id = data[0]["id"]
            detail_response = self.session.get(f"{BASE_URL}/api/appuntamenti", params={"id": app_id})
            assert detail_response.status_code == 200
            detail = detail_response.json()
            assert detail["id"] == app_id
            print(f"✅ GET appuntamento detail: id={app_id}")
        else:
            pytest.skip("No appuntamenti to test detail")


class TestAuthMe:
    """Test /api/auth/me endpoint"""
    
    def test_auth_me_authenticated(self):
        """GET /api/auth/me when authenticated"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        data = me_response.json()
        assert data["email"] == "admin@villaparis.local"
        assert data["role"] == "ADMIN"
        print(f"✅ GET /api/auth/me: {data['email']} ({data['role']})")
    
    def test_auth_me_unauthenticated(self):
        """GET /api/auth/me when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Unauthenticated /api/auth/me correctly returns 401")


class TestEventiAPI:
    """Test Eventi API (no regression)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_get_eventi_list(self):
        """GET list of eventi"""
        response = self.session.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET eventi: {len(data)} items")


class TestReportStatsAPI:
    """Test Report Stats API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
    
    def test_get_report_stats(self):
        """GET /api/report/stats"""
        response = self.session.get(f"{BASE_URL}/api/report/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ GET /api/report/stats: {data}")
    
    def test_get_report_eventi_stats(self):
        """GET /api/report/eventi/stats"""
        response = self.session.get(f"{BASE_URL}/api/report/eventi/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ GET /api/report/eventi/stats: received data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
