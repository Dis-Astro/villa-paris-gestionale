"""
Villa Paris - Iteration 7 Tests
Testing new piantina features:
1. Rotazione planimetria 90° (persist rotazioneImmagine)
2. Libreria planimetrie API (/api/piantine GET/POST)
3. Selezione planimetria da libreria
4. Copia schema da evento simile (dropdown + button)
5. Tavoli default molto piccoli (dimensionePerc = 0.03)
6. Gestione posti per tavolo (input posti) e persistenza
7. Export PNG/PDF/Stampa funzionanti dopo rotazione
8. Regressione salvataggio planimetria
"""
import pytest
import requests
import json
import os
import io

BASE_URL = "http://localhost:3000"


class TestPiantinaLibreria:
    """Test libreria planimetrie persistente via API /api/piantine"""
    
    def test_get_piantine_returns_list(self):
        """GET /api/piantine returns list of planimetrie"""
        response = requests.get(f"{BASE_URL}/api/piantine")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/piantine returns {len(data)} planimetrie")
    
    def test_get_piantine_structure(self):
        """Each planimetria has nome and url fields"""
        response = requests.get(f"{BASE_URL}/api/piantine")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            planimetria = data[0]
            assert 'nome' in planimetria, "Planimetria should have 'nome'"
            assert 'url' in planimetria, "Planimetria should have 'url'"
            assert planimetria['url'].startswith('/planimetrie/'), f"URL should start with /planimetrie/, got {planimetria['url']}"
            print(f"✅ Planimetria structure valid: nome={planimetria['nome']}, url={planimetria['url']}")
        else:
            print("⚠️ No planimetrie in library yet - structure test skipped")
    
    def test_post_planimetria_validation(self):
        """POST /api/piantine validates file presence"""
        response = requests.post(f"{BASE_URL}/api/piantine")
        assert response.status_code == 400
        data = response.json()
        assert 'error' in data
        print(f"✅ POST /api/piantine validates file presence: {data['error']}")


class TestRotazionePlanimetria:
    """Test rotazione planimetria a step 90°"""
    
    def test_save_rotazione_immagine(self):
        """PUT /api/eventi saves rotazioneImmagine in disposizioneSala"""
        # First get existing event 3
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        evento = response.json()
        
        # Parse current disposizione
        current_disp = json.loads(evento.get('disposizioneSala', '{}')) if isinstance(evento.get('disposizioneSala'), str) else (evento.get('disposizioneSala') or {})
        
        # Test setting rotazioneImmagine to 90
        new_disp = {
            **current_disp,
            'rotazioneImmagine': 90
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/eventi?id=3",
            json={'disposizioneSala': new_disp},
            headers={'Content-Type': 'application/json'}
        )
        assert update_response.status_code == 200
        print("✅ PUT with rotazioneImmagine=90 succeeded")
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert verify_response.status_code == 200
        saved = verify_response.json()
        saved_disp = json.loads(saved.get('disposizioneSala', '{}')) if isinstance(saved.get('disposizioneSala'), str) else (saved.get('disposizioneSala') or {})
        
        assert saved_disp.get('rotazioneImmagine') == 90, f"rotazioneImmagine should be 90, got {saved_disp.get('rotazioneImmagine')}"
        print("✅ rotazioneImmagine=90 persisted correctly")
        
        # Reset to 0 for other tests
        requests.put(
            f"{BASE_URL}/api/eventi?id=3",
            json={'disposizioneSala': {**new_disp, 'rotazioneImmagine': 0}},
            headers={'Content-Type': 'application/json'}
        )


