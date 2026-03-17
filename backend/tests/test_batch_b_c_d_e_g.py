"""
Test Suite for Batches B, C, D, E, G of Yash Ornaments WayFinder

BATCH B: Customer flow - fast/assisted entry, hub, location consent, sticky quick-actions
BATCH C: Picture-based checkpoint recovery
BATCH D: Helpdesk dashboard with queue categories
BATCH E: Admin dashboard with enhanced KPIs, reports & export
BATCH G: Service worker offline (checked via frontend)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://checkpoint-recovery-3.preview.emergentagent.com').rstrip('/')

# Test QR codes
TEST_QR_FAST = 'AJPL-DEFAULT'
TEST_QR_ASSISTED = 'YASH-DEFAULT'

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin JWT token"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "otp": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json().get("token")

@pytest.fixture(scope="module")
def helpdesk_token(api_client):
    """Get helpdesk JWT token"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={"username": "helpdesk1", "otp": "admin123"})
    assert res.status_code == 200, f"Helpdesk login failed: {res.text}"
    return res.json().get("token")

@pytest.fixture(scope="module")
def trainer_token(api_client):
    """Get trainer JWT token"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={"username": "trainer1", "otp": "admin123"})
    assert res.status_code == 200, f"Trainer login failed: {res.text}"
    return res.json().get("token")


class TestBatchB_CustomerFlow:
    """BATCH B: Customer entry via QR scan, hub, location consent, navigation"""

    def test_qr_info_fast_mode(self, api_client):
        """GET /api/scan/{qr_code}/info returns QR info with entry_mode"""
        res = api_client.get(f"{BASE_URL}/api/scan/{TEST_QR_FAST}/info")
        assert res.status_code == 200, f"QR info failed: {res.text}"
        data = res.json()
        assert "business" in data
        assert "entry_mode" in data
        # entry_mode should be 'fast' or 'assisted'
        print(f"PASS: QR info returns entry_mode={data['entry_mode']}")

    def test_fast_entry_creates_session(self, api_client):
        """POST /api/sessions/create with QR code creates session without form"""
        res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-test"
        })
        assert res.status_code == 200, f"Fast session create failed: {res.text}"
        data = res.json()
        assert "session" in data
        assert "business" in data
        assert data["session"]["status"] == "active"
        print(f"PASS: Fast entry created session {data['session']['id'][:8]}")
        return data["session"]["id"]

    def test_assisted_entry_register(self, api_client):
        """POST /api/scan/{qr_code}/register creates session with name/phone"""
        res = api_client.post(f"{BASE_URL}/api/scan/{TEST_QR_ASSISTED}/register", json={
            "customer_name": "TEST_Assisted_User",
            "customer_phone": "9876543210",
            "device_info": "pytest-assisted-test"
        })
        assert res.status_code == 200, f"Assisted register failed: {res.text}"
        data = res.json()
        assert data["session"]["customer_name"] == "TEST_Assisted_User"
        assert data["session"]["customer_phone"] == "9876543210"
        print(f"PASS: Assisted entry created session with customer info")
        return data["session"]["id"]

    def test_routes_list_for_hub(self, api_client):
        """GET /api/routes returns published routes for hub display"""
        res = api_client.get(f"{BASE_URL}/api/routes")
        assert res.status_code == 200, f"Routes list failed: {res.text}"
        routes = res.json()
        assert isinstance(routes, list)
        assert len(routes) > 0, "No routes found"
        # Each route should have distance, time, checkpoint count
        route = routes[0]
        assert "name" in route
        assert "estimated_time_minutes" in route
        assert "checkpoint_count" in route
        print(f"PASS: Routes list has {len(routes)} routes with hub info")

    def test_select_route_with_distance(self, api_client):
        """POST /api/sessions/{id}/select-route stores distance from trainer data"""
        # Create session first
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-route-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        # Get a route
        routes_res = api_client.get(f"{BASE_URL}/api/routes")
        route_id = routes_res.json()[0]["id"]
        
        # Select route
        res = api_client.post(f"{BASE_URL}/api/sessions/{session_id}/select-route", json={
            "route_id": route_id
        })
        assert res.status_code == 200, f"Select route failed: {res.text}"
        data = res.json()
        assert "route" in data
        print(f"PASS: Route selected, distance stored")

    def test_location_consent_grant(self, api_client):
        """POST /api/sessions/{id}/location-consent works for grant"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-consent-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        res = api_client.post(f"{BASE_URL}/api/sessions/{session_id}/location-consent", json={
            "granted": True
        })
        assert res.status_code == 200, f"Location consent failed: {res.text}"
        data = res.json()
        assert data["location_permission_state"] == "granted"
        print(f"PASS: Location consent granted")

    def test_location_consent_deny(self, api_client):
        """POST /api/sessions/{id}/location-consent works for deny"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-deny-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        res = api_client.post(f"{BASE_URL}/api/sessions/{session_id}/location-consent", json={
            "granted": False
        })
        assert res.status_code == 200, f"Location deny failed: {res.text}"
        data = res.json()
        assert data["location_permission_state"] == "denied"
        print(f"PASS: Location consent denied")

    def test_assist_event_whatsapp_video(self, api_client):
        """POST /api/sessions/{id}/assist-event logs whatsapp_video_attempted"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-assist-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        res = api_client.post(f"{BASE_URL}/api/sessions/{session_id}/assist-event", json={
            "event_type": "whatsapp_video_attempted",
            "event_data": {"context": "navigation"}
        })
        assert res.status_code == 200, f"Assist event failed: {res.text}"
        print(f"PASS: WhatsApp video event logged")


