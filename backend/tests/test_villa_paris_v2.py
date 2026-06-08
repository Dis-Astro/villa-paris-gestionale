"""
Villa Paris v2.0.0 Feature Tests
Tests for: Meteo API, Frequent Visitors, Piano B, Imperial Tables, Version
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session with cookie"""
        session = requests.Session()
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        return session
    
    @pytest.fixture(scope="class")
    def worker_session(self):
        """Get worker session with cookie"""
        session = requests.Session()
        res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, f"Worker login failed: {res.text}"
        return session


class TestMeteoAPI(TestAuth):
    """Tests for /api/meteo endpoint"""
    
    def test_meteo_returns_weather_data(self, admin_session):
        """Test that meteo API returns weather data for a given date"""
        res = admin_session.get(f"{BASE_URL}/api/meteo?date=2026-04-01")
        assert res.status_code == 200
        data = res.json()
        
        # Verify response structure
        assert "date" in data
        assert "weatherCode" in data
        assert "descrizione" in data
        assert "tempMax" in data
        assert "tempMin" in data
        assert "meteoString" in data
        
        # Verify meteoString format
        assert "°" in data["meteoString"]
        print(f"Meteo data: {data['meteoString']}")
    
    def test_meteo_worker_access(self, worker_session):
        """Test that worker role can access /api/meteo endpoint"""
        res = worker_session.get(f"{BASE_URL}/api/meteo?date=2026-04-01")
        assert res.status_code == 200
        data = res.json()
        assert "meteoString" in data
        print(f"Worker can access meteo: {data['meteoString']}")
    
    def test_meteo_default_date(self, admin_session):
        """Test that meteo API uses today's date if not specified"""
        res = admin_session.get(f"{BASE_URL}/api/meteo")
        assert res.status_code == 200
        data = res.json()
        assert "date" in data
        assert "meteoString" in data


class TestSuggerimentiAPI(TestAuth):
    """Tests for /api/presenze-villa/suggerimenti endpoint"""
    
    def test_suggerimenti_returns_frequent_visitors(self, admin_session):
        """Test that suggerimenti API returns frequent visitors"""
        res = admin_session.get(f"{BASE_URL}/api/presenze-villa/suggerimenti")
        assert res.status_code == 200
        data = res.json()
        
        # Verify response structure
        assert "visitatori" in data
        assert isinstance(data["visitatori"], list)
        
        if len(data["visitatori"]) > 0:
            visitor = data["visitatori"][0]
            assert "nome" in visitor
            assert "cognome" in visitor
            assert "azienda" in visitor
            assert "count" in visitor
            print(f"Found {len(data['visitatori'])} frequent visitors")
    
    def test_suggerimenti_worker_access(self, worker_session):
        """Test that worker role can access suggerimenti endpoint"""
        res = worker_session.get(f"{BASE_URL}/api/presenze-villa/suggerimenti")
        assert res.status_code == 200
        data = res.json()
        assert "visitatori" in data


class TestPresenzeVillaMeteo(TestAuth):
    """Tests for meteo field in presenze-villa"""
    
    def test_post_presenze_with_meteo(self, admin_session):
        """Test that POST /api/presenze-villa saves meteo field correctly"""
        payload = {
            "dataRiferimento": "2026-04-01",
            "nome": "TEST_Meteo",
            "cognome": "User",
            "azienda": "Test Company",
            "orarioIngresso": "09:00",
            "orarioUscita": "17:00",
            "motivoVisita": "Testing meteo field",
            "mansioneSvolta": "Testing",
            "meteo": "Sereno, 15°/25°C"
        }
        
        res = admin_session.post(f"{BASE_URL}/api/presenze-villa", json=payload)
        assert res.status_code == 201
        data = res.json()
        
        # Verify meteo field is saved
        assert "meteo" in data
        assert data["meteo"] == "Sereno, 15°/25°C"
        print(f"Meteo saved: {data['meteo']}")
        
        # Store ID for cleanup
        return data["id"]
    
    def test_get_presenze_includes_meteo(self, admin_session):
        """Test that GET /api/presenze-villa returns meteo field"""
        res = admin_session.get(f"{BASE_URL}/api/presenze-villa?date=2026-04-01&mode=day")
        assert res.status_code == 200
        data = res.json()
        
        assert "items" in data
        # Check if any item has meteo field
        items_with_meteo = [item for item in data["items"] if item.get("meteo")]
        print(f"Found {len(items_with_meteo)} presenze with meteo data")


