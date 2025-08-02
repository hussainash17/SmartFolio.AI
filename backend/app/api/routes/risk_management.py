from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session
from app.api.deps import get_current_user, get_session_dep
from app.model.risk_management import (
    UserRiskProfile, UserRiskProfileCreate, UserRiskProfileUpdate, UserRiskProfilePublic,
    PortfolioRiskMetrics, PortfolioRiskMetricsPublic,
    RiskAlert, RiskAlertCreate, RiskAlertPublic,
    StockScreener, StockScreenerCreate, StockScreenerUpdate, StockScreenerPublic,
    RiskSummary, RiskProfile
)
from app.model.portfolio import Portfolio
from app.model.user import User

router = APIRouter(prefix="/risk", tags=["risk-management"])


@router.post("/profile", response_model=UserRiskProfilePublic)
def create_user_risk_profile(
    risk_profile: UserRiskProfileCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get user risk profile"""
    profile = session.exec(
        select(UserRiskProfile).where(UserRiskProfile.user_id == current_user.id)
    ).first()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk profile not found"
        )
    
    return profile


@router.get("/alerts", response_model=List[RiskAlertPublic])
def get_risk_alerts(
    portfolio_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get stock screeners for the user"""
    query = select(StockScreener).where(StockScreener.user_id == current_user.id)
    
    if is_active is not None:
        query = query.where(StockScreener.is_active == is_active)
    
    screeners = session.exec(query.order_by(StockScreener.created_at.desc())).all()
    return screeners 