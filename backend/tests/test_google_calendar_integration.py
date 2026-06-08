"""
Google Calendar Integration Tests - Villa Paris
Tests for:
- OAuth login URL generation
- Sync status endpoint (connected=false when not connected)
- Role-based access (ADMIN only)
- Error handling when GCal not connected
- Validate-change endpoint validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGoogleCalendarAuth:
    """Test authentication and role-based access for Google Calendar APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin credentials"""
        self.session = requests.Session()
        self.admin_token = None
        self.worker_token = None
        
        # Login as admin
        admin_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        if admin_res.status_code == 200:
            # Extract token from Set-Cookie header
            cookies = admin_res.cookies
            self.admin_token = cookies.get('vp_token')
        
        # Login as worker in separate session
        worker_session = requests.Session()
        worker_res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        if worker_res.status_code == 200:
            self.worker_token = worker_res.cookies.get('vp_token')
        
        yield
    
    def test_admin_login_success(self):
        """Verify admin can login successfully"""
        assert self.admin_token is not None, "Admin login should succeed and return token"
        print(f"Admin token obtained: {self.admin_token[:20]}...")
    
    def test_worker_login_success(self):
        """Verify worker can login successfully"""
        assert self.worker_token is not None, "Worker login should succeed and return token"
        print(f"Worker token obtained: {self.worker_token[:20]}...")


class TestGoogleCalendarSyncStatus:
    """Test GET /api/google-calendar/sync - Status endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        # Login as admin
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_sync_status_returns_connected_false(self):
        """GET /api/google-calendar/sync returns connected=false when not connected"""
        res = self.session.get(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        data = res.json()
        assert "connected" in data, "Response should contain 'connected' field"
        assert data["connected"] == False, "connected should be false when GCal not connected"
        assert "pendingChanges" in data, "Response should contain 'pendingChanges' field"
        print(f"Sync status response: connected={data['connected']}, pendingChanges={len(data.get('pendingChanges', []))}")
    
    def test_sync_status_admin_only(self):
        """GET /api/google-calendar/sync should be ADMIN only"""
        # Test with worker token
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.get(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to sync status endpoint")


class TestGoogleCalendarOAuthLogin:
    """Test GET /api/oauth/google-calendar/login - OAuth URL generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_oauth_login_returns_google_url(self):
        """GET /api/oauth/google-calendar/login returns Google OAuth URL"""
        res = self.session.get(f"{BASE_URL}/api/oauth/google-calendar/login")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        data = res.json()
        assert "url" in data, "Response should contain 'url' field"
        assert "accounts.google.com" in data["url"], "URL should point to Google accounts"
        assert "oauth2" in data["url"].lower() or "auth" in data["url"].lower(), "URL should be OAuth URL"
        print(f"OAuth URL generated: {data['url'][:80]}...")
    
    def test_oauth_login_admin_only(self):
        """GET /api/oauth/google-calendar/login should be ADMIN only"""
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.get(f"{BASE_URL}/api/oauth/google-calendar/login")
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to OAuth login endpoint")


class TestGoogleCalendarSyncPost:
    """Test POST /api/google-calendar/sync - Full sync endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_sync_post_returns_error_when_not_connected(self):
        """POST /api/google-calendar/sync returns error when GCal not connected"""
        res = self.session.post(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"
        
        data = res.json()
        assert "error" in data, "Response should contain 'error' field"
        assert "non connesso" in data["error"].lower() or "not connected" in data["error"].lower(), \
            f"Error should mention not connected, got: {data['error']}"
        print(f"Sync POST error (expected): {data['error']}")
    
    def test_sync_post_admin_only(self):
        """POST /api/google-calendar/sync should be ADMIN only"""
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.post(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to sync POST endpoint")


class TestGoogleCalendarCheckChanges:
    """Test POST /api/google-calendar/check-changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_check_changes_returns_error_when_not_connected(self):
        """POST /api/google-calendar/check-changes returns error when GCal not connected"""
        res = self.session.post(f"{BASE_URL}/api/google-calendar/check-changes")
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"
        
        data = res.json()
        assert "error" in data, "Response should contain 'error' field"
        assert "non connesso" in data["error"].lower() or "not connected" in data["error"].lower(), \
            f"Error should mention not connected, got: {data['error']}"
        print(f"Check changes error (expected): {data['error']}")
    
    def test_check_changes_admin_only(self):
        """POST /api/google-calendar/check-changes should be ADMIN only"""
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.post(f"{BASE_URL}/api/google-calendar/check-changes")
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to check-changes endpoint")


class TestGoogleCalendarValidateChange:
    """Test POST /api/google-calendar/validate-change"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_validate_change_returns_400_for_invalid_params(self):
        """POST /api/google-calendar/validate-change returns 400 for invalid params"""
        # Test with missing changeId
        res = self.session.post(
            f"{BASE_URL}/api/google-calendar/validate-change",
            json={"azione": "accetta"}
        )
        assert res.status_code == 400, f"Expected 400 for missing changeId, got {res.status_code}"
        
        # Test with invalid azione
        res = self.session.post(
            f"{BASE_URL}/api/google-calendar/validate-change",
            json={"changeId": 1, "azione": "invalid_action"}
        )
        assert res.status_code == 400, f"Expected 400 for invalid azione, got {res.status_code}"
        
        data = res.json()
        assert "error" in data, "Response should contain 'error' field"
        print(f"Validate change error (expected): {data['error']}")
    
    def test_validate_change_returns_404_for_nonexistent_change(self):
        """POST /api/google-calendar/validate-change returns 404 for nonexistent change"""
        res = self.session.post(
            f"{BASE_URL}/api/google-calendar/validate-change",
            json={"changeId": 999999, "azione": "accetta"}
        )
        assert res.status_code == 404, f"Expected 404 for nonexistent change, got {res.status_code}"
        print("Validate change correctly returns 404 for nonexistent change")
    
    def test_validate_change_admin_only(self):
        """POST /api/google-calendar/validate-change should be ADMIN only"""
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.post(
            f"{BASE_URL}/api/google-calendar/validate-change",
            json={"changeId": 1, "azione": "accetta"}
        )
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to validate-change endpoint")


class TestGoogleCalendarDisconnect:
    """Test DELETE /api/google-calendar/sync - Disconnect endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@villaparis.local",
            "password": "Admin123!"
        })
        assert res.status_code == 200, "Admin login failed"
        yield
    
    def test_disconnect_succeeds_even_when_not_connected(self):
        """DELETE /api/google-calendar/sync succeeds even when not connected"""
        res = self.session.delete(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        data = res.json()
        assert data.get("success") == True, "Response should indicate success"
        print("Disconnect endpoint works correctly")
    
    def test_disconnect_admin_only(self):
        """DELETE /api/google-calendar/sync should be ADMIN only"""
        worker_session = requests.Session()
        res = worker_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "worker.check@villaparis.local",
            "password": "Worker123!"
        })
        assert res.status_code == 200, "Worker login failed"
        
        res = worker_session.delete(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 403, f"Worker should get 403, got {res.status_code}"
        print("Worker correctly denied access to disconnect endpoint")


class TestOAuthCallbackBypassesAuth:
    """Test that OAuth callback route bypasses middleware auth"""
    
    def test_oauth_callback_accessible_without_auth(self):
        """OAuth callback should be accessible without authentication (for Google redirect)"""
        # This should not return 401 (unauthenticated) - it should redirect or handle the request
        session = requests.Session()
        res = session.get(
            f"{BASE_URL}/api/oauth/google-calendar/callback",
            allow_redirects=False
        )
        # Should redirect to /impostazioni with error (no code provided), not 401
        assert res.status_code != 401, f"OAuth callback should not require auth, got {res.status_code}"
        # Should be a redirect (302/307) to impostazioni with error
        assert res.status_code in [302, 307, 308], f"Expected redirect, got {res.status_code}"
        
        location = res.headers.get('Location', '')
        assert 'impostazioni' in location, f"Should redirect to impostazioni, got: {location}"
        assert 'gcal=error' in location, f"Should have gcal=error param, got: {location}"
        print(f"OAuth callback correctly bypasses auth and redirects to: {location}")


class TestReportRoleAccess:
    """Test that REPORT role cannot access Google Calendar APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "report.temp@villaparis.local",
            "password": "Report123!"
        })
        # Report user may or may not exist
        self.report_logged_in = res.status_code == 200
        yield
    
    def test_report_cannot_access_sync_status(self):
        """REPORT role should not access /api/google-calendar/sync"""
        if not self.report_logged_in:
            pytest.skip("Report user not available")
        
        res = self.session.get(f"{BASE_URL}/api/google-calendar/sync")
        assert res.status_code == 403, f"Report should get 403, got {res.status_code}"
        print("Report role correctly denied access to sync status")
    
    def test_report_cannot_access_oauth_login(self):
        """REPORT role should not access /api/oauth/google-calendar/login"""
        if not self.report_logged_in:
            pytest.skip("Report user not available")
        
        res = self.session.get(f"{BASE_URL}/api/oauth/google-calendar/login")
        assert res.status_code == 403, f"Report should get 403, got {res.status_code}"
        print("Report role correctly denied access to OAuth login")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
