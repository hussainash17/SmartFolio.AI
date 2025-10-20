"""
Investment Goals API Integration Test

This script tests all Investment Goals endpoints using real authentication.
It logs in with actual credentials and tests the complete workflow.
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "ash123@gmail.com"  # Update with your actual user email
TEST_PASSWORD = "Ashatop*by721"  # Update with your actual password


class InvestmentGoalsAPITester:
    """Test Investment Goals API endpoints with real authentication"""
    
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url
        self.email = email
        self.password = password
        self.token: Optional[str] = None
        self.headers: dict = {}
        self.test_goal_id: Optional[str] = None
    
    def print_section(self, title: str):
        """Print formatted section header"""
        print("\n" + "=" * 80)
        print(f"  {title}")
        print("=" * 80)
    
    def login(self) -> bool:
        """Login and get authentication token"""
        self.print_section("Step 1: Authentication")
        
        try:
            response = requests.post(
                f"{self.base_url}/login/access-token",
                data={
                    "username": self.email,
                    "password": self.password
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                }
                print(f"[OK] Logged in successfully as {self.email}")
                print(f"Token: {self.token[:50]}...")
                return True
            else:
                print(f"[FAIL] Login failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Login error: {e}")
            return False
    
    def test_create_goal(self) -> bool:
        """Test: Create a new investment goal"""
        self.print_section("Step 2: Create Investment Goal")
        
        target_date = (datetime.now() + timedelta(days=3650)).isoformat()  # 10 years from now
        
        goal_data = {
            "goal_type": "RETIREMENT",
            "target_amount": 10000000,  # Rs.1 crore
            "target_date": target_date,
            "current_savings": 500000,  # Rs.5 lakh
            "risk_appetite": "MODERATE",
            "current_monthly_sip": 0,
            "description": "Test retirement goal - Retire comfortably at 60",
            "priority": 1,
            "auto_rebalance_enabled": False,
            "rebalance_threshold": 5.0
        }
        
        print("Creating goal with:")
        print(f"  Goal Type: {goal_data['goal_type']}")
        print(f"  Target Amount: Rs.{goal_data['target_amount']:,}")
        print(f"  Current Savings: Rs.{goal_data['current_savings']:,}")
        print(f"  Risk Appetite: {goal_data['risk_appetite']}")
        
        try:
            response = requests.post(
                f"{self.base_url}/kyc/goals",
                headers=self.headers,
                json=goal_data
            )
            
            if response.status_code == 200:
                goal = response.json()
                self.test_goal_id = goal["id"]
                
                print("\n[OK] Goal created successfully!")
                print(f"  Goal ID: {goal['id']}")
                print(f"  Monthly SIP Required: Rs.{goal.get('monthly_sip_required', 0):,.2f}")
                print(f"  Equity Allocation: {goal.get('equity_allocation', 0)}%")
                print(f"  Debt Allocation: {goal.get('debt_allocation', 0)}%")
                print(f"  Gold Allocation: {goal.get('gold_allocation', 0)}%")
                print(f"  Cash Allocation: {goal.get('cash_allocation', 0)}%")
                print(f"  Expected Return (Avg): {goal.get('expected_return_avg', 0)}% p.a.")
                print(f"  Probability of Achievement: {goal.get('probability_achievement', 0)}%")
                print(f"  Projected Final Value: Rs.{goal.get('projected_final_value', 0):,.2f}")
                return True
            else:
                print(f"[FAIL] Create goal failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_calculate_sip(self) -> bool:
        """Test: Calculate required SIP"""
        self.print_section("Step 3: Calculate Required SIP")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        try:
            response = requests.post(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/calculate-sip",
                headers=self.headers
            )
            
            if response.status_code == 200:
                result = response.json()
                print("[OK] SIP calculation successful!")
                print(f"  Monthly SIP Required: Rs.{result['monthly_sip_required']:,.2f}")
                print(f"  Total Investment: Rs.{result['total_investment']:,.2f}")
                print(f"  Expected Final Value: Rs.{result['expected_final_value']:,.2f}")
                print(f"  Expected Returns: Rs.{result['expected_returns']:,.2f}")
                print(f"  Time Period: {result['time_period_months']} months")
                print(f"  Probability of Success: {result['probability_of_success']}%")
                return True
            else:
                print(f"[FAIL] SIP calculation failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_add_contribution(self) -> bool:
        """Test: Add a contribution"""
        self.print_section("Step 4: Add Monthly Contribution")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        contribution_data = {
            "amount": 50000,  # Rs.50,000
            "notes": "First monthly SIP contribution"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/contributions",
                headers=self.headers,
                json=contribution_data
            )
            
            if response.status_code == 200:
                contribution = response.json()
                print("[OK] Contribution added successfully!")
                print(f"  Contribution ID: {contribution['id']}")
                print(f"  Amount: Rs.{contribution['amount']:,.2f}")
                print(f"  Date: {contribution['contributed_at']}")
                print(f"  Notes: {contribution['notes']}")
                return True
            else:
                print(f"[FAIL] Add contribution failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_get_progress(self) -> bool:
        """Test: Get goal progress"""
        self.print_section("Step 5: Get Goal Progress")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/progress",
                headers=self.headers
            )
            
            if response.status_code == 200:
                progress = response.json()
                print("[OK] Progress retrieved successfully!")
                print(f"  Current Value: Rs.{progress['current_value']:,.2f}")
                print(f"  Target Amount: Rs.{progress['target_amount']:,.2f}")
                print(f"  Progress: {progress['progress_percentage']:.2f}%")
                print(f"  Status: {progress['on_track_status']}")
                print(f"  Total Contributions: Rs.{progress['total_contributions']:,.2f}")
                print(f"  Total Returns: Rs.{progress['total_returns']:,.2f}")
                print(f"  Months Remaining: {progress['months_remaining']}")
                print(f"  Projected Final Value: Rs.{progress['projected_final_value']:,.2f}")
                print(f"  Recommendation: {progress.get('recommended_action', 'N/A')}")
                return True
            else:
                print(f"[FAIL] Get progress failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_what_if_scenario(self) -> bool:
        """Test: What-if scenario analysis"""
        self.print_section("Step 6: What-If Scenario Analysis")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        scenario_data = {
            "additional_monthly_investment": 10000,  # Rs.10,000 more per month
            "delay_months": 0,
            "return_adjustment": -1.0  # 1% lower returns
        }
        
        print("Testing scenario:")
        print(f"  Additional monthly investment: Rs.{scenario_data['additional_monthly_investment']:,}")
        print(f"  Return adjustment: {scenario_data['return_adjustment']}%")
        
        try:
            response = requests.post(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/what-if",
                headers=self.headers,
                json=scenario_data
            )
            
            if response.status_code == 200:
                result = response.json()
                print("\n[OK] What-if scenario calculated!")
                print(f"  Scenario: {result['scenario_description']}")
                print(f"  New Monthly SIP: Rs.{result['new_monthly_sip']:,.2f}")
                print(f"  New Projected Value: Rs.{result['new_projected_value']:,.2f}")
                print(f"  New Probability: {result['new_probability']}%")
                print(f"  Impact: {result['impact_on_goal']}")
                print(f"  Recommendation: {result['recommendation']}")
                return True
            else:
                print(f"[FAIL] What-if scenario failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_asset_allocation(self) -> bool:
        """Test: Get asset allocation recommendation"""
        self.print_section("Step 7: Asset Allocation Recommendation")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/asset-allocation",
                headers=self.headers
            )
            
            if response.status_code == 200:
                allocation = response.json()
                print("[OK] Asset allocation recommendation retrieved!")
                print(f"  Equity: {allocation['equity_percent']}%")
                print(f"  Debt: {allocation['debt_percent']}%")
                print(f"  Gold: {allocation['gold_percent']}%")
                print(f"  Cash: {allocation['cash_percent']}%")
                print(f"  Risk Level: {allocation['risk_level']}")
                print(f"  Rationale: {allocation['rationale']}")
                return True
            else:
                print(f"[FAIL] Asset allocation failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_product_recommendations(self) -> bool:
        """Test: Get product recommendations"""
        self.print_section("Step 8: Product Recommendations")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/recommendations",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print("[OK] Product recommendations retrieved!")
                print(f"  Total Allocation: {data['total_allocation']}%")
                print(f"  Diversification Score: {data['diversification_score']}")
                print(f"\n  Recommended Products:")
                for rec in data['recommendations']:
                    print(f"\n    {rec['product_type']}: {rec['product_name']}")
                    print(f"      Allocation: {rec['allocation_percent']}%")
                    print(f"      Expected Return: {rec['expected_return']}% p.a.")
                    print(f"      Risk Level: {rec['risk_level']}")
                    print(f"      Rationale: {rec['rationale']}")
                return True
            else:
                print(f"[FAIL] Product recommendations failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_get_alerts(self) -> bool:
        """Test: Get goal alerts"""
        self.print_section("Step 9: Goal Alerts")
        
        if not self.test_goal_id:
            print("[SKIP] No goal ID available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}/alerts",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"[OK] Alerts retrieved! Total: {data['total_alerts']}")
                
                if data['total_alerts'] > 0:
                    print("\n  Active Alerts:")
                    for alert in data['alerts']:
                        print(f"\n    [{alert['severity']}] {alert['alert_type']}")
                        print(f"      Message: {alert['message']}")
                        if alert['action_required']:
                            print(f"      Action: {alert['action_required']}")
                else:
                    print("  No active alerts (goal is on track!)")
                
                return True
            else:
                print(f"[FAIL] Get alerts failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def test_list_goals(self) -> bool:
        """Test: List all goals"""
        self.print_section("Step 10: List All Goals")
        
        try:
            response = requests.get(
                f"{self.base_url}/kyc/goals",
                headers=self.headers
            )
            
            if response.status_code == 200:
                goals = response.json()
                print(f"[OK] Found {len(goals)} goal(s)")
                
                for i, goal in enumerate(goals, 1):
                    print(f"\n  Goal {i}:")
                    print(f"    Type: {goal['goal_type']}")
                    print(f"    Target: Rs.{goal.get('target_amount', 0):,.2f}")
                    print(f"    Progress: {goal.get('progress_percentage', 0):.2f}%")
                    print(f"    Status: {goal.get('on_track_status', 'N/A')}")
                    print(f"    Probability: {goal.get('probability_achievement', 0)}%")
                
                return True
            else:
                print(f"[FAIL] List goals failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {e}")
            return False
    
    def cleanup(self) -> bool:
        """Cleanup: Delete test goal"""
        self.print_section("Cleanup: Delete Test Goal")
        
        if not self.test_goal_id:
            print("[SKIP] No goal to delete")
            return True
        
        try:
            response = requests.delete(
                f"{self.base_url}/kyc/goals/{self.test_goal_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                print("[OK] Test goal deleted successfully")
                return True
            else:
                print(f"[WARN] Delete failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[WARN] Cleanup error: {e}")
            return False
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("\n" + "=" * 80)
        print("  INVESTMENT GOALS API - INTEGRATION TEST SUITE")
        print("  Using Real Authentication System")
        print("=" * 80)
        
        results = []
        
        # Step 1: Login
        if not self.login():
            print("\n[FAIL] Cannot proceed without authentication")
            return False
        
        # Step 2: Create goal
        results.append(("Create Goal", self.test_create_goal()))
        
        # Step 3: Calculate SIP
        results.append(("Calculate SIP", self.test_calculate_sip()))
        
        # Step 4: Add contribution
        results.append(("Add Contribution", self.test_add_contribution()))
        
        # Step 5: Get progress
        results.append(("Get Progress", self.test_get_progress()))
        
        # Step 6: What-if scenario
        results.append(("What-If Scenario", self.test_what_if_scenario()))
        
        # Step 7: Asset allocation
        results.append(("Asset Allocation", self.test_asset_allocation()))
        
        # Step 8: Product recommendations
        results.append(("Product Recommendations", self.test_product_recommendations()))
        
        # Step 9: Alerts
        results.append(("Goal Alerts", self.test_get_alerts()))
        
        # Step 10: List goals
        results.append(("List Goals", self.test_list_goals()))
        
        # Cleanup
        self.cleanup()
        
        # Print summary
        self.print_section("TEST SUMMARY")
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        print(f"Tests Passed: {passed}/{total}")
        print("\nDetailed Results:")
        for test_name, result in results:
            status = "[OK]" if result else "[FAIL]"
            print(f"  {status} {test_name}")
        
        if passed == total:
            print("\n[SUCCESS] All tests passed! Investment Goals API is fully functional!")
            print("\nYou can now:")
            print("  1. Access Swagger UI at http://localhost:8000/docs")
            print("  2. Regenerate frontend types: cd pms-frontend && npm run generate-client")
            print("  3. Build frontend UI components for Investment Goals")
            return True
        else:
            print(f"\n[WARNING] {total - passed} test(s) failed")
            return False


def main():
    """Main entry point"""
    print("\nInvestment Goals API Integration Test")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("\nMake sure:")
    print("  1. Backend server is running (fastapi run --reload)")
    print("  2. Database migration is applied (alembic upgrade head)")
    print("  3. Test user exists in the database")
    print("\nStarting tests in 3 seconds...")
    
    import time
    time.sleep(3)
    
    tester = InvestmentGoalsAPITester(BASE_URL, TEST_EMAIL, TEST_PASSWORD)
    success = tester.run_all_tests()
    
    return 0 if success else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())