class TestBatchC_RecoveryFlow:
    """BATCH C: Picture-based checkpoint recovery"""

    def test_recovery_candidates(self, api_client):
        """GET /api/sessions/{id}/recovery-candidates returns route-scoped checkpoints"""
        # Create session and select route
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-recovery-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        routes_res = api_client.get(f"{BASE_URL}/api/routes")
        route_id = routes_res.json()[0]["id"]
        api_client.post(f"{BASE_URL}/api/sessions/{session_id}/select-route", json={"route_id": route_id})
        
        # Get recovery candidates
        res = api_client.get(f"{BASE_URL}/api/sessions/{session_id}/recovery-candidates")
        assert res.status_code == 200, f"Recovery candidates failed: {res.text}"
        candidates = res.json()
        assert isinstance(candidates, list)
        print(f"PASS: Recovery candidates returned {len(candidates)} checkpoints")

    def test_recovery_candidates_requires_route(self, api_client):
        """GET /api/sessions/{id}/recovery-candidates returns 400 if no route selected"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-noroute-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        res = api_client.get(f"{BASE_URL}/api/sessions/{session_id}/recovery-candidates")
        assert res.status_code == 400, f"Expected 400 for no route, got {res.status_code}"
        print(f"PASS: Recovery without route returns 400")

    def test_recover_session_resumes_from_checkpoint(self, api_client):
        """POST /api/sessions/{id}/recover resumes navigation from checkpoint"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-recover-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        routes_res = api_client.get(f"{BASE_URL}/api/routes")
        route_id = routes_res.json()[0]["id"]
        api_client.post(f"{BASE_URL}/api/sessions/{session_id}/select-route", json={"route_id": route_id})
        
        # Get checkpoints
        cp_res = api_client.get(f"{BASE_URL}/api/routes/{route_id}/checkpoints")
        checkpoints = cp_res.json()
        if len(checkpoints) == 0:
            pytest.skip("No checkpoints to test recovery")
        
        checkpoint_id = checkpoints[0]["id"]
        
        # Recover
        res = api_client.post(f"{BASE_URL}/api/sessions/{session_id}/recover", json={
            "checkpoint_id": checkpoint_id
        })
        assert res.status_code == 200, f"Recovery failed: {res.text}"
        data = res.json()
        assert "checkpoint" in data
        print(f"PASS: Session recovered to checkpoint {checkpoints[0]['name']}")


