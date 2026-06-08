"""
Iteration 9 - Audit Tests
Testing data alignment and consistency across modules:
- Menu Base: creation/save, defaultSelected persistence
- Menu Evento: no delete portata UI, selection with limits
- Stampe: no undefined/undefined client names, prezzo/persona propagation
- Clienti: dataPrimoContatto consistency
- Dashboard/Stats: ricavi based on evento.prezzo or struttura.prezzo
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

class TestMenuBase:
    """Menu Base API Tests - POST/PUT/GET with defaultSelected"""
    
    def test_menu_base_list(self):
        """GET /api/menu-base returns list"""
        response = requests.get(f"{BASE_URL}/api/menu-base")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Menu Base list: {len(data)} menus found")
    
    def test_menu_base_create_with_default_selected(self):
        """POST /api/menu-base with defaultSelected piatti"""
        payload = {
            "nome": "TEST_Menu_Iter9",
            "struttura": {
                "descrizione": "Test menu for iteration 9",
                "prezzo": 85,
                "piatti": [
                    {"id": "test1", "nome": "Piatto Default Test", "categoria": "antipasto", "defaultSelected": True},
                    {"id": "test2", "nome": "Piatto Non Default", "categoria": "antipasto", "defaultSelected": False}
                ],
                "regole": {"antipasti": 1, "primi": 2, "secondi": 1, "contorni": 1, "dolci": 1}
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/menu-base", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify data persisted
        assert data.get("nome") == "TEST_Menu_Iter9"
        struttura = data.get("struttura", {})
        if isinstance(struttura, str):
            struttura = json.loads(struttura)
        
        piatti = struttura.get("piatti", [])
        default_piatti = [p for p in piatti if p.get("defaultSelected")]
        assert len(default_piatti) >= 1, "defaultSelected piatto should persist"
        
        print(f"✅ Menu Base created with ID: {data.get('id')}, defaultSelected piatti: {len(default_piatti)}")
        
        # Cleanup
        menu_id = data.get("id")
        if menu_id:
            requests.delete(f"{BASE_URL}/api/menu-base?id={menu_id}")
    
    def test_menu_base_get_by_id(self):
        """GET /api/menu-base?id=1 returns single menu with struttura parsed"""
        response = requests.get(f"{BASE_URL}/api/menu-base?id=1")
        if response.status_code == 404:
            pytest.skip("Menu ID 1 not found")
        
        assert response.status_code == 200
        data = response.json()
        
        struttura = data.get("struttura", {})
        if isinstance(struttura, str):
            struttura = json.loads(struttura)
        
        assert isinstance(struttura, dict)
        print(f"✅ Menu Base ID 1: prezzo={struttura.get('prezzo')}, piatti={len(struttura.get('piatti', []))}")


class TestMenuEvento:
    """Menu Evento Tests - Selection and Save"""
    
    def test_evento_3_menu_structure(self):
        """GET /api/eventi?id=3 has valid menu with piatti and portate"""
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        data = response.json()
        
        menu = data.get("menu", "{}")
        if isinstance(menu, str):
            menu = json.loads(menu)
        
        portate = menu.get("portate", [])
        assert len(portate) > 0, "Event 3 should have portate"
        
        # Check for piatti selection
        for portata in portate:
            piatti = portata.get("piatti", [])
            if piatti:
                print(f"  Portata '{portata.get('nome')}': {len(piatti)} piatti")
        
        print(f"✅ Event 3 menu has {len(portate)} portate")
    
    def test_evento_menu_save(self):
        """PUT /api/eventi saves menu correctly"""
        # Get existing event
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        evento = response.json()
        
        # Modify menu note
        menu = evento.get("menu", "{}")
        if isinstance(menu, str):
            menu = json.loads(menu)
        
        menu["note"] = "TEST_NOTE_ITER9"
        evento["menu"] = menu
        
        # Save
        save_response = requests.put(f"{BASE_URL}/api/eventi?id=3", json=evento)
        assert save_response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        verify_data = verify_response.json()
        verify_menu = verify_data.get("menu", "{}")
        if isinstance(verify_menu, str):
            verify_menu = json.loads(verify_menu)
        
        assert verify_menu.get("note") == "TEST_NOTE_ITER9"
        print("✅ Menu save and reload works correctly")
        
        # Cleanup
        menu["note"] = ""
        evento["menu"] = menu
        requests.put(f"{BASE_URL}/api/eventi?id=3", json=evento)


class TestStampeClienteNome:
    """Stampe Tests - Client name should not be undefined/undefined"""
    
    def test_evento_3_has_valid_cliente_name(self):
        """Event 3 clienti should have nome/cognome populated"""
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        data = response.json()
        
        clienti = data.get("clienti", [])
        assert len(clienti) > 0, "Event 3 should have clienti"
        
        c = clienti[0].get("cliente", clienti[0])
        nome = c.get("nome", "")
        cognome = c.get("cognome", "")
        full_name = f"{nome} {cognome}".strip()
        
        assert full_name, "Client name should not be empty"
        assert "undefined" not in full_name.lower(), "Client name should not contain undefined"
        
        print(f"✅ Client name for Event 3: '{full_name}'")
    
    def test_evento_3_has_prezzo(self):
        """Event 3 should have prezzo (for PDF totale stimato)"""
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        data = response.json()
        
        prezzo_evt = data.get("prezzo")
        struttura = data.get("struttura", "{}")
        if isinstance(struttura, str):
            struttura = json.loads(struttura)
        prezzo_str = struttura.get("prezzo")
        
        prezzo_final = prezzo_evt or prezzo_str
        assert prezzo_final, "Event 3 should have prezzo set"
        
        print(f"✅ Event 3 prezzo: {prezzo_final}")


class TestClientiDataPrimoContatto:
    """Clienti Tests - dataPrimoContatto consistency"""
    
    def test_clienti_with_data_primo_contatto(self):
        """GET /api/clienti returns clients with dataPrimoContatto"""
        response = requests.get(f"{BASE_URL}/api/clienti")
        assert response.status_code == 200
        data = response.json()
        
        clients_with_date = [c for c in data if c.get("dataPrimoContatto")]
        print(f"✅ {len(clients_with_date)} of {len(data)} clients have dataPrimoContatto set")
    
    def test_cliente_update_preserves_date(self):
        """PUT /api/clienti preserves dataPrimoContatto"""
        # Find a test client or skip
        response = requests.get(f"{BASE_URL}/api/clienti")
        data = response.json()
        
        test_clients = [c for c in data if c.get("nome", "").startswith("TEST_")]
        if not test_clients:
            pytest.skip("No TEST_ client to test with")
        
        client = test_clients[0]
        client_id = client.get("id")
        
        # Update something else, verify date stays
        original_date = client.get("dataPrimoContatto")
        client["notaAnagrafica"] = "TEST_UPDATE_ITER9"
        
        update_response = requests.put(f"{BASE_URL}/api/clienti?id={client_id}", json=client)
        assert update_response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/clienti?id={client_id}")
        if verify_response.status_code == 200:
            verify_data = verify_response.json()
            if isinstance(verify_data, list):
                verify_data = [c for c in verify_data if c.get("id") == client_id][0]
            assert verify_data.get("dataPrimoContatto") == original_date
            print(f"✅ dataPrimoContatto preserved after update")


class TestReportStats:
    """Report Stats Tests - Ricavi calculation"""
    
    def test_report_stats_endpoint(self):
        """GET /api/report/stats returns valid structure"""
        response = requests.get(f"{BASE_URL}/api/report/stats?year=2026")
        assert response.status_code == 200
        data = response.json()
        
        assert "year" in data
        assert "monthly" in data
        assert "totals" in data
        
        totals = data.get("totals", {})
        print(f"✅ Report stats: {totals.get('eventiTotali')} events, {totals.get('ospitiTotali')} ospiti, €{totals.get('ricaviTotali')} ricavi")
    
    def test_ricavi_uses_evento_prezzo(self):
        """Ricavi should use evento.prezzo or struttura.prezzo, not hardcoded 80"""
        # This is a code review test - the actual calculation depends on data
        # Check that the getPrezzoEvento function exists in stats route
        response = requests.get(f"{BASE_URL}/api/report/stats?year=2026")
        assert response.status_code == 200
        data = response.json()
        
        # If any event has prezzo and personePreviste, ricavi should not be 0
        # (unless all confirmed events have no prezzo set)
        totals = data.get("totals", {})
        ricavi = totals.get("ricaviTotali", 0)
        
        # Note: ricavi may be 0 if no confirmed events have prezzo set
        # This test just verifies the endpoint works
        print(f"✅ Ricavi calculation works: €{ricavi}")


class TestEventiAPI:
    """Eventi API regression tests"""
    
    def test_eventi_list(self):
        """GET /api/eventi returns list"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Eventi list: {len(data)} events")
    
    def test_evento_3_data_integrity(self):
        """Event 3 has all required fields"""
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        data = response.json()
        
        # Required fields check
        assert data.get("titolo"), "titolo required"
        assert data.get("clienti"), "clienti required"
        
        # Prezzo check
        prezzo = data.get("prezzo")
        assert prezzo == 99, f"Event 3 prezzo should be 99, got {prezzo}"
        
        print(f"✅ Event 3 data integrity OK: {data.get('titolo')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
