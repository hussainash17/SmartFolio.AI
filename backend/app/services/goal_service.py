"""
Enhanced Investment Goal Service

This module provides comprehensive goal management including:
- Goal CRUD operations
- SIP calculations and recommendations
- Progress tracking and monitoring
- Asset allocation recommendations
- What-if scenario analysis
- Product recommendations
- Alert generation
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlmodel import Session, select
import logging

from app.services.base import BaseService, ServiceException
from app.model.user import (
    UserInvestmentGoal,
    UserInvestmentGoalCreate,
    UserInvestmentGoalUpdate,
    UserInvestmentGoalContribution,
    UserInvestmentGoalContributionCreate,
    InvestmentGoal,
    RiskAppetite,
    GoalTrackingStatus,
    AssetAllocationRecommendation,
    SIPCalculationResult,
    GoalProgressResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
    ProductRecommendation,
    ProductRecommendationResponse,
    GoalAlert,
    GoalAlertResponse,
)
from app.services.financial_calculations import FinancialCalculator

logger = logging.getLogger(__name__)


class EnhancedInvestmentGoalService(BaseService[UserInvestmentGoal, UserInvestmentGoalCreate, UserInvestmentGoalUpdate]):
    """Enhanced service for managing investment goals with advanced features"""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(UserInvestmentGoal, session)
        self.financial_calc = FinancialCalculator()
    
    # ==================== CRUD Operations ====================
    
    def get_user_goals(self, user_id: UUID, active_only: bool = True) -> List[UserInvestmentGoal]:
        """Get investment goals for a user"""
        try:
            query = select(UserInvestmentGoal).where(UserInvestmentGoal.user_id == user_id)
            
            if active_only:
                query = query.where(UserInvestmentGoal.is_active == True)
            
            return self.session.exec(
                query.order_by(UserInvestmentGoal.priority, UserInvestmentGoal.created_at)
            ).all()
        except Exception as e:
            logger.error(f"Error retrieving goals for user {user_id}: {e}")
            raise ServiceException("Failed to retrieve investment goals")
    
    def create_goal_with_calculations(
        self, 
        user_id: UUID, 
        goal_data: UserInvestmentGoalCreate
    ) -> UserInvestmentGoal:
        """
        Create an investment goal and automatically calculate SIP, allocation, and projections.
        """
        self._validate_goal_data(goal_data)
        
        # Calculate years to goal
        if goal_data.target_date:
            years_to_goal = (goal_data.target_date - datetime.utcnow()).days / 365.25
        else:
            years_to_goal = 10  # Default 10 years if no target date
        
        # Get asset allocation recommendation
        risk_appetite = goal_data.risk_appetite or RiskAppetite.MODERATE
        asset_allocation = self.financial_calc.get_asset_allocation_for_goal(
            goal_data.goal_type,
            risk_appetite,
            years_to_goal
        )
        
        # Calculate expected returns
        min_return, avg_return, max_return = self.financial_calc.calculate_expected_returns(asset_allocation)
        
        # Calculate required SIP
        if goal_data.target_amount and goal_data.target_amount > 0:
            sip_calc = self.financial_calc.calculate_sip_required(
                goal_data.target_amount,
                goal_data.current_savings or 0,
                years_to_goal,
                avg_return
            )
            
            monthly_sip_required = sip_calc['monthly_sip_required']
            projected_value = sip_calc['expected_final_value']
            
            # Calculate probability of success
            probability = self.financial_calc.calculate_goal_probability(
                goal_data.target_amount,
                monthly_sip_required,
                goal_data.current_savings or 0,
                years_to_goal,
                asset_allocation
            )
        else:
            monthly_sip_required = None
            projected_value = None
            probability = None
        
        # Create goal with calculated values
        goal = self.create(
            goal_data,
            user_id=user_id,
            monthly_sip_required=monthly_sip_required,
            equity_allocation=asset_allocation.get('equity'),
            debt_allocation=asset_allocation.get('debt'),
            gold_allocation=asset_allocation.get('gold'),
            cash_allocation=asset_allocation.get('cash'),
            expected_return_min=min_return,
            expected_return_max=max_return,
            expected_return_avg=avg_return,
            probability_achievement=probability,
            projected_final_value=projected_value,
            current_value=goal_data.current_savings or 0,
            total_contributions=goal_data.current_savings or 0,
            total_returns=0,
            progress_percentage=0,
            on_track_status=GoalTrackingStatus.ON_TRACK,
            milestones={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Created investment goal for user {user_id}: {goal_data.goal_type}")
        return goal
    
    def update_goal_with_recalculation(
        self,
        goal_id: UUID,
        user_id: UUID,
        goal_update: UserInvestmentGoalUpdate
    ) -> Optional[UserInvestmentGoal]:
        """Update goal and recalculate all metrics"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        # Update the goal
        updated_goal = self.update(goal_id, goal_update, updated_at=datetime.utcnow())
        
        # Recalculate if key fields changed
        needs_recalc = any([
            goal_update.target_amount is not None,
            goal_update.target_date is not None,
            goal_update.risk_appetite is not None,
            goal_update.current_monthly_sip is not None,
        ])
        
        if needs_recalc and updated_goal:
            self._recalculate_goal_metrics(updated_goal)
        
        return updated_goal
    
    def deactivate_goal(self, goal_id: UUID, user_id: UUID) -> bool:
        """Deactivate an investment goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        self.update(goal_id, UserInvestmentGoalUpdate(is_active=False))
        logger.info(f"Deactivated investment goal {goal_id}")
        return True
    
    # ==================== Contribution Management ====================
    
    def add_contribution(
        self, 
        user_id: UUID, 
        goal_id: UUID, 
        contribution_data: UserInvestmentGoalContributionCreate
    ) -> UserInvestmentGoalContribution:
        """Add a contribution to a goal and update goal metrics"""
        # Verify goal ownership
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        # Create contribution
        contribution = UserInvestmentGoalContribution(
            user_id=user_id,
            goal_id=goal_id,
            amount=contribution_data.amount,
            contributed_at=contribution_data.contributed_at or datetime.utcnow(),
            notes=contribution_data.notes,
            created_at=datetime.utcnow()
        )
        
        self.session.add(contribution)
        
        # Update goal metrics
        goal.total_contributions = (goal.total_contributions or 0) + contribution_data.amount
        goal.current_value = (goal.current_value or 0) + contribution_data.amount
        goal.updated_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(contribution)
        self.session.refresh(goal)
        
        # Recalculate progress
        self._recalculate_goal_metrics(goal)
        
        logger.info(f"Added contribution of {contribution_data.amount} to goal {goal_id}")
        return contribution
    
    def list_contributions(
        self, 
        user_id: UUID, 
        goal_id: UUID
    ) -> List[UserInvestmentGoalContribution]:
        """List all contributions for a goal"""
        # Verify goal ownership
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        contributions = self.session.exec(
            select(UserInvestmentGoalContribution)
            .where(UserInvestmentGoalContribution.goal_id == goal_id)
            .order_by(UserInvestmentGoalContribution.contributed_at.desc())
        ).all()
        
        return list(contributions)
    
    def delete_contribution(self, user_id: UUID, contribution_id: UUID) -> bool:
        """Delete a contribution and update goal metrics"""
        contribution = self.session.exec(
            select(UserInvestmentGoalContribution)
            .where(UserInvestmentGoalContribution.id == contribution_id)
        ).first()
        
        if not contribution or contribution.user_id != user_id:
            raise ServiceException("Contribution not found", status_code=404)
        
        goal = self.get_by_id(contribution.goal_id)
        if goal:
            # Update goal metrics
            goal.total_contributions = (goal.total_contributions or 0) - contribution.amount
            goal.current_value = max(0, (goal.current_value or 0) - contribution.amount)
            goal.updated_at = datetime.utcnow()
        
        self.session.delete(contribution)
        self.session.commit()
        
        if goal:
            self._recalculate_goal_metrics(goal)
        
        logger.info(f"Deleted contribution {contribution_id}")
        return True
    
    # ==================== Goal Calculations ====================
    
    def calculate_sip(self, goal_id: UUID, user_id: UUID) -> SIPCalculationResult:
        """Calculate required SIP for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        if not goal.target_amount or not goal.target_date:
            raise ServiceException("Goal must have target amount and date", status_code=400)
        
        years_to_goal = (goal.target_date - datetime.utcnow()).days / 365.25
        if years_to_goal <= 0:
            raise ServiceException("Target date must be in the future", status_code=400)
        
        sip_calc = self.financial_calc.calculate_sip_required(
            goal.target_amount,
            goal.current_value or 0,
            years_to_goal,
            goal.expected_return_avg or 10.0
        )
        
        # Calculate probability
        asset_allocation = {
            'equity': goal.equity_allocation or 50,
            'debt': goal.debt_allocation or 35,
            'gold': goal.gold_allocation or 10,
            'cash': goal.cash_allocation or 5,
        }
        
        probability = self.financial_calc.calculate_goal_probability(
            goal.target_amount,
            sip_calc['monthly_sip_required'],
            goal.current_value or 0,
            years_to_goal,
            asset_allocation
        )
        
        return SIPCalculationResult(
            monthly_sip_required=sip_calc['monthly_sip_required'],
            total_investment=sip_calc['total_investment'],
            expected_final_value=sip_calc['expected_final_value'],
            expected_returns=sip_calc['expected_returns'],
            time_period_months=sip_calc['time_period_months'],
            probability_of_success=probability
        )
    
    def get_goal_progress(self, goal_id: UUID, user_id: UUID) -> GoalProgressResponse:
        """Get detailed progress information for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        if not goal.target_amount or not goal.target_date:
            raise ServiceException("Goal must have target amount and date", status_code=400)
        
        months_remaining = int((goal.target_date - datetime.utcnow()).days / 30.44)
        
        # Calculate shortfall/surplus
        shortfall = max(0, goal.target_amount - (goal.current_value or 0))
        
        # Determine recommended action
        if goal.on_track_status == GoalTrackingStatus.BEHIND:
            recommended_action = f"Increase monthly SIP by ₹{shortfall / max(months_remaining, 1):.0f} to stay on track"
        elif goal.on_track_status == GoalTrackingStatus.AHEAD:
            recommended_action = "You're ahead of schedule! Consider reducing SIP or reallocating to other goals"
        else:
            recommended_action = "Continue with current investment plan"
        
        return GoalProgressResponse(
            goal_id=goal.id,
            goal_name=goal.goal_type.value,
            current_value=goal.current_value or 0,
            target_amount=goal.target_amount,
            progress_percentage=goal.progress_percentage or 0,
            on_track_status=goal.on_track_status or GoalTrackingStatus.ON_TRACK,
            shortfall_amount=shortfall,
            total_contributions=goal.total_contributions or 0,
            total_returns=goal.total_returns or 0,
            months_remaining=max(0, months_remaining),
            projected_final_value=goal.projected_final_value or goal.target_amount,
            recommended_action=recommended_action
        )
    
    def calculate_what_if_scenario(
        self,
        goal_id: UUID,
        user_id: UUID,
        scenario: WhatIfScenarioRequest
    ) -> WhatIfScenarioResponse:
        """Calculate what-if scenario for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        if not goal.target_amount or not goal.target_date:
            raise ServiceException("Goal must have target amount and date", status_code=400)
        
        years_to_goal = (goal.target_date - datetime.utcnow()).days / 365.25
        
        # Apply scenario adjustments
        new_monthly_sip = (goal.current_monthly_sip or goal.monthly_sip_required or 0)
        if scenario.additional_monthly_investment:
            new_monthly_sip += scenario.additional_monthly_investment
        
        new_years = years_to_goal
        if scenario.delay_months:
            new_years += scenario.delay_months / 12
        
        new_return = goal.expected_return_avg or 10.0
        if scenario.return_adjustment:
            new_return += scenario.return_adjustment
        
        # Calculate new projection
        new_projected_value = self.financial_calc.calculate_future_value(
            new_monthly_sip,
            goal.current_value or 0,
            new_years,
            new_return
        )
        
        # Calculate new probability
        asset_allocation = {
            'equity': goal.equity_allocation or 50,
            'debt': goal.debt_allocation or 35,
            'gold': goal.gold_allocation or 10,
            'cash': goal.cash_allocation or 5,
        }
        
        new_probability = self.financial_calc.calculate_goal_probability(
            goal.target_amount,
            new_monthly_sip,
            goal.current_value or 0,
            new_years,
            asset_allocation
        )
        
        # Generate description and recommendation
        scenario_parts = []
        if scenario.additional_monthly_investment:
            scenario_parts.append(f"₹{scenario.additional_monthly_investment:.0f} additional monthly investment")
        if scenario.delay_months:
            scenario_parts.append(f"{scenario.delay_months} months delay")
        if scenario.return_adjustment:
            scenario_parts.append(f"{scenario.return_adjustment:+.1f}% return adjustment")
        
        scenario_description = " + ".join(scenario_parts) if scenario_parts else "Base scenario"
        
        impact = "POSITIVE" if new_projected_value >= goal.target_amount else "NEGATIVE"
        recommendation = (
            "This scenario improves your chances of achieving the goal" if impact == "POSITIVE"
            else "This scenario reduces your chances - consider alternative adjustments"
        )
        
        return WhatIfScenarioResponse(
            scenario_description=scenario_description,
            new_monthly_sip=new_monthly_sip,
            new_projected_value=new_projected_value,
            new_probability=new_probability,
            impact_on_goal=impact,
            recommendation=recommendation
        )
    
    # ==================== Recommendations ====================
    
    def get_asset_allocation_recommendation(
        self,
        goal_id: UUID,
        user_id: UUID
    ) -> AssetAllocationRecommendation:
        """Get asset allocation recommendation for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        if not goal.target_date:
            raise ServiceException("Goal must have a target date", status_code=400)
        
        years_to_goal = (goal.target_date - datetime.utcnow()).days / 365.25
        risk_appetite = goal.risk_appetite or RiskAppetite.MODERATE
        
        allocation = self.financial_calc.get_asset_allocation_for_goal(
            goal.goal_type,
            risk_appetite,
            years_to_goal
        )
        
        # Generate rationale
        rationale = self._generate_allocation_rationale(goal.goal_type, risk_appetite, years_to_goal)
        
        return AssetAllocationRecommendation(
            equity_percent=allocation['equity'],
            debt_percent=allocation['debt'],
            gold_percent=allocation['gold'],
            cash_percent=allocation['cash'],
            rationale=rationale,
            risk_level=risk_appetite
        )
    
    def get_product_recommendations(
        self,
        goal_id: UUID,
        user_id: UUID
    ) -> ProductRecommendationResponse:
        """Get investment product recommendations for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        recommendations = []
        
        # Equity recommendations
        if goal.equity_allocation and goal.equity_allocation > 0:
            recommendations.append(ProductRecommendation(
                product_type="ETF",
                product_name="Nifty 50 Index Fund",
                ticker="NIFTY50",
                allocation_percent=goal.equity_allocation * 0.6,
                expected_return=12.0,
                risk_level="MEDIUM",
                rationale="Low-cost diversified exposure to top 50 Indian companies"
            ))
            recommendations.append(ProductRecommendation(
                product_type="MUTUAL_FUND",
                product_name="Large & Mid Cap Fund",
                ticker=None,
                allocation_percent=goal.equity_allocation * 0.4,
                expected_return=14.0,
                risk_level="MEDIUM_HIGH",
                rationale="Growth potential from mid-cap stocks with large-cap stability"
            ))
        
        # Debt recommendations
        if goal.debt_allocation and goal.debt_allocation > 0:
            recommendations.append(ProductRecommendation(
                product_type="BOND",
                product_name="Government Securities",
                ticker="GSEC",
                allocation_percent=goal.debt_allocation * 0.7,
                expected_return=7.5,
                risk_level="LOW",
                rationale="Safe government-backed fixed income"
            ))
            recommendations.append(ProductRecommendation(
                product_type="FD",
                product_name="Fixed Deposit",
                ticker=None,
                allocation_percent=goal.debt_allocation * 0.3,
                expected_return=7.0,
                risk_level="VERY_LOW",
                rationale="Capital protection with guaranteed returns"
            ))
        
        # Gold recommendation
        if goal.gold_allocation and goal.gold_allocation > 0:
            recommendations.append(ProductRecommendation(
                product_type="ETF",
                product_name="Gold ETF",
                ticker="GOLDBEES",
                allocation_percent=goal.gold_allocation,
                expected_return=8.0,
                risk_level="LOW",
                rationale="Inflation hedge and portfolio diversification"
            ))
        
        # Cash/Liquid recommendation
        if goal.cash_allocation and goal.cash_allocation > 0:
            recommendations.append(ProductRecommendation(
                product_type="MUTUAL_FUND",
                product_name="Liquid Fund",
                ticker=None,
                allocation_percent=goal.cash_allocation,
                expected_return=4.0,
                risk_level="VERY_LOW",
                rationale="High liquidity with better returns than savings account"
            ))
        
        total_allocation = sum(r.allocation_percent for r in recommendations)
        diversification_score = min(100, len(recommendations) * 20)
        
        return ProductRecommendationResponse(
            goal_id=goal.id,
            recommendations=recommendations,
            total_allocation=total_allocation,
            diversification_score=diversification_score
        )
    
    # ==================== Alerts ====================
    
    def get_goal_alerts(self, goal_id: UUID, user_id: UUID) -> GoalAlertResponse:
        """Generate alerts for a goal"""
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        alerts = []
        
        # Goal drift alert
        if goal.on_track_status == GoalTrackingStatus.BEHIND:
            alerts.append(GoalAlert(
                alert_type="DRIFT",
                severity="WARNING",
                message=f"Your goal is behind schedule by ₹{goal.shortfall_amount or 0:.0f}",
                action_required="Consider increasing your monthly SIP",
                created_at=datetime.utcnow()
            ))
        elif goal.on_track_status == GoalTrackingStatus.AT_RISK:
            alerts.append(GoalAlert(
                alert_type="DRIFT",
                severity="CRITICAL",
                message="Your goal is significantly off-track",
                action_required="Urgent review and adjustment needed",
                created_at=datetime.utcnow()
            ))
        
        # Milestone alerts
        if goal.progress_percentage and goal.progress_percentage >= 25 and not goal.milestones.get('25%'):
            alerts.append(GoalAlert(
                alert_type="MILESTONE",
                severity="INFO",
                message="Congratulations! You've achieved 25% of your goal",
                action_required=None,
                created_at=datetime.utcnow()
            ))
        
        # Rebalancing alert
        if goal.auto_rebalance_enabled and goal.last_rebalance_date:
            days_since_rebalance = (datetime.utcnow() - goal.last_rebalance_date).days
            if days_since_rebalance > 180:  # 6 months
                alerts.append(GoalAlert(
                    alert_type="REBALANCE_NEEDED",
                    severity="INFO",
                    message="Portfolio rebalancing is due",
                    action_required="Review and rebalance your portfolio",
                    created_at=datetime.utcnow()
                ))
        
        # Review reminder
        if goal.last_reviewed_date:
            days_since_review = (datetime.utcnow() - goal.last_reviewed_date).days
            if days_since_review > 90:  # 3 months
                alerts.append(GoalAlert(
                    alert_type="REVIEW_DUE",
                    severity="INFO",
                    message="Goal review is overdue",
                    action_required="Review your goal progress and adjust if needed",
                    created_at=datetime.utcnow()
                ))
        
        return GoalAlertResponse(
            goal_id=goal.id,
            alerts=alerts,
            total_alerts=len(alerts)
        )
    
    # ==================== Internal Helper Methods ====================
    
    def _recalculate_goal_metrics(self, goal: UserInvestmentGoal) -> None:
        """Recalculate all metrics for a goal"""
        if not goal.target_amount or not goal.target_date:
            return
        
        try:
            # Calculate progress percentage
            if goal.target_amount > 0:
                goal.progress_percentage = min(100, ((goal.current_value or 0) / goal.target_amount) * 100)
            
            # Calculate years remaining
            years_remaining = (goal.target_date - datetime.utcnow()).days / 365.25
            if years_remaining <= 0:
                goal.on_track_status = GoalTrackingStatus.AT_RISK
                self.session.commit()
                return
            
            # Calculate expected returns
            goal.total_returns = (goal.current_value or 0) - (goal.total_contributions or 0)
            
            # Calculate shortfall and projection
            asset_allocation = {
                'equity': goal.equity_allocation or 50,
                'debt': goal.debt_allocation or 35,
                'gold': goal.gold_allocation or 10,
                'cash': goal.cash_allocation or 5,
            }
            
            shortfall_calc = self.financial_calc.calculate_shortfall(
                goal.current_value or 0,
                goal.target_amount,
                int(years_remaining * 12),
                goal.current_monthly_sip or goal.monthly_sip_required or 0,
                goal.expected_return_avg or 10.0
            )
            
            goal.projected_final_value = shortfall_calc['projected_value']
            goal.shortfall_amount = shortfall_calc['shortfall_amount']
            
            # Update tracking status
            if shortfall_calc['on_track']:
                goal.on_track_status = GoalTrackingStatus.ON_TRACK
            elif shortfall_calc['shortfall_amount'] > goal.target_amount * 0.1:  # >10% shortfall
                goal.on_track_status = GoalTrackingStatus.AT_RISK
            else:
                goal.on_track_status = GoalTrackingStatus.BEHIND
            
            # Update probability
            goal.probability_achievement = self.financial_calc.calculate_goal_probability(
                goal.target_amount,
                goal.current_monthly_sip or goal.monthly_sip_required or 0,
                goal.current_value or 0,
                years_remaining,
                asset_allocation
            )
            
            goal.updated_at = datetime.utcnow()
            self.session.commit()
            
        except Exception as e:
            logger.error(f"Error recalculating goal metrics: {e}")
            self.session.rollback()
    
    def _validate_goal_data(self, goal_data: UserInvestmentGoalCreate) -> None:
        """Validate investment goal data"""
        if goal_data.target_amount is not None and goal_data.target_amount <= 0:
            raise ServiceException("Target amount must be positive")
        
        if goal_data.target_date:
            if goal_data.target_date <= datetime.utcnow():
                raise ServiceException("Target date must be in the future")
            
            # Ensure target date is at least 1 month in the future for meaningful calculations
            min_target_date = datetime.utcnow() + timedelta(days=30)
            if goal_data.target_date < min_target_date:
                raise ServiceException("Target date must be at least 1 month in the future")
        
        if goal_data.priority < 1:
            raise ServiceException("Priority must be at least 1")
        
        if goal_data.current_savings and goal_data.current_savings < 0:
            raise ServiceException("Current savings cannot be negative")
    
    def _generate_allocation_rationale(
        self,
        goal_type: InvestmentGoal,
        risk_appetite: RiskAppetite,
        years_to_goal: float
    ) -> str:
        """Generate human-readable rationale for allocation"""
        rationale_parts = []
        
        if years_to_goal < 3:
            rationale_parts.append("Short-term horizon requires capital preservation")
        elif years_to_goal < 7:
            rationale_parts.append("Medium-term horizon allows balanced growth")
        else:
            rationale_parts.append("Long-term horizon enables equity-focused growth")
        
        risk_descriptions = {
            RiskAppetite.CONSERVATIVE: "conservative risk profile prioritizes safety",
            RiskAppetite.MODERATE: "moderate risk profile balances growth and safety",
            RiskAppetite.AGGRESSIVE: "aggressive risk profile maximizes growth potential"
        }
        rationale_parts.append(risk_descriptions[risk_appetite])
        
        if goal_type == InvestmentGoal.RETIREMENT:
            rationale_parts.append("with gradual shift to safer assets as retirement approaches")
        elif goal_type == InvestmentGoal.EMERGENCY_FUND:
            rationale_parts.append("emphasizing liquidity and capital protection")
        
        return "; ".join(rationale_parts).capitalize()

