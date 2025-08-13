from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, get_session_dep
from app.model.subscription import (
    Payment,
    PaymentCreate,
    PaymentPublic,
    PaymentRequest,
    PaymentResponse,
    SubscriptionPlan,
    SubscriptionPlanCreate,
    SubscriptionPlanPublic,
    SubscriptionPlanUpdate,
    SubscriptionStatus,
    UserSubscription,
    UserSubscriptionCreate,
    UserSubscriptionPublic,
)
from app.model.user import User

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"]) 


@router.get("/plans", response_model=List[SubscriptionPlanPublic])
def list_plans(session: Session = Depends(get_session_dep)):
    return session.exec(select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)).all()  # noqa: E712


@router.post("/plans", response_model=SubscriptionPlanPublic)
def create_plan(plan: SubscriptionPlanCreate, session: Session = Depends(get_session_dep)):
    db_plan = SubscriptionPlan(**plan.dict())
    session.add(db_plan)
    session.commit()
    session.refresh(db_plan)
    return db_plan


@router.post("/", response_model=UserSubscriptionPublic)
def subscribe(
    payload: UserSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    plan = session.get(SubscriptionPlan, payload.plan_id)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan")
    end_date = datetime.utcnow() + timedelta(days=plan.duration_days)
    sub = UserSubscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status="pending",
        start_date=datetime.utcnow(),
        end_date=end_date,
        auto_renew=False,
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


@router.get("/status", response_model=SubscriptionStatus)
def status_check(current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
    sub = session.exec(
        select(UserSubscription)
        .where(UserSubscription.user_id == current_user.id)
        .order_by(UserSubscription.updated_at.desc())
        .limit(1)
    ).first()
    if not sub:
        return SubscriptionStatus(user_id=current_user.id, status="none", is_active=False)
    plan = session.get(SubscriptionPlan, sub.plan_id)
    is_active = sub.status == "active" and sub.end_date >= datetime.utcnow()
    return SubscriptionStatus(
        user_id=current_user.id,
        current_plan=plan.name if plan else None,
        status=sub.status,
        start_date=sub.start_date,
        end_date=sub.end_date,
        is_active=is_active,
        features=plan.features if plan else {},
    )


@router.post("/payments/bkash", response_model=PaymentResponse)
def bkash_payment(
    req: PaymentRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep),
):
    # Placeholder flow: create payment record with pending status and fake transaction id
    payment = Payment(
        user_id=current_user.id,
        subscription_id=None,
        amount=req.amount,
        currency=req.currency,
        payment_method="bkash",
        transaction_id=f"BK-{int(datetime.utcnow().timestamp())}",
        status="pending",
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)
    # In real integration, return gateway url/data
    return PaymentResponse(
        payment_id=payment.id,
        transaction_id=payment.transaction_id,
        status=payment.status,
        gateway_url=None,
        gateway_data=None,
    )