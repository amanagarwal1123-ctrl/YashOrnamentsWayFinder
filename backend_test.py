#!/usr/bin/env python3
"""
Backend API Testing for Yash Ornaments WayFinder
Tests all new branding, QR generation, media upload, and scanning features.
"""

import requests
import sys
import json
from datetime import datetime
from pathlib import Path

class YashWayFinderTester:
    def __init__(self, base_url="https://content-section.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []
        self.admin_username = "admin"
        self.admin_otp = "admin123"

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
            self.failures.append({"test": test_name, "error": details})

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_result(name, True)
                try:
                    return response.json() if response.content else {}
                except:
                    return {"status": "success", "raw_response": response.text}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response.content:
                    try:
                        error_data = response.json()
                        if 'detail' in error_data:
                            error_msg += f" - {error_data['detail']}"
                    except:
                        error_msg += f" - {response.text[:100]}"
                self.log_result(name, False, error_msg)
                return {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return {}

    def test_admin_login(self):
        """Test admin login"""
        print("\n═══ ADMIN AUTHENTICATION ═══")
        response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            {"username": self.admin_username, "otp": self.admin_otp}
        )
        if response and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_branding_apis(self):
        """Test branding configuration APIs"""
        print("\n═══ BRANDING APIS ═══")
        
        # Test public branding endpoint
        branding = self.run_test(
            "GET /api/branding (public)",
            "GET", 
            "branding",
            200
        )
        
        # Verify app name is updated
        if branding:
            app_name = branding.get('app_name', '')
            if 'Yash Ornaments WayFinder' in app_name:
                self.log_result("App name shows 'Yash Ornaments WayFinder'", True)
            else:
                self.log_result("App name shows 'Yash Ornaments WayFinder'", False, f"Got: {app_name}")
            
            footer = branding.get('branding_footer', '')
            if 'Navigation powered by YASH ORNAMENTS' in footer:
                self.log_result("Branding footer correct", True)
            else:
                self.log_result("Branding footer correct", False, f"Got: {footer}")

        # Test admin branding endpoints
        admin_branding = self.run_test(
            "GET /api/admin/branding", 
            "GET",
            "admin/branding",
            200
        )
        
        if admin_branding:
            # Test updating branding settings
            updated_branding = {
                **admin_branding,
                "watermark_opacity": 0.25,
                "app_name": "Yash Ornaments WayFinder"
            }
            
            self.run_test(
                "PUT /api/admin/branding",
                "PUT",
                "admin/branding", 
                200,
                updated_branding
            )

    def test_qr_generation_apis(self):
        """Test QR code generation APIs"""
        print("\n═══ QR GENERATION APIS ═══")
        
        # Get businesses first
        businesses = self.run_test(
            "GET /api/admin/businesses",
            "GET",
            "admin/businesses", 
            200
        )
        
        if not businesses:
            self.log_result("QR Generation (no businesses found)", False, "Cannot test without businesses")
            return
        
        # Find AJPL and Yash businesses
        ajpl_biz = None
        yash_biz = None
        for biz in businesses:
            if biz.get('slug') == 'ajpl':
                ajpl_biz = biz
            elif biz.get('slug') == 'yash':
                yash_biz = biz
        
        # Test QR generation for AJPL
        if ajpl_biz:
            qr_result = self.run_test(
                "POST /api/admin/qr/generate (AJPL)",
                "POST",
                "admin/qr/generate",
                200,
                {
                    "business_id": ajpl_biz['id'],
                    "campaign": "test-ajpl",
                    "description": "Test QR for AJPL"
                }
            )
            
            if qr_result and 'qr_code' in qr_result:
                qr_code = qr_result['qr_code']
                if qr_code.startswith('AJPL-'):
                    self.log_result("QR code has AJPL prefix", True)
                else:
                    self.log_result("QR code has AJPL prefix", False, f"Got: {qr_code}")
                
                # Test the scan URL
                if 'scan_url' in qr_result:
                    scan_url = qr_result['scan_url']
                    if 'content-section.preview.emergentagent.com' in scan_url:
                        self.log_result("QR scan URL correct domain", True)
                    else:
                        self.log_result("QR scan URL correct domain", False, f"Got: {scan_url}")

    def test_scan_apis(self):
        """Test QR scanning APIs using predefined test QR codes"""
        print("\n═══ QR SCANNING APIS ═══")
        
        # Test with the predefined test QR codes from the review request
        test_qr_codes = ["AJPL-33E0F163", "YASH-1D598159"]
        
        for qr_code in test_qr_codes:
            # Test getting QR info
            qr_info = self.run_test(
                f"GET /api/scan/{qr_code}/info",
                "GET",
                f"scan/{qr_code}/info",
                200
            )
            
            if qr_info:
                business = qr_info.get('business', {})
                business_name = business.get('name', '')
                
                if qr_code.startswith('AJPL'):
                    if 'ajpl' in business.get('slug', '').lower():
                        self.log_result(f"QR {qr_code} returns AJPL business", True)
                    else:
                        self.log_result(f"QR {qr_code} returns AJPL business", False, f"Got business: {business_name}")
                elif qr_code.startswith('YASH'):
                    if 'yash' in business.get('slug', '').lower():
                        self.log_result(f"QR {qr_code} returns Yash business", True)
                    else:
                        self.log_result(f"QR {qr_code} returns Yash business", False, f"Got business: {business_name}")
                
                # Test customer registration
                registration = self.run_test(
                    f"POST /api/scan/{qr_code}/register",
                    "POST", 
                    f"scan/{qr_code}/register",
                    200,
                    {
                        "customer_name": "Test Customer",
                        "customer_phone": "9876543210",
                        "device_info": "Test Device"
                    }
                )
                
                if registration and 'session' in registration:
                    session = registration['session']
                    if session.get('customer_name') == "Test Customer":
                        self.log_result(f"QR {qr_code} registration success", True)
                    else:
                        self.log_result(f"QR {qr_code} registration success", False, "Customer name not saved")

    def test_media_apis(self):
        """Test media upload and watermark APIs"""
        print("\n═══ MEDIA APIS ═══")
        
        # Test placeholder media generation
        placeholder = self.run_test(
            "GET /api/media/placeholder/Metro-Gate-5",
            "GET",
            "media/placeholder/Metro-Gate-5",
            200,
            headers={'Accept': 'image/jpeg'}
        )
        
        # Cannot test file upload without actual files, but test the endpoint existence
        # We'll use playwright to test the actual file upload workflow
        
        # Test admin media endpoints
        media_list = self.run_test(
            "GET /api/admin/media",
            "GET", 
            "admin/media",
            200
        )

    def test_core_navigation_apis(self):
        """Test core navigation APIs still work"""
        print("\n═══ CORE NAVIGATION APIS ═══")
        
        # Test routes
        routes = self.run_test("GET /api/routes", "GET", "routes", 200)
        
        # Test gold rates (AJPL only feature)
        self.run_test("GET /api/gold-rates", "GET", "gold-rates", 200)
        
        # Test gallery (AJPL only feature) 
        self.run_test("GET /api/gallery", "GET", "gallery", 200)

    def test_admin_qr_sources(self):
        """Test admin QR sources management"""
        print("\n═══ ADMIN QR SOURCES ═══")
        
        qr_sources = self.run_test(
            "GET /api/admin/qr-sources",
            "GET",
            "admin/qr-sources", 
            200
        )
        
        if qr_sources and len(qr_sources) > 0:
            # Check if our test QR codes exist
            existing_codes = [qr.get('code', '') for qr in qr_sources]
            for test_code in ["AJPL-33E0F163", "YASH-1D598159"]:
                if test_code in existing_codes:
                    self.log_result(f"Test QR code {test_code} exists in DB", True)
                else:
                    self.log_result(f"Test QR code {test_code} exists in DB", False, "QR code not found")

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Yash Ornaments WayFinder API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Login first
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot continue with admin tests")
            return self.generate_report()
        
        # Run all test categories
        self.test_branding_apis()
        self.test_qr_generation_apis() 
        self.test_scan_apis()
        self.test_media_apis()
        self.test_admin_qr_sources()
        self.test_core_navigation_apis()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/max(self.tests_run,1)*100):.1f}%")
        
        if self.failures:
            print("\n❌ FAILURES:")
            for failure in self.failures:
                print(f"  • {failure['test']}: {failure['error']}")
        
        return {
            "total": self.tests_run,
            "passed": self.tests_passed,
            "failed": self.tests_run - self.tests_passed,
            "success_rate": self.tests_passed/max(self.tests_run,1)*100,
            "failures": self.failures
        }

def main():
    tester = YashWayFinderTester()
    report = tester.run_all_tests()
    
    # Return non-zero exit code if there are failures
    return 0 if report["failed"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())