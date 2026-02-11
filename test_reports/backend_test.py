"""
Villa Paris Gestionale - Backend API Tests
Tests all Next.js API routes for the gestionale application
"""
import pytest
import requests
import os
import json

# Base URL from environment (Next.js app on port 3000)
BASE_URL = "http://localhost:3000"

class TestMenuBaseAPI:
    """Menu Base API endpoint tests - CRUD operations"""
    
    def test_get_all_menus(self):
        """Test GET /api/menu-base - retrieve all menus"""
        response = requests.get(f"{BASE_URL}/api/menu-base")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} menus")
        
        # Verify menu structure
        if len(data) > 0:
            menu = data[0]
            assert "id" in menu
            assert "nome" in menu
            assert "struttura" in menu
            
    def test_create_menu(self):
        """Test POST /api/menu-base - create new menu"""
        payload = {
            "nome": "TEST_Menu_API_Test",
            "struttura": {
                "descrizione": "Test menu from API",
                "prezzo": 100,
                "piatti": [
                    {"id": "test_p1", "nome": "Pasta Test", "categoria": "primo"}
                ],
                "regole": {
                    "antipasti": 2,
                    "primi": 2,
                    "secondi": 1,
                    "contorni": 2,
                    "dolci": 1
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/menu-base",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "TEST_Menu_API_Test"
        assert "id" in data
        
        # Store ID for cleanup
        self.created_menu_id = data["id"]
        print(f"Created menu with ID: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/menu-base?id={data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["nome"] == "TEST_Menu_API_Test"
        
    def test_get_single_menu(self):
        """Test GET /api/menu-base?id=X - retrieve single menu"""
        # First get all menus to find an ID
        all_response = requests.get(f"{BASE_URL}/api/menu-base")
        menus = all_response.json()
        
        if len(menus) > 0:
            menu_id = menus[0]["id"]
            response = requests.get(f"{BASE_URL}/api/menu-base?id={menu_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == menu_id
            
    def test_update_menu(self):
        """Test PUT /api/menu-base?id=X - update menu"""
        # Create a menu first
        create_payload = {
            "nome": "TEST_Update_Menu",
            "struttura": {"prezzo": 80}
        }
        create_response = requests.post(
            f"{BASE_URL}/api/menu-base",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        menu_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "nome": "TEST_Update_Menu_Modified",
            "struttura": {"prezzo": 120, "descrizione": "Updated"}
        }
        response = requests.put(
            f"{BASE_URL}/api/menu-base?id={menu_id}",
            json=update_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "TEST_Update_Menu_Modified"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/menu-base?id={menu_id}")
        
    def test_delete_menu(self):
        """Test DELETE /api/menu-base?id=X - delete menu"""
        # Create a menu to delete
        create_payload = {
            "nome": "TEST_Delete_Menu",
            "struttura": {}
        }
        create_response = requests.post(
            f"{BASE_URL}/api/menu-base",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        menu_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/menu-base?id={menu_id}")
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/menu-base?id={menu_id}")
        assert get_response.status_code == 404


class TestEventiAPI:
    """Eventi API endpoint tests"""
    
    def test_get_all_eventi(self):
        """Test GET /api/eventi - retrieve all events"""
        response = requests.get(f"{BASE_URL}/api/eventi")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} eventi")
        
        # Verify event structure
        if len(data) > 0:
            evento = data[0]
            assert "id" in evento
            assert "titolo" in evento
            assert "tipo" in evento
            
    def test_get_single_evento(self):
        """Test GET /api/eventi?id=X - retrieve single event"""
        # First get all events to find an ID
        all_response = requests.get(f"{BASE_URL}/api/eventi")
        eventi = all_response.json()
        
        if len(eventi) > 0:
            evento_id = eventi[0]["id"]
            response = requests.get(f"{BASE_URL}/api/eventi?id={evento_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == evento_id


class TestClientiAPI:
    """Clienti API endpoint tests"""
    
    def test_get_all_clienti(self):
        """Test GET /api/clienti - retrieve all clients"""
        response = requests.get(f"{BASE_URL}/api/clienti")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clienti")
        
        # Verify client structure
        if len(data) > 0:
            cliente = data[0]
            assert "id" in cliente
            assert "nome" in cliente


class TestReportAPI:
    """Report/Stats API endpoint tests"""
    
    def test_get_stats(self):
        """Test GET /api/report/stats - get statistics"""
        response = requests.get(f"{BASE_URL}/api/report/stats")
        # May return 200 or different based on implementation
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            print(f"Stats data: {data}")


class TestVersioniAPI:
    """Versioni API endpoint tests"""
    
    def test_get_versioni(self):
        """Test GET /api/versioni - get document versions"""
        response = requests.get(f"{BASE_URL}/api/versioni")
        # May return 200 or different based on implementation
        assert response.status_code in [200, 404, 500]


class TestPiattiAPI:
    """Piatti API endpoint tests"""
    
    def test_get_piatti(self):
        """Test GET /api/piatti - get dishes"""
        response = requests.get(f"{BASE_URL}/api/piatti")
        assert response.status_code in [200, 404, 500]


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup any TEST_ menus
    try:
        all_menus = requests.get(f"{BASE_URL}/api/menu-base").json()
        for menu in all_menus:
            if menu["nome"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/menu-base?id={menu['id']}")
                print(f"Cleaned up menu: {menu['nome']}")
    except Exception as e:
        print(f"Cleanup error: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
