"""
KYC API routes.

This module provides REST endpoints for KYC (Know Your Customer) functionality
using the service layer for business logic.
"""

from typing import List, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import get_current_user, get_session_dep
from app.model.user import (
    User, 
    KYCInformationCreate, 
    KYCInformationUpdate, 
    KYCInformationPublic,
    UserInvestmentGoalCreate,
    UserInvestmentGoalUpdate,
    UserInvestmentGoalPublic,
    UserAccountCreate,
    UserAccountUpdate,
    UserAccountPublic,
    UserInvestmentGoalContributionCreate,
    UserInvestmentGoalContributionPublic,
)
from app.services.kyc_service import KYCService, InvestmentGoalService, UserAccountService, ServiceException

router = APIRouter(prefix="/kyc", tags=["kyc"])

# Dependency injection for services
def get_kyc_service(session: Session = Depends(get_session_dep)) -> KYCService:
    """Get KYC service instance with database session."""
    return KYCService(session)

def get_investment_goal_service(session: Session = Depends(get_session_dep)) -> InvestmentGoalService:
    """Get Investment Goal service instance with database session."""
    return InvestmentGoalService(session)

def get_user_account_service(session: Session = Depends(get_session_dep)) -> UserAccountService:
    """Get User Account service instance with database session."""
    return UserAccountService(session)


# KYC Information Management
@router.post("/information", response_model=KYCInformationPublic)
def create_kyc_information(
    kyc_info: KYCInformationCreate,
    current_user: User = Depends(get_current_user),
    kyc_service: KYCService = Depends(get_kyc_service)
):
    """Submit KYC information for verification."""
    try:
        return kyc_service.create_kyc_information(current_user.id, kyc_info)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/information", response_model=KYCInformationPublic)
def get_kyc_information(
    current_user: User = Depends(get_current_user),
    kyc_service: KYCService = Depends(get_kyc_service)
):
    """Get user's KYC information."""
    try:
        kyc_info = kyc_service.get_by_user_id(current_user.id)
        if not kyc_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="KYC information not found"
            )
        return kyc_info
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/information", response_model=KYCInformationPublic)
def update_kyc_information(
    kyc_update: KYCInformationUpdate,
    current_user: User = Depends(get_current_user),
    kyc_service: KYCService = Depends(get_kyc_service)
):
    """Update KYC information."""
    try:
        updated_kyc = kyc_service.update_kyc_information(current_user.id, kyc_update)
        if not updated_kyc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="KYC information not found"
            )
        return updated_kyc
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/status")
def get_kyc_status(
    current_user: User = Depends(get_current_user),
    kyc_service: KYCService = Depends(get_kyc_service)
):
    """Get KYC verification status."""
    try:
        return kyc_service.get_kyc_status(current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# Investment Goals Management
@router.post("/goals", response_model=UserInvestmentGoalPublic)
def create_investment_goal(
    goal: UserInvestmentGoalCreate,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Create a new investment goal."""
    try:
        return goal_service.create_goal(current_user.id, goal)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals", response_model=List[UserInvestmentGoalPublic])
def get_investment_goals(
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Get user's investment goals."""
    try:
        return goal_service.get_user_goals(current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/goals/{goal_id}", response_model=UserInvestmentGoalPublic)
def update_investment_goal(
    goal_id: UUID,
    goal_update: UserInvestmentGoalUpdate,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Update an investment goal."""
    try:
        updated_goal = goal_service.update_goal(goal_id, current_user.id, goal_update)
        if not updated_goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investment goal not found"
            )
        return updated_goal
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/goals/{goal_id}")
def delete_investment_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Delete an investment goal."""
    try:
        success = goal_service.deactivate_goal(goal_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Investment goal not found"
            )
        return {"message": "Investment goal deleted successfully"}
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# Goal Contributions Management
@router.post("/goals/{goal_id}/contributions", response_model=UserInvestmentGoalContributionPublic)
def create_goal_contribution(
    goal_id: UUID,
    contribution: UserInvestmentGoalContributionCreate,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Add a contribution to an investment goal."""
    try:
        return goal_service.add_contribution(current_user.id, goal_id, contribution)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/contributions", response_model=List[UserInvestmentGoalContributionPublic])
def list_goal_contributions(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """List contributions for an investment goal."""
    try:
        return goal_service.list_contributions(current_user.id, goal_id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/goals/contributions/{contribution_id}")
def delete_goal_contribution(
    contribution_id: UUID,
    current_user: User = Depends(get_current_user),
    goal_service: InvestmentGoalService = Depends(get_investment_goal_service)
):
    """Delete an investment goal contribution."""
    try:
        success = goal_service.delete_contribution(current_user.id, contribution_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contribution not found"
            )
        return {"message": "Contribution deleted successfully"}
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# User Account Management
@router.post("/accounts", response_model=UserAccountPublic)
def create_user_account(
    account: UserAccountCreate,
    current_user: User = Depends(get_current_user),
    account_service: UserAccountService = Depends(get_user_account_service)
):
    """Create a new user account."""
    try:
        return account_service.create_account(current_user.id, account)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/accounts", response_model=List[UserAccountPublic])
def get_user_accounts(
    current_user: User = Depends(get_current_user),
    account_service: UserAccountService = Depends(get_user_account_service)
):
    """Get user's accounts."""
    try:
        return account_service.get_user_accounts(current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/accounts/{account_id}", response_model=UserAccountPublic)
def update_user_account(
    account_id: UUID,
    account_update: UserAccountUpdate,
    current_user: User = Depends(get_current_user),
    account_service: UserAccountService = Depends(get_user_account_service)
):
    """Update a user account."""
    try:
        updated_account = account_service.update_account(account_id, current_user.id, account_update)
        if not updated_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        return updated_account
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/accounts/{account_id}")
def delete_user_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    account_service: UserAccountService = Depends(get_user_account_service)
):
    """Deactivate a user account."""
    try:
        success = account_service.deactivate_account(account_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        return {"message": "Account deactivated successfully"}
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)