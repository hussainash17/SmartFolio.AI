from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session
from datetime import datetime

from app.api.deps import get_current_user, get_session_dep
from app.model.user import (
    User, 
    KYCInformation, 
    KYCInformationCreate, 
    KYCInformationUpdate, 
    KYCInformationPublic,
    KYCStatus,
    UserInvestmentGoal,
    UserInvestmentGoalCreate,
    UserInvestmentGoalUpdate,
    UserInvestmentGoalPublic,
    UserAccount,
    UserAccountCreate,
    UserAccountUpdate,
    UserAccountPublic,
)

router = APIRouter(prefix="/kyc", tags=["kyc"])


# KYC Information Management
@router.post("/information", response_model=KYCInformationPublic)
def create_kyc_information(
    kyc_info: KYCInformationCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Submit KYC information for verification"""
    # Check if KYC information already exists
    existing_kyc = session.exec(
        select(KYCInformation).where(KYCInformation.user_id == current_user.id)
    ).first()
    
    if existing_kyc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="KYC information already exists. Use PUT to update."
        )
    
    db_kyc = KYCInformation(
        user_id=current_user.id,
        **kyc_info.dict(),
        kyc_status=KYCStatus.PENDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(db_kyc)
    session.commit()
    session.refresh(db_kyc)
    return db_kyc


@router.get("/information", response_model=KYCInformationPublic)
def get_kyc_information(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get user's KYC information"""
    kyc_info = session.exec(
        select(KYCInformation).where(KYCInformation.user_id == current_user.id)
    ).first()
    
    if not kyc_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC information not found"
        )
    
    return kyc_info


@router.put("/information", response_model=KYCInformationPublic)
def update_kyc_information(
    kyc_update: KYCInformationUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Update KYC information"""
    kyc_info = session.exec(
        select(KYCInformation).where(KYCInformation.user_id == current_user.id)
    ).first()
    
    if not kyc_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC information not found"
        )
    
    # Only allow updates if status is PENDING or REJECTED
    if kyc_info.kyc_status not in [KYCStatus.PENDING, KYCStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update KYC information once verified or under review"
        )
    
    update_data = kyc_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(kyc_info, field, value)
    
    kyc_info.updated_at = datetime.utcnow()
    kyc_info.kyc_status = KYCStatus.PENDING  # Reset to pending on update
    
    session.add(kyc_info)
    session.commit()
    session.refresh(kyc_info)
    return kyc_info


@router.get("/status")
def get_kyc_status(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get KYC verification status"""
    kyc_info = session.exec(
        select(KYCInformation).where(KYCInformation.user_id == current_user.id)
    ).first()
    
    if not kyc_info:
        return {"status": "NOT_SUBMITTED", "message": "KYC information not submitted"}
    
    return {
        "status": kyc_info.kyc_status,
        "verification_date": kyc_info.verification_date,
        "expiry_date": kyc_info.expiry_date,
        "rejection_reason": kyc_info.rejection_reason
    }


# Investment Goals Management
@router.post("/goals", response_model=UserInvestmentGoalPublic)
def create_investment_goal(
    goal: UserInvestmentGoalCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Create a new investment goal"""
    db_goal = UserInvestmentGoal(
        user_id=current_user.id,
        **goal.dict(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(db_goal)
    session.commit()
    session.refresh(db_goal)
    return db_goal


@router.get("/goals", response_model=List[UserInvestmentGoalPublic])
def get_investment_goals(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get user's investment goals"""
    goals = session.exec(
        select(UserInvestmentGoal)
        .where(UserInvestmentGoal.user_id == current_user.id)
        .where(UserInvestmentGoal.is_active == True)
        .order_by(UserInvestmentGoal.priority)
    ).all()
    
    return goals


@router.put("/goals/{goal_id}", response_model=UserInvestmentGoalPublic)
def update_investment_goal(
    goal_id: UUID,
    goal_update: UserInvestmentGoalUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Update an investment goal"""
    goal = session.exec(
        select(UserInvestmentGoal).where(
            UserInvestmentGoal.id == goal_id,
            UserInvestmentGoal.user_id == current_user.id
        )
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment goal not found"
        )
    
    update_data = goal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    goal.updated_at = datetime.utcnow()
    
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}")
def delete_investment_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Delete an investment goal"""
    goal = session.exec(
        select(UserInvestmentGoal).where(
            UserInvestmentGoal.id == goal_id,
            UserInvestmentGoal.user_id == current_user.id
        )
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment goal not found"
        )
    
    goal.is_active = False
    goal.updated_at = datetime.utcnow()
    
    session.add(goal)
    session.commit()
    
    return {"message": "Investment goal deleted successfully"}


# User Account Management
@router.post("/accounts", response_model=UserAccountPublic)
def create_user_account(
    account: UserAccountCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Create a new user account"""
    db_account = UserAccount(
        user_id=current_user.id,
        **account.dict(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(db_account)
    session.commit()
    session.refresh(db_account)
    return db_account


@router.get("/accounts", response_model=List[UserAccountPublic])
def get_user_accounts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get user's accounts"""
    accounts = session.exec(
        select(UserAccount)
        .where(UserAccount.user_id == current_user.id)
        .where(UserAccount.is_active == True)
    ).all()
    
    return accounts


@router.put("/accounts/{account_id}", response_model=UserAccountPublic)
def update_user_account(
    account_id: UUID,
    account_update: UserAccountUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Update a user account"""
    account = session.exec(
        select(UserAccount).where(
            UserAccount.id == account_id,
            UserAccount.user_id == current_user.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    update_data = account_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    account.updated_at = datetime.utcnow()
    
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
def delete_user_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Deactivate a user account"""
    account = session.exec(
        select(UserAccount).where(
            UserAccount.id == account_id,
            UserAccount.user_id == current_user.id
        )
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    account.is_active = False
    account.updated_at = datetime.utcnow()
    
    session.add(account)
    session.commit()
    
    return {"message": "Account deactivated successfully"}