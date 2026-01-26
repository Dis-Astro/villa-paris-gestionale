#!/usr/bin/env python3
"""
Backend API Test for Villa Paris Gestionale - Menu Evento
Testing the Next.js API routes for event menu functionality
"""

import requests
import json
import sys
from datetime import datetime

class MenuEventoAPITester:
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

    def test_get_event_by_id(self, event_id=1):
        """Test getting specific event by ID"""
        try:
            response = requests.get(f"{self.base_url}/api/eventi?id={event_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_menu = 'menu' in data
                self.log_test(f"Get Event {event_id}", success, f"Has menu: {has_menu}")
                return data
            else:
                self.log_test(f"Get Event {event_id}", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test(f"Get Event {event_id}", False, str(e))
            return None

    def test_update_event_menu(self, event_id=1):
        """Test updating event menu"""
        try:
            # First get the current event
            get_response = requests.get(f"{self.base_url}/api/eventi?id={event_id}", timeout=10)
            if get_response.status_code != 200:
                self.log_test("Update Menu - Get Event", False, f"Status: {get_response.status_code}")
                return False

            event_data = get_response.json()
            
            # Update with test menu data
            test_menu = {
                "portate": [
                    {
                        "id": "portata_test_1",
                        "nome": "Antipasto Test",
                        "ordine": 1,
                        "descrizione": "Test antipasto description"
                    }
                ],
                "variantiAttive": ["vegetariano", "senza_glutine"],
                "note": "Test menu note"
            }
            
            event_data['menu'] = test_menu
            
            # Send PUT request
            response = requests.put(
                f"{self.base_url}/api/eventi?id={event_id}",
                json=event_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            self.log_test("Update Event Menu", success, f"Status: {response.status_code}")
            return success
            
        except Exception as e:
            self.log_test("Update Event Menu", False, str(e))
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
        print("🧪 Starting Villa Paris Menu API Tests...")
        print("=" * 50)
        
        # Test API connection
        if not self.test_api_connection():
            print("❌ Cannot connect to API, stopping tests")
            return False
        
        # Create test event if needed
        self.create_test_event_if_needed()
        
        # Test getting event
        event_data = self.test_get_event_by_id(1)
        
        # Test updating menu
        if event_data:
            self.test_update_event_menu(1)
        
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
    tester = MenuEventoAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())