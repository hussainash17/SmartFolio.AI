"""
KYC API routes.

This module provides REST endpoints for KYC (Know Your Customer) functionality
using the service layer for business logic.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep
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
    AssetAllocationRecommendation,
    SIPCalculationResult,
    GoalProgressResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
    ProductRecommendationResponse,
    GoalAlertResponse,
    GoalLinkedAssetPublic,
    GoalLinkedAssetCreate,
)
from app.services.goal_service import EnhancedInvestmentGoalService
from app.services.kyc_service import KYCService, InvestmentGoalService, UserAccountService, ServiceException

router = APIRouter(prefix="/kyc", tags=["kyc"])


# Dependency injection for services
def get_kyc_service(session: SessionDep) -> KYCService:
    """Get KYC service instance with database session."""
    return KYCService(session)


def get_investment_goal_service(session: SessionDep) -> InvestmentGoalService:
    """Get Investment Goal service instance with database session."""
    return InvestmentGoalService(session)


def get_enhanced_goal_service(session: SessionDep) -> EnhancedInvestmentGoalService:
    """Get Enhanced Investment Goal service instance with database session."""
    return EnhancedInvestmentGoalService(session)


def get_user_account_service(session: SessionDep) -> UserAccountService:
    """Get User Account service instance with database session."""
    return UserAccountService(session)


# KYC Information Management
@router.post("/information", response_model=KYCInformationPublic)
def create_kyc_information(
        kyc_info: KYCInformationCreate,
        current_user: CurrentUser,
        kyc_service: KYCService = Depends(get_kyc_service)
):
    """Submit KYC information for verification."""
    try:
        return kyc_service.create_kyc_information(current_user.id, kyc_info)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/information", response_model=KYCInformationPublic)
def get_kyc_information(
        current_user: CurrentUser,
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
        current_user: CurrentUser,
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
        current_user: CurrentUser,
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
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Create a new investment goal with automatic calculations."""
    try:
        return goal_service.create_goal_with_calculations(current_user.id, goal)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals", response_model=List[UserInvestmentGoalPublic])
def get_investment_goals(
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get user's investment goals with all calculated fields."""
    try:
        return goal_service.get_user_goals(current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/goals/{goal_id}", response_model=UserInvestmentGoalPublic)
def update_investment_goal(
        goal_id: UUID,
        goal_update: UserInvestmentGoalUpdate,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Update an investment goal with automatic recalculations."""
    try:
        updated_goal = goal_service.update_goal_with_recalculation(goal_id, current_user.id, goal_update)
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
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
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
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Add a contribution to an investment goal and update progress."""
    try:
        return goal_service.add_contribution(current_user.id, goal_id, contribution)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/contributions", response_model=List[UserInvestmentGoalContributionPublic])
def list_goal_contributions(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """List contributions for an investment goal."""
    try:
        return goal_service.list_contributions(current_user.id, goal_id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/goals/contributions/{contribution_id}")
def delete_goal_contribution(
        contribution_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
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


@router.post("/goals/{goal_id}/assets", response_model=GoalLinkedAssetPublic)
def link_asset_to_goal(
        goal_id: UUID,
        asset_data: GoalLinkedAssetCreate,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Link a portfolio asset to an investment goal."""
    try:
        return goal_service.link_asset(current_user.id, goal_id, asset_data)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/goals/assets/{asset_id}")
def unlink_asset_from_goal(
        asset_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Unlink an asset from an investment goal."""
    try:
        success = goal_service.unlink_asset(current_user.id, asset_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked asset not found"
            )
        return {"message": "Asset unlinked successfully"}
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/assets", response_model=List[GoalLinkedAssetPublic])
def get_goal_linked_assets(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get all assets linked to an investment goal."""
    try:
        return goal_service.get_linked_assets(current_user.id, goal_id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# ==================== ENHANCED GOAL FEATURES ====================

@router.post("/goals/{goal_id}/calculate-sip", response_model=SIPCalculationResult)
def calculate_goal_sip(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Calculate required monthly SIP for achieving the goal."""
    try:
        return goal_service.calculate_sip(goal_id, current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/progress", response_model=GoalProgressResponse)
def get_goal_progress(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get detailed progress information for a goal."""
    try:
        return goal_service.get_goal_progress(goal_id, current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/goals/{goal_id}/what-if", response_model=WhatIfScenarioResponse)
def calculate_what_if_scenario(
        goal_id: UUID,
        scenario: WhatIfScenarioRequest,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Calculate what-if scenarios for a goal (e.g., increase SIP, delay goal, change returns)."""
    try:
        return goal_service.calculate_what_if_scenario(goal_id, current_user.id, scenario)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/asset-allocation", response_model=AssetAllocationRecommendation)
def get_asset_allocation_recommendation(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get asset allocation recommendation based on goal, risk profile, and time horizon."""
    try:
        return goal_service.get_asset_allocation_recommendation(goal_id, current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/recommendations", response_model=ProductRecommendationResponse)
def get_product_recommendations(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get investment product recommendations (mutual funds, ETFs, stocks, bonds) for a goal."""
    try:
        return goal_service.get_product_recommendations(goal_id, current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/goals/{goal_id}/alerts", response_model=GoalAlertResponse)
def get_goal_alerts(
        goal_id: UUID,
        current_user: CurrentUser,
        goal_service: EnhancedInvestmentGoalService = Depends(get_enhanced_goal_service)
):
    """Get alerts for a goal (drift, milestones, rebalancing, review reminders)."""
    try:
        return goal_service.get_goal_alerts(goal_id, current_user.id)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# User Account Management
@router.post("/accounts", response_model=UserAccountPublic)
def create_user_account(
        account: UserAccountCreate,
        current_user: CurrentUser,
        account_service: UserAccountService = Depends(get_user_account_service)
):
    """Create a new user account."""
    try:
        return account_service.create_account(current_user.id, account)
    except ServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/accounts", response_model=List[UserAccountPublic])
def get_user_accounts(
        current_user: CurrentUser,
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
        current_user: CurrentUser,
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
        current_user: CurrentUser,
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
