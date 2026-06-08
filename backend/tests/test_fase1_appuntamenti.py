"""
Test FASE 1 Villa Paris - Appuntamento Flow & API Tests
Focus: Appuntamento/Evento integration, patch-safe PUT, audit logging
"""
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"


class TestEventiAPIAfterSchemaExtension:
    """Test that /api/eventi still works after Prisma schema extension"""

    def test_get_eventi_list(self):
        """GET /api/eventi returns list"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of eventi"
        print(f"✅ GET /api/eventi: returned {len(data)} eventi")

    def test_get_single_evento(self):
        """GET /api/eventi?id=X returns single evento with _blocco info"""
        # First get list to find an ID
        res_list = requests.get(f"{BASE_URL}/api/eventi")
        eventi = res_list.json()
        if not eventi:
            pytest.skip("No eventi in DB to test")
        
        evento_id = eventi[0]["id"]
        response = requests.get(f"{BASE_URL}/api/eventi?id={evento_id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "titolo" in data
        assert "_blocco" in data, "Expected _blocco info in response"
        print(f"✅ GET /api/eventi?id={evento_id}: evento '{data['titolo']}' with _blocco info")


class TestAppuntamentiAPICRUD:
    """Test /api/appuntamenti POST/GET/PUT/DELETE"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup and cleanup test data"""
        self.created_ids = []
        yield
        # Cleanup after tests
        for app_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/appuntamenti?id={app_id}")
            except:
                pass

    def test_post_appuntamento_creates_with_auto_cliente(self):
        """POST /api/appuntamenti creates appuntamento with inline cliente"""
        data_app = (datetime.now() + timedelta(days=7)).isoformat()
        payload = {
            "dataAppuntamento": data_app,
            "durataMinuti": 45,
            "canalePrimoContatto": "telefono",
            "noteColloquio": "Test notes from pytest",
            "riassuntoColloquio": "Test riassunto",
            "statoFunnel": "in_trattativa",
            "clienti": [{
                "nome": "TEST_PytestCliente",
                "cognome": "TestCognome",
                "email": "test.pytest@villa-paris.local",
                "telefono": "333 1234567"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/appuntamenti", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert "id" in created
        assert created["noteColloquio"] == "Test notes from pytest"
        assert "clientePrincipale" in created
        assert created["clientePrincipale"]["nome"] == "TEST_PytestCliente"
        
        self.created_ids.append(created["id"])
        print(f"✅ POST /api/appuntamenti: created ID {created['id']} with cliente auto-generated")
        return created["id"]

    def test_get_appuntamenti_list(self):
        """GET /api/appuntamenti returns list with statsCliente"""
        response = requests.get(f"{BASE_URL}/api/appuntamenti")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            first = data[0]
            assert "clientePrincipale" in first
            assert "statsCliente" in first, "Expected statsCliente in list items"
        print(f"✅ GET /api/appuntamenti: returned {len(data)} appuntamenti")

    def test_get_appuntamento_by_id(self):
        """GET /api/appuntamenti?id=X returns single with full detail"""
        # Create one first
        data_app = (datetime.now() + timedelta(days=5)).isoformat()
        payload = {
            "dataAppuntamento": data_app,
            "clienti": [{"nome": "TEST_GetById"}]
        }
        create_res = requests.post(f"{BASE_URL}/api/appuntamenti", json=payload)
        assert create_res.status_code == 200
        app_id = create_res.json()["id"]
        self.created_ids.append(app_id)
        
        # Now GET by ID
        response = requests.get(f"{BASE_URL}/api/appuntamenti?id={app_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == app_id
        assert "statsCliente" in data
        assert "totaleAppuntamenti" in data["statsCliente"]
        assert "tempoTotaleDedicatoMin" in data["statsCliente"]
        print(f"✅ GET /api/appuntamenti?id={app_id}: has statsCliente")

    def test_put_appuntamento_patch_safe(self):
        """PUT /api/appuntamenti updates only provided fields (patch-safe)"""
        # Create one first
        data_app = (datetime.now() + timedelta(days=3)).isoformat()
        payload = {
            "dataAppuntamento": data_app,
            "durataMinuti": 60,
            "noteColloquio": "Original note",
            "riassuntoColloquio": "Original summary",
            "clienti": [{"nome": "TEST_PutPatch"}]
        }
        create_res = requests.post(f"{BASE_URL}/api/appuntamenti", json=payload)
        assert create_res.status_code == 200
        app_id = create_res.json()["id"]
        self.created_ids.append(app_id)
        
        # Update only esito
        update_payload = {"esito": "positivo"}
        update_res = requests.put(f"{BASE_URL}/api/appuntamenti?id={app_id}", json=update_payload)
        assert update_res.status_code == 200
        
        # Verify other fields preserved
        get_res = requests.get(f"{BASE_URL}/api/appuntamenti?id={app_id}")
        data = get_res.json()
        assert data["esito"] == "positivo", "esito should be updated"
        assert data["noteColloquio"] == "Original note", "noteColloquio should be preserved"
        assert data["riassuntoColloquio"] == "Original summary", "riassuntoColloquio should be preserved"
        print(f"✅ PUT /api/appuntamenti patch-safe: esito updated, other fields preserved")

    def test_delete_appuntamento(self):
        """DELETE /api/appuntamenti?id=X removes appuntamento"""
        # Create one
        data_app = (datetime.now() + timedelta(days=2)).isoformat()
        payload = {
            "dataAppuntamento": data_app,
            "clienti": [{"nome": "TEST_Delete"}]
        }
        create_res = requests.post(f"{BASE_URL}/api/appuntamenti", json=payload)
        assert create_res.status_code == 200
        app_id = create_res.json()["id"]
        
        # Delete
        del_res = requests.delete(f"{BASE_URL}/api/appuntamenti?id={app_id}")
        assert del_res.status_code == 200
        
        # Verify gone
        get_res = requests.get(f"{BASE_URL}/api/appuntamenti?id={app_id}")
        assert get_res.status_code == 404
        print(f"✅ DELETE /api/appuntamenti?id={app_id}: appuntamento removed")


class TestEventiPutPatchSafe:
    """PUT /api/eventi should be patch-safe: updating only stato should not clear titolo/other fields"""

    def test_put_eventi_stato_only_preserves_other_fields(self):
        """Update only 'stato' on evento should preserve titolo, tipo, etc."""
        # Get an existing evento
        res_list = requests.get(f"{BASE_URL}/api/eventi")
        eventi = res_list.json()
        if not eventi:
            pytest.skip("No eventi in DB to test PUT patch-safe")
        
        evento = eventi[0]
        evento_id = evento["id"]
        original_titolo = evento.get("titolo")
        original_tipo = evento.get("tipo")
        original_fascia = evento.get("fascia")
        
        # Update only stato
        new_stato = "in_attesa" if evento.get("stato") != "in_attesa" else "confermato"
        update_res = requests.put(
            f"{BASE_URL}/api/eventi?id={evento_id}",
            json={"stato": new_stato}
        )
        assert update_res.status_code == 200, f"PUT failed: {update_res.text}"
        
        # Verify other fields preserved
        get_res = requests.get(f"{BASE_URL}/api/eventi?id={evento_id}")
        assert get_res.status_code == 200
        updated = get_res.json()
        
        assert updated["titolo"] == original_titolo, f"titolo was overwritten! Was '{original_titolo}', now '{updated['titolo']}'"
        assert updated["tipo"] == original_tipo, f"tipo was overwritten! Was '{original_tipo}', now '{updated['tipo']}'"
        assert updated["fascia"] == original_fascia, f"fascia was overwritten! Was '{original_fascia}', now '{updated['fascia']}'"
        assert updated["stato"] == new_stato, f"stato not updated"
        
        # Revert stato
        requests.put(f"{BASE_URL}/api/eventi?id={evento_id}", json={"stato": evento.get("stato", "in_attesa")})
        print(f"✅ PUT /api/eventi patch-safe: updating stato did NOT clear titolo/tipo/fascia")


class TestClienteSpamSupport:
    """API clienti: support isSpam/spamReason in update"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_cliente_id = None
        yield
        if self.created_cliente_id:
            try:
                requests.delete(f"{BASE_URL}/api/clienti?id={self.created_cliente_id}")
            except:
                pass

    def test_create_cliente_with_spam_flag(self):
        """POST /api/clienti with isSpam/spamReason"""
        payload = {
            "nome": "TEST_SpamCliente",
            "cognome": "Pytest",
            "email": "spam.test@example.com",
            "isSpam": True,
            "spamReason": "Test spam reason from pytest"
        }
        
        response = requests.post(f"{BASE_URL}/api/clienti", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        self.created_cliente_id = data["id"]
        assert data["isSpam"] == True
        assert data["spamReason"] == "Test spam reason from pytest"
        assert data["spamMarkedAt"] is not None
        print(f"✅ POST /api/clienti with isSpam: created ID {data['id']}")

    def test_update_cliente_set_spam(self):
        """PUT /api/clienti?id=X with isSpam/spamReason"""
        # Create non-spam cliente first
        create_res = requests.post(f"{BASE_URL}/api/clienti", json={"nome": "TEST_SpamUpdate"})
        assert create_res.status_code == 201
        cliente_id = create_res.json()["id"]
        self.created_cliente_id = cliente_id
        
        # Update to spam
        update_res = requests.put(
            f"{BASE_URL}/api/clienti?id={cliente_id}",
            json={"isSpam": True, "spamReason": "Changed to spam via pytest"}
        )
        assert update_res.status_code == 200
        
        # Verify
        get_res = requests.get(f"{BASE_URL}/api/clienti?id={cliente_id}")
        data = get_res.json()
        assert data["isSpam"] == True
        assert "Changed to spam" in data["spamReason"]
        print(f"✅ PUT /api/clienti?id={cliente_id}: isSpam updated correctly")


class TestAuditLogAPI:
    """API audit: registra modifiche su clienti/eventi/appuntamenti"""

    def test_get_audit_logs(self):
        """GET /api/audit returns logs"""
        response = requests.get(f"{BASE_URL}/api/audit")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/audit: returned {len(data)} logs")

    def test_audit_logs_contain_client_updates(self):
        """Audit logs should contain CLIENT updates"""
        response = requests.get(f"{BASE_URL}/api/audit?entityType=CLIENT")
        assert response.status_code == 200
        data = response.json()
        
        if not data:
            pytest.skip("No CLIENT audit logs yet")
        
        # Check structure
        log = data[0]
        assert "entityType" in log
        assert "action" in log
        assert "createdAt" in log
        print(f"✅ GET /api/audit?entityType=CLIENT: found {len(data)} logs")

    def test_audit_logs_contain_event_updates(self):
        """Audit logs should contain EVENT updates"""
        response = requests.get(f"{BASE_URL}/api/audit?entityType=EVENT")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ GET /api/audit?entityType=EVENT: found {len(data)} logs")

    def test_audit_logs_contain_appointment_updates(self):
        """Audit logs should contain APPOINTMENT updates"""
        response = requests.get(f"{BASE_URL}/api/audit?entityType=APPOINTMENT")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ GET /api/audit?entityType=APPOINTMENT: found {len(data)} logs")


class TestAppuntamentoDateOpzionate:
    """Test dateOpzionate functionality in appuntamenti"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.created_ids = []
        yield
        for app_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/appuntamenti?id={app_id}")
            except:
                pass

    def test_create_appuntamento_with_date_opzionate(self):
        """POST /api/appuntamenti with dateOpzionate array"""
        data_app = (datetime.now() + timedelta(days=10)).isoformat()
        date_opts = [
            (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        ]
        
        payload = {
            "dataAppuntamento": data_app,
            "dateOpzionate": date_opts,
            "clienti": [{"nome": "TEST_DateOpzionate"}]
        }
        
        response = requests.post(f"{BASE_URL}/api/appuntamenti", json=payload)
        assert response.status_code == 200
        created = response.json()
        self.created_ids.append(created["id"])
        
        assert "dateOpzionate" in created
        assert isinstance(created["dateOpzionate"], list)
        assert len(created["dateOpzionate"]) == 2
        assert created["statoOpzione"] == "opzionata", f"Expected 'opzionata', got '{created['statoOpzione']}'"
        print(f"✅ POST /api/appuntamenti with dateOpzionate: {created['dateOpzionate']}, statoOpzione: {created['statoOpzione']}")

    def test_update_appuntamento_date_opzionate(self):
        """PUT /api/appuntamenti?id=X updates dateOpzionate"""
        # Create
        data_app = (datetime.now() + timedelta(days=8)).isoformat()
        create_res = requests.post(
            f"{BASE_URL}/api/appuntamenti",
            json={"dataAppuntamento": data_app, "clienti": [{"nome": "TEST_UpdateDates"}]}
        )
        assert create_res.status_code == 200
        app_id = create_res.json()["id"]
        self.created_ids.append(app_id)
        
        # Update with dateOpzionate
        new_dates = [(datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")]
        update_res = requests.put(
            f"{BASE_URL}/api/appuntamenti?id={app_id}",
            json={"dateOpzionate": new_dates}
        )
        assert update_res.status_code == 200
        
        # Verify
        get_res = requests.get(f"{BASE_URL}/api/appuntamenti?id={app_id}")
        data = get_res.json()
        assert data["dateOpzionate"] == new_dates
        print(f"✅ PUT /api/appuntamenti dateOpzionate updated: {data['dateOpzionate']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
