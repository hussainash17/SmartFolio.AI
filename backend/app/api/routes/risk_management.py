from datetime import datetime
from typing import List, Optional, Dict
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Body
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.performance import verify_portfolio_access
from app.model.portfolio import AllocationTarget
from app.model.risk_management import (
    UserRiskProfile, UserRiskProfileCreate, UserRiskProfilePublic,
    RiskAlert, RiskAlertCreate, RiskAlertPublic,
    StockScreener, StockScreenerCreate, StockScreenerPublic
)
from app.services.risk_service import RiskService

router = APIRouter(prefix="/risk", tags=["risk-management"])


@router.post("/profile", response_model=UserRiskProfilePublic)
def create_user_risk_profile(
        risk_profile: UserRiskProfileCreate,
        current_user: CurrentUser,
        session: SessionDep
):
    """Create or update user risk profile"""
    existing_profile = session.exec(
        select(UserRiskProfile).where(UserRiskProfile.user_id == current_user.id)
    ).first()

    if existing_profile:
        for field, value in risk_profile.dict().items():
            setattr(existing_profile, field, value)
        session.add(existing_profile)
        session.commit()
        session.refresh(existing_profile)
        return existing_profile
    else:
        db_profile = UserRiskProfile(
            user_id=current_user.id,
            **risk_profile.dict()
        )
        session.add(db_profile)
        session.commit()
        session.refresh(db_profile)
        return db_profile


@router.get("/profile", response_model=UserRiskProfilePublic)
def get_user_risk_profile(
        current_user: CurrentUser,
        session: SessionDep
):
    """Get user risk profile"""
    profile = session.exec(
        select(UserRiskProfile).where(UserRiskProfile.user_id == current_user.id)
    ).first()

    if not profile:
        # Auto-create a default risk profile if none exists for the user
        profile = UserRiskProfile(user_id=current_user.id)
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return profile


@router.get("/alerts", response_model=List[RiskAlertPublic])
def get_risk_alerts(
        current_user: CurrentUser,
        session: SessionDep,
        portfolio_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
):
    """Get risk alerts for the user"""
    query = select(RiskAlert).where(RiskAlert.user_id == current_user.id)

    if portfolio_id:
        query = query.where(RiskAlert.portfolio_id == portfolio_id)

    if is_active is not None:
        query = query.where(RiskAlert.is_active == is_active)

    alerts = session.exec(query.order_by(RiskAlert.created_at.desc())).all()
    return alerts


@router.post("/screeners", response_model=StockScreenerPublic)
def create_stock_screener(
        screener: StockScreenerCreate,
        current_user: CurrentUser,
        session: SessionDep
):
    """Create a stock screener"""
    db_screener = StockScreener(
        user_id=current_user.id,
        **screener.dict()
    )
    session.add(db_screener)
    session.commit()
    session.refresh(db_screener)
    return db_screener


@router.get("/screeners", response_model=List[StockScreenerPublic])
def get_stock_screeners(
        current_user: CurrentUser,
        session: SessionDep,
        is_active: Optional[bool] = None,
):
    """Get stock screeners for the user"""
    query = select(StockScreener).where(StockScreener.user_id == current_user.id)

    if is_active is not None:
        query = query.where(StockScreener.is_active == is_active)

    screeners = session.exec(query.order_by(StockScreener.created_at.desc())).all()
    return screeners


# ============================================================================
# NEW RISK ANALYSIS ENDPOINTS
# ============================================================================

@router.get("/portfolios/{portfolio_id}/overview")
def get_risk_overview(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|ALL)$"),
        benchmark_id: Optional[str] = Query(None),
):
    """Get comprehensive risk overview for a portfolio"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    risk_service = RiskService(session)
    return risk_service.get_risk_overview(str(portfolio_id), period, benchmark_id)


@router.get("/portfolios/{portfolio_id}/metrics")
def get_risk_metrics(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|ALL)$"),
        benchmark_id: Optional[str] = Query(None),
):
    """Get detailed risk metrics for a portfolio"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    risk_service = RiskService(session)
    return risk_service.get_risk_metrics(str(portfolio_id), period, benchmark_id)


@router.get("/portfolios/{portfolio_id}/metrics/timeseries")
def get_risk_metrics_timeseries(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|ALL)$"),
        benchmark_id: Optional[str] = Query(None),
):
    """Get risk metrics as time series"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    risk_service = RiskService(session)
    return risk_service.get_risk_metrics_timeseries(str(portfolio_id), period, benchmark_id)


@router.get("/portfolios/{portfolio_id}/concentration/sector")
def get_sector_concentration(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|ALL)$"),
        benchmark_id: Optional[str] = Query(None),
):
    """Get sector concentration analysis"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    risk_service = RiskService(session)
    return risk_service.get_sector_concentration(str(portfolio_id), period, benchmark_id)