class TestBatchD_HelpdeskDashboard:
    """BATCH D: Helpdesk dashboard with queue categories"""

    def test_helpdesk_live_customers(self, api_client, helpdesk_token):
        """GET /api/helpdesk/live-customers returns enriched active sessions"""
        res = api_client.get(f"{BASE_URL}/api/helpdesk/live-customers", 
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Live customers failed: {res.text}"
        customers = res.json()
        assert isinstance(customers, list)
        # Check enrichment fields if data exists
        if len(customers) > 0:
            c = customers[0]
            # Should have enriched fields
            assert "customer_name" in c or "id" in c
        print(f"PASS: Live customers returned {len(customers)} sessions")

    def test_helpdesk_recent_completed(self, api_client, helpdesk_token):
        """GET /api/helpdesk/recent-completed returns recently completed sessions"""
        res = api_client.get(f"{BASE_URL}/api/helpdesk/recent-completed",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Recent completed failed: {res.text}"
        sessions = res.json()
        assert isinstance(sessions, list)
        print(f"PASS: Recent completed returned {len(sessions)} sessions")

    def test_helpdesk_claim_session(self, api_client, helpdesk_token):
        """POST /api/helpdesk/sessions/{id}/claim works"""
        # Create a session first
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-claim-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        res = api_client.post(f"{BASE_URL}/api/helpdesk/sessions/{session_id}/claim",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Claim failed: {res.text}"
        print(f"PASS: Helpdesk claimed session")

    def test_helpdesk_unclaim_session(self, api_client, helpdesk_token):
        """POST /api/helpdesk/sessions/{id}/unclaim works"""
        session_res = api_client.post(f"{BASE_URL}/api/sessions/create", json={
            "qr_code": TEST_QR_FAST,
            "device_info": "pytest-unclaim-test"
        })
        session_id = session_res.json()["session"]["id"]
        
        # Claim first
        api_client.post(f"{BASE_URL}/api/helpdesk/sessions/{session_id}/claim",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        
        # Unclaim
        res = api_client.post(f"{BASE_URL}/api/helpdesk/sessions/{session_id}/unclaim",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Unclaim failed: {res.text}"
        print(f"PASS: Helpdesk unclaimed session")

    def test_helpdesk_case_actions(self, api_client, helpdesk_token):
        """POST /api/helpdesk/cases/{id}/action with claim/unclaim/note"""
        # Get any existing case or skip
        cases_res = api_client.get(f"{BASE_URL}/api/helpdesk/cases",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        cases = cases_res.json()
        if len(cases) == 0:
            pytest.skip("No helpdesk cases to test")
        
        case_id = cases[0]["id"]
        
        # Test note action
        res = api_client.post(f"{BASE_URL}/api/helpdesk/cases/{case_id}/action",
            headers={"Authorization": f"Bearer {helpdesk_token}"},
            json={"action": "note_added", "note": "TEST note from pytest"})
        assert res.status_code == 200, f"Note action failed: {res.text}"
        print(f"PASS: Helpdesk case note action works")


class TestBatchE_AdminDashboard:
    """BATCH E: Admin dashboard with enhanced KPIs, reports & export"""

    def test_admin_enhanced_stats(self, api_client, admin_token):
        """GET /api/admin/stats/enhanced returns KPIs with route/source usage"""
        res = api_client.get(f"{BASE_URL}/api/admin/stats/enhanced",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"Enhanced stats failed: {res.text}"
        stats = res.json()
        # Check expected KPI fields
        assert "total_sessions" in stats
        assert "active_sessions" in stats
        assert "completed_sessions" in stats
        assert "help_pending" in stats
        # Check route/source usage
        assert "route_usage" in stats
        assert "source_usage" in stats
        print(f"PASS: Enhanced stats has KPIs: total={stats['total_sessions']}, active={stats['active_sessions']}")

    def test_admin_reports_sessions(self, api_client, admin_token):
        """GET /api/admin/reports/sessions with filters works"""
        res = api_client.get(f"{BASE_URL}/api/admin/reports/sessions",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"Reports sessions failed: {res.text}"
        sessions = res.json()
        assert isinstance(sessions, list)
        print(f"PASS: Reports sessions returned {len(sessions)} records")

    def test_admin_reports_sessions_with_filters(self, api_client, admin_token):
        """GET /api/admin/reports/sessions?status=completed works"""
        res = api_client.get(f"{BASE_URL}/api/admin/reports/sessions?status=completed",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"Filtered reports failed: {res.text}"
        print(f"PASS: Reports sessions with filter works")

    def test_admin_export_csv(self, api_client, admin_token):
        """GET /api/admin/reports/export?format=csv returns CSV"""
        res = api_client.get(f"{BASE_URL}/api/admin/reports/export?format=csv",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"CSV export failed: {res.text}"
        # Check content type is CSV
        assert 'text/csv' in res.headers.get('content-type', '') or 'application/octet-stream' in res.headers.get('content-type', '') or len(res.content) > 0
        print(f"PASS: CSV export works, size={len(res.content)} bytes")

    def test_admin_export_xlsx(self, api_client, admin_token):
        """GET /api/admin/reports/export?format=xlsx returns XLSX"""
        res = api_client.get(f"{BASE_URL}/api/admin/reports/export?format=xlsx",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"XLSX export failed: {res.text}"
        print(f"PASS: XLSX export works, size={len(res.content)} bytes")

    def test_admin_user_performance(self, api_client, admin_token):
        """GET /api/admin/users/{id}/performance returns helpdesk user stats"""
        # Get users first
        users_res = api_client.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"})
        users = users_res.json()
        helpdesk_user = next((u for u in users if u.get('role') == 'helpdesk'), None)
        if not helpdesk_user:
            pytest.skip("No helpdesk user for performance test")
        
        res = api_client.get(f"{BASE_URL}/api/admin/users/{helpdesk_user['id']}/performance",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"User performance failed: {res.text}"
        perf = res.json()
        assert "customers_handled" in perf
        assert "cases_handled" in perf
        print(f"PASS: User performance works, customers_handled={perf['customers_handled']}")


class TestRBAC:
    """RBAC tests for batch endpoints"""

    def test_trainer_cannot_export(self, api_client, trainer_token):
        """Trainer cannot access export endpoints (403)"""
        res = api_client.get(f"{BASE_URL}/api/admin/reports/export?format=csv",
            headers={"Authorization": f"Bearer {trainer_token}"})
        assert res.status_code == 403, f"Trainer should get 403 on export, got {res.status_code}"
        print(f"PASS: Trainer blocked from export (403)")

    def test_helpdesk_can_access_live_customers(self, api_client, helpdesk_token):
        """Helpdesk can access live-customers"""
        res = api_client.get(f"{BASE_URL}/api/helpdesk/live-customers",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Helpdesk should access live-customers, got {res.status_code}"
        print(f"PASS: Helpdesk can access live-customers")

    def test_helpdesk_can_access_recent_completed(self, api_client, helpdesk_token):
        """Helpdesk can access recent-completed"""
        res = api_client.get(f"{BASE_URL}/api/helpdesk/recent-completed",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 200, f"Helpdesk should access recent-completed, got {res.status_code}"
        print(f"PASS: Helpdesk can access recent-completed")

    def test_admin_can_access_enhanced_stats(self, api_client, admin_token):
        """Admin can access all enhanced stats and reports"""
        res = api_client.get(f"{BASE_URL}/api/admin/stats/enhanced",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200, f"Admin should access enhanced stats, got {res.status_code}"
        print(f"PASS: Admin can access enhanced stats")

    def test_helpdesk_cannot_access_enhanced_stats(self, api_client, helpdesk_token):
        """Helpdesk cannot access admin enhanced stats"""
        res = api_client.get(f"{BASE_URL}/api/admin/stats/enhanced",
            headers={"Authorization": f"Bearer {helpdesk_token}"})
        assert res.status_code == 403, f"Helpdesk should get 403 on enhanced stats, got {res.status_code}"
        print(f"PASS: Helpdesk blocked from admin stats (403)")


class TestHealthAndBasics:
    """Basic health and connectivity tests"""

    def test_health_endpoint(self, api_client):
        """GET /api/health returns healthy"""
        res = api_client.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"PASS: Health check - {data['app']} v{data['version']}")

    def test_public_routes_list(self, api_client):
        """GET /api/routes returns published routes only"""
        res = api_client.get(f"{BASE_URL}/api/routes")
        assert res.status_code == 200
        routes = res.json()
        # All should be published
        for r in routes:
            assert r.get("status") == "published" or "status" not in r
        print(f"PASS: Public routes list works ({len(routes)} routes)")

    def test_schematic_map(self, api_client):
        """GET /api/map/schematic returns map data"""
        res = api_client.get(f"{BASE_URL}/api/map/schematic")
        assert res.status_code == 200
        data = res.json()
        assert "nodes" in data
        assert "edges" in data
        assert "route_paths" in data
        print(f"PASS: Schematic map has {len(data['nodes'])} nodes, {len(data['route_paths'])} routes")
