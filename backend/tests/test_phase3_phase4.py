"""
Backend API Tests for YashOrnamentsWayFinder - Phase 3 (Media UX) and Phase 4 (Schematic Map)
Tests:
- GET /api/map/schematic - multi-origin schematic map data
- GET /api/admin/media - media library with filters
- POST /api/media/upload - file validation, RBAC
- DELETE /api/admin/media/{id} - admin only
- GET /api/routes - public routes only returns published
- RBAC verification for admin/trainer/helpdesk roles
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://helpdesk-live-3.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"username": "admin", "otp": "admin123"}
TRAINER_CREDS = {"username": "trainer1", "otp": "admin123"}
HELPDESK_CREDS = {"username": "helpdesk1", "otp": "admin123"}


class TestSchematicMapEndpoint:
    """Phase 4: Test /api/map/schematic endpoint for multi-origin metro-style map data."""
    
    def test_schematic_map_returns_nodes_edges_paths(self):
        """GET /api/map/schematic should return nodes, edges, route_paths."""
        response = requests.get(f"{BASE_URL}/api/map/schematic")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'nodes' in data, "Response should contain 'nodes'"
        assert 'edges' in data, "Response should contain 'edges'"
        assert 'route_paths' in data, "Response should contain 'route_paths'"
        
        print(f"✓ Schematic map: {len(data['nodes'])} nodes, {len(data['edges'])} edges, {len(data['route_paths'])} route_paths")
    
    def test_schematic_map_has_destination_node(self):
        """Map should have a destination node (Yash Complex)."""
        response = requests.get(f"{BASE_URL}/api/map/schematic")
        assert response.status_code == 200
        
        data = response.json()
        dest_nodes = [n for n in data['nodes'] if n.get('type') == 'destination']
        assert len(dest_nodes) >= 1, "Should have at least one destination node"
        print(f"✓ Destination node found: {dest_nodes[0].get('label')}")
    
    def test_schematic_map_has_origin_nodes(self):
        """Map should have origin nodes (M, R, O, T, G for the 5 origins)."""
        response = requests.get(f"{BASE_URL}/api/map/schematic")
        assert response.status_code == 200
        
        data = response.json()
        origin_nodes = [n for n in data['nodes'] if n.get('type') == 'origin']
        # We expect 5 outdoor origins (Metro, Red Fort, Omaxe, Town Hall, Gurudwara)
        # Building entrance is excluded
        assert len(origin_nodes) >= 5, f"Expected at least 5 origin nodes, got {len(origin_nodes)}"
        print(f"✓ Found {len(origin_nodes)} origin nodes")
        for node in origin_nodes:
            print(f"  - {node.get('label')} (route_id: {node.get('route_id', '')[:8]}...)")
    
    def test_schematic_map_route_paths_have_colors(self):
        """Each route path should have a color assigned."""
        response = requests.get(f"{BASE_URL}/api/map/schematic")
        assert response.status_code == 200
        
        data = response.json()
        for rp in data['route_paths']:
            assert 'color' in rp, f"Route path {rp.get('route_name')} missing color"
            assert rp['color'].startswith('#'), f"Color should be hex format, got {rp['color']}"
        print(f"✓ All {len(data['route_paths'])} route paths have valid colors")
    
    def test_schematic_map_no_building_entrance_route(self):
        """Building entrance route should be excluded from schematic map."""
        response = requests.get(f"{BASE_URL}/api/map/schematic")
        assert response.status_code == 200
        
        data = response.json()
        building_entrance_paths = [rp for rp in data['route_paths'] if rp.get('start_type') == 'building_entrance']
        assert len(building_entrance_paths) == 0, "Building entrance routes should be excluded from map"
        print("✓ Building entrance route correctly excluded")


class TestPublicRoutesEndpoint:
    """Test /api/routes returns only published routes."""
    
    def test_public_routes_only_published(self):
        """GET /api/routes should only return published routes."""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        
        routes = response.json()
        assert isinstance(routes, list)
        
        for route in routes:
            assert route.get('status') == 'published', f"Route '{route.get('name')}' has status '{route.get('status')}', expected 'published'"
        
        print(f"✓ All {len(routes)} public routes are published")
        for r in routes:
            print(f"  - {r.get('name')} (start_type: {r.get('start_type')})")
    
    def test_gurudwara_route_exists(self):
        """Verify Gurudwara route is published and accessible."""
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200
        
        routes = response.json()
        gurudwara_routes = [r for r in routes if 'gurudwara' in r.get('name', '').lower() or r.get('start_type') == 'gurudwara']
        assert len(gurudwara_routes) >= 1, "Gurudwara route should be published"
        print(f"✓ Gurudwara route found: {gurudwara_routes[0].get('name')}")


class TestMediaUploadValidation:
    """Phase 3: Test media upload file validation."""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get('token')
    
    @pytest.fixture
    def trainer_token(self):
        """Get trainer auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TRAINER_CREDS)
        if response.status_code != 200:
            pytest.skip("Trainer login failed")
        return response.json().get('token')
    
    def test_upload_requires_auth(self):
        """POST /api/media/upload should require authentication."""
        # Create a small fake file
        files = {'file': ('test.png', io.BytesIO(b'fake png content'), 'image/png')}
        data = {'media_type': 'checkpoint_image'}
        
        response = requests.post(f"{BASE_URL}/api/media/upload", files=files, data=data)
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Upload requires authentication")
    
    def test_upload_rejects_unsupported_extension(self, admin_token):
        """Upload should reject unsupported file extensions."""
        files = {'file': ('test.exe', io.BytesIO(b'fake exe content'), 'application/octet-stream')}
        data = {'media_type': 'checkpoint_image'}
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        response = requests.post(f"{BASE_URL}/api/media/upload", files=files, data=data, headers=headers)
        assert response.status_code == 400, f"Expected 400 for .exe, got {response.status_code}"
        assert 'not allowed' in response.json().get('detail', '').lower() or 'unsupported' in response.json().get('detail', '').lower()
        print("✓ Unsupported extension (.exe) correctly rejected")
    
    def test_upload_rejects_oversized_file(self, admin_token):
        """Upload should reject files over 50MB."""
        # Create a 51MB file (just the header claim - backend should check size)
        large_content = b'x' * (51 * 1024 * 1024)  # 51MB
        files = {'file': ('large.jpg', io.BytesIO(large_content), 'image/jpeg')}
        data = {'media_type': 'checkpoint_image'}
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        response = requests.post(f"{BASE_URL}/api/media/upload", files=files, data=data, headers=headers)
        assert response.status_code == 400, f"Expected 400 for oversized file, got {response.status_code}"
        assert 'too large' in response.json().get('detail', '').lower() or 'maximum' in response.json().get('detail', '').lower() or '50' in response.json().get('detail', '')
        print("✓ Oversized file (51MB) correctly rejected")
    
    def test_trainer_can_upload(self, trainer_token):
        """Trainer role should be able to upload media."""
        # Create a valid small image
        files = {'file': ('trainer_test.png', io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100), 'image/png')}
        data = {'media_type': 'checkpoint_image', 'route_id': ''}
        headers = {'Authorization': f'Bearer {trainer_token}'}
        
        response = requests.post(f"{BASE_URL}/api/media/upload", files=files, data=data, headers=headers)
        assert response.status_code == 200, f"Trainer should be able to upload, got {response.status_code}"
        print("✓ Trainer can upload media (require_admin_or_trainer verified)")


