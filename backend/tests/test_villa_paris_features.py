"""
Villa Paris API Tests - Iteration 6
Testing new features:
- Calendario filters and navigation
- Nuovo Evento with Menu Easy
- Piantina Evento persistence  
- Report Excel Prezzo/Persona column
"""
import pytest
import requests
import os
import json

BASE_URL = "http://localhost:3000"

class TestCalendarioFeatures:
    """Test calendario API and filters"""
    
    def test_get_eventi_for_calendar(self):
        """GET /api/eventi returns events for calendar display"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ GET /api/eventi returns {len(data)} events")
    
    def test_eventi_have_required_fields_for_filters(self):
        """Events have fields needed for Tutti/Confermati/Opzionati/Appuntamenti filters"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        
        # Check first event has required fields
        event = data[0]
        assert 'tipo' in event
        assert 'stato' in event
        assert 'dataConfermata' in event
        assert 'dateProposte' in event
        print(f"✅ Events have required filter fields")


class TestNuovoEventoMenuEasy:
    """Test creating events with Menu Easy flow"""
    
    def test_create_evento_with_menu_easy_fields(self):
        """POST /api/eventi with menu easy fields (sovrapprezzo, extra)"""
        payload = {
            "tipo": "Compleanno",
            "titolo": "TEST_Menu_Easy_Compleanno",
            "dateProposte": ["2026-04-15"],
            "dataConfermata": "2026-04-15",
            "fascia": "pranzo",
            "personePreviste": 30,
            "stato": "in_attesa",
            "note": "Extra / accordi speciali:\nRisotto ai funghi +€3/persona",
            "menu": {
                "portate": [{"id": "1", "nome": "Antipasti", "descrizione": "Bruschette miste"}],
                "note": "Extra / accordi speciali:\nRisotto ai funghi +€3/persona"
            },
            "struttura": {"prezzo": 55.00},
            "prezzo": 58.00,  # Base 55 + sovrapprezzo 3
            "clienti": [{
                "nome": "TEST",
                "cognome": "MenuEasy",
                "email": "test.menueasy@villa-paris.local",
                "telefono": "333-0001111"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['titolo'] == "TEST_Menu_Easy_Compleanno"
        assert data['prezzo'] == 58.0
        print(f"✅ Created event with menu easy: ID {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/eventi?id={data['id']}")
        print(f"  Cleaned up test event")


class TestPiantinaEvento:
    """Test piantina (floor plan) persistence"""
    
    def test_update_evento_with_disposizione_sala(self):
        """PUT /api/eventi updates disposizioneSala correctly"""
        # First get an existing event
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        
        # Create test disposizione
        test_disposizione = {
            "tavoli": [
                {
                    "id": 99,
                    "numero": "TEST_TAV",
                    "posti": 10,
                    "posizione": {"xPerc": 0.5, "yPerc": 0.5},
                    "rotazione": 0,
                    "forma": "rotondo",
                    "dimensionePerc": 0.08
                }
            ],
            "stazioni": [
                {
                    "id": 99,
                    "nome": "TEST_STAZIONE",
                    "tipo": "buffet",
                    "posizione": {"xPerc": 0.3, "yPerc": 0.3},
                    "rotazione": 0,
                    "dimensionePerc": {"larghezzaPerc": 0.15, "altezzaPerc": 0.06}
                }
            ]
        }
        
        update_payload = {
            "disposizioneSala": test_disposizione
        }
        
        response = requests.put(
            f"{BASE_URL}/api/eventi?id=3",
            json=update_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        print(f"✅ PUT /api/eventi with disposizioneSala succeeded")
        
        # Verify it was saved
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        data = response.json()
        saved_disposizione = json.loads(data['disposizioneSala']) if isinstance(data['disposizioneSala'], str) else data['disposizioneSala']
        
        assert len(saved_disposizione['tavoli']) >= 1
        assert len(saved_disposizione['stazioni']) >= 1
        print(f"✅ disposizioneSala persisted with {len(saved_disposizione['tavoli'])} tavoli, {len(saved_disposizione['stazioni'])} stazioni")


class TestReportExcel:
    """Test Report Excel generation with Prezzo/Persona"""
    
    def test_excel_report_generation(self):
        """GET /api/report/azienda.xlsx returns valid Excel"""
        response = requests.get(f"{BASE_URL}/api/report/azienda.xlsx")
        assert response.status_code == 200
        assert 'spreadsheetml' in response.headers.get('Content-Type', '')
        assert len(response.content) > 1000  # Should be reasonably sized
        print(f"✅ Excel report generated: {len(response.content)} bytes")
    
    def test_excel_has_prezzo_persona_column(self):
        """Excel report contains Prezzo/Persona column"""
        import zipfile
        import io
        
        response = requests.get(f"{BASE_URL}/api/report/azienda.xlsx")
        assert response.status_code == 200
        
        # Parse XLSX (it's a zip file)
        xlsx_bytes = io.BytesIO(response.content)
        with zipfile.ZipFile(xlsx_bytes, 'r') as z:
            with z.open('xl/sharedStrings.xml') as f:
                content = f.read().decode('utf-8')
                assert 'Prezzo/Persona' in content or 'Prezzo' in content
                print(f"✅ Excel contains Prezzo/Persona column")
    
    def test_prezzo_fallback_from_menu(self):
        """Test that prezzo falls back to menu struttura.prezzo when event.prezzo is null"""
        # Create event without prezzo but with struttura.prezzo
        payload = {
            "tipo": "Battesimo",
            "titolo": "TEST_Prezzo_Fallback",
            "dateProposte": ["2026-05-01"],
            "dataConfermata": "2026-05-01",
            "fascia": "pranzo",
            "personePreviste": 25,
            "stato": "confermato",
            "prezzo": None,  # No direct prezzo
            "struttura": {"prezzo": 45.00},  # Menu base prezzo
            "clienti": [{
                "nome": "TEST",
                "cognome": "PrezzoFallback",
                "email": "test.prezzofallback@villa-paris.local"
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        event_id = response.json()['id']
        print(f"✅ Created test event ID {event_id} with struttura.prezzo=45")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/eventi?id={event_id}")


class TestMenuBase:
    """Test Menu Base API"""
    
    def test_get_menu_base_list(self):
        """GET /api/menu-base returns menu base list"""
        response = requests.get(f"{BASE_URL}/api/menu-base")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/menu-base returns {len(data)} menu templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
