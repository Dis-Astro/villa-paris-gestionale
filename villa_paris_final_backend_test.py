#!/usr/bin/env python3
"""
Villa Paris - Backend Final Verification
Test the specific requirements from the review request:

1. POST /api/auth/login con admin@villaparis.local / Admin123! deve funzionare.
2. GET /api/auth/me deve confermare l'admin attivo.
3. GET/POST/DELETE /api/presenze-villa devono funzionare con Admin.
4. GET /api/eventi e GET /api/report/stats non devono più fallire nel runtime corrente.
5. Nessuna regressione su /api/report/azienda.xlsx e /api/report/eventi.xlsx.
"""

import requests
import json
import sys
from datetime import datetime, date

BASE_URL = "http://127.0.0.1:3000"
CREDENTIALS = {
    "email": "admin@villaparis.local",
    "password": "Admin123!"
}

def test_admin_login():
    """Test 1: POST /api/auth/login con admin@villaparis.local / Admin123!"""
    print("🔐 Testing admin login...")
    
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Admin login successful")
        if session.cookies:
            print(f"   ✅ Session cookies received: {len(session.cookies)} cookies")
        return session, True
    else:
        print(f"   ❌ Admin login failed: {response.text}")
        return None, False

def test_auth_me_admin(session):
    """Test 2: GET /api/auth/me deve confermare l'admin attivo"""
    print("\n👤 Testing auth/me for admin confirmation...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    response = session.get(f"{BASE_URL}/api/auth/me")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        email = data.get('email', '')
        role = data.get('role', '')
        
        print(f"   User email: {email}")
        print(f"   User role: {role}")
        
        if email == "admin@villaparis.local" and role == "ADMIN":
            print("   ✅ Admin confirmed active")
            return True
        else:
            print(f"   ❌ Admin not confirmed - email: {email}, role: {role}")
            return False
    else:
        print(f"   ❌ Auth/me failed: {response.text}")
        return False

def test_presenze_villa_endpoints(session):
    """Test 3: GET/POST/DELETE /api/presenze-villa devono funzionare con Admin"""
    print("\n🏛️  Testing presenze-villa endpoints...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
    
    results = {"get": False, "post": False, "delete": False}
    created_record_id = None
    
    # Test GET /api/presenze-villa
    print("   Testing GET /api/presenze-villa...")
    response = session.get(f"{BASE_URL}/api/presenze-villa")
    print(f"   GET Status: {response.status_code}")
    
    if response.status_code == 200:
        print("   ✅ GET /api/presenze-villa works")
        results["get"] = True
        try:
            data = response.json()
            print(f"   Found {len(data)} existing records")
        except:
            print("   Response is not JSON")
    else:
        print(f"   ❌ GET /api/presenze-villa failed: {response.text}")
    
    # Test POST /api/presenze-villa (create test record)
    print("   Testing POST /api/presenze-villa...")
    test_record = {
        "dataRiferimento": date.today().isoformat(),
        "nome": "Mario",
        "cognome": "Rossi",
        "azienda": "Test Company",
        "orarioIngresso": "09:00",
        "orarioUscita": "17:00",
        "motivoVisita": "Test visit for backend verification",
        "mansioneSvolta": "Testing",
        "note": "Test record - will be deleted"
    }
    
    response = session.post(
        f"{BASE_URL}/api/presenze-villa",
        json=test_record
    )
    print(f"   POST Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("   ✅ POST /api/presenze-villa works")
        results["post"] = True
        try:
            data = response.json()
            created_record_id = data.get('id')
            print(f"   Created record ID: {created_record_id}")
        except:
            print("   Could not parse created record ID")
    else:
        print(f"   ❌ POST /api/presenze-villa failed: {response.text}")
    
    # Test DELETE /api/presenze-villa (clean up test record)
    if created_record_id:
        print(f"   Testing DELETE /api/presenze-villa?id={created_record_id}...")
        response = session.delete(f"{BASE_URL}/api/presenze-villa?id={created_record_id}")
        print(f"   DELETE Status: {response.status_code}")
        
        if response.status_code in [200, 204]:
            print("   ✅ DELETE /api/presenze-villa works")
            print("   ✅ Test record cleaned up successfully")
            results["delete"] = True
        else:
            print(f"   ❌ DELETE /api/presenze-villa failed: {response.text}")
            print("   ⚠️  Test record may still exist in database")
    else:
        print("   ⚠️  No record ID to delete, skipping DELETE test")
        # Try a generic DELETE test
        response = session.delete(f"{BASE_URL}/api/presenze-villa?id=999999")
        if response.status_code in [404, 400]:
            print("   ✅ DELETE endpoint responds appropriately to invalid ID")
            results["delete"] = True
    
    return all(results.values())

def test_eventi_and_report_stats(session):
    """Test 4: GET /api/eventi e GET /api/report/stats non devono più fallire"""
    print("\n📊 Testing eventi and report/stats endpoints...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
    
    results = {"eventi": False, "report_stats": False}
    
    # Test GET /api/eventi
    print("   Testing GET /api/eventi...")
    response = session.get(f"{BASE_URL}/api/eventi")
    print(f"   Eventi Status: {response.status_code}")
    
    if response.status_code == 200:
        print("   ✅ GET /api/eventi works (no runtime failure)")
        results["eventi"] = True
        try:
            data = response.json()
            print(f"   Found {len(data)} eventi records")
        except:
            print("   Response is not JSON but status is 200")
    else:
        print(f"   ❌ GET /api/eventi failed: {response.text}")
    
    # Test GET /api/report/stats
    print("   Testing GET /api/report/stats...")
    response = session.get(
        f"{BASE_URL}/api/report/stats",
        params={
            "period": "month",
            "referenceDate": "2026-03-20",
            "spamMode": "policy"
        }
    )
    print(f"   Report/stats Status: {response.status_code}")
    
    if response.status_code == 200:
        print("   ✅ GET /api/report/stats works (no runtime failure)")
        results["report_stats"] = True
        try:
            data = response.json()
            print(f"   Report contains {len(data.keys())} main sections")
        except:
            print("   Response is not JSON but status is 200")
    else:
        print(f"   ❌ GET /api/report/stats failed: {response.text}")
    
    return all(results.values())

def test_excel_exports_no_regression(session):
    """Test 5: Nessuna regressione su /api/report/azienda.xlsx e /api/report/eventi.xlsx"""
    print("\n📁 Testing Excel exports for regressions...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
    
    results = {"azienda_xlsx": False, "eventi_xlsx": False}
    
    # Test /api/report/azienda.xlsx
    print("   Testing GET /api/report/azienda.xlsx...")
    response = session.get(
        f"{BASE_URL}/api/report/azienda.xlsx",
        params={
            "period": "month",
            "referenceDate": "2026-03-20",
            "spamMode": "policy"
        }
    )
    print(f"   Azienda.xlsx Status: {response.status_code}")
    
    if response.status_code == 200:
        content_type = response.headers.get("Content-Type", "")
        file_size = len(response.content)
        
        if "spreadsheetml" in content_type and file_size > 1000:
            print(f"   ✅ /api/report/azienda.xlsx works - {file_size} bytes, correct content-type")
            results["azienda_xlsx"] = True
        else:
            print(f"   ⚠️  /api/report/azienda.xlsx - size: {file_size}, type: {content_type}")
    else:
        print(f"   ❌ /api/report/azienda.xlsx failed: {response.text}")
    
    # Test /api/report/eventi.xlsx
    print("   Testing GET /api/report/eventi.xlsx...")
    response = session.get(
        f"{BASE_URL}/api/report/eventi.xlsx",
        params={
            "year": "2026"
        }
    )
    print(f"   Eventi.xlsx Status: {response.status_code}")
    
    if response.status_code == 200:
        content_type = response.headers.get("Content-Type", "")
        file_size = len(response.content)
        
        if "spreadsheetml" in content_type and file_size > 1000:
            print(f"   ✅ /api/report/eventi.xlsx works - {file_size} bytes, correct content-type")
            results["eventi_xlsx"] = True
        else:
            print(f"   ⚠️  /api/report/eventi.xlsx - size: {file_size}, type: {content_type}")
    else:
        print(f"   ❌ /api/report/eventi.xlsx failed: {response.text}")
    
    return all(results.values())

def main():
    print("🏛️  Villa Paris - Backend Final Verification")
    print("Testing specific review request requirements")
    print("=" * 60)
    
    results = []
    
    # Test 1: Admin login
    session, login_success = test_admin_login()
    results.append(("Admin login (admin@villaparis.local)", login_success))
    
    # Test 2: Auth/me admin confirmation
    auth_me_result = test_auth_me_admin(session)
    results.append(("Auth/me admin confirmation", auth_me_result))
    
    # Test 3: Presenze-villa endpoints
    presenze_result = test_presenze_villa_endpoints(session)
    results.append(("Presenze-villa GET/POST/DELETE", presenze_result))
    
    # Test 4: Eventi and report/stats no failures
    eventi_stats_result = test_eventi_and_report_stats(session)
    results.append(("Eventi and report/stats no failures", eventi_stats_result))
    
    # Test 5: Excel exports no regression
    excel_result = test_excel_exports_no_regression(session)
    results.append(("Excel exports no regression", excel_result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 FINAL VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL REVIEW REQUIREMENTS PASSED - Backend is ready")
    else:
        print("⚠️  Some requirements failed - Backend needs attention")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())