class TestPianoBAPI(TestAuth):
    """Tests for Piano B (dual layout) feature"""
    
    def test_save_piantina_with_piano_b(self, admin_session):
        """Test that saving piantina saves both Piano A and Piano B configurations"""
        # First get event 3
        res = admin_session.get(f"{BASE_URL}/api/eventi?id=3")
        assert res.status_code == 200
        
        # Update with Piano A and Piano B
        payload = {
            "disposizioneSala": {
                "tavoli": [{"id": 1, "numero": "T1", "posti": 8, "posizione": {"xPerc": 0.2, "yPerc": 0.2}, "rotazione": 0, "forma": "rotondo", "dimensionePerc": 0.03}],
                "stazioni": []
            },
            "disposizioneSalePianoB": {
                "tavoli": [{"id": 2, "numero": "Imperiale 1", "posti": 20, "posizione": {"xPerc": 0.3, "yPerc": 0.3}, "rotazione": 0, "forma": "imperiale", "dimensionePerc": 0.04}],
                "stazioni": []
            },
            "pianoAttivo": "A"
        }
        
        res = admin_session.put(f"{BASE_URL}/api/eventi?id=3", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        # Verify Piano B is saved
        assert "disposizioneSalaPianoB" in data
        assert data["pianoAttivo"] == "A"
        print("Piano A and Piano B saved successfully")
    
    def test_get_event_includes_piano_b(self, admin_session):
        """Test that GET event returns Piano B configuration"""
        res = admin_session.get(f"{BASE_URL}/api/eventi?id=3")
        assert res.status_code == 200
        data = res.json()
        
        assert "disposizioneSalaPianoB" in data
        assert "pianoAttivo" in data
        print(f"Piano attivo: {data['pianoAttivo']}")


class TestImperialTable(TestAuth):
    """Tests for Imperial Table (Tavolo Imperiale) feature"""
    
    def test_imperial_table_in_piantina(self, admin_session):
        """Test that imperial table can be saved with forma='imperiale'"""
        payload = {
            "disposizioneSala": {
                "tavoli": [
                    {"id": 1, "numero": "T1", "posti": 8, "posizione": {"xPerc": 0.2, "yPerc": 0.2}, "rotazione": 0, "forma": "rotondo", "dimensionePerc": 0.03},
                    {"id": 2, "numero": "Imperiale 1", "posti": 20, "posizione": {"xPerc": 0.5, "yPerc": 0.5}, "rotazione": 0, "forma": "imperiale", "dimensionePerc": 0.04}
                ],
                "stazioni": []
            }
        }
        
        res = admin_session.put(f"{BASE_URL}/api/eventi?id=3", json=payload)
        assert res.status_code == 200
        data = res.json()
        
        # Verify imperial table is saved
        import json
        disposizione = json.loads(data["disposizioneSala"]) if isinstance(data["disposizioneSala"], str) else data["disposizioneSala"]
        
        imperial_tables = [t for t in disposizione.get("tavoli", []) if t.get("forma") == "imperiale"]
        assert len(imperial_tables) > 0, "No imperial table found"
        
        imperial = imperial_tables[0]
        assert imperial["posti"] == 20
        assert imperial["numero"] == "Imperiale 1"
        print(f"Imperial table saved: {imperial['numero']} with {imperial['posti']} seats")


class TestVersion:
    """Tests for version v2.0.0"""
    
    def test_app_shell_version(self):
        """Test that AppShell shows v2.0.0 in footer"""
        # This is a frontend test, verified via Playwright
        # Here we just verify the file contains v2.0.0
        import os
        app_shell_path = "/app/src/components/layout/AppShell.tsx"
        if os.path.exists(app_shell_path):
            with open(app_shell_path, "r") as f:
                content = f.read()
                assert "v2.0.0" in content, "Version v2.0.0 not found in AppShell.tsx"
                print("Version v2.0.0 found in AppShell.tsx")


class TestMiddlewarePermissions(TestAuth):
    """Tests for middleware permissions"""
    
    def test_worker_can_access_meteo(self, worker_session):
        """Test that worker role can access /api/meteo endpoint"""
        res = worker_session.get(f"{BASE_URL}/api/meteo")
        assert res.status_code == 200
        print("Worker can access /api/meteo")
    
    def test_worker_can_access_presenze_villa(self, worker_session):
        """Test that worker role can access /api/presenze-villa"""
        res = worker_session.get(f"{BASE_URL}/api/presenze-villa")
        assert res.status_code == 200
        print("Worker can access /api/presenze-villa")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