@router.get("/portfolios/{portfolio_id}/correlation")
def get_correlation_analysis(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", regex="^(1M|3M|6M|1Y|3Y|5Y|ALL)$"),
        top: int = Query(10, ge=1, le=30),
):
    """Get correlation analysis for portfolio holdings"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    risk_service = RiskService(session)
    return risk_service.get_correlation_analysis(str(portfolio_id), period, top)


@router.get("/portfolios/{portfolio_id}/stress-tests")
def get_stress_tests(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        scenarios: Optional[str] = Query(None,
                                         description="Comma-separated scenario keys: 2008,covid,rate_hike,tech_crash"),
        benchmark_id: Optional[str] = Query(None),
):
    """Get stress test results for various scenarios"""
    verify_portfolio_access(session, str(portfolio_id), current_user)

    scenario_list = None
    if scenarios:
        scenario_list = [s.strip() for s in scenarios.split(',')]

    risk_service = RiskService(session)
    return risk_service.get_stress_tests(str(portfolio_id), scenario_list, benchmark_id)


@router.post("/alerts", response_model=RiskAlertPublic)
def create_risk_alert(
        alert: RiskAlertCreate,
        current_user: CurrentUser,
        session: SessionDep
):
    """Create a new risk alert"""
    # Verify portfolio access if portfolio_id is provided
    if alert.portfolio_id:
        verify_portfolio_access(session, str(alert.portfolio_id), current_user)

    db_alert = RiskAlert(
        user_id=current_user.id,
        **alert.dict()
    )
    session.add(db_alert)
    session.commit()
    session.refresh(db_alert)
    return db_alert


@router.patch("/alerts/{alert_id}", response_model=RiskAlertPublic)
def update_risk_alert(
        alert_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        is_active: Optional[bool] = Body(None),
        resolved_at: Optional[datetime] = Body(None),
):
    """Update a risk alert (acknowledge/resolve)"""
    alert = session.get(RiskAlert, alert_id)

    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    if alert.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this alert")

    if is_active is not None:
        alert.is_active = is_active

    if resolved_at is not None:
        alert.resolved_at = resolved_at
    elif is_active is False and alert.resolved_at is None:
        # Auto-set resolved_at when deactivating
        alert.resolved_at = datetime.utcnow()

    session.add(alert)
    session.commit()
    session.refresh(alert)
    return alert


@router.post("/portfolios/{portfolio_id}/rebalancing/recommendations")
def get_rebalancing_recommendations(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        targets: Optional[Dict[str, float]] = Body(None, description="Optional custom target weights by sector/asset"),
):
    """Get rebalancing recommendations for a portfolio"""
    portfolio = verify_portfolio_access(session, str(portfolio_id), current_user)

    # Get current holdings
    from app.services.performance_calculator import PerformanceCalculator
    from datetime import date

    calculator = PerformanceCalculator(session)
    current_holdings = calculator._get_holdings_on_date(str(portfolio_id), date.today())

    # Get allocation targets if not provided
    if targets is None:
        statement = select(AllocationTarget).where(
            AllocationTarget.portfolio_id == portfolio_id
        )
        allocation_targets = session.exec(statement).all()

        # Build targets dict from allocation_targets
        targets = {}
        for target in allocation_targets:
            if target.category_type == "SECTOR":
                targets[target.category] = float(target.target_percent)

    # Calculate current sector weights
    sector_weights = calculator.compute_sector_weights(str(portfolio_id), date.today())

    # Get portfolio value
    portfolio_value = calculator._get_portfolio_value_on_date(str(portfolio_id), date.today())

    # Generate recommendations
    suggestions = []

    # Process sector-level recommendations
    for sector, current_weight in sector_weights.items():
        target_weight = targets.get(sector, current_weight)
        difference = target_weight - current_weight

        # Only suggest if difference is significant (> 1%)
        if abs(difference) > 1.0:
            amount = (difference / 100.0) * portfolio_value

            suggestions.append({
                'asset': sector,
                'currentWeight': round(current_weight, 2),
                'targetWeight': round(target_weight, 2),
                'differencePct': round(difference, 2),
                'action': 'buy' if difference > 0 else 'sell',
                'amount': round(abs(amount), 2)
            })

    # Sort by absolute difference
    suggestions.sort(key=lambda x: abs(x['differencePct']), reverse=True)

    return {'suggestions': suggestions}
