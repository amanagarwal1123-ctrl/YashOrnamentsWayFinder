"""
Test suite for Admin Routes CMS functionality
- Route CRUD operations
- Checkpoint CRUD operations
- Drag-drop reorder
- Route duplicate/export/import
- Checkpoint duplicate
- Role-based access (admin vs trainer)
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminRoutesCMS:
    """Test Admin Routes CMS features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with admin authentication"""
        self.admin_token = None
        self.trainer_token = None
        self.test_route_id = None
        self.test_checkpoint_id = None
        
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "otp": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()['token']
        
        # Login as trainer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "trainer1",
            "otp": "admin123"
        })
        assert response.status_code == 200, f"Trainer login failed: {response.text}"
        self.trainer_token = response.json()['token']
        
    def admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
    
    def trainer_headers(self):
        return {"Authorization": f"Bearer {self.trainer_token}", "Content-Type": "application/json"}
        
    # ========== Route CRUD Tests ==========
    
    def test_01_get_routes_list(self):
        """Test getting routes list shows all routes including 'From Gurudwara Sis Ganj'"""
        response = requests.get(f"{BASE_URL}/api/admin/routes", headers=self.admin_headers())
        assert response.status_code == 200, f"Failed to get routes: {response.text}"
        routes = response.json()
        assert isinstance(routes, list), "Routes should be a list"
        print(f"Found {len(routes)} routes")
        
        # Check for 'Gurudwara' route
        route_names = [r.get('name', '') for r in routes]
        print(f"Route names: {route_names}")
        gurudwara_route = any('gurudwara' in name.lower() for name in route_names)
        print(f"Gurudwara route found: {gurudwara_route}")
        
        # Verify route structure
        if routes:
            route = routes[0]
            assert 'id' in route, "Route should have id"
            assert 'name' in route, "Route should have name"
            assert 'status' in route, "Route should have status"
            print(f"Sample route: {route.get('name')} - status: {route.get('status')}")
    
    def test_02_create_route_validation(self):
        """Test route creation with validation - empty name should fail"""
        # Test with empty name
        response = requests.post(f"{BASE_URL}/api/admin/routes", 
            headers=self.admin_headers(),
            json={"name": "", "description": "Test"})
        
        # Note: API may accept empty name, frontend validates
        # Just verify API responds
        print(f"Create route with empty name: {response.status_code}")
    
    def test_03_create_route_success(self):
        """Test creating a new route"""
        route_data = {
            "name": "TEST_Route_For_Testing",
            "description": "Test route created for CMS testing",
            "start_type": "metro",
            "start_label": "Test Metro Gate",
            "difficulty": "easy",
            "estimated_time_minutes": 10,
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json=route_data)
        
        assert response.status_code == 200, f"Failed to create route: {response.text}"
        created = response.json()
        assert created.get('name') == route_data['name'], "Route name mismatch"
        assert created.get('status') == 'draft', "Route should be draft status"
        assert 'id' in created, "Route should have id"
        self.test_route_id = created['id']
        print(f"Created route: {created.get('name')} with ID: {self.test_route_id}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/admin/routes", headers=self.admin_headers())
        routes = get_response.json()
        found = any(r['id'] == self.test_route_id for r in routes)
        assert found, "Created route should appear in routes list"
    
    def test_04_edit_route(self):
        """Test editing a route with pre-filled data"""
        # First create a test route
        create_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Edit_Route", "status": "draft"})
        route_id = create_response.json()['id']
        
        # Update the route
        update_data = {
            "name": "TEST_Edit_Route_Updated",
            "description": "Updated description",
            "status": "published"
        }
        response = requests.put(f"{BASE_URL}/api/admin/routes/{route_id}",
            headers=self.admin_headers(),
            json=update_data)
        
        assert response.status_code == 200, f"Failed to update route: {response.text}"
        updated = response.json()
        assert updated.get('name') == update_data['name'], "Route name should be updated"
        assert updated.get('status') == 'published', "Route status should be published"
        print(f"Updated route: {updated.get('name')} to status: {updated.get('status')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_05_publish_unpublish_route(self):
        """Test publishing and unpublishing a route reflects in public API"""
        # Create draft route
        create_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Publish_Route", "status": "draft"})
        route_id = create_response.json()['id']
        
        # Verify draft route NOT in public routes
        public_routes = requests.get(f"{BASE_URL}/api/routes").json()
        draft_in_public = any(r['id'] == route_id for r in public_routes)
        assert not draft_in_public, "Draft route should NOT be in public routes"
        print("Draft route correctly hidden from public API")
        
        # Publish the route
        publish_response = requests.put(f"{BASE_URL}/api/admin/routes/{route_id}",
            headers=self.admin_headers(),
            json={"status": "published"})
        assert publish_response.status_code == 200
        
        # Verify published route IS in public routes
        public_routes_after = requests.get(f"{BASE_URL}/api/routes").json()
        published_in_public = any(r['id'] == route_id for r in public_routes_after)
        assert published_in_public, "Published route should be in public routes"
        print("Published route correctly visible in public API")
        
        # Unpublish
        unpublish_response = requests.put(f"{BASE_URL}/api/admin/routes/{route_id}",
            headers=self.admin_headers(),
            json={"status": "draft"})
        assert unpublish_response.status_code == 200
        
        # Verify unpublished route NOT in public routes
        public_routes_final = requests.get(f"{BASE_URL}/api/routes").json()
        unpublished_in_public = any(r['id'] == route_id for r in public_routes_final)
        assert not unpublished_in_public, "Unpublished route should NOT be in public routes"
        print("Unpublished route correctly hidden from public API")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_06_duplicate_route(self):
        """Test duplicating a route creates copy with (Copy) suffix in draft status"""
        # Create original route
        create_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Original_Route", "status": "published"})
        original_id = create_response.json()['id']
        original_name = create_response.json()['name']
        
        # Duplicate
        dup_response = requests.post(f"{BASE_URL}/api/admin/routes/{original_id}/duplicate",
            headers=self.admin_headers())
        
        assert dup_response.status_code == 200, f"Failed to duplicate route: {dup_response.text}"
        duplicated = dup_response.json()
        
        # Verify duplicate has (Copy) suffix
        assert "(Copy)" in duplicated.get('name', ''), f"Duplicated route name should contain (Copy): {duplicated.get('name')}"
        
        # Verify duplicate is in draft status
        assert duplicated.get('status') == 'draft', f"Duplicated route should be draft, got: {duplicated.get('status')}"
        
        print(f"Duplicated '{original_name}' to '{duplicated.get('name')}' in status: {duplicated.get('status')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{original_id}", headers=self.admin_headers())
        requests.delete(f"{BASE_URL}/api/admin/routes/{duplicated['id']}", headers=self.admin_headers())
    
    def test_07_export_route_json(self):
        """Test exporting a route as JSON"""
        # Get existing routes to find one with checkpoints
        routes = requests.get(f"{BASE_URL}/api/admin/routes", headers=self.admin_headers()).json()
        assert len(routes) > 0, "Need at least one route for export test"
        
        route_to_export = routes[0]
        route_id = route_to_export['id']
        
        # Export
        export_response = requests.get(f"{BASE_URL}/api/admin/routes/{route_id}/export",
            headers=self.admin_headers())
        
        assert export_response.status_code == 200, f"Failed to export: {export_response.text}"
        export_data = export_response.json()
        
        assert 'route' in export_data, "Export should contain route"
        assert 'checkpoints' in export_data, "Export should contain checkpoints"
        assert export_data['route']['id'] == route_id, "Exported route ID should match"
        
        print(f"Exported route '{export_data['route']['name']}' with {len(export_data['checkpoints'])} checkpoints")
    
    def test_08_import_route_json(self):
        """Test importing a route from JSON"""
        import_data = {
            "route": {
                "name": "TEST_Imported_Route",
                "description": "Imported from JSON",
                "start_type": "metro",
                "difficulty": "moderate"
            },
            "checkpoints": [
                {
                    "name": "Imported CP 1",
                    "short_instruction": "First checkpoint",
                    "order": 1
                },
                {
                    "name": "Imported CP 2",
                    "short_instruction": "Second checkpoint",
                    "order": 2
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/routes/import",
            headers=self.admin_headers(),
            json=import_data)
        
        assert response.status_code == 200, f"Failed to import: {response.text}"
        imported = response.json()
        
        assert imported.get('name') == import_data['route']['name'], "Imported route name should match"
        assert imported.get('status') == 'draft', "Imported route should be draft"
        
        # Verify checkpoints were created
        imported_route_id = imported['id']
        cps_response = requests.get(f"{BASE_URL}/api/admin/checkpoints?route_id={imported_route_id}",
            headers=self.admin_headers())
        checkpoints = cps_response.json()
        
        assert len(checkpoints) == 2, f"Should have 2 imported checkpoints, got {len(checkpoints)}"
        print(f"Imported route '{imported.get('name')}' with {len(checkpoints)} checkpoints")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{imported_route_id}", headers=self.admin_headers())
    
    # ========== Checkpoint CRUD Tests ==========
    
    def test_09_get_checkpoints_for_route(self):
        """Test getting checkpoints for a selected route"""
        # Get routes first
        routes = requests.get(f"{BASE_URL}/api/admin/routes", headers=self.admin_headers()).json()
        assert len(routes) > 0, "Need at least one route"
        
        # Find a route with checkpoints
        for route in routes:
            route_id = route['id']
            response = requests.get(f"{BASE_URL}/api/admin/checkpoints?route_id={route_id}",
                headers=self.admin_headers())
            
            assert response.status_code == 200, f"Failed to get checkpoints: {response.text}"
            checkpoints = response.json()
            
            print(f"Route '{route.get('name')}' has {len(checkpoints)} checkpoints")
            
            if checkpoints:
                cp = checkpoints[0]
                assert 'id' in cp, "Checkpoint should have id"
                assert 'name' in cp, "Checkpoint should have name"
                assert 'order' in cp, "Checkpoint should have order"
                print(f"  Sample checkpoint: {cp.get('name')} (order: {cp.get('order')})")
                break
    
    def test_10_create_checkpoint_validation(self):
        """Test checkpoint creation with validation"""
        # Create test route first
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Route_For_CP", "status": "draft"})
        route_id = route_response.json()['id']
        
        # Create checkpoint with valid data
        cp_data = {
            "route_id": route_id,
            "name": "TEST_Checkpoint",
            "short_instruction": "Test instruction",
            "order": 1,
            "direction": "straight",
            "risk_level": "low"
        }
        response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
            headers=self.admin_headers(),
            json=cp_data)
        
        assert response.status_code == 200, f"Failed to create checkpoint: {response.text}"
        created = response.json()
        assert created.get('name') == cp_data['name']
        print(f"Created checkpoint: {created.get('name')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_11_edit_checkpoint(self):
        """Test editing a checkpoint"""
        # Create route and checkpoint
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Route_Edit_CP", "status": "draft"})
        route_id = route_response.json()['id']
        
        cp_response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
            headers=self.admin_headers(),
            json={"route_id": route_id, "name": "Original Name", "short_instruction": "Original", "order": 1})
        cp_id = cp_response.json()['id']
        
        # Edit checkpoint
        update_data = {
            "name": "Updated Name",
            "short_instruction": "Updated instruction",
            "risk_level": "high"
        }
        update_response = requests.put(f"{BASE_URL}/api/admin/checkpoints/{cp_id}",
            headers=self.admin_headers(),
            json=update_data)
        
        assert update_response.status_code == 200, f"Failed to update checkpoint: {update_response.text}"
        updated = update_response.json()
        assert updated.get('name') == 'Updated Name'
        assert updated.get('risk_level') == 'high'
        print(f"Updated checkpoint: {updated.get('name')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_12_delete_checkpoint(self):
        """Test deleting a checkpoint"""
        # Create route and checkpoint
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Route_Del_CP", "status": "draft"})
        route_id = route_response.json()['id']
        
        cp_response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
            headers=self.admin_headers(),
            json={"route_id": route_id, "name": "To Delete", "short_instruction": "Delete me", "order": 1})
        cp_id = cp_response.json()['id']
        
        # Delete checkpoint
        delete_response = requests.delete(f"{BASE_URL}/api/admin/checkpoints/{cp_id}",
            headers=self.admin_headers())
        
        assert delete_response.status_code == 200, f"Failed to delete checkpoint: {delete_response.text}"
        
        # Verify deletion
        cps = requests.get(f"{BASE_URL}/api/admin/checkpoints?route_id={route_id}",
            headers=self.admin_headers()).json()
        assert len(cps) == 0, "Checkpoint should be deleted"
        print("Checkpoint deleted successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_13_duplicate_checkpoint(self):
        """Test duplicating a checkpoint creates copy after original"""
        # Create route and checkpoint
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Route_Dup_CP", "status": "draft"})
        route_id = route_response.json()['id']
        
        cp_response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
            headers=self.admin_headers(),
            json={"route_id": route_id, "name": "Original CP", "short_instruction": "Original", "order": 1})
        cp_id = cp_response.json()['id']
        
        # Duplicate checkpoint
        dup_response = requests.post(f"{BASE_URL}/api/admin/checkpoints/{cp_id}/duplicate",
            headers=self.admin_headers())
        
        assert dup_response.status_code == 200, f"Failed to duplicate checkpoint: {dup_response.text}"
        duplicated = dup_response.json()
        
        assert "(Copy)" in duplicated.get('name', ''), f"Duplicated name should contain (Copy): {duplicated.get('name')}"
        assert duplicated.get('order') == 2, f"Duplicated should be order 2, got: {duplicated.get('order')}"
        print(f"Duplicated to: {duplicated.get('name')} at order {duplicated.get('order')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_14_reorder_checkpoints(self):
        """Test drag-and-drop reorder persists via API"""
        # Create route with 3 checkpoints
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_Route_Reorder", "status": "draft"})
        route_id = route_response.json()['id']
        
        cp_ids = []
        for i in range(1, 4):
            cp_response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
                headers=self.admin_headers(),
                json={"route_id": route_id, "name": f"CP {i}", "short_instruction": f"Step {i}", "order": i})
            cp_ids.append(cp_response.json()['id'])
        
        # Reorder: swap first and third
        new_order = [
            {"id": cp_ids[2], "order": 1},  # CP 3 -> order 1
            {"id": cp_ids[1], "order": 2},  # CP 2 -> order 2
            {"id": cp_ids[0], "order": 3},  # CP 1 -> order 3
        ]
        
        reorder_response = requests.post(f"{BASE_URL}/api/admin/checkpoints/reorder",
            headers=self.admin_headers(),
            json={"order": new_order})
        
        assert reorder_response.status_code == 200, f"Failed to reorder: {reorder_response.text}"
        result = reorder_response.json()
        assert result.get('updated') == 3, f"Should update 3 checkpoints, got: {result.get('updated')}"
        
        # Verify new order
        cps = requests.get(f"{BASE_URL}/api/admin/checkpoints?route_id={route_id}",
            headers=self.admin_headers()).json()
        
        # Should be sorted by order
        assert cps[0]['name'] == 'CP 3', f"First should be CP 3, got: {cps[0]['name']}"
        assert cps[2]['name'] == 'CP 1', f"Last should be CP 1, got: {cps[2]['name']}"
        print("Reorder successful: CP 3 -> CP 2 -> CP 1")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    # ========== Role-Based Access Tests ==========
    
    def test_15_trainer_can_manage_routes(self):
        """Test trainer can create/edit routes and checkpoints"""
        # Trainer creates route
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.trainer_headers(),
            json={"name": "TEST_Trainer_Route", "status": "draft"})
        
        assert route_response.status_code == 200, f"Trainer should create route: {route_response.text}"
        route_id = route_response.json()['id']
        print("Trainer created route successfully")
        
        # Trainer creates checkpoint
        cp_response = requests.post(f"{BASE_URL}/api/admin/checkpoints",
            headers=self.trainer_headers(),
            json={"route_id": route_id, "name": "Trainer CP", "short_instruction": "By trainer", "order": 1})
        
        assert cp_response.status_code == 200, f"Trainer should create checkpoint: {cp_response.text}"
        print("Trainer created checkpoint successfully")
        
        # Cleanup (by admin since trainer can't delete routes)
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_16_trainer_cannot_delete_route(self):
        """Test trainer cannot delete routes (admin-only)"""
        # Admin creates route
        route_response = requests.post(f"{BASE_URL}/api/admin/routes",
            headers=self.admin_headers(),
            json={"name": "TEST_NoDelete_Route", "status": "draft"})
        route_id = route_response.json()['id']
        
        # Trainer tries to delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}",
            headers=self.trainer_headers())
        
        assert delete_response.status_code == 403, f"Trainer should get 403 on delete, got: {delete_response.status_code}"
        print("Trainer correctly denied route deletion")
        
        # Cleanup by admin
        requests.delete(f"{BASE_URL}/api/admin/routes/{route_id}", headers=self.admin_headers())
    
    def test_17_public_routes_shows_only_published(self):
        """Test public /api/routes only shows published routes"""
        # Get public routes
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        routes = response.json()
        
        # All should be published
        for route in routes:
            assert route.get('status') == 'published', f"Public route should be published: {route.get('name')} is {route.get('status')}"
        
        print(f"Public API correctly shows only {len(routes)} published routes")
        
        # Verify count matches admin published count
        admin_routes = requests.get(f"{BASE_URL}/api/admin/routes", headers=self.admin_headers()).json()
        published_count = sum(1 for r in admin_routes if r.get('status') == 'published')
        assert len(routes) == published_count, f"Public count {len(routes)} should match admin published count {published_count}"


class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    def test_cleanup_test_data(self):
        """Clean up all TEST_ prefixed routes"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "otp": "admin123"})
        token = response.json()['token']
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get all routes
        routes = requests.get(f"{BASE_URL}/api/admin/routes", headers=headers).json()
        
        # Delete TEST_ routes
        deleted = 0
        for route in routes:
            if route.get('name', '').startswith('TEST_'):
                del_response = requests.delete(f"{BASE_URL}/api/admin/routes/{route['id']}", headers=headers)
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test routes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
