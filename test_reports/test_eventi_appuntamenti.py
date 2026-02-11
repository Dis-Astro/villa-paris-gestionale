"""
Villa Paris - Eventi & Appuntamenti API Tests
Tests POST /api/eventi and PUT /api/eventi operations
"""
import pytest
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

class TestEventiPOSTAPI:
    """Test POST /api/eventi - Create events including Appuntamenti"""
    
    def test_create_appuntamento_rapido(self):
        """Test creating a quick appointment (Appuntamento rapido)"""
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        payload = {
            "tipo": "Appuntamento",
            "titolo": f"TEST_Appuntamento - Cliente Test",
            "dateProposte": [tomorrow],
            "dataConfermata": tomorrow,
            "fascia": "pranzo",
            "stato": "confermato",
            "note": "Ora: 10:00\nTelefono: 333 1234567\nNote test",
            "clienti": [{
                "nome": "TEST_Cliente",
                "email": "test_cliente_appuntamento@test.local",
                "telefono": "333 1234567"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"POST response status: {response.status_code}")
        print(f"POST response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["tipo"] == "Appuntamento"
        assert data["titolo"] == "TEST_Appuntamento - Cliente Test"
        assert data["stato"] == "confermato"
        
        # Store ID for cleanup
        self.created_evento_id = data["id"]
        print(f"✅ Appuntamento created with ID: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/eventi?id={data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["tipo"] == "Appuntamento"
        print(f"✅ GET verification passed")
        
        return data["id"]
    
    def test_create_evento_matrimonio(self):
        """Test creating a regular matrimonio event"""
        future_date = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
        
        payload = {
            "tipo": "Matrimonio",
            "titolo": "TEST_Matrimonio - Bianchi",
            "dateProposte": [future_date],
            "dataConfermata": future_date,
            "fascia": "cena",
            "stato": "in_attesa",
            "personePreviste": 100,
            "note": "Test matrimonio",
            "clienti": [{
                "nome": "Maria",
                "cognome": "Bianchi",
                "email": "test_maria_bianchi@test.local",
                "telefono": "444 5678910"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"POST matrimonio status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tipo"] == "Matrimonio"
        assert data["personePreviste"] == 100
        print(f"✅ Matrimonio created with ID: {data['id']}")
        
        return data["id"]
    
    def test_create_evento_without_cognome(self):
        """Test creating event without cognome (now optional)"""
        future_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        payload = {
            "tipo": "Compleanno",
            "titolo": "TEST_Compleanno - Solo Nome",
            "dateProposte": [future_date],
            "dataConfermata": future_date,
            "fascia": "pranzo",
            "stato": "confermato",
            "clienti": [{
                "nome": "TestNome",
                # cognome omitted - should work now
                "email": "solo_nome_test@test.local"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"POST without cognome status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        assert response.status_code == 200, f"Expected 200 (cognome now optional), got {response.status_code}"
        print(f"✅ Evento created without cognome (cognome optional works)")
        
        return response.json()["id"]
    
    def test_create_evento_missing_cliente_name(self):
        """Test validation - missing required nome field"""
        payload = {
            "tipo": "Appuntamento",
            "titolo": "Test Missing Nome",
            "clienti": [{
                "email": "test@test.local"
                # nome missing - should fail
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"POST missing nome status: {response.status_code}")
        assert response.status_code == 400, f"Expected 400 for missing nome, got {response.status_code}"
        print(f"✅ Validation works - missing nome returns 400")


class TestEventiPUTAPI:
    """Test PUT /api/eventi - Update events"""
    
    def test_update_evento_title(self):
        """Test updating event title"""
        # First get an existing event
        all_response = requests.get(f"{BASE_URL}/api/eventi")
        eventi = all_response.json()
        
        # Find a test event or use first one
        test_evento = None
        for e in eventi:
            if "TEST_" in e.get("titolo", "") or e["id"] <= 5:
                test_evento = e
                break
        
        if not test_evento:
            pytest.skip("No test event found")
        
        evento_id = test_evento["id"]
        original_title = test_evento["titolo"]
        new_title = f"{original_title} - Updated"
        
        update_payload = {
            "tipo": test_evento["tipo"],
            "titolo": new_title,
            "fascia": test_evento.get("fascia", "pranzo"),
            "stato": test_evento.get("stato", "confermato"),
            "note": test_evento.get("note", ""),
            "dateProposte": test_evento.get("dateProposte", [])
        }
        
        response = requests.put(
            f"{BASE_URL}/api/eventi?id={evento_id}",
            json=update_payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"PUT update status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["titolo"] == new_title
        print(f"✅ Evento {evento_id} title updated")
        
        # Revert title
        update_payload["titolo"] = original_title
        requests.put(
            f"{BASE_URL}/api/eventi?id={evento_id}",
            json=update_payload,
            headers={"Content-Type": "application/json"}
        )
        
    def test_update_evento_stato(self):
        """Test updating event stato"""
        # Get event ID 5 (Matrimonio Test SALVATO)
        response = requests.get(f"{BASE_URL}/api/eventi?id=5")
        
        if response.status_code != 200:
            pytest.skip("Event ID 5 not found")
            
        evento = response.json()
        
        update_payload = {
            "tipo": evento["tipo"],
            "titolo": evento["titolo"],
            "fascia": evento.get("fascia", "pranzo"),
            "stato": "confermato",
            "note": evento.get("note", ""),
            "dateProposte": evento.get("dateProposte", [])
        }
        
        response = requests.put(
            f"{BASE_URL}/api/eventi?id=5",
            json=update_payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"PUT stato update status: {response.status_code}")
        assert response.status_code == 200
        print(f"✅ Stato update works")


class TestDashboardStats:
    """Test that dashboard stats include appuntamenti"""
    
    def test_get_eventi_for_dashboard_stats(self):
        """Test GET /api/eventi returns all types for stats calculation"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        
        eventi = response.json()
        
        # Count appuntamenti
        appuntamenti = [e for e in eventi if e.get("tipo") == "Appuntamento"]
        print(f"Total eventi: {len(eventi)}")
        print(f"Appuntamenti: {len(appuntamenti)}")
        
        # Verify appuntamento data
        for app in appuntamenti:
            print(f"  - ID {app['id']}: {app['titolo']}")
            assert app["tipo"] == "Appuntamento"
            
        print(f"✅ API returns appuntamenti for stats")


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_eventi():
    """Cleanup TEST_ prefixed eventi after all tests"""
    yield
    try:
        all_eventi = requests.get(f"{BASE_URL}/api/eventi").json()
        for evento in all_eventi:
            if evento.get("titolo", "").startswith("TEST_"):
                response = requests.delete(f"{BASE_URL}/api/eventi?id={evento['id']}")
                print(f"Cleaned up evento: {evento['titolo']} (status: {response.status_code})")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
