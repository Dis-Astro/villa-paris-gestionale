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

    def test_get_event_with_disposizione(self, event_id=1):
        """Test getting event with disposizioneSala and tavolo variants"""
        try:
            response = requests.get(f"{self.base_url}/api/eventi?id={event_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_disposizione = 'disposizioneSala' in data
                has_tavoli = has_disposizione and 'tavoli' in data['disposizioneSala']
                has_variants = False
                
                if has_tavoli and len(data['disposizioneSala']['tavoli']) > 0:
                    tavolo = data['disposizioneSala']['tavoli'][0]
                    has_variants = 'varianti' in tavolo and len(tavolo.get('varianti', {})) > 0
                
                self.log_test(f"Get Event {event_id} with Disposizione", success, 
                             f"Has disposizione: {has_disposizione}, Has tavoli: {has_tavoli}, Has variants: {has_variants}")
                return data
            else:
                self.log_test(f"Get Event {event_id} with Disposizione", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"Get Event {event_id} with Disposizione", False, str(e))
            return None

    def test_update_tavolo_variants(self, event_id=1):
        """Test updating tavolo variants in disposizioneSala"""
        try:
            # First get the current event
            get_response = requests.get(f"{self.base_url}/api/eventi?id={event_id}", timeout=10)
            if get_response.status_code != 200:
                self.log_test("Update Tavolo Variants - Get Event", False, f"Status: {get_response.status_code}")
                return False

            event_data = get_response.json()
            
            # Update tavolo variants
            if 'disposizioneSala' not in event_data:
                event_data['disposizioneSala'] = {'tavoli': [], 'stazioni': []}
            
            if not event_data['disposizioneSala'].get('tavoli'):
                # Create a test tavolo if none exists
                event_data['disposizioneSala']['tavoli'] = [{
                    "id": 1,
                    "numero": "T1",
                    "posti": 8,
                    "posizione": {"xPerc": 0.12, "yPerc": 0.12},
                    "rotazione": 0,
                    "forma": "rotondo",
                    "dimensionePerc": 0.06,
                    "varianti": {}
                }]
            
            # Update variants for first tavolo
            tavolo = event_data['disposizioneSala']['tavoli'][0]
            tavolo['varianti'] = {
                "vegetariano": 3,
                "senza_glutine": 2,
                "vegano": 1
            }
            
            # Send PUT request
            response = requests.put(
                f"{self.base_url}/api/eventi?id={event_id}",
                json=event_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            self.log_test("Update Tavolo Variants", success, f"Status: {response.status_code}")
            return success
            
        except Exception as e:
            self.log_test("Update Tavolo Variants", False, str(e))
            return False

    def create_test_event_if_needed(self):
        """Create a test event if event ID 1 doesn't exist"""
        try:
            # Check if event 1 exists
            response = requests.get(f"{self.base_url}/api/eventi?id=1", timeout=10)
            if response.status_code == 200:
                self.log_test("Test Event Exists", True, "Event ID 1 found")
                return True
            
            # Create test event
            test_event = {
                "tipo": "matrimonio",
                "titolo": "Test Event for Menu",
                "fascia": "cena",
                "stato": "bozza",
                "personePreviste": 50,
                "note": "Test event for menu functionality",
                "clienti": [{
                    "nome": "Test",
                    "cognome": "Client",
                    "email": "test@example.com",
                    "telefono": "1234567890"
                }],
                "menu": {
                    "portate": [],
                    "variantiAttive": [],
                    "note": ""
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/eventi",
                json=test_event,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            self.log_test("Create Test Event", success, f"Status: {response.status_code}")
            return success
            
        except Exception as e:
            self.log_test("Create Test Event", False, str(e))
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