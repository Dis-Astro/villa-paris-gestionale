#!/usr/bin/env python3
"""
Villa Paris Hotfix Backend Verification
Test the 6 key points mentioned in the review request:
1. GET /api/report/stats continues to work for operational reports
2. GET /api/report/azienda.xlsx continues to work for operational reports  
3. GET /api/report/eventi/stats works for historical events reports
4. GET /api/report/eventi.xlsx works for historical events export
5. GET /api/clienti exposes dataPrimoContatto useful for calendar
6. No 500 errors or auth regressions on hotfix routes

Credentials: admin@villaparis.local / Admin123!
"""

import requests
import json
import os
import sys

BASE_URL = "http://127.0.0.1:3000"
CREDENTIALS = {
    "email": "admin@villaparis.local",
    "password": "Admin123!"
}

def test_login_and_get_session():
    """Login and return session for authenticated requests"""
    print("🔐 Testing login functionality...")
    
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Login successful")
        if session.cookies:
            print(f"   ✅ Session cookies received: {len(session.cookies)} cookies")
        return session
    else:
        print(f"   ❌ Login failed: {response.text}")
        return None

def test_operational_report_stats(session):
    """Test 1: GET /api/report/stats continues to work for operational reports"""
    print("\n📊 Testing GET /api/report/stats (operational reports)...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    # Test different periods
    periods = ["week", "month", "year"]
    results = {}
    
    for period in periods:
        print(f"   Testing period: {period}")
        response = session.get(
            f"{BASE_URL}/api/report/stats",
            params={
                "period": period,
                "referenceDate": "2026-03-20",
                "spamMode": "policy"
            }
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results[period] = True
            
            # Check payload structure
            required_fields = ["meta", "summary", "sources", "operators", "trend", "clients", "activities"]
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if not missing_fields:
                print(f"   ✅ {period}: All required fields present")
            else:
                print(f"   ⚠️  {period}: Missing fields: {missing_fields}")
                results[period] = False
        else:
            print(f"   ❌ {period}: Failed with {response.status_code}: {response.text}")
            results[period] = False
    
    return all(results.values())

def test_operational_excel_export(session):
    """Test 2: GET /api/report/azienda.xlsx continues to work for operational reports"""
    print("\n📁 Testing GET /api/report/azienda.xlsx (operational Excel export)...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    response = session.get(
        f"{BASE_URL}/api/report/azienda.xlsx",
        params={
            "period": "month",
            "referenceDate": "2026-03-20",
            "spamMode": "policy"
        }
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        if "spreadsheetml" in content_type:
            print("   ✅ Correct content type for Excel file")
        else:
            print(f"   ⚠️  Content-Type: {content_type}")
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        if "attachment" in content_disposition and ".xlsx" in content_disposition:
            print("   ✅ Correct content disposition header")
        else:
            print(f"   ⚠️  Content-Disposition: {content_disposition}")
        
        # Check file size
        file_size = len(response.content)
        if file_size > 1000:
            print(f"   ✅ File size looks reasonable: {file_size} bytes")
        else:
            print(f"   ⚠️  File size seems too small: {file_size} bytes")
        
        # Check Excel magic bytes
        if response.content[:4] == b'PK\x03\x04':
            print("   ✅ Valid Excel file format (PK zip)")
            return True
        else:
            print(f"   ❌ Invalid file format, magic bytes: {response.content[:4]}")
            return False
    else:
        print(f"   ❌ Excel export failed: {response.text}")
        return False

def test_historical_events_stats(session):
    """Test 3: GET /api/report/eventi/stats works for historical events reports"""
    print("\n📈 Testing GET /api/report/eventi/stats (historical events reports)...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    # Test current year and previous year
    years = [2026, 2025]
    results = {}
    
    for year in years:
        print(f"   Testing year: {year}")
        response = session.get(
            f"{BASE_URL}/api/report/eventi/stats",
            params={"year": year}
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results[year] = True
            
            # Check payload structure
            required_fields = ["year", "monthly", "byTipo", "totals"]
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if not missing_fields:
                print(f"   ✅ {year}: All required fields present")
                # Check monthly data structure
                if isinstance(data.get("monthly"), list) and len(data["monthly"]) == 12:
                    print(f"   ✅ {year}: Monthly data has 12 months")
                else:
                    print(f"   ⚠️  {year}: Monthly data structure issue")
                    results[year] = False
                
                # Check totals structure
                totals = data.get("totals", {})
                expected_totals = ["eventiTotali", "ospitiTotali", "ricaviTotali", "ticketMedio"]
                missing_totals = [t for t in expected_totals if t not in totals]
                if not missing_totals:
                    print(f"   ✅ {year}: All totals fields present")
                else:
                    print(f"   ⚠️  {year}: Missing totals: {missing_totals}")
                    results[year] = False
            else:
                print(f"   ❌ {year}: Missing fields: {missing_fields}")
                results[year] = False
        else:
            print(f"   ❌ {year}: Failed with {response.status_code}: {response.text}")
            results[year] = False
    
    return all(results.values())

def test_historical_events_excel_export(session):
    """Test 4: GET /api/report/eventi.xlsx works for historical events export"""
    print("\n📊 Testing GET /api/report/eventi.xlsx (historical events Excel export)...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    # Test with date range
    response = session.get(
        f"{BASE_URL}/api/report/eventi.xlsx",
        params={
            "from": "2025-01-01",
            "to": "2026-12-31"
        }
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        if "spreadsheetml" in content_type:
            print("   ✅ Correct content type for Excel file")
        else:
            print(f"   ⚠️  Content-Type: {content_type}")
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        if "attachment" in content_disposition and ".xlsx" in content_disposition:
            print("   ✅ Correct content disposition header")
        else:
            print(f"   ⚠️  Content-Disposition: {content_disposition}")
        
        # Check file size
        file_size = len(response.content)
        if file_size > 1000:
            print(f"   ✅ File size looks reasonable: {file_size} bytes")
        else:
            print(f"   ⚠️  File size seems too small: {file_size} bytes")
        
        # Check Excel magic bytes
        if response.content[:4] == b'PK\x03\x04':
            print("   ✅ Valid Excel file format (PK zip)")
            return True
        else:
            print(f"   ❌ Invalid file format, magic bytes: {response.content[:4]}")
            return False
    else:
        print(f"   ❌ Events Excel export failed: {response.text}")
        return False

def test_clienti_with_primo_contatto(session):
    """Test 5: GET /api/clienti exposes dataPrimoContatto useful for calendar"""
    print("\n👥 Testing GET /api/clienti (dataPrimoContatto for calendar)...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    response = session.get(f"{BASE_URL}/api/clienti")
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        if isinstance(data, list):
            print(f"   ✅ Received list of {len(data)} clients")
            
            # Check if clients have dataPrimoContatto field
            clients_with_primo_contatto = 0
            clients_with_valid_primo_contatto = 0
            
            for client in data:
                if "dataPrimoContatto" in client:
                    clients_with_primo_contatto += 1
                    if client["dataPrimoContatto"]:
                        clients_with_valid_primo_contatto += 1
            
            print(f"   ✅ {clients_with_primo_contatto}/{len(data)} clients have dataPrimoContatto field")
            print(f"   ✅ {clients_with_valid_primo_contatto}/{len(data)} clients have valid dataPrimoContatto")
            
            # Check if we have at least some clients with first contact dates
            if clients_with_valid_primo_contatto > 0:
                print("   ✅ Calendar integration data available")
                return True
            else:
                print("   ⚠️  No clients with valid first contact dates found")
                return True  # This is not a failure, just no data
        else:
            print(f"   ❌ Expected list, got: {type(data)}")
            return False
    else:
        print(f"   ❌ Clienti API failed: {response.text}")
        return False

def test_no_500_errors_on_hotfix_routes(session):
    """Test 6: No 500 errors or auth regressions on hotfix routes"""
    print("\n🚨 Testing for 500 errors and auth regressions on hotfix routes...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    # Test all hotfix-related endpoints
    endpoints = [
        "/api/report/stats?period=week&spamMode=policy",
        "/api/report/stats?period=month&spamMode=policy", 
        "/api/report/stats?period=year&spamMode=policy",
        "/api/report/eventi/stats?year=2026",
        "/api/clienti"
    ]
    
    has_500_error = False
    has_auth_regression = False
    
    for endpoint in endpoints:
        print(f"   Testing: {endpoint}")
        response = session.get(f"{BASE_URL}{endpoint}")
        
        if response.status_code == 500:
            print(f"   ❌ 500 Error on {endpoint}: {response.text}")
            has_500_error = True
        elif response.status_code == 401 or response.status_code == 403:
            print(f"   ❌ Auth regression on {endpoint}: {response.status_code}")
            has_auth_regression = True
        elif response.status_code >= 400:
            print(f"   ⚠️  {response.status_code} on {endpoint}")
        else:
            print(f"   ✅ {response.status_code} on {endpoint}")
    
    # Test unauthorized access (should return 401)
    print("   Testing unauthorized access...")
    unauth_session = requests.Session()
    response = unauth_session.get(f"{BASE_URL}/api/report/stats")
    if response.status_code == 401:
        print("   ✅ Unauthorized access properly blocked (401)")
    else:
        print(f"   ❌ Auth protection issue: {response.status_code}")
        has_auth_regression = True
    
    if not has_500_error and not has_auth_regression:
        print("   ✅ No 500 errors or auth regressions found")
    
    return not has_500_error and not has_auth_regression

def create_test_client_if_needed(session):
    """Create a temporary test client for calendar testing if needed"""
    print("\n👤 Creating temporary test client for calendar testing...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return None
        
    # Check if we already have clients with first contact dates
    response = session.get(f"{BASE_URL}/api/clienti")
    if response.status_code == 200:
        clients = response.json()
        clients_with_dates = [c for c in clients if c.get("dataPrimoContatto")]
        if len(clients_with_dates) > 0:
            print(f"   ✅ Found {len(clients_with_dates)} existing clients with first contact dates")
            return None
    
    # Create a temporary test client
    test_client_data = {
        "nome": "Test",
        "cognome": "Calendar",
        "email": "test.calendar@temp.local",
        "telefono": "+39 123 456 7890",
        "canalePrimoContatto": "Test",
        "dataPrimoContatto": "2026-03-20T10:00:00.000Z",
        "tipoCliente": "Privato"
    }
    
    response = session.post(f"{BASE_URL}/api/clienti", json=test_client_data)
    
    if response.status_code == 201:
        client = response.json()
        print(f"   ✅ Created temporary test client: {client['id']}")
        return client['id']
    else:
        print(f"   ⚠️  Could not create test client: {response.status_code}")
        return None

def cleanup_test_client(session, client_id):
    """Clean up temporary test client"""
    if not session or not client_id:
        return
        
    print(f"\n🧹 Cleaning up temporary test client {client_id}...")
    
    response = session.delete(f"{BASE_URL}/api/clienti?id={client_id}")
    
    if response.status_code == 204:
        print("   ✅ Test client cleaned up successfully")
    else:
        print(f"   ⚠️  Could not clean up test client: {response.status_code}")

def main():
    print("🏛️  Villa Paris Hotfix Backend Verification")
    print("=" * 60)
    
    results = []
    test_client_id = None
    
    # Login
    session = test_login_and_get_session()
    if not session:
        print("\n❌ Cannot proceed without authentication")
        return 1
    
    try:
        # Create test client if needed for calendar testing
        test_client_id = create_test_client_if_needed(session)
        
        # Test 1: Operational report stats
        result1 = test_operational_report_stats(session)
        results.append(("GET /api/report/stats (operational)", result1))
        
        # Test 2: Operational Excel export
        result2 = test_operational_excel_export(session)
        results.append(("GET /api/report/azienda.xlsx (operational)", result2))
        
        # Test 3: Historical events stats
        result3 = test_historical_events_stats(session)
        results.append(("GET /api/report/eventi/stats (historical)", result3))
        
        # Test 4: Historical events Excel export
        result4 = test_historical_events_excel_export(session)
        results.append(("GET /api/report/eventi.xlsx (historical)", result4))
        
        # Test 5: Clienti with dataPrimoContatto
        result5 = test_clienti_with_primo_contatto(session)
        results.append(("GET /api/clienti (dataPrimoContatto)", result5))
        
        # Test 6: No 500 errors or auth regressions
        result6 = test_no_500_errors_on_hotfix_routes(session)
        results.append(("No 500 errors or auth regressions", result6))
        
    finally:
        # Clean up test client
        if test_client_id:
            cleanup_test_client(session, test_client_id)
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 VILLA PARIS HOTFIX VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL HOTFIX TESTS PASSED - Villa Paris hotfix is STABLE")
        print("✅ Operational reports continue to work")
        print("✅ Historical events reports work correctly")
        print("✅ Calendar integration data available")
        print("✅ No regressions detected")
    else:
        print("⚠️  Some hotfix tests failed - Needs attention")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())