#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class NavigationAPITester:
    def __init__(self, base_url="https://content-section.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None
        self.business_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                
                # Print response data for certain endpoints
                if endpoint in ['sessions/create', 'routes', 'gold-rates', 'admin/stats']:
                    try:
                        resp_data = response.json()
                        if isinstance(resp_data, dict):
                            if 'session' in resp_data:
                                print(f"   Session ID: {resp_data['session'].get('id', 'N/A')}")
                                print(f"   Business: {resp_data.get('business', {}).get('name', 'N/A')}")
                            elif 'active_sessions' in resp_data:
                                print(f"   Active Sessions: {resp_data.get('active_sessions', 'N/A')}")
                                print(f"   AJPL Active: {resp_data.get('ajpl_active', 'N/A')}")
                                print(f"   Yash Active: {resp_data.get('yash_active', 'N/A')}")
                            elif isinstance(resp_data, list) and len(resp_data) > 0:
                                print(f"   Items count: {len(resp_data)}")
                    except Exception:
                        pass
                        
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"   Raw response: {response.text[:200]}")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_session_creation(self, qr_code, expected_business_slug):
        """Test session creation with QR code"""
        success, response = self.run_test(
            f"Create Session with {qr_code}",
            "POST",
            "sessions/create",
            200,
            data={"qr_code": qr_code, "device_info": "Test Browser"}
        )
        if success and 'session' in response:
            self.session_id = response['session']['id']
            self.business_id = response['session']['business_id']
            
            # Verify correct business
            business_slug = response.get('business', {}).get('slug', '')
            if business_slug == expected_business_slug:
                print(f"   ✅ Correct business: {business_slug}")
                return True
            else:
                print(f"   ❌ Wrong business: expected {expected_business_slug}, got {business_slug}")
                return False
        return False

    def test_get_routes(self):
        """Test getting all published routes"""
        success, response = self.run_test(
            "Get Routes",
            "GET", 
            "routes",
            200
        )
        if success:
            if isinstance(response, list) and len(response) >= 5:
                print(f"   ✅ Found {len(response)} routes")
                # Check route names
                route_names = [r.get('name', '') for r in response]
                expected_routes = ["From Metro Gate 5", "From Red Fort Side", "From Omaxe Mall", "From Town Hall", "From Building Entrance"]
                found_routes = sum(1 for name in expected_routes if any(name in route_name for route_name in route_names))
                print(f"   ✅ Found {found_routes}/{len(expected_routes)} expected routes")
                return len(response) >= 5
            else:
                print(f"   ❌ Expected at least 5 routes, got {len(response) if isinstance(response, list) else 0}")
        return False

    def test_gold_rates(self):
        """Test gold rates API (AJPL feature)"""
        success, response = self.run_test(
            "Get Gold Rates",
            "GET",
            "gold-rates", 
            200
        )
        if success:
            rate_24k = response.get('rate_24k', 0)
            rate_22k = response.get('rate_22k', 0)
            if rate_24k > 0 and rate_22k > 0:
                print(f"   ✅ Valid gold rates: 24K=₹{rate_24k}, 22K=₹{rate_22k}")
                return True
            else:
                print(f"   ❌ Invalid gold rates: 24K=₹{rate_24k}, 22K=₹{rate_22k}")
        return False

    def test_admin_login(self):
        """Test admin login with bypass OTP"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "otp": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            user_role = response.get('user', {}).get('role', '')
            if user_role == 'admin':
                print(f"   ✅ Admin logged in successfully")
                return True
            else:
                print(f"   ❌ Wrong user role: expected admin, got {user_role}")
        return False

    def test_admin_stats(self):
        """Test admin dashboard statistics"""
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/stats",
            200
        )
        if success:
            required_keys = ['active_sessions', 'completed_sessions', 'help_pending', 'callback_pending', 'ajpl_active', 'yash_active']
            has_all_keys = all(key in response for key in required_keys)
            if has_all_keys:
                print(f"   ✅ All required KPI fields present")
                return True
            else:
                missing_keys = [key for key in required_keys if key not in response]
                print(f"   ❌ Missing KPI fields: {missing_keys}")
        return False

    def test_session_events(self):
        """Test adding session events"""
        if not self.session_id:
            print("❌ No session ID available for event testing")
            return False
            
        # Test route selection event
        success, response = self.run_test(
            "Add Route Selection Event",
            "POST",
            f"sessions/{self.session_id}/events",
            200,
            data={
                "event_type": "route_selected",
                "event_data": {"route_id": "test-route-id", "route_name": "Test Route"},
                "checkpoint_id": ""
            }
        )
        return success

    def test_callback_request(self):
        """Test callback request functionality"""
        if not self.session_id:
            print("❌ No session ID available for callback testing")
            return False
            
        success, response = self.run_test(
            "Create Callback Request",
            "POST",
            f"sessions/{self.session_id}/callback",
            200,
            data={
                "customer_name": "Test User",
                "customer_phone": "+91-9876543210",
                "issue_type": "cannot_find_building",
                "notes": "Test callback request"
            }
        )
        return success

def main():
    print("🚀 Starting Chandni Chowk Navigation API Tests")
    print("=" * 60)
    
    tester = NavigationAPITester()

    # Test 1: AJPL Session Creation
    print("\n📱 Testing AJPL Session Creation...")
    ajpl_session_success = tester.test_session_creation("AJPL-DEFAULT", "ajpl")
    
    # Test 2: Routes API
    print("\n🗺️ Testing Routes API...")
    routes_success = tester.test_get_routes()
    
    # Test 3: Gold Rates API (AJPL feature)
    print("\n💰 Testing Gold Rates API...")
    gold_rates_success = tester.test_gold_rates()
    
    # Test 4: Session Events
    print("\n📊 Testing Session Events...")
    events_success = tester.test_session_events()
    
    # Test 5: Callback Request
    print("\n📞 Testing Callback Request...")
    callback_success = tester.test_callback_request()
    
    # Test 6: Admin Login
    print("\n🔐 Testing Admin Authentication...")
    admin_login_success = tester.test_admin_login()
    
    # Test 7: Admin Stats
    print("\n📈 Testing Admin Dashboard Stats...")
    admin_stats_success = tester.test_admin_stats()
    
    # Test 8: Yash Session Creation 
    print("\n🏪 Testing Yash Session Creation...")
    yash_session_success = tester.test_session_creation("YASH-DEFAULT", "yash")

    # Print Results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Critical test results
    critical_tests = {
        "AJPL Session Creation": ajpl_session_success,
        "Yash Session Creation": yash_session_success, 
        "Routes API": routes_success,
        "Gold Rates API": gold_rates_success,
        "Admin Login": admin_login_success,
        "Admin Stats API": admin_stats_success
    }
    
    print(f"\n🎯 Critical Test Results:")
    for test_name, passed in critical_tests.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {test_name}: {status}")
    
    # Return exit code
    critical_failures = sum(1 for passed in critical_tests.values() if not passed)
    if critical_failures == 0:
        print(f"\n🎉 All critical tests passed!")
        return 0
    else:
        print(f"\n⚠️  {critical_failures} critical test(s) failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())