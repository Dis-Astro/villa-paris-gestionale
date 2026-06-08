"""
Villa Paris Gestionale - API Tests (Iteration 2)
Tests for eventi with multiple clienti, canalePrimoContatto, appuntamento rapido
Updated: Tests for nuovo-evento form with 2 separate clients (sposa+sposo) and canale contatto
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')


class TestDatabaseAPIs:
    """Verify database APIs work correctly"""
    
    def test_clienti_api_returns_list(self):
        """GET /api/clienti returns a valid list"""
        response = requests.get(f"{BASE_URL}/api/clienti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_eventi_api_returns_list(self):
        """GET /api/eventi returns a valid list"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEventiWithMultipleClienti:
    """Test creating eventi with multiple clients (sposa + sposo) - Core new feature"""
    
    def test_create_matrimonio_with_two_clients(self):
        """POST /api/eventi with 2 clienti creates 2 separate client records and 1 event"""
        payload = {
            "tipo": "Matrimonio",
            "titolo": "TEST_Matrimonio_Rossi_Bianchi",
            "dateProposte": ["2026-06-15"],
            "dataConfermata": "2026-06-15",
            "fascia": "pranzo",
            "stato": "in_attesa",
            "personePreviste": 100,
            "canalePrimoContatto": "telefono",
            "sposa": "Maria Rossi",
            "sposo": "Luca Bianchi",
            "clienti": [
                {
                    "nome": "Maria",
                    "cognome": "Rossi",
                    "email": "maria.rossi@test.com",
                    "telefono": "333-111-2222",
                    "tipoCliente": "sposa"
                },
                {
                    "nome": "Luca",
                    "cognome": "Bianchi",
                    "email": "luca.bianchi@test.com",
                    "telefono": "333-333-4444",
                    "tipoCliente": "sposo"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        evento = response.json()
        assert evento["id"] is not None
        assert evento["tipo"] == "Matrimonio"
        assert evento["titolo"] == "TEST_Matrimonio_Rossi_Bianchi"
        assert evento["canalePrimoContatto"] == "telefono"
        assert evento["sposa"] == "Maria Rossi"
        assert evento["sposo"] == "Luca Bianchi"
        
        # Event should have 2 linked clients
        assert "clienti" in evento
        assert len(evento["clienti"]) == 2, f"Expected 2 clienti, got {len(evento['clienti'])}"
        
        # Verify client types
        client_types = [c["cliente"]["tipoCliente"] for c in evento["clienti"]]
        assert "sposa" in client_types
        assert "sposo" in client_types
        
        return evento["id"]
    
    def test_verify_two_separate_client_records_created(self):
        """After creating matrimonio, verify 2 separate Client records exist"""
        # First create an event with 2 clients
        payload = {
            "tipo": "Matrimonio",
            "titolo": "TEST_Matrimonio_Verify_Clients",
            "dateProposte": ["2026-07-20"],
            "fascia": "cena",
            "stato": "confermato",
            "canalePrimoContatto": "matrimonio.com",
            "sposa": "Anna TEST_Verdi",
            "sposo": "Paolo TEST_Neri",
            "clienti": [
                {
                    "nome": "Anna",
                    "cognome": "TEST_Verdi",
                    "email": "anna.test.verdi@test.com",
                    "telefono": "333-555-6666",
                    "tipoCliente": "sposa"
                },
                {
                    "nome": "Paolo",
                    "cognome": "TEST_Neri",
                    "email": "paolo.test.neri@test.com",
                    "telefono": "333-777-8888",
                    "tipoCliente": "sposo"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Now check /api/clienti to verify both clients exist separately
        clienti_response = requests.get(f"{BASE_URL}/api/clienti")
        assert clienti_response.status_code == 200
        clienti = clienti_response.json()
        
        # Find our test clients
        sposa = next((c for c in clienti if c.get("email") == "anna.test.verdi@test.com"), None)
        sposo = next((c for c in clienti if c.get("email") == "paolo.test.neri@test.com"), None)
        
        assert sposa is not None, "Sposa client not found in /api/clienti"
        assert sposo is not None, "Sposo client not found in /api/clienti"
        
        # Verify they are SEPARATE records with correct tipoCliente
        assert sposa["id"] != sposo["id"], "Sposa and sposo should have different IDs"
        assert sposa["tipoCliente"] == "sposa", f"Sposa should have tipoCliente='sposa', got {sposa['tipoCliente']}"
        assert sposo["tipoCliente"] == "sposo", f"Sposo should have tipoCliente='sposo', got {sposo['tipoCliente']}"
        
        # Verify canalePrimoContatto is saved on clients
        assert sposa.get("canalePrimoContatto") == "matrimonio.com", f"Sposa canalePrimoContatto should be 'matrimonio.com', got {sposa.get('canalePrimoContatto')}"


class TestCanalePrimoContatto:
    """Test canalePrimoContatto is saved correctly on eventi and clienti"""
    
    def test_canale_saved_on_evento(self):
        """canalePrimoContatto should be saved on Evento record"""
        payload = {
            "tipo": "Compleanno",
            "titolo": "TEST_Compleanno_Canale",
            "dateProposte": ["2026-08-10"],
            "fascia": "cena",
            "stato": "in_attesa",
            "canalePrimoContatto": "social",
            "clienti": [
                {
                    "nome": "TEST_Cliente_Canale",
                    "email": "test.canale@test.com",
                    "tipoCliente": "festeggiato"
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        evento = response.json()
        
        # Verify canale on event
        assert evento["canalePrimoContatto"] == "social"
        
        # Also verify via GET
        get_response = requests.get(f"{BASE_URL}/api/eventi?id={evento['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["canalePrimoContatto"] == "social"
    
    def test_all_canali_values(self):
        """Test all 6 canale values: telefono, email, matrimonio.com, social, passaparola, altro"""
        canali = ['telefono', 'email', 'matrimonio.com', 'social', 'passaparola', 'altro']
        
        for canale in canali:
            payload = {
                "tipo": "Appuntamento",
                "titolo": f"TEST_Canale_{canale}",
                "dateProposte": ["2026-09-01"],
                "fascia": "pranzo",
                "stato": "confermato",
                "canalePrimoContatto": canale,
                "clienti": [{"nome": f"TEST_Cliente_{canale}"}]
            }
            
            response = requests.post(
                f"{BASE_URL}/api/eventi",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 200, f"Failed for canale={canale}: {response.text}"
            evento = response.json()
            assert evento["canalePrimoContatto"] == canale, f"canale should be {canale}, got {evento['canalePrimoContatto']}"


class TestAppuntamentoRapido:
    """Test appuntamento rapido creation with canale (from Calendar modal)"""
    
    def test_create_appuntamento_with_canale(self):
        """Appuntamento created from calendar should save canalePrimoContatto"""
        payload = {
            "tipo": "Appuntamento",
            "titolo": "TEST_Appuntamento_Rapido_Social",
            "dateProposte": ["2026-02-15"],
            "dataConfermata": "2026-02-15",
            "dataPrimoContatto": "2026-02-15",
            "canalePrimoContatto": "social",
            "fascia": "pranzo",
            "stato": "confermato",
            "note": "Ora: 10:00\nTelefono: 333-999-0000\nNote test",
            "clienti": [{
                "nome": "TEST_Appuntamento_Cliente",
                "email": "test.app@villa-paris.local",
                "telefono": "333-999-0000"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        evento = response.json()
        
        assert evento["tipo"] == "Appuntamento"
        assert evento["canalePrimoContatto"] == "social"
        assert evento["titolo"] == "TEST_Appuntamento_Rapido_Social"


class TestClienteFormNoSecondoContatto:
    """Test that cliente form creates single client (no secondo contatto in direct client creation)"""
    
    def test_create_client_without_secondo_contatto_fields(self):
        """Creating a client directly should work without secondo contatto"""
        payload = {
            "nome": "TEST_Direct_Client",
            "cognome": "NoSecondo",
            "telefono": "333-123-4567",
            "email": "test.direct@test.com",
            "tipoCliente": "altro",
            "canalePrimoContatto": "passaparola"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clienti",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 201
        cliente = response.json()
        
        assert cliente["nome"] == "TEST_Direct_Client"
        assert cliente["tipoCliente"] == "altro"
        assert cliente["canalePrimoContatto"] == "passaparola"
        # secondo contatto fields should be null/empty - they are still in schema but not used in form
        assert cliente.get("secondoContattoNome") in [None, ""]
        assert cliente.get("secondoContattoTelefono") in [None, ""]


class TestHealthAndNavigation:
    """Basic health checks"""
    
    def test_dashboard_loads(self):
        """Dashboard page loads"""
        response = requests.get(f"{BASE_URL}/dashboard")
        assert response.status_code == 200
    
    def test_calendario_page_loads(self):
        """Calendario page loads"""
        response = requests.get(f"{BASE_URL}/calendario")
        assert response.status_code == 200
    
    def test_nuovo_evento_page_loads(self):
        """Nuovo evento page loads"""
        response = requests.get(f"{BASE_URL}/nuovo-evento")
        assert response.status_code == 200
    
    def test_clienti_page_loads(self):
        """Clienti page loads"""
        response = requests.get(f"{BASE_URL}/clienti")
        assert response.status_code == 200
    
    def test_report_page_loads(self):
        """Report page loads"""
        response = requests.get(f"{BASE_URL}/report/azienda")
        assert response.status_code == 200


# Cleanup test data after tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Clean up TEST_ prefixed data after all tests"""
    yield
    # Cleanup after tests
    try:
        # Clean up test eventi first
        eventi_response = requests.get(f"{BASE_URL}/api/eventi")
        if eventi_response.status_code == 200:
            eventi = eventi_response.json()
            for evento in eventi:
                if evento.get("titolo", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/eventi?id={evento['id']}")
        
        # Then clean up test clienti
        clienti_response = requests.get(f"{BASE_URL}/api/clienti")
        if clienti_response.status_code == 200:
            clienti = clienti_response.json()
            for cliente in clienti:
                if cliente.get("nome", "").startswith("TEST_") or cliente.get("cognome", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/clienti?id={cliente['id']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
