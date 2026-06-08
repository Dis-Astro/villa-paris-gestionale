#!/usr/bin/env python3
"""
Villa Paris PDF Eventi - Backend Final Verification
Minimal backend verification for PDF eventi step to ensure no regressions
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:3000"
CREDENTIALS = {
    "email": "admin@villaparis.local",
    "password": "Admin123!"
}

def login_and_get_session():
    """Login and return authenticated session"""
    print("🔐 Logging in...")
    
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS
    )
    
    if response.status_code == 200:
        print("   ✅ Login successful")
        return session
    else:
        print(f"   ❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_report_stats_no_regression(session):
    """Target 1: No regression on GET /api/report/stats"""
    print("\n📊 Testing GET /api/report/stats (no regression)...")
    
    if not session:
        return False
        
    # Test different periods to ensure comprehensive coverage
    periods = ["week", "month", "year"]
    all_passed = True
    
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
        
        if response.status_code == 200:
            data = response.json()
            # Check essential structure
            required_fields = ["meta", "summary", "sources", "operators"]
            missing = [f for f in required_fields if f not in data]
            
            if not missing:
                print(f"   ✅ {period}: 200 OK with complete structure")
            else:
                print(f"   ❌ {period}: Missing fields: {missing}")
                all_passed = False
        else:
            print(f"   ❌ {period}: {response.status_code} - {response.text}")
            all_passed = False
    
    return all_passed

def test_azienda_xlsx_no_regression(session):
    """Target 1: No regression on GET /api/report/azienda.xlsx"""
    print("\n📁 Testing GET /api/report/azienda.xlsx (no regression)...")
    
    if not session:
        return False
        
    response = session.get(
        f"{BASE_URL}/api/report/azienda.xlsx",
        params={
            "period": "month",
            "referenceDate": "2026-03-20",
            "spamMode": "policy"
        }
    )
    
    if response.status_code == 200:
        # Check it's a valid Excel file
        content_type = response.headers.get("Content-Type", "")
        file_size = len(response.content)
        is_excel = response.content[:4] == b'PK\x03\x04'
        
        if "spreadsheetml" in content_type and file_size > 1000 and is_excel:
            print(f"   ✅ Valid Excel file: {file_size} bytes, correct headers")
            return True
        else:
            print(f"   ❌ Invalid Excel: size={file_size}, type={content_type}, magic={response.content[:4]}")
            return False
    else:
        print(f"   ❌ Failed: {response.status_code} - {response.text}")
        return False

def test_eventi_stats_no_regression(session):
    """Target 2: No regression on GET /api/report/eventi/stats"""
    print("\n📈 Testing GET /api/report/eventi/stats (no regression)...")
    
    if not session:
        return False
        
    # Test different years
    years = ["2025", "2026"]
    all_passed = True
    
    for year in years:
        print(f"   Testing year: {year}")
        response = session.get(
            f"{BASE_URL}/api/report/eventi/stats",
            params={"year": year}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Check essential structure for eventi stats
            required_fields = ["year", "monthly", "byTipo", "totals"]
            missing = [f for f in required_fields if f not in data]
            
            if not missing:
                totals = data.get("totals", {})
                if "eventiTotali" in totals and "ospitiTotali" in totals:
                    print(f"   ✅ {year}: 200 OK with complete eventi structure")
                else:
                    print(f"   ❌ {year}: Missing totals fields")
                    all_passed = False
            else:
                print(f"   ❌ {year}: Missing fields: {missing}")
                all_passed = False
        else:
            print(f"   ❌ {year}: {response.status_code} - {response.text}")
            all_passed = False
    
    return all_passed

def test_eventi_xlsx_no_regression(session):
    """Target 2: No regression on GET /api/report/eventi.xlsx"""
    print("\n📊 Testing GET /api/report/eventi.xlsx (no regression)...")
    
    if not session:
        return False
        
    response = session.get(
        f"{BASE_URL}/api/report/eventi.xlsx",
        params={"year": "2026"}
    )
    
    if response.status_code == 200:
        # Check it's a valid Excel file
        content_type = response.headers.get("Content-Type", "")
        file_size = len(response.content)
        is_excel = response.content[:4] == b'PK\x03\x04'
        
        if "spreadsheetml" in content_type and file_size > 1000 and is_excel:
            print(f"   ✅ Valid Excel file: {file_size} bytes, correct headers")
            return True
        else:
            print(f"   ❌ Invalid Excel: size={file_size}, type={content_type}, magic={response.content[:4]}")
            return False
    else:
        print(f"   ❌ Failed: {response.status_code} - {response.text}")
        return False

def test_no_500_auth_issues(session):
    """Target 3: No 500/auth issues on report routes"""
    print("\n🚨 Testing no 500/auth issues on report routes...")
    
    if not session:
        return False
        
    # Test all report endpoints for 500 errors
    endpoints = [
        "/api/report/stats?period=week&spamMode=policy",
        "/api/report/stats?period=month&spamMode=policy",
        "/api/report/azienda.xlsx?period=month&spamMode=policy",
        "/api/report/eventi/stats?year=2026",
        "/api/report/eventi.xlsx?year=2026"
    ]
    
    all_passed = True
    
    for endpoint in endpoints:
        print(f"   Testing: {endpoint}")
        response = session.get(f"{BASE_URL}{endpoint}")
        
        if response.status_code == 500:
            print(f"   ❌ 500 Error: {response.text}")
            all_passed = False
        elif response.status_code == 401 or response.status_code == 403:
            print(f"   ❌ Auth issue: {response.status_code}")
            all_passed = False
        elif response.status_code >= 200 and response.status_code < 300:
            print(f"   ✅ OK: {response.status_code}")
        else:
            print(f"   ⚠️  Unexpected: {response.status_code}")
    
    return all_passed

def test_unauthorized_access_still_blocked():
    """Verify auth protection still works"""
    print("\n🔒 Testing unauthorized access still blocked...")
    
    # Test without session
    endpoints = [
        "/api/report/stats",
        "/api/report/azienda.xlsx",
        "/api/report/eventi/stats",
        "/api/report/eventi.xlsx"
    ]
    
    all_blocked = True
    
    for endpoint in endpoints:
        response = requests.get(f"{BASE_URL}{endpoint}")
        if response.status_code == 401:
            print(f"   ✅ {endpoint}: Properly blocked (401)")
        else:
            print(f"   ❌ {endpoint}: Not blocked ({response.status_code})")
            all_blocked = False
    
    return all_blocked

def main():
    print("🏛️  Villa Paris PDF Eventi - Backend Final Verification")
    print("=" * 60)
    print("Target: Verify no regressions after PDF eventi frontend addition")
    print("=" * 60)
    
    # Login
    session = login_and_get_session()
    if not session:
        print("❌ Cannot proceed without authentication")
        return 1
    
    results = []
    
    # Target 1: No regression on operational reports
    print("\n🎯 TARGET 1: No regression on operational reports")
    stats_ok = test_report_stats_no_regression(session)
    xlsx_ok = test_azienda_xlsx_no_regression(session)
    results.append(("GET /api/report/stats", stats_ok))
    results.append(("GET /api/report/azienda.xlsx", xlsx_ok))
    
    # Target 2: No regression on eventi reports  
    print("\n🎯 TARGET 2: No regression on eventi reports")
    eventi_stats_ok = test_eventi_stats_no_regression(session)
    eventi_xlsx_ok = test_eventi_xlsx_no_regression(session)
    results.append(("GET /api/report/eventi/stats", eventi_stats_ok))
    results.append(("GET /api/report/eventi.xlsx", eventi_xlsx_ok))
    
    # Target 3: No 500/auth issues
    print("\n🎯 TARGET 3: No 500/auth issues")
    no_errors_ok = test_no_500_auth_issues(session)
    auth_ok = test_unauthorized_access_still_blocked()
    results.append(("No 500/auth issues", no_errors_ok))
    results.append(("Auth protection working", auth_ok))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 PDF EVENTI BACKEND VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TARGETS VERIFIED - No backend regressions detected")
        print("✅ PDF eventi frontend addition did not break backend APIs")
    else:
        print("⚠️  REGRESSIONS DETECTED - Backend needs attention")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())