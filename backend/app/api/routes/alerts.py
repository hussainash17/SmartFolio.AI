from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_session_dep
from app.model.alert import Alert, AlertCreate, AlertPublic, AlertUpdate, News
from app.model.stock import StockCompany, StockData
from app.model.user import User

router = APIRouter(prefix="/alerts", tags=["alerts"]) 


@router.post("/", response_model=AlertPublic)
def create_alert(
    alert_in: AlertCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    db_alert = Alert(
        user_id=current_user.id,
        status="active",
        **alert_in.dict(),
    )
    session.add(db_alert)
    session.commit()
    session.refresh(db_alert)
    return db_alert


@router.get("/", response_model=List[AlertPublic])
def list_alerts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    alerts = session.exec(select(Alert).where(Alert.user_id == current_user.id)).all()
    return alerts


@router.put("/{alert_id}", response_model=AlertPublic)
def update_alert(
    alert_id: UUID,
    alert_update: AlertUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    alert = session.get(Alert, alert_id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    update_data = alert_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)
    alert.updated_at = datetime.utcnow()

    session.add(alert)
    session.commit()
    session.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    alert = session.get(Alert, alert_id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    session.delete(alert)
    session.commit()


@router.get("/{alert_id}/evaluate", response_model=AlertPublic)
def evaluate_alert(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    alert = session.get(Alert, alert_id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    triggered = False

    # Price/percent/volume based alerts need latest stock data
    if alert.stock_id:
        latest = session.exec(
            select(StockData)
            .where(StockData.company_id == alert.stock_id)
            .order_by(StockData.timestamp.desc())
            .limit(1)
        ).first()
        if latest:
            # Support additional alert types
            # alert_type could be: price, percent_change, volume, news
            if alert.alert_type in ("price", "price_target"):
                current_value = latest.last_trade_price
                alert.current_value = current_value
                if alert.condition == "above":
                    triggered = current_value > alert.target_value
                elif alert.condition == "below":
                    triggered = current_value < alert.target_value
                elif alert.condition == "equals":
                    triggered = current_value == alert.target_value
            elif alert.alert_type in ("percent", "percentage_move", "percent_change"):
                # compare absolute percent move against target_value
                abs_move = abs(latest.change_percent)
                # condition above/below applies to magnitude
                if alert.condition == "above":
                    triggered = abs_move > Decimal(alert.target_value)
                elif alert.condition == "below":
                    triggered = abs_move < Decimal(alert.target_value)
                elif alert.condition == "equals":
                    triggered = abs_move == Decimal(alert.target_value)
                alert.current_value = Decimal(latest.change_percent)
            elif alert.alert_type in ("volume", "volume_spike"):
                current_vol = Decimal(latest.volume)
                if alert.condition == "above":
                    triggered = current_vol > Decimal(alert.target_value)
                elif alert.condition == "below":
                    triggered = current_vol < Decimal(alert.target_value)
                elif alert.condition == "equals":
                    triggered = current_vol == Decimal(alert.target_value)
                alert.current_value = current_vol

    # News/Earnings alerts: triggered if recent news exists
    if alert.alert_type in ("news", "earnings"):
        since = datetime.utcnow() - timedelta(days=7)
        # Basic filter by recency; in a richer model we'd filter by stock relation or keywords
        news_exists = session.exec(
            select(News).where(News.published_at >= since, News.is_active == True)  # noqa: E712
        ).first()
        if news_exists:
            triggered = True

    if triggered:
        alert.status = "triggered"
        alert.last_triggered = datetime.utcnow()
        alert.trigger_count += 1

    alert.updated_at = datetime.utcnow()
    session.add(alert)
    session.commit()
    session.refresh(alert)
    return alert