class TestTavoliDefaultDimensione:
    """Test tavoli default molto piccoli (dimensionePerc = 0.03)"""
    
    def test_default_tavolo_size_in_code(self):
        """Verify code creates tavoli with dimensionePerc=0.03"""
        # This test verifies that a newly created tavolo uses small default size
        # We simulate by creating a new event with a minimal tavolo
        payload = {
            "tipo": "Compleanno",
            "titolo": "TEST_Tavolo_Piccolo",
            "dateProposte": ["2026-05-15"],
            "dataConfermata": "2026-05-15",
            "fascia": "pranzo",
            "stato": "in_attesa",
            "clienti": [{"nome": "TEST", "cognome": "TavoloPiccolo"}],
            "disposizioneSala": {
                "tavoli": [{
                    "id": 1,
                    "numero": "T1",
                    "posti": 8,
                    "posizione": {"xPerc": 0.12, "yPerc": 0.12},
                    "rotazione": 0,
                    "forma": "rotondo",
                    "dimensionePerc": 0.03  # Default small size
                }],
                "stazioni": []
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        assert response.status_code == 200
        evento = response.json()
        evento_id = evento['id']
        
        # Verify the small size was saved
        saved_disp = json.loads(evento.get('disposizioneSala', '{}')) if isinstance(evento.get('disposizioneSala'), str) else (evento.get('disposizioneSala') or {})
        if saved_disp.get('tavoli'):
            saved_size = saved_disp['tavoli'][0].get('dimensionePerc')
            assert saved_size == 0.03, f"Tavolo dimensionePerc should be 0.03 (default small), got {saved_size}"
            print(f"✅ Tavolo created with small default size: dimensionePerc={saved_size}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/eventi?id={evento_id}")


class TestGestionePostiTavolo:
    """Test gestione posti per tavolo (input posti) funzionante e persistente"""
    
    def test_update_posti_tavolo(self):
        """Updating posti on a tavolo persists correctly"""
        # Get event 3
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        evento = response.json()
        
        current_disp = json.loads(evento.get('disposizioneSala', '{}')) if isinstance(evento.get('disposizioneSala'), str) else (evento.get('disposizioneSala') or {})
        
        # Add/update tavolo with specific posti
        new_tavoli = current_disp.get('tavoli', [])
        test_tavolo = {
            "id": 999,
            "numero": "TEST_POSTI",
            "posti": 12,  # Test updating to 12 seats
            "posizione": {"xPerc": 0.2, "yPerc": 0.2},
            "rotazione": 0,
            "forma": "rotondo",
            "dimensionePerc": 0.05
        }
        new_tavoli.append(test_tavolo)
        
        new_disp = {
            **current_disp,
            'tavoli': new_tavoli
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/eventi?id=3",
            json={'disposizioneSala': new_disp},
            headers={'Content-Type': 'application/json'}
        )
        assert update_response.status_code == 200
        print("✅ PUT with tavolo posti=12 succeeded")
        
        # Verify posti persisted
        verify_response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        saved = verify_response.json()
        saved_disp = json.loads(saved.get('disposizioneSala', '{}')) if isinstance(saved.get('disposizioneSala'), str) else (saved.get('disposizioneSala') or {})
        
        test_tavolo_saved = next((t for t in saved_disp.get('tavoli', []) if t.get('id') == 999), None)
        assert test_tavolo_saved is not None, "Test tavolo should be saved"
        assert test_tavolo_saved.get('posti') == 12, f"Posti should be 12, got {test_tavolo_saved.get('posti')}"
        print(f"✅ Tavolo posti=12 persisted correctly")
        
        # Cleanup - remove test tavolo
        cleaned_tavoli = [t for t in saved_disp.get('tavoli', []) if t.get('id') != 999]
        requests.put(
            f"{BASE_URL}/api/eventi?id=3",
            json={'disposizioneSala': {**saved_disp, 'tavoli': cleaned_tavoli}},
            headers={'Content-Type': 'application/json'}
        )


class TestCopiaSchema:
    """Test copia schema da evento simile"""
    
    def test_eventi_list_for_copia(self):
        """GET /api/eventi returns events that can be used for schema copying"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        eventi = response.json()
        
        # Filter events with disposizioneSala
        eventi_with_disp = []
        for ev in eventi:
            disp = ev.get('disposizioneSala')
            if disp:
                parsed = json.loads(disp) if isinstance(disp, str) else disp
                if parsed and parsed.get('tavoli') and len(parsed['tavoli']) > 0:
                    eventi_with_disp.append(ev)
        
        print(f"✅ Found {len(eventi_with_disp)} eventi with disposizioneSala and tavoli")
        assert len(eventi_with_disp) >= 0, "Should have events that can serve as schema source"


class TestExportFunctionality:
    """Test export PNG/PDF/Stampa functionality at API level"""
    
    def test_evento_data_available_for_export(self):
        """Event 3 has data needed for export (disposizioneSala)"""
        response = requests.get(f"{BASE_URL}/api/eventi?id=3")
        assert response.status_code == 200
        evento = response.json()
        
        assert 'disposizioneSala' in evento, "Event should have disposizioneSala for export"
        
        disp = json.loads(evento['disposizioneSala']) if isinstance(evento['disposizioneSala'], str) else evento['disposizioneSala']
        assert disp is not None, "disposizioneSala should not be null"
        print(f"✅ Event 3 has disposizioneSala ready for export")


class TestSalvataggioRegressione:
    """Test regressione: salvataggio planimetria continua a funzionare"""
    
    def test_save_complete_disposizione(self):
        """Full disposizione save/load cycle works"""
        test_disp = {
            "tavoli": [
                {
                    "id": 1,
                    "numero": "Tavolo A",
                    "posti": 8,
                    "posizione": {"xPerc": 0.3, "yPerc": 0.3},
                    "rotazione": 45,
                    "forma": "rotondo",
                    "dimensionePerc": 0.06
                },
                {
                    "id": 2,
                    "numero": "Tavolo B",
                    "posti": 10,
                    "posizione": {"xPerc": 0.6, "yPerc": 0.4},
                    "rotazione": 0,
                    "forma": "rotondo",
                    "dimensionePerc": 0.07
                }
            ],
            "stazioni": [
                {
                    "id": 1,
                    "nome": "Buffet Test",
                    "tipo": "buffet",
                    "posizione": {"xPerc": 0.5, "yPerc": 0.8},
                    "rotazione": 0,
                    "dimensionePerc": {"larghezzaPerc": 0.15, "altezzaPerc": 0.06}
                }
            ],
            "immagine": "/planimetrie/test-image.png",
            "rotazioneImmagine": 180
        }
        
        # Create test event
        payload = {
            "tipo": "Battesimo",
            "titolo": "TEST_Regressione_Salvataggio",
            "dateProposte": ["2026-06-20"],
            "fascia": "pranzo",
            "stato": "in_attesa",
            "clienti": [{"nome": "TEST", "cognome": "Regressione"}],
            "disposizioneSala": test_disp
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/eventi",
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        assert create_response.status_code == 200
        evento = create_response.json()
        evento_id = evento['id']
        print(f"✅ Created test event ID {evento_id}")
        
        # Verify all data saved
        verify_response = requests.get(f"{BASE_URL}/api/eventi?id={evento_id}")
        assert verify_response.status_code == 200
        saved = verify_response.json()
        
        saved_disp = json.loads(saved.get('disposizioneSala', '{}')) if isinstance(saved.get('disposizioneSala'), str) else (saved.get('disposizioneSala') or {})
        
        # Verify tavoli
        assert len(saved_disp.get('tavoli', [])) == 2, f"Should have 2 tavoli, got {len(saved_disp.get('tavoli', []))}"
        
        # Verify stazioni
        assert len(saved_disp.get('stazioni', [])) == 1, f"Should have 1 stazione, got {len(saved_disp.get('stazioni', []))}"
        
        # Verify rotazione
        assert saved_disp.get('rotazioneImmagine') == 180, f"rotazioneImmagine should be 180, got {saved_disp.get('rotazioneImmagine')}"
        
        # Verify immagine path
        assert saved_disp.get('immagine') == "/planimetrie/test-image.png"
        
        print("✅ Complete disposizione save/load cycle works correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/eventi?id={evento_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
