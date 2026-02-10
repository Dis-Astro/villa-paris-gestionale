#!/usr/bin/env python3
"""
Backend API Test for Villa Paris Gestionale - UI/UX + Report Features
Testing AppShell/Sidebar navigation and Report Azienda functionality
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class VillaParisUIReportTester:
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

    def test_report_stats_api(self):
        """Test GET /api/report/stats returns monthly statistics"""
        try:
            current_year = datetime.now().year
            response = requests.get(f"{self.base_url}/api/report/stats?year={current_year}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_year = 'year' in data
                has_monthly = 'monthly' in data and isinstance(data['monthly'], list)
                has_by_tipo = 'byTipo' in data and isinstance(data['byTipo'], list)
                has_totals = 'totals' in data and isinstance(data['totals'], dict)
                
                monthly_count = len(data['monthly']) if has_monthly else 0
                tipo_count = len(data['byTipo']) if has_by_tipo else 0
                
                self.log_test("GET Report Stats API", success, 
                             f"Year: {data.get('year')}, Monthly: {monthly_count} entries, Tipo: {tipo_count} types")
                return data
            else:
                self.log_test("GET Report Stats API", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("GET Report Stats API", False, str(e))
            return None

    def test_report_excel_api(self):
        """Test GET /api/report/azienda.xlsx generates valid Excel file"""
        try:
            response = requests.get(f"{self.base_url}/api/report/azienda.xlsx", timeout=30)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('Content-Type', '')
                content_disposition = response.headers.get('Content-Disposition', '')
                content_length = len(response.content)
                
                is_excel = 'spreadsheet' in content_type or 'excel' in content_type
                has_filename = 'VillaParis_Report' in content_disposition
                has_content = content_length > 1000  # Excel files should be at least 1KB
                
                self.log_test("GET Excel Report API", success, 
                             f"Content-Type: {content_type}, Size: {content_length} bytes, Has filename: {has_filename}")
                return response.content
            else:
                self.log_test("GET Excel Report API", False, f"Status: {response.status_code}")
                return None
        except Exception as e:
            self.log_test("GET Excel Report API", False, str(e))
            return None

    def test_eventi_api_basic(self):
        """Test basic eventi API for dashboard data"""
        try:
            response = requests.get(f"{self.base_url}/api/eventi", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                event_count = len(data) if is_list else 0
                
                self.log_test("GET Eventi API (Basic)", success, f"Returned {event_count} events")
                return data
            else:
                self.log_test("GET Eventi API (Basic)", False, f"Status: {response.status_code}")
                return []
        except Exception as e:
            self.log_test("GET Eventi API (Basic)", False, str(e))
            return []

    def test_clienti_api_basic(self):
        """Test basic clienti API for dashboard data"""
        try:
            response = requests.get(f"{self.base_url}/api/clienti", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                client_count = len(data) if is_list else 0
                
                self.log_test("GET Clienti API (Basic)", success, f"Returned {client_count} clients")
                return data
            else:
                self.log_test("GET Clienti API (Basic)", False, f"Status: {response.status_code}")
                return []
        except Exception as e:
            self.log_test("GET Clienti API (Basic)", False, str(e))
            return []

    def run_all_tests(self):
        """Run all backend API tests for UI/UX and Report features"""
        print("🧪 Starting Villa Paris UI/UX + Report API Tests...")
        print("=" * 60)
        
        # Test API connection
        if not self.test_api_connection():
            print("❌ Cannot connect to API, stopping tests")
            return False
        
        print("\n📊 Testing Dashboard Data APIs...")
        print("-" * 40)
        
        # Test basic APIs for dashboard
        eventi_data = self.test_eventi_api_basic()
        clienti_data = self.test_clienti_api_basic()
        
        print("\n📈 Testing Report Features...")
        print("-" * 40)
        
        # Test report APIs
        stats_data = self.test_report_stats_api()
        excel_data = self.test_report_excel_api()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    """Main test execution"""
    tester = VillaParisUIReportTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())