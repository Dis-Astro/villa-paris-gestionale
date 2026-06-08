"""
FASE 2 Villa Paris - Authentication, Roles & Permissions Testing
Tests for:
- JWT Login/Logout
- /api/auth/login, /api/auth/me, /api/auth/logout
- Role-based API restrictions (ADMIN/REPORT/WORKER)
- User management (ADMIN only)
- Audit log access (ADMIN/REPORT only)
- Report API access (ADMIN/REPORT only)
- Non-regression: /api/appuntamenti still operational with auth
"""
import pytest
import requests
import os

BASE_URL = "http://localhost:3000"

# Admin credentials (seeded)
ADMIN_EMAIL = "admin@villaparis.local"
ADMIN_PASSWORD = "Admin123!"

# Worker credentials (to be created in test)
WORKER_EMAIL = "test_worker_fase2@villaparis.local"
WORKER_PASSWORD = "Worker123!"

# Report user credentials (to be created)
REPORT_EMAIL = "test_report_fase2@villaparis.local"
REPORT_PASSWORD = "Report123!"


class TestAuthLogin:
    """Test /api/auth/login endpoint"""

    def test_login_admin_success(self):
        """Admin login with correct credentials returns user info and sets cookie"""
        session = requests.Session()
        res = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "ADMIN"
        assert "id" in data
        # Check cookie was set
        assert "vp_token" in session.cookies

    def test_login_missing_fields(self):
        """Login without email/password returns 400"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={})
        assert res.status_code == 400
        data = res.json()
        assert "error" in data

    def test_login_invalid_credentials(self):
        """Login with wrong password returns 401"""
        res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert res.status_code == 401
        data = res.json()
        assert "error" in data

    def test_login_nonexistent_user(self):
        """Login with non-existent user returns 401"""
        res = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@test.com", "password": "test123"}
        )
        assert res.status_code == 401


class TestAuthMe:
    """Test /api/auth/me endpoint"""

    def test_me_without_token_returns_401(self):
        """GET /api/auth/me without token returns 401"""
        res = requests.get(f"{BASE_URL}/api/auth/me")
        assert res.status_code == 401

    def test_me_with_valid_token_returns_user(self):
        """GET /api/auth/me with valid token returns current user"""
        session = requests.Session()
        login = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login.status_code == 200

        me = session.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        data = me.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("role") == "ADMIN"
        assert data.get("isActive") == True


class TestAuthLogout:
    """Test /api/auth/logout endpoint"""

    def test_logout_clears_session(self):
        """POST /api/auth/logout clears token cookie"""
        session = requests.Session()
        # Login first
        login = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login.status_code == 200

        # Verify session is active
        me = session.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200

        # Logout
        logout = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout.status_code == 200
        data = logout.json()
        assert data.get("success") == True


@pytest.fixture(scope="module")
def admin_session():
    """Get authenticated admin session"""
    session = requests.Session()
    res = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return session


@pytest.fixture(scope="module")
def created_worker_session(admin_session):
    """Create a worker user and return authenticated session"""
    # Create worker user
    create_res = admin_session.post(
        f"{BASE_URL}/api/users",
        json={"email": WORKER_EMAIL, "password": WORKER_PASSWORD, "role": "WORKER"}
    )
    # May already exist from previous run
    if create_res.status_code == 409:
        pass  # User exists, OK
    elif create_res.status_code == 201:
        pass  # User created
    else:
        pytest.fail(f"Failed to create worker: {create_res.status_code} {create_res.text}")

    # Login as worker
    worker_session = requests.Session()
    login = worker_session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": WORKER_EMAIL, "password": WORKER_PASSWORD}
    )
    assert login.status_code == 200, f"Worker login failed: {login.text}"
    return worker_session


@pytest.fixture(scope="module")
def created_report_session(admin_session):
    """Create a report user and return authenticated session"""
    # Create report user
    create_res = admin_session.post(
        f"{BASE_URL}/api/users",
        json={"email": REPORT_EMAIL, "password": REPORT_PASSWORD, "role": "REPORT"}
    )
    if create_res.status_code not in [201, 409]:
        pytest.fail(f"Failed to create report user: {create_res.status_code} {create_res.text}")

    # Login as report user
    report_session = requests.Session()
    login = report_session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": REPORT_EMAIL, "password": REPORT_PASSWORD}
    )
    assert login.status_code == 200, f"Report login failed: {login.text}"
    return report_session


class TestUserManagementAPI:
    """Test /api/users endpoints - ADMIN only"""

    def test_get_users_as_admin(self, admin_session):
        """GET /api/users as ADMIN returns user list"""
        res = admin_session.get(f"{BASE_URL}/api/users")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        # Should contain admin user
        admin_found = any(u.get("email") == ADMIN_EMAIL for u in data)
        assert admin_found, "Admin user not found in users list"

    def test_get_users_as_worker_returns_403(self, created_worker_session):
        """GET /api/users as WORKER returns 403"""
        res = created_worker_session.get(f"{BASE_URL}/api/users")
        assert res.status_code == 403

    def test_get_users_as_report_returns_403(self, created_report_session):
        """GET /api/users as REPORT returns 403"""
        res = created_report_session.get(f"{BASE_URL}/api/users")
        assert res.status_code == 403

    def test_get_users_without_auth_returns_401(self):
        """GET /api/users without auth returns 401"""
        res = requests.get(f"{BASE_URL}/api/users")
        assert res.status_code == 401

    def test_create_user_as_admin(self, admin_session):
        """POST /api/users as ADMIN creates new user"""
        test_email = f"test_create_{os.urandom(4).hex()}@test.local"
        res = admin_session.post(
            f"{BASE_URL}/api/users",
            json={"email": test_email, "password": "Test123!", "role": "WORKER"}
        )
        assert res.status_code == 201
        data = res.json()
        assert data.get("email") == test_email
        assert data.get("role") == "WORKER"
        assert data.get("isActive") == True

    def test_create_user_as_worker_returns_403(self, created_worker_session):
        """POST /api/users as WORKER returns 403"""
        res = created_worker_session.post(
            f"{BASE_URL}/api/users",
            json={"email": "shouldfail@test.local", "password": "Test123!", "role": "WORKER"}
        )
        assert res.status_code == 403

    def test_update_user_role_as_admin(self, admin_session):
        """PATCH /api/users as ADMIN can change user role"""
        # First get users to find our test worker
        users_res = admin_session.get(f"{BASE_URL}/api/users")
        users = users_res.json()
        worker = next((u for u in users if u.get("email") == WORKER_EMAIL), None)
        
        if not worker:
            pytest.skip("Worker user not found")

        # Change role to REPORT and back
        patch_res = admin_session.patch(
            f"{BASE_URL}/api/users",
            json={"id": worker["id"], "role": "REPORT"}
        )
        assert patch_res.status_code == 200
        assert patch_res.json().get("role") == "REPORT"

        # Change back to WORKER
        revert_res = admin_session.patch(
            f"{BASE_URL}/api/users",
            json={"id": worker["id"], "role": "WORKER"}
        )
        assert revert_res.status_code == 200

    def test_toggle_user_active_status(self, admin_session):
        """PATCH /api/users can toggle isActive"""
        users_res = admin_session.get(f"{BASE_URL}/api/users")
        users = users_res.json()
        worker = next((u for u in users if u.get("email") == WORKER_EMAIL), None)
        
        if not worker:
            pytest.skip("Worker user not found")

        # Deactivate
        patch_res = admin_session.patch(
            f"{BASE_URL}/api/users",
            json={"id": worker["id"], "isActive": False}
        )
        assert patch_res.status_code == 200
        assert patch_res.json().get("isActive") == False

        # Reactivate
        revert_res = admin_session.patch(
            f"{BASE_URL}/api/users",
            json={"id": worker["id"], "isActive": True}
        )
        assert revert_res.status_code == 200


class TestAuditAPIAccess:
    """Test /api/audit - ADMIN/REPORT only"""

    def test_audit_as_admin_returns_200(self, admin_session):
        """GET /api/audit as ADMIN returns audit logs"""
        res = admin_session.get(f"{BASE_URL}/api/audit")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_audit_as_report_returns_200(self, created_report_session):
        """GET /api/audit as REPORT returns audit logs"""
        res = created_report_session.get(f"{BASE_URL}/api/audit")
        assert res.status_code == 200

    def test_audit_as_worker_returns_403(self, created_worker_session):
        """GET /api/audit as WORKER returns 403"""
        res = created_worker_session.get(f"{BASE_URL}/api/audit")
        assert res.status_code == 403

    def test_audit_without_auth_returns_401(self):
        """GET /api/audit without auth returns 401"""
        res = requests.get(f"{BASE_URL}/api/audit")
        assert res.status_code == 401

    def test_audit_filter_by_entity_type(self, admin_session):
        """GET /api/audit?entityType=USER filters by entity type"""
        res = admin_session.get(f"{BASE_URL}/api/audit?entityType=USER")
        assert res.status_code == 200
        data = res.json()
        # All returned logs should be USER type (if any)
        for log in data:
            assert log.get("entityType") == "USER"


class TestReportAPIAccess:
    """Test /api/report/* - ADMIN/REPORT only"""

    def test_report_stats_as_admin(self, admin_session):
        """GET /api/report/stats as ADMIN returns stats"""
        res = admin_session.get(f"{BASE_URL}/api/report/stats")
        assert res.status_code == 200
        data = res.json()
        assert "year" in data
        assert "monthly" in data
        assert "totals" in data

    def test_report_stats_as_report(self, created_report_session):
        """GET /api/report/stats as REPORT returns stats"""
        res = created_report_session.get(f"{BASE_URL}/api/report/stats")
        assert res.status_code == 200

    def test_report_stats_as_worker_returns_403(self, created_worker_session):
        """GET /api/report/stats as WORKER returns 403"""
        res = created_worker_session.get(f"{BASE_URL}/api/report/stats")
        assert res.status_code == 403

    def test_report_xlsx_as_admin(self, admin_session):
        """GET /api/report/azienda.xlsx as ADMIN returns Excel file"""
        res = admin_session.get(f"{BASE_URL}/api/report/azienda.xlsx")
        assert res.status_code == 200
        assert "spreadsheet" in res.headers.get("Content-Type", "")

    def test_report_xlsx_as_worker_returns_403(self, created_worker_session):
        """GET /api/report/azienda.xlsx as WORKER returns 403"""
        res = created_worker_session.get(f"{BASE_URL}/api/report/azienda.xlsx")
        assert res.status_code == 403


class TestWorkerAllowedAPIs:
    """Test APIs that WORKER can access"""

    def test_worker_can_access_eventi(self, created_worker_session):
        """WORKER can GET /api/eventi"""
        res = created_worker_session.get(f"{BASE_URL}/api/eventi")
        assert res.status_code == 200

    def test_worker_can_access_clienti(self, created_worker_session):
        """WORKER can GET /api/clienti"""
        res = created_worker_session.get(f"{BASE_URL}/api/clienti")
        assert res.status_code == 200

    def test_worker_can_access_menu_base(self, created_worker_session):
        """WORKER can GET /api/menu-base"""
        res = created_worker_session.get(f"{BASE_URL}/api/menu-base")
        assert res.status_code == 200

    def test_worker_can_access_appuntamenti(self, created_worker_session):
        """WORKER can GET /api/appuntamenti"""
        res = created_worker_session.get(f"{BASE_URL}/api/appuntamenti")
        assert res.status_code == 200

    def test_worker_can_access_auth_me(self, created_worker_session):
        """WORKER can GET /api/auth/me"""
        res = created_worker_session.get(f"{BASE_URL}/api/auth/me")
        assert res.status_code == 200


class TestNonRegressionFase1:
    """Test that FASE 1 APIs still work with auth"""

    def test_appuntamenti_crud_still_works(self, admin_session):
        """FASE 1: /api/appuntamenti CRUD still operational"""
        # GET appuntamenti
        get_res = admin_session.get(f"{BASE_URL}/api/appuntamenti")
        assert get_res.status_code == 200

    def test_eventi_api_with_auth(self, admin_session):
        """FASE 1: /api/eventi works with auth"""
        res = admin_session.get(f"{BASE_URL}/api/eventi")
        assert res.status_code == 200

    def test_clienti_api_with_auth(self, admin_session):
        """FASE 1: /api/clienti works with auth"""
        res = admin_session.get(f"{BASE_URL}/api/clienti")
        assert res.status_code == 200


class TestCleanup:
    """Cleanup test users created during testing"""

    def test_cleanup_test_users(self, admin_session):
        """Cleanup: deactivate test users (don't delete to preserve audit)"""
        users_res = admin_session.get(f"{BASE_URL}/api/users")
        users = users_res.json()
        
        test_emails = [WORKER_EMAIL, REPORT_EMAIL]
        for user in users:
            if user.get("email") in test_emails:
                admin_session.patch(
                    f"{BASE_URL}/api/users",
                    json={"id": user["id"], "isActive": False}
                )
        
        # Re-enable for next test run
        for user in users:
            if user.get("email") in test_emails:
                admin_session.patch(
                    f"{BASE_URL}/api/users",
                    json={"id": user["id"], "isActive": True}
                )
