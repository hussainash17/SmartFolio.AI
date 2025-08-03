"""
KYC (Know Your Customer) service module.

This module handles all KYC-related business logic including verification,
document management, and compliance checks.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlmodel import Session, select
import logging

from app.services.base import BaseService, ServiceException
from app.model.user import (
    KYCInformation, 
    KYCInformationCreate, 
    KYCInformationUpdate,
    KYCStatus,
    UserInvestmentGoal,
    UserInvestmentGoalCreate,
    UserInvestmentGoalUpdate,
    UserAccount,
    UserAccountCreate,
    UserAccountUpdate,
    AccountType,
    InvestmentGoal
)

logger = logging.getLogger(__name__)


class KYCService(BaseService[KYCInformation, KYCInformationCreate, KYCInformationUpdate]):
    """Service for managing KYC information and compliance."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(KYCInformation, session)
    
    def get_by_user_id(self, user_id: UUID) -> Optional[KYCInformation]:
        """
        Get KYC information for a specific user.
        
        Args:
            user_id: The UUID of the user
            
        Returns:
            KYC information if found, None otherwise
        """
        try:
            return self.session.exec(
                select(KYCInformation).where(KYCInformation.user_id == user_id)
            ).first()
        except Exception as e:
            logger.error(f"Error retrieving KYC for user {user_id}: {e}")
            raise ServiceException("Failed to retrieve KYC information")
    
    def create_kyc_information(
        self, 
        user_id: UUID, 
        kyc_data: KYCInformationCreate
    ) -> KYCInformation:
        """
        Create KYC information for a user.
        
        Args:
            user_id: The UUID of the user
            kyc_data: KYC information data
            
        Returns:
            Created KYC information
            
        Raises:
            ServiceException: If KYC already exists or validation fails
        """
        # Check if KYC already exists
        existing_kyc = self.get_by_user_id(user_id)
        if existing_kyc:
            raise ServiceException(
                "KYC information already exists for this user",
                status_code=409
            )
        
        # Validate KYC data
        self._validate_kyc_data(kyc_data)
        
        # Create KYC information
        kyc_info = self.create(
            kyc_data,
            user_id=user_id,
            kyc_status=KYCStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Created KYC information for user {user_id}")
        return kyc_info
    
    def update_kyc_information(
        self,
        user_id: UUID,
        kyc_update: KYCInformationUpdate
    ) -> Optional[KYCInformation]:
        """
        Update KYC information for a user.
        
        Args:
            user_id: The UUID of the user
            kyc_update: Updated KYC data
            
        Returns:
            Updated KYC information if found and updated
            
        Raises:
            ServiceException: If KYC is not in an updatable state
        """
        kyc_info = self.get_by_user_id(user_id)
        if not kyc_info:
            raise ServiceException("KYC information not found", status_code=404)
        
        # Check if KYC can be updated
        if kyc_info.kyc_status not in [KYCStatus.PENDING, KYCStatus.REJECTED]:
            raise ServiceException(
                "Cannot update KYC information once verified or under review",
                status_code=400
            )
        
        # Validate update data
        if kyc_update.model_dump(exclude_unset=True):
            self._validate_kyc_update(kyc_update)
        
        # Update KYC information
        updated_kyc = self.update(
            kyc_info.id,
            kyc_update,
            kyc_status=KYCStatus.PENDING,  # Reset to pending on update
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Updated KYC information for user {user_id}")
        return updated_kyc
    
    def get_kyc_status(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get KYC status for a user.
        
        Args:
            user_id: The UUID of the user
            
        Returns:
            Dictionary containing KYC status information
        """
        kyc_info = self.get_by_user_id(user_id)
        
        if not kyc_info:
            return {
                "status": "NOT_SUBMITTED",
                "message": "KYC information not submitted",
                "verification_date": None,
                "expiry_date": None,
                "rejection_reason": None
            }
        
        return {
            "status": kyc_info.kyc_status,
            "verification_date": kyc_info.verification_date,
            "expiry_date": kyc_info.expiry_date,
            "rejection_reason": kyc_info.rejection_reason,
            "days_until_expiry": self._calculate_days_until_expiry(kyc_info.expiry_date)
        }
    
    def verify_kyc(self, user_id: UUID, verification_notes: Optional[str] = None) -> KYCInformation:
        """
        Verify a user's KYC information (admin function).
        
        Args:
            user_id: The UUID of the user
            verification_notes: Optional verification notes
            
        Returns:
            Updated KYC information
            
        Raises:
            ServiceException: If KYC is not in a verifiable state
        """
        kyc_info = self.get_by_user_id(user_id)
        if not kyc_info:
            raise ServiceException("KYC information not found", status_code=404)
        
        if kyc_info.kyc_status != KYCStatus.IN_REVIEW:
            raise ServiceException(
                "KYC must be in review status to be verified",
                status_code=400
            )
        
        # Set verification details
        verification_date = datetime.utcnow()
        expiry_date = verification_date + timedelta(days=365)  # 1 year validity
        
        updated_kyc = self.update(
            kyc_info.id,
            KYCInformationUpdate(),
            kyc_status=KYCStatus.VERIFIED,
            verification_date=verification_date,
            expiry_date=expiry_date,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Verified KYC for user {user_id}")
        return updated_kyc
    
    def reject_kyc(
        self, 
        user_id: UUID, 
        rejection_reason: str
    ) -> KYCInformation:
        """
        Reject a user's KYC information (admin function).
        
        Args:
            user_id: The UUID of the user
            rejection_reason: Reason for rejection
            
        Returns:
            Updated KYC information
        """
        kyc_info = self.get_by_user_id(user_id)
        if not kyc_info:
            raise ServiceException("KYC information not found", status_code=404)
        
        updated_kyc = self.update(
            kyc_info.id,
            KYCInformationUpdate(),
            kyc_status=KYCStatus.REJECTED,
            rejection_reason=rejection_reason,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Rejected KYC for user {user_id}: {rejection_reason}")
        return updated_kyc
    
    def _validate_kyc_data(self, kyc_data: KYCInformationCreate) -> None:
        """
        Validate KYC data.
        
        Args:
            kyc_data: KYC data to validate
            
        Raises:
            ServiceException: If validation fails
        """
        # Age validation
        age = (datetime.utcnow() - kyc_data.date_of_birth).days / 365.25
        if age < 18:
            raise ServiceException("User must be at least 18 years old")
        
        if age > 120:
            raise ServiceException("Invalid date of birth")
        
        # SSN validation (last 4 digits)
        if not kyc_data.ssn_last_four.isdigit() or len(kyc_data.ssn_last_four) != 4:
            raise ServiceException("SSN last four digits must be exactly 4 digits")
        
        # Phone number basic validation
        phone_digits = ''.join(filter(str.isdigit, kyc_data.phone_number))
        if len(phone_digits) < 10:
            raise ServiceException("Invalid phone number")
        
        # Income validation
        if kyc_data.annual_income is not None and kyc_data.annual_income < 0:
            raise ServiceException("Annual income cannot be negative")
        
        if kyc_data.net_worth is not None and kyc_data.net_worth < 0:
            raise ServiceException("Net worth cannot be negative")
    
    def _validate_kyc_update(self, kyc_update: KYCInformationUpdate) -> None:
        """
        Validate KYC update data.
        
        Args:
            kyc_update: KYC update data to validate
            
        Raises:
            ServiceException: If validation fails
        """
        # Similar validations as create, but only for provided fields
        if kyc_update.date_of_birth:
            age = (datetime.utcnow() - kyc_update.date_of_birth).days / 365.25
            if age < 18 or age > 120:
                raise ServiceException("Invalid date of birth")
        
        if kyc_update.annual_income is not None and kyc_update.annual_income < 0:
            raise ServiceException("Annual income cannot be negative")
        
        if kyc_update.net_worth is not None and kyc_update.net_worth < 0:
            raise ServiceException("Net worth cannot be negative")
    
    def _calculate_days_until_expiry(self, expiry_date: Optional[datetime]) -> Optional[int]:
        """
        Calculate days until KYC expires.
        
        Args:
            expiry_date: KYC expiry date
            
        Returns:
            Number of days until expiry, None if no expiry date
        """
        if not expiry_date:
            return None
        
        days_until_expiry = (expiry_date - datetime.utcnow()).days
        return max(0, days_until_expiry)


class InvestmentGoalService(BaseService[UserInvestmentGoal, UserInvestmentGoalCreate, UserInvestmentGoalUpdate]):
    """Service for managing user investment goals."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(UserInvestmentGoal, session)
    
    def get_user_goals(self, user_id: UUID, active_only: bool = True) -> List[UserInvestmentGoal]:
        """
        Get investment goals for a user.
        
        Args:
            user_id: The UUID of the user
            active_only: Whether to return only active goals
            
        Returns:
            List of investment goals
        """
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
    
    def create_goal(self, user_id: UUID, goal_data: UserInvestmentGoalCreate) -> UserInvestmentGoal:
        """
        Create an investment goal for a user.
        
        Args:
            user_id: The UUID of the user
            goal_data: Goal data
            
        Returns:
            Created investment goal
        """
        self._validate_goal_data(goal_data)
        
        goal = self.create(
            goal_data,
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Created investment goal for user {user_id}: {goal_data.goal_type}")
        return goal
    
    def update_goal(
        self, 
        goal_id: UUID, 
        user_id: UUID, 
        goal_update: UserInvestmentGoalUpdate
    ) -> Optional[UserInvestmentGoal]:
        """
        Update an investment goal.
        
        Args:
            goal_id: The UUID of the goal
            user_id: The UUID of the user (for ownership verification)
            goal_update: Updated goal data
            
        Returns:
            Updated goal if found and owned by user
        """
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        if goal_update.model_dump(exclude_unset=True):
            self._validate_goal_update(goal_update)
        
        updated_goal = self.update(
            goal_id,
            goal_update,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Updated investment goal {goal_id} for user {user_id}")
        return updated_goal
    
    def deactivate_goal(self, goal_id: UUID, user_id: UUID) -> bool:
        """
        Deactivate an investment goal.
        
        Args:
            goal_id: The UUID of the goal
            user_id: The UUID of the user (for ownership verification)
            
        Returns:
            True if deactivated successfully
        """
        goal = self.get_by_id(goal_id)
        if not goal or goal.user_id != user_id:
            raise ServiceException("Investment goal not found", status_code=404)
        
        self.update(
            goal_id,
            UserInvestmentGoalUpdate(),
            is_active=False,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Deactivated investment goal {goal_id} for user {user_id}")
        return True
    
    def _validate_goal_data(self, goal_data: UserInvestmentGoalCreate) -> None:
        """Validate investment goal data."""
        if goal_data.target_amount is not None and goal_data.target_amount <= 0:
            raise ServiceException("Target amount must be positive")
        
        if goal_data.target_date and goal_data.target_date <= datetime.utcnow():
            raise ServiceException("Target date must be in the future")
        
        if goal_data.priority < 1:
            raise ServiceException("Priority must be at least 1")
    
    def _validate_goal_update(self, goal_update: UserInvestmentGoalUpdate) -> None:
        """Validate investment goal update data."""
        if goal_update.target_amount is not None and goal_update.target_amount <= 0:
            raise ServiceException("Target amount must be positive")
        
        if goal_update.target_date and goal_update.target_date <= datetime.utcnow():
            raise ServiceException("Target date must be in the future")
        
        if goal_update.priority is not None and goal_update.priority < 1:
            raise ServiceException("Priority must be at least 1")


class UserAccountService(BaseService[UserAccount, UserAccountCreate, UserAccountUpdate]):
    """Service for managing user accounts."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(UserAccount, session)
    
    def get_user_accounts(self, user_id: UUID, active_only: bool = True) -> List[UserAccount]:
        """
        Get accounts for a user.
        
        Args:
            user_id: The UUID of the user
            active_only: Whether to return only active accounts
            
        Returns:
            List of user accounts
        """
        try:
            query = select(UserAccount).where(UserAccount.user_id == user_id)
            
            if active_only:
                query = query.where(UserAccount.is_active == True)
            
            return self.session.exec(query.order_by(UserAccount.created_at)).all()
        except Exception as e:
            logger.error(f"Error retrieving accounts for user {user_id}: {e}")
            raise ServiceException("Failed to retrieve user accounts")
    
    def create_account(self, user_id: UUID, account_data: UserAccountCreate) -> UserAccount:
        """
        Create a user account.
        
        Args:
            user_id: The UUID of the user
            account_data: Account data
            
        Returns:
            Created user account
        """
        self._validate_account_data(account_data)
        
        account = self.create(
            account_data,
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Created {account_data.account_type} account for user {user_id}")
        return account
    
    def update_account(
        self, 
        account_id: UUID, 
        user_id: UUID, 
        account_update: UserAccountUpdate
    ) -> Optional[UserAccount]:
        """
        Update a user account.
        
        Args:
            account_id: The UUID of the account
            user_id: The UUID of the user (for ownership verification)
            account_update: Updated account data
            
        Returns:
            Updated account if found and owned by user
        """
        account = self.get_by_id(account_id)
        if not account or account.user_id != user_id:
            raise ServiceException("User account not found", status_code=404)
        
        if account_update.model_dump(exclude_unset=True):
            self._validate_account_update(account_update)
        
        updated_account = self.update(
            account_id,
            account_update,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Updated account {account_id} for user {user_id}")
        return updated_account
    
    def deactivate_account(self, account_id: UUID, user_id: UUID) -> bool:
        """
        Deactivate a user account.
        
        Args:
            account_id: The UUID of the account
            user_id: The UUID of the user (for ownership verification)
            
        Returns:
            True if deactivated successfully
        """
        account = self.get_by_id(account_id)
        if not account or account.user_id != user_id:
            raise ServiceException("User account not found", status_code=404)
        
        self.update(
            account_id,
            UserAccountUpdate(),
            is_active=False,
            updated_at=datetime.utcnow()
        )
        
        logger.info(f"Deactivated account {account_id} for user {user_id}")
        return True
    
    def _validate_account_data(self, account_data: UserAccountCreate) -> None:
        """Validate user account data."""
        # Validate joint account requirements
        if account_data.account_type == AccountType.JOINT:
            if not account_data.joint_holder_name:
                raise ServiceException("Joint holder name is required for joint accounts")
        
        # Validate retirement account limits
        if account_data.account_type in [AccountType.RETIREMENT_401K, AccountType.RETIREMENT_IRA, AccountType.RETIREMENT_ROTH_IRA]:
            if account_data.contribution_limit is not None and account_data.contribution_limit <= 0:
                raise ServiceException("Contribution limit must be positive for retirement accounts")
    
    def _validate_account_update(self, account_update: UserAccountUpdate) -> None:
        """Validate user account update data."""
        if account_update.contribution_limit is not None and account_update.contribution_limit <= 0:
            raise ServiceException("Contribution limit must be positive")
        
        if account_update.current_year_contributions is not None and account_update.current_year_contributions < 0:
            raise ServiceException("Current year contributions cannot be negative")