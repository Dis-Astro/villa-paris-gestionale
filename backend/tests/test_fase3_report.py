"""
FASE 3 - Report and Dashboard API Tests
Tests for:
- /api/report/stats with period=week/month/year
- /api/report/azienda.xlsx Excel export
- Spam policy verification (week=include, month/year=exclude)
- Filters: operatorId, source, status, spamMode
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://127.0.0.1:3000')

@pytest.fixture(scope="module")
def auth_session():
    """Login and get authenticated session"""
    session = requests.Session()
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@villaparis.local", "password": "Admin123!"}
    )
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    return session


class TestReportStatsAPI:
    """Tests for /api/report/stats endpoint"""
    
    def test_report_stats_week_period(self, auth_session):
        """Test report stats with week period - spam should be included"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "week", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify meta fields
        assert data["meta"]["period"] == "week"
        assert "Settimana" in data["meta"]["periodLabel"]
        assert data["meta"]["effectiveSpamMode"] == "include"
        assert "visibili" in data["meta"]["spamPolicyLabel"] and "rosso" in data["meta"]["spamPolicyLabel"]
        
        # Verify summary structure
        summary = data["summary"]
        assert "contactsPrimary" in summary
        assert "appointmentsScheduled" in summary
        assert "interactionsCount" in summary
        assert "totalTimeMinutes" in summary
        assert "confirmedEvents" in summary
        
        # Verify trend is daily for week
        assert len(data["trend"]) == 7  # 7 days
        
    def test_report_stats_month_period(self, auth_session):
        """Test report stats with month period - spam should be excluded"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "month", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify spam is excluded for month
        assert data["meta"]["period"] == "month"
        assert data["meta"]["effectiveSpamMode"] == "exclude"
        assert "esclusi" in data["meta"]["spamPolicyLabel"]
        
        # Verify trend is daily for month (28-31 days)
        assert 28 <= len(data["trend"]) <= 31
        
    def test_report_stats_year_period(self, auth_session):
        """Test report stats with year period - spam should be excluded"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "year", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify spam is excluded for year
        assert data["meta"]["period"] == "year"
        assert data["meta"]["effectiveSpamMode"] == "exclude"
        assert "esclusi" in data["meta"]["spamPolicyLabel"]
        
        # Verify trend is monthly for year (12 months)
        assert len(data["trend"]) == 12
        
        # Verify summary has real data for year
        summary = data["summary"]
        assert summary["contactsPrimary"] >= 0
        assert summary["confirmedEvents"] >= 0
        
    def test_report_stats_filter_by_source(self, auth_session):
        """Test report stats filtered by source"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "year", "source": "matrimonio.com", "spamMode": "policy"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify filter is applied
        assert data["appliedFilters"]["source"] == "matrimonio.com"
        
        # All returned clients should have matrimonio.com source
        for client in data["clients"]:
            assert client["source"] == "matrimonio.com"
            
    def test_report_stats_filter_by_operator(self, auth_session):
        """Test report stats filtered by operator"""
        # First get available operators
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "month", "spamMode": "policy"}
        )
        data = response.json()
        
        if data["availableFilters"]["operators"]:
            operator_id = data["availableFilters"]["operators"][0]["value"]
            
            # Filter by operator
            filtered_response = auth_session.get(
                f"{BASE_URL}/api/report/stats",
                params={"period": "month", "operatorId": operator_id, "spamMode": "policy"}
            )
            assert filtered_response.status_code == 200
            filtered_data = filtered_response.json()
            assert filtered_data["appliedFilters"]["operatorId"] == operator_id
            
    def test_report_stats_available_filters(self, auth_session):
        """Test that available filters are properly returned"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "month", "spamMode": "policy"}
        )
        assert response.status_code == 200
        data = response.json()
        
        filters = data["availableFilters"]
        assert "operators" in filters
        assert "sources" in filters
        assert "statuses" in filters
        assert "spamModes" in filters
        
        # Verify status options contain expected values
        status_values = [s["value"] for s in filters["statuses"]]
        assert "" in status_values  # "Tutti" option
        assert "svolto" in status_values or "confermato" in status_values


class TestReportExcelAPI:
    """Tests for /api/report/azienda.xlsx Excel export endpoint"""
    
    def test_excel_export_returns_valid_file(self, auth_session):
        """Test Excel export returns a valid xlsx file"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/azienda.xlsx",
            params={"period": "month", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        
        # Verify content type
        assert "spreadsheetml" in response.headers.get("Content-Type", "")
        
        # Verify content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert ".xlsx" in content_disposition
        
        # Verify file is not empty
        assert len(response.content) > 1000  # Reasonable minimum size
        
        # Verify Excel file magic bytes (PK zip format)
        assert response.content[:4] == b'PK\x03\x04'
        
    def test_excel_export_week_period(self, auth_session):
        """Test Excel export for week period"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/azienda.xlsx",
            params={"period": "week", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        assert len(response.content) > 500
        
    def test_excel_export_year_period(self, auth_session):
        """Test Excel export for year period"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/azienda.xlsx",
            params={"period": "year", "referenceDate": "2026-03-20", "spamMode": "policy"}
        )
        assert response.status_code == 200
        assert len(response.content) > 500


class TestDashboardIntegration:
    """Tests for dashboard API usage"""
    
    def test_dashboard_events_api(self, auth_session):
        """Test that events API works for dashboard"""
        response = auth_session.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_dashboard_auth_me_api(self, auth_session):
        """Test that auth/me API works for dashboard user info"""
        response = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "role" in data


class TestSpamPolicyConsistency:
    """Test spam policy is correctly applied across different periods"""
    
    def test_week_includes_spam_in_primary_count(self, auth_session):
        """Week period should include spam in contactsPrimary"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "week", "spamMode": "policy"}
        )
        data = response.json()
        
        # Week should show total (including spam)
        assert data["summary"]["contactsPrimary"] == data["summary"]["contactsTotal"]
        
    def test_month_excludes_spam_from_primary_count(self, auth_session):
        """Month period should exclude spam from contactsPrimary"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "month", "spamMode": "policy"}
        )
        data = response.json()
        
        # Month should show valid contacts only
        assert data["summary"]["contactsPrimary"] == data["summary"]["contactsValid"]
        
    def test_year_excludes_spam_from_primary_count(self, auth_session):
        """Year period should exclude spam from contactsPrimary"""
        response = auth_session.get(
            f"{BASE_URL}/api/report/stats",
            params={"period": "year", "spamMode": "policy"}
        )
        data = response.json()
        
        # Year should show valid contacts only
        assert data["summary"]["contactsPrimary"] == data["summary"]["contactsValid"]


class TestUnauthorizedAccess:
    """Test that report APIs require authentication"""
    
    def test_report_stats_requires_auth(self):
        """Test that report stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/report/stats")
        assert response.status_code == 401
        
    def test_report_excel_requires_auth(self):
        """Test that Excel export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/report/azienda.xlsx")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
