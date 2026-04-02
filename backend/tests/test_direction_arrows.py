"""
Test direction_arrows field in Checkpoint model
Tests for the new arrow overlay feature on checkpoint images
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDirectionArrows:
    """Test direction_arrows field in checkpoint CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "otp": "admin123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_get_routes(self):
        """Test that routes endpoint works"""
        routes_response = self.session.get(f"{BASE_URL}/api/routes")
        assert routes_response.status_code == 200, f"Failed to get routes: {routes_response.text}"
        routes = routes_response.json()
        assert len(routes) > 0, "No routes found"
        print(f"TEST PASS: Found {len(routes)} routes")
        
    def test_get_checkpoints_for_route(self):
        """Test that checkpoints endpoint works"""
        # Get routes first
        routes_response = self.session.get(f"{BASE_URL}/api/routes")
        assert routes_response.status_code == 200
        routes = routes_response.json()
        
        route_id = routes[0]["id"]
        
        # Get checkpoints for the route
        checkpoints_response = self.session.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        assert checkpoints_response.status_code == 200, f"Failed to get checkpoints: {checkpoints_response.text}"
        
        checkpoints = checkpoints_response.json()
        assert len(checkpoints) > 0, "No checkpoints found"
        print(f"TEST PASS: Found {len(checkpoints)} checkpoints for route {route_id}")
    
    def test_update_checkpoint_with_direction_arrows(self):
        """Test updating a checkpoint with direction_arrows data"""
        # Get routes first
        routes_response = self.session.get(f"{BASE_URL}/api/routes")
        assert routes_response.status_code == 200
        routes = routes_response.json()
        
        route_id = routes[0]["id"]
        
        # Get checkpoints
        checkpoints_response = self.session.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        assert checkpoints_response.status_code == 200
        
        checkpoints = checkpoints_response.json()
        checkpoint_id = checkpoints[0]["id"]
        
        # Test arrow data
        test_arrows = [
            {"x": 50.0, "y": 30.0, "type": "straight", "rotation": 0},
            {"x": 75.0, "y": 60.0, "type": "left", "rotation": 0}
        ]
        
        # Update checkpoint with direction_arrows
        update_response = self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": test_arrows}
        )
        assert update_response.status_code == 200, f"Failed to update checkpoint: {update_response.text}"
        
        updated_checkpoint = update_response.json()
        assert "direction_arrows" in updated_checkpoint, "direction_arrows not in response"
        assert len(updated_checkpoint["direction_arrows"]) == 2
        print(f"TEST PASS: Checkpoint updated with direction_arrows: {updated_checkpoint['direction_arrows']}")
        
        # Verify by fetching again via public endpoint
        get_response = self.session.get(f"{BASE_URL}/api/checkpoints/{checkpoint_id}")
        assert get_response.status_code == 200
        
        fetched_checkpoint = get_response.json()
        assert "direction_arrows" in fetched_checkpoint, "direction_arrows not in fetched checkpoint"
        assert len(fetched_checkpoint["direction_arrows"]) == 2
        assert fetched_checkpoint["direction_arrows"][0]["type"] == "straight"
        assert fetched_checkpoint["direction_arrows"][1]["type"] == "left"
        print("TEST PASS: Direction arrows persisted correctly")
        
        # Clean up - remove arrows
        cleanup_response = self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": []}
        )
        assert cleanup_response.status_code == 200
        print("TEST PASS: Cleanup successful - arrows removed")
    
    def test_direction_arrows_in_route_checkpoints(self):
        """Test that direction_arrows appears in route checkpoints list after update"""
        # Get routes first
        routes_response = self.session.get(f"{BASE_URL}/api/routes")
        assert routes_response.status_code == 200
        routes = routes_response.json()
        
        route_id = routes[0]["id"]
        
        # Get checkpoints
        checkpoints_response = self.session.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        assert checkpoints_response.status_code == 200
        
        checkpoints = checkpoints_response.json()
        checkpoint_id = checkpoints[0]["id"]
        
        # Add arrows
        test_arrows = [{"x": 25.0, "y": 50.0, "type": "right", "rotation": 45}]
        update_response = self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": test_arrows}
        )
        assert update_response.status_code == 200
        
        # Fetch route checkpoints again
        checkpoints_response2 = self.session.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        assert checkpoints_response2.status_code == 200
        
        checkpoints2 = checkpoints_response2.json()
        first_cp = checkpoints2[0]
        
        assert "direction_arrows" in first_cp, "direction_arrows not in route checkpoints list"
        assert len(first_cp["direction_arrows"]) == 1
        assert first_cp["direction_arrows"][0]["type"] == "right"
        print("TEST PASS: direction_arrows appears in route checkpoints list")
        
        # Clean up
        self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": []}
        )


class TestArrowTypes:
    """Test all 6 arrow types can be saved"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "otp": "admin123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_all_arrow_types(self):
        """Test that all 6 arrow types can be saved"""
        # Get a checkpoint
        routes_response = self.session.get(f"{BASE_URL}/api/routes")
        routes = routes_response.json()
        route_id = routes[0]["id"]
        
        checkpoints_response = self.session.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        checkpoints = checkpoints_response.json()
        checkpoint_id = checkpoints[0]["id"]
        
        # All 6 arrow types
        arrow_types = ['straight', 'left', 'right', 'straight_left', 'straight_right', 'way_sign']
        
        test_arrows = [
            {"x": 10.0 + i*15, "y": 50.0, "type": arrow_type, "rotation": 0}
            for i, arrow_type in enumerate(arrow_types)
        ]
        
        # Update checkpoint with all arrow types
        update_response = self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": test_arrows}
        )
        assert update_response.status_code == 200
        
        updated_checkpoint = update_response.json()
        assert len(updated_checkpoint["direction_arrows"]) == 6
        
        saved_types = [a["type"] for a in updated_checkpoint["direction_arrows"]]
        for arrow_type in arrow_types:
            assert arrow_type in saved_types, f"Arrow type {arrow_type} not saved"
        
        print(f"TEST PASS: All 6 arrow types saved: {saved_types}")
        
        # Clean up
        self.session.put(
            f"{BASE_URL}/api/admin/checkpoints/{checkpoint_id}",
            json={"direction_arrows": []}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
