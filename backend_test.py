#!/usr/bin/env python3
"""
Villa Paris FASE 3 - Backend Final Verification
Test the 7 key points mentioned in the review request
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

def test_login_functionality():
    """Test 1: POST /api/auth/login returns 200 and valid session"""
    print("🔐 Testing login functionality...")
    
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json=CREDENTIALS
    )
    
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✅ Login successful")
        # Check if we got any cookies/session data
        if session.cookies:
            print(f"   ✅ Session cookies received: {len(session.cookies)} cookies")
        return session
    else:
        print(f"   ❌ Login failed: {response.text}")
        return None

def test_auth_me(session):
    """Test 2: GET /api/auth/me with session returns correct user"""
    print("\n👤 Testing auth/me endpoint...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    response = session.get(f"{BASE_URL}/api/auth/me")
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ User data received: {data.get('email', 'N/A')}")
        print(f"   ✅ User role: {data.get('role', 'N/A')}")
        return True
    else:
        print(f"   ❌ Auth/me failed: {response.text}")
        return False

def test_report_stats_periods(session):
    """Test 3: GET /api/report/stats for different periods"""
    print("\n📊 Testing report/stats for different periods...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
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

def test_spam_policy_logic(session):
    """Test 4: Verify spam policy logic"""
    print("\n🚫 Testing spam policy logic...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    results = {"week_includes": False, "month_excludes": False, "year_excludes": False}
    
    # Test week (should include spam in main view)
    print("   Testing week + spamMode=policy (should include spam)...")
    response = session.get(
        f"{BASE_URL}/api/report/stats",
        params={"period": "week", "spamMode": "policy"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["meta"]["effectiveSpamMode"] == "include":
            print("   ✅ Week period includes spam in main view")
            results["week_includes"] = True
        else:
            print(f"   ❌ Week period spam mode: {data['meta']['effectiveSpamMode']} (expected: include)")
    
    # Test month (should exclude spam from main counts)
    print("   Testing month + spamMode=policy (should exclude spam)...")
    response = session.get(
        f"{BASE_URL}/api/report/stats",
        params={"period": "month", "spamMode": "policy"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["meta"]["effectiveSpamMode"] == "exclude":
            print("   ✅ Month period excludes spam from main counts")
            results["month_excludes"] = True
        else:
            print(f"   ❌ Month period spam mode: {data['meta']['effectiveSpamMode']} (expected: exclude)")
    
    # Test year (should exclude spam from main counts)
    print("   Testing year + spamMode=policy (should exclude spam)...")
    response = session.get(
        f"{BASE_URL}/api/report/stats",
        params={"period": "year", "spamMode": "policy"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data["meta"]["effectiveSpamMode"] == "exclude":
            print("   ✅ Year period excludes spam from main counts")
            results["year_excludes"] = True
        else:
            print(f"   ❌ Year period spam mode: {data['meta']['effectiveSpamMode']} (expected: exclude)")
    
    return all(results.values())

def test_excel_export(session):
    """Test 5: GET /api/report/azienda.xlsx returns valid xlsx file"""
    print("\n📁 Testing Excel export...")
    
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

def test_unauthorized_access():
    """Test 6: GET /api/report/stats without auth returns 401"""
    print("\n🔒 Testing unauthorized access...")
    
    # Test report/stats without auth
    response = requests.get(f"{BASE_URL}/api/report/stats")
    print(f"   report/stats status: {response.status_code}")
    
    stats_protected = response.status_code == 401
    if stats_protected:
        print("   ✅ report/stats properly protected (401)")
    else:
        print(f"   ❌ report/stats not protected, returned: {response.status_code}")
    
    return stats_protected

def test_no_500_errors(session):
    """Test 7: No 500 errors on FASE 3 APIs"""
    print("\n🚨 Testing for 500 errors on key FASE 3 endpoints...")
    
    if not session:
        print("   ❌ No session available, skipping")
        return False
        
    endpoints = [
        "/api/auth/me",
        "/api/report/stats?period=week&spamMode=policy",
        "/api/report/stats?period=month&spamMode=policy", 
        "/api/report/stats?period=year&spamMode=policy",
        "/api/eventi"
    ]
    
    has_500_error = False
    
    for endpoint in endpoints:
        print(f"   Testing: {endpoint}")
        response = session.get(f"{BASE_URL}{endpoint}")
        
        if response.status_code == 500:
            print(f"   ❌ 500 Error on {endpoint}: {response.text}")
            has_500_error = True
        elif response.status_code >= 400:
            print(f"   ⚠️  {response.status_code} on {endpoint}")
        else:
            print(f"   ✅ {response.status_code} on {endpoint}")
    
    if not has_500_error:
        print("   ✅ No 500 errors found on FASE 3 APIs")
    
    return not has_500_error

def main():
    print("🏛️  Villa Paris FASE 3 Backend Verification")
    print("=" * 50)
    
    results = []
    
    # Test 1: Login
    session = test_login_functionality()
    results.append(("Login functionality", session is not None))
    
    # Test 2: Auth/me
    auth_me_result = test_auth_me(session)
    results.append(("Auth/me endpoint", auth_me_result))
    
    # Test 3: Report stats periods
    report_stats_result = test_report_stats_periods(session)
    results.append(("Report stats periods", report_stats_result))
    
    # Test 4: Spam policy logic
    spam_policy_result = test_spam_policy_logic(session)
    results.append(("Spam policy logic", spam_policy_result))
    
    # Test 5: Excel export
    excel_result = test_excel_export(session)
    results.append(("Excel export", excel_result))
    
    # Test 6: Unauthorized access
    unauth_result = test_unauthorized_access()
    results.append(("Unauthorized access protection", unauth_result))
    
    # Test 7: No 500 errors
    no_500_result = test_no_500_errors(session)
    results.append(("No 500 errors", no_500_result))
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 FINAL VERIFICATION SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL TESTS PASSED - Backend FASE 3 is STABLE")
    else:
        print("⚠️  Some tests failed - Backend needs attention")
    print("=" * 50)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())