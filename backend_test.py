#!/usr/bin/env python3
"""
Backend API Test for Villa Paris Gestionale - Versioning + Blocking Features
Testing STEP 5 (Versioning) and STEP 6 (Blocco -10 giorni) functionality
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class VillaParisVersioningBlockingTester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.override_token = "VILLA-PARIS-ADMIN-2026"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def test_api_connection(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.base_url}/api/eventi", timeout=10)
            success = response.status_code in [200, 404]  # 404 is ok if no events exist
            self.log_test("API Connection", success, f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("API Connection", False, str(e))
            return False

    def test_versioni_api_get(self, event_id=1):
        """Test GET /api/versioni?eventoId=X returns versions list"""
        try:
            response = requests.get(f"{self.base_url}/api/versioni?eventoId={event_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                self.log_test(f"GET Versioni for Event {event_id}", success, 
                             f"Returned {len(data) if is_list else 0} versions")
                return data
            else:
                self.log_test(f"GET Versioni for Event {event_id}", False, f"Status: {response.status_code}")
                return []
        except Exception as e:
            self.log_test(f"GET Versioni for Event {event_id}", False, str(e))
            return []

    def test_versioni_api_post(self, event_id=1):
        """Test POST /api/versioni creates version with snapshot"""
        try:
            version_data = {
                "eventoId": event_id,
                "tipo": "CONTRATTO",
                "watermark": "CONTRATTO",
                "commento": "Test version creation",
                "autore": "Test User"
            }
            
            response = requests.post(
                f"{self.base_url}/api/versioni",
                json=version_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                has_version = 'versione' in data
                has_numero = 'numero' in data
                self.log_test("POST Create Version", success, 
                             f"Created version {data.get('numero', 'N/A')}")
                return data
            else:
                self.log_test("POST Create Version", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("POST Create Version", False, str(e))
            return None

    def test_eventi_api_get_with_blocco(self, event_id=1):
        """Test GET /api/eventi?id=X includes _blocco info"""
        try:
            response = requests.get(f"{self.base_url}/api/eventi?id={event_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_blocco = '_blocco' in data
                blocco_info = data.get('_blocco', {})
                is_blocked = blocco_info.get('isBloccato', False)
                giorni = blocco_info.get('giorniMancanti', 'N/A')
                
                self.log_test(f"GET Event {event_id} with Blocco Info", success, 
                             f"Has _blocco: {has_blocco}, Blocked: {is_blocked}, Days: {giorni}")
                return data
            else:
                self.log_test(f"GET Event {event_id} with Blocco Info", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"GET Event {event_id} with Blocco Info", False, str(e))
            return None

    def test_eventi_api_put_blocked_without_override(self, event_id=3):
        """Test PUT /api/eventi returns 423 for blocked event without override"""
        try:
            # Try to update blocked fields without override headers
            update_data = {
                "menu": {"test": "blocked update"},
                "note": "This should be blocked"
            }
            
            response = requests.put(
                f"{self.base_url}/api/eventi?id={event_id}",
                json=update_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 423
            if success:
                data = response.json()
                has_error = 'error' in data
                has_override_required = data.get('overrideRequired', False)
                self.log_test("PUT Blocked Event (No Override)", success, 
                             f"Correctly returned 423 Locked, Override required: {has_override_required}")
                return data
            else:
                self.log_test("PUT Blocked Event (No Override)", False, 
                             f"Expected 423, got {response.status_code}")
                return None
        except Exception as e:
            self.log_test("PUT Blocked Event (No Override)", False, str(e))
            return None

    def test_eventi_api_put_blocked_with_override(self, event_id=3):
        """Test PUT /api/eventi succeeds with valid override headers"""
        try:
            # Update blocked fields WITH override headers
            update_data = {
                "menu": {"test": "override update"},
                "note": "This should work with override"
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-Override-Token': self.override_token,
                'X-Override-Motivo': 'Test override for automated testing - urgent client request',
                'X-Override-Autore': 'Test Automation'
            }
            
            response = requests.put(
                f"{self.base_url}/api/eventi?id={event_id}",
                json=update_data,
                headers=headers,
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                self.log_test("PUT Blocked Event (With Override)", success, 
                             f"Successfully updated with override")
                return data
            else:
                self.log_test("PUT Blocked Event (With Override)", False, 
                             f"Expected 200, got {response.status_code}")
                return None
        except Exception as e:
            self.log_test("PUT Blocked Event (With Override)", False, str(e))
            return None

    def test_stampa_cliente_creates_version(self, event_id=1):
        """Test that Stampa Cliente creates AUTO_PRE_STAMPA version"""
        try:
            # Get initial version count
            initial_versions = self.test_versioni_api_get(event_id)
            initial_count = len(initial_versions) if initial_versions else 0
            
            # Create AUTO_PRE_STAMPA version (simulating Stampa Cliente action)
            version_data = {
                "eventoId": event_id,
                "tipo": "AUTO_PRE_STAMPA",
                "watermark": "BOZZA",
                "commento": "Stampa Cliente automatica",
                "autore": "Sistema"
            }
            
            response = requests.post(
                f"{self.base_url}/api/versioni",
                json=version_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                # Verify version was created
                new_versions = self.test_versioni_api_get(event_id)
                new_count = len(new_versions) if new_versions else 0
                version_created = new_count > initial_count
                
                self.log_test("Stampa Cliente Creates AUTO_PRE_STAMPA Version", 
                             version_created, 
                             f"Versions: {initial_count} -> {new_count}")
                return version_created
            else:
                self.log_test("Stampa Cliente Creates AUTO_PRE_STAMPA Version", False, 
                             f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Stampa Cliente Creates AUTO_PRE_STAMPA Version", False, str(e))
            return False

    def create_test_events_if_needed(self):
        """Create test events if they don't exist - Event 1 (not blocked), Event 3 (blocked)"""
        try:
            # Check if events exist
            event1_exists = False
            event3_exists = False
            
            response1 = requests.get(f"{self.base_url}/api/eventi?id=1", timeout=10)
            if response1.status_code == 200:
                event1_exists = True
                self.log_test("Test Event 1 Exists", True, "Event ID 1 found")
            
            response3 = requests.get(f"{self.base_url}/api/eventi?id=3", timeout=10)
            if response3.status_code == 200:
                event3_exists = True
                self.log_test("Test Event 3 Exists", True, "Event ID 3 found")
            
            # Create Event 1 (not blocked - 41 days away)
            if not event1_exists:
                future_date = (datetime.now() + timedelta(days=41)).isoformat()
                test_event1 = {
                    "tipo": "matrimonio",
                    "titolo": "Test Event 1 - Not Blocked",
                    "dataConfermata": future_date,
                    "fascia": "cena",
                    "stato": "confermato",
                    "personePreviste": 50,
                    "note": "Test event for versioning - not blocked",
                    "clienti": [{
                        "nome": "Test",
                        "cognome": "Client1",
                        "email": "test1@example.com",
                        "telefono": "1234567890"
                    }],
                    "menu": {"portate": [], "variantiAttive": [], "note": ""},
                    "struttura": {"varianti": []},
                    "disposizioneSala": {"tavoli": [], "stazioni": []}
                }
                
                response = requests.post(
                    f"{self.base_url}/api/eventi",
                    json=test_event1,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                success = response.status_code == 200
                self.log_test("Create Test Event 1 (Not Blocked)", success, f"Status: {response.status_code}")
            
            # Create Event 3 (blocked - 5 days away)
            if not event3_exists:
                blocked_date = (datetime.now() + timedelta(days=5)).isoformat()
                test_event3 = {
                    "tipo": "matrimonio", 
                    "titolo": "Test Event 3 - Blocked",
                    "dataConfermata": blocked_date,
                    "fascia": "cena",
                    "stato": "confermato",
                    "personePreviste": 80,
                    "note": "Test event for blocking - 5 days away",
                    "clienti": [{
                        "nome": "Test",
                        "cognome": "Client3",
                        "email": "test3@example.com",
                        "telefono": "0987654321"
                    }],
                    "menu": {"portate": [], "variantiAttive": [], "note": ""},
                    "struttura": {"varianti": []},
                    "disposizioneSala": {"tavoli": [], "stazioni": []}
                }
                
                response = requests.post(
                    f"{self.base_url}/api/eventi",
                    json=test_event3,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                success = response.status_code == 200
                self.log_test("Create Test Event 3 (Blocked)", success, f"Status: {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_test("Create Test Events", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🧪 Starting Villa Paris Tavolo Varianti API Tests...")
        print("=" * 50)
        
        # Test API connection
        if not self.test_api_connection():
            print("❌ Cannot connect to API, stopping tests")
            return False
        
        # Create test event if needed
        self.create_test_event_if_needed()
        
        # Test getting event with disposizione
        event_data = self.test_get_event_with_disposizione(1)
        
        # Test updating tavolo variants
        if event_data:
            self.test_update_tavolo_variants(1)
            # Verify the update worked
            self.test_get_event_with_disposizione(1)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    """Main test execution"""
    tester = TavoloVariantiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())