class TestMediaLibraryEndpoint:
    """Phase 3: Test /api/admin/media with search/filter params."""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get('token')
    
    @pytest.fixture
    def trainer_token(self):
        """Get trainer auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TRAINER_CREDS)
        if response.status_code != 200:
            pytest.skip("Trainer login failed")
        return response.json().get('token')
    
    def test_admin_media_requires_auth(self):
        """GET /api/admin/media should require authentication."""
        response = requests.get(f"{BASE_URL}/api/admin/media")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Media library requires authentication")
    
    def test_admin_media_list(self, admin_token):
        """GET /api/admin/media returns media list."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/media", headers=headers)
        assert response.status_code == 200
        
        media = response.json()
        assert isinstance(media, list)
        print(f"✓ Media library: {len(media)} files")
    
    def test_admin_media_search_filter(self, admin_token):
        """GET /api/admin/media supports search param."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/media?search=test", headers=headers)
        assert response.status_code == 200
        
        media = response.json()
        assert isinstance(media, list)
        print(f"✓ Search filter works: {len(media)} results for 'test'")
    
    def test_admin_media_type_filter(self, admin_token):
        """GET /api/admin/media supports media_type filter."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/media?media_type=checkpoint_image", headers=headers)
        assert response.status_code == 200
        
        media = response.json()
        assert isinstance(media, list)
        # All returned items should have matching media_type
        for m in media:
            assert m.get('media_type') == 'checkpoint_image', f"Expected checkpoint_image, got {m.get('media_type')}"
        print(f"✓ Type filter works: {len(media)} checkpoint_image files")
    
    def test_trainer_can_access_media_library(self, trainer_token):
        """Trainer should be able to access media library."""
        headers = {'Authorization': f'Bearer {trainer_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/media", headers=headers)
        assert response.status_code == 200, f"Trainer should access media library, got {response.status_code}"
        print("✓ Trainer can access media library")


class TestMediaDeleteRBAC:
    """Phase 3: Test DELETE /api/admin/media/{id} is admin-only."""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get('token')
    
    @pytest.fixture
    def trainer_token(self):
        """Get trainer auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TRAINER_CREDS)
        if response.status_code != 200:
            pytest.skip("Trainer login failed")
        return response.json().get('token')
    
    def test_trainer_cannot_delete_media(self, trainer_token):
        """Trainer role should NOT be able to delete media (admin only)."""
        headers = {'Authorization': f'Bearer {trainer_token}'}
        # Try to delete a non-existent media to check RBAC before 404
        response = requests.delete(f"{BASE_URL}/api/admin/media/fake-media-id", headers=headers)
        # Should get 403 Forbidden (not 404 or 200)
        assert response.status_code == 403, f"Expected 403 for trainer delete, got {response.status_code}"
        print("✓ Trainer cannot delete media (admin-only enforced)")
    
    def test_admin_can_delete_media(self, admin_token):
        """Admin should be able to delete media (returns 404 for non-existent)."""
        headers = {'Authorization': f'Bearer {admin_token}'}
        # Try to delete non-existent - should get 404 (not 403)
        response = requests.delete(f"{BASE_URL}/api/admin/media/fake-media-id", headers=headers)
        assert response.status_code == 404, f"Expected 404 for admin delete non-existent, got {response.status_code}"
        print("✓ Admin can attempt to delete (role check passes, returns 404 for non-existent)")


class TestRBACHelpdeskRestrictions:
    """Test that helpdesk role cannot access admin routes."""
    
    @pytest.fixture
    def helpdesk_token(self):
        """Get helpdesk auth token."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HELPDESK_CREDS)
        if response.status_code != 200:
            pytest.skip("Helpdesk login failed")
        return response.json().get('token')
    
    def test_helpdesk_cannot_access_admin_routes(self, helpdesk_token):
        """Helpdesk should not access /api/admin/routes."""
        headers = {'Authorization': f'Bearer {helpdesk_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/routes", headers=headers)
        assert response.status_code == 403, f"Expected 403 for helpdesk accessing admin/routes, got {response.status_code}"
        print("✓ Helpdesk cannot access /admin/routes")
    
    def test_helpdesk_cannot_access_admin_media(self, helpdesk_token):
        """Helpdesk should not access /api/admin/media."""
        headers = {'Authorization': f'Bearer {helpdesk_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/media", headers=headers)
        assert response.status_code == 403, f"Expected 403 for helpdesk accessing admin/media, got {response.status_code}"
        print("✓ Helpdesk cannot access /admin/media")
    
    def test_helpdesk_can_access_helpdesk_cases(self, helpdesk_token):
        """Helpdesk should be able to access /api/helpdesk/cases."""
        headers = {'Authorization': f'Bearer {helpdesk_token}'}
        response = requests.get(f"{BASE_URL}/api/helpdesk/cases", headers=headers)
        assert response.status_code == 200, f"Expected 200 for helpdesk accessing cases, got {response.status_code}"
        print("✓ Helpdesk can access /helpdesk/cases")


class TestAuthLogin:
    """Test authentication for all roles."""
    
    def test_admin_login(self):
        """Admin should be able to login."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert 'token' in data
        assert data.get('user', {}).get('role') == 'admin'
        print("✓ Admin login successful")
    
    def test_trainer_login(self):
        """Trainer should be able to login."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TRAINER_CREDS)
        assert response.status_code == 200, f"Trainer login failed: {response.status_code}"
        data = response.json()
        assert 'token' in data
        assert data.get('user', {}).get('role') == 'trainer'
        print("✓ Trainer login successful")
    
    def test_helpdesk_login(self):
        """Helpdesk should be able to login."""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=HELPDESK_CREDS)
        assert response.status_code == 200, f"Helpdesk login failed: {response.status_code}"
        data = response.json()
        assert 'token' in data
        assert data.get('user', {}).get('role') == 'helpdesk'
        print("✓ Helpdesk login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
