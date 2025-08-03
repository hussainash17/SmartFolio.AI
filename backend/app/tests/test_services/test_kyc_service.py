"""
Unit tests for KYC service.

This module demonstrates how the service layer can be easily tested
with proper mocking and dependency injection.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import Mock, patch

from app.services.kyc_service import KYCService, InvestmentGoalService, UserAccountService, ServiceException
from app.model.user import (
    KYCInformation,
    KYCInformationCreate,
    KYCInformationUpdate,
    KYCStatus,
    UserInvestmentGoal,
    UserInvestmentGoalCreate,
    InvestmentGoal,
    UserAccount,
    UserAccountCreate,
    AccountType
)


class TestKYCService:
    """Test cases for KYCService."""
    
    @pytest.fixture
    def mock_session(self):
        """Create a mock database session."""
        return Mock()
    
    @pytest.fixture
    def kyc_service(self, mock_session):
        """Create KYC service with mock session."""
        return KYCService(mock_session)
    
    @pytest.fixture
    def user_id(self):
        """Create a test user ID."""
        return uuid4()
    
    @pytest.fixture
    def kyc_create_data(self):
        """Create valid KYC creation data."""
        return KYCInformationCreate(
            first_name="John",
            last_name="Doe",
            date_of_birth=datetime(1990, 1, 1),
            ssn_last_four="1234",
            phone_number="555-123-4567",
            street_address="123 Main St",
            city="Anytown",
            state="CA",
            zip_code="12345",
            country="USA",
            annual_income=75000,
            net_worth=150000,
            investment_experience="INTERMEDIATE"
        )
    
    def test_create_kyc_information_success(self, kyc_service, user_id, kyc_create_data, mock_session):
        """Test successful KYC information creation."""
        # Mock that no existing KYC exists
        mock_session.exec.return_value.first.return_value = None
        
        # Mock the create operation
        expected_kyc = KYCInformation(
            id=uuid4(),
            user_id=user_id,
            **kyc_create_data.dict(),
            kyc_status=KYCStatus.PENDING
        )
        
        with patch.object(kyc_service, 'create', return_value=expected_kyc) as mock_create:
            result = kyc_service.create_kyc_information(user_id, kyc_create_data)
            
            # Verify the service was called correctly
            mock_create.assert_called_once()
            assert result == expected_kyc
    
    def test_create_kyc_information_already_exists(self, kyc_service, user_id, kyc_create_data, mock_session):
        """Test KYC creation when information already exists."""
        # Mock that existing KYC exists
        existing_kyc = Mock()
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.create_kyc_information(user_id, kyc_create_data)
        
        assert exc_info.value.status_code == 409
        assert "already exists" in exc_info.value.message
    
    def test_create_kyc_information_invalid_age(self, kyc_service, user_id, kyc_create_data, mock_session):
        """Test KYC creation with invalid age."""
        # Mock that no existing KYC exists
        mock_session.exec.return_value.first.return_value = None
        
        # Set birth date to make user under 18
        kyc_create_data.date_of_birth = datetime.now() - timedelta(days=365 * 17)
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.create_kyc_information(user_id, kyc_create_data)
        
        assert "at least 18 years old" in exc_info.value.message
    
    def test_create_kyc_information_invalid_ssn(self, kyc_service, user_id, kyc_create_data, mock_session):
        """Test KYC creation with invalid SSN."""
        # Mock that no existing KYC exists
        mock_session.exec.return_value.first.return_value = None
        
        # Set invalid SSN
        kyc_create_data.ssn_last_four = "123"  # Too short
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.create_kyc_information(user_id, kyc_create_data)
        
        assert "4 digits" in exc_info.value.message
    
    def test_update_kyc_information_success(self, kyc_service, user_id, mock_session):
        """Test successful KYC information update."""
        # Mock existing KYC with PENDING status
        existing_kyc = Mock()
        existing_kyc.id = uuid4()
        existing_kyc.kyc_status = KYCStatus.PENDING
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        update_data = KYCInformationUpdate(annual_income=80000)
        
        with patch.object(kyc_service, 'update', return_value=existing_kyc) as mock_update:
            result = kyc_service.update_kyc_information(user_id, update_data)
            
            mock_update.assert_called_once()
            assert result == existing_kyc
    
    def test_update_kyc_information_not_found(self, kyc_service, user_id, mock_session):
        """Test KYC update when information not found."""
        # Mock that no KYC exists
        mock_session.exec.return_value.first.return_value = None
        
        update_data = KYCInformationUpdate(annual_income=80000)
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.update_kyc_information(user_id, update_data)
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.message
    
    def test_update_kyc_information_verified_status(self, kyc_service, user_id, mock_session):
        """Test KYC update when status is VERIFIED (should fail)."""
        # Mock existing KYC with VERIFIED status
        existing_kyc = Mock()
        existing_kyc.kyc_status = KYCStatus.VERIFIED
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        update_data = KYCInformationUpdate(annual_income=80000)
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.update_kyc_information(user_id, update_data)
        
        assert exc_info.value.status_code == 400
        assert "Cannot update" in exc_info.value.message
    
    def test_get_kyc_status_not_submitted(self, kyc_service, user_id, mock_session):
        """Test KYC status when not submitted."""
        # Mock that no KYC exists
        mock_session.exec.return_value.first.return_value = None
        
        result = kyc_service.get_kyc_status(user_id)
        
        assert result["status"] == "NOT_SUBMITTED"
        assert result["message"] == "KYC information not submitted"
    
    def test_get_kyc_status_with_expiry(self, kyc_service, user_id, mock_session):
        """Test KYC status with expiry date."""
        # Mock existing KYC
        existing_kyc = Mock()
        existing_kyc.kyc_status = KYCStatus.VERIFIED
        existing_kyc.verification_date = datetime.utcnow()
        existing_kyc.expiry_date = datetime.utcnow() + timedelta(days=100)
        existing_kyc.rejection_reason = None
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        result = kyc_service.get_kyc_status(user_id)
        
        assert result["status"] == KYCStatus.VERIFIED
        assert result["days_until_expiry"] == 100
    
    def test_verify_kyc_success(self, kyc_service, user_id, mock_session):
        """Test successful KYC verification."""
        # Mock existing KYC with IN_REVIEW status
        existing_kyc = Mock()
        existing_kyc.id = uuid4()
        existing_kyc.kyc_status = KYCStatus.IN_REVIEW
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        with patch.object(kyc_service, 'update', return_value=existing_kyc) as mock_update:
            result = kyc_service.verify_kyc(user_id)
            
            mock_update.assert_called_once()
            # Verify that verification date and expiry date were set
            call_kwargs = mock_update.call_args[1]
            assert call_kwargs['kyc_status'] == KYCStatus.VERIFIED
            assert 'verification_date' in call_kwargs
            assert 'expiry_date' in call_kwargs
    
    def test_verify_kyc_wrong_status(self, kyc_service, user_id, mock_session):
        """Test KYC verification with wrong status."""
        # Mock existing KYC with PENDING status
        existing_kyc = Mock()
        existing_kyc.kyc_status = KYCStatus.PENDING
        mock_session.exec.return_value.first.return_value = existing_kyc
        
        with pytest.raises(ServiceException) as exc_info:
            kyc_service.verify_kyc(user_id)
        
        assert exc_info.value.status_code == 400
        assert "in review status" in exc_info.value.message


class TestInvestmentGoalService:
    """Test cases for InvestmentGoalService."""
    
    @pytest.fixture
    def mock_session(self):
        """Create a mock database session."""
        return Mock()
    
    @pytest.fixture
    def goal_service(self, mock_session):
        """Create Investment Goal service with mock session."""
        return InvestmentGoalService(mock_session)
    
    @pytest.fixture
    def user_id(self):
        """Create a test user ID."""
        return uuid4()
    
    @pytest.fixture
    def goal_create_data(self):
        """Create valid goal creation data."""
        return UserInvestmentGoalCreate(
            goal_type=InvestmentGoal.RETIREMENT,
            target_amount=1000000,
            target_date=datetime.now() + timedelta(days=365 * 30),  # 30 years
            priority=1,
            description="Retirement savings goal"
        )
    
    def test_create_goal_success(self, goal_service, user_id, goal_create_data, mock_session):
        """Test successful goal creation."""
        expected_goal = UserInvestmentGoal(
            id=uuid4(),
            user_id=user_id,
            **goal_create_data.dict()
        )
        
        with patch.object(goal_service, 'create', return_value=expected_goal) as mock_create:
            result = goal_service.create_goal(user_id, goal_create_data)
            
            mock_create.assert_called_once()
            assert result == expected_goal
    
    def test_create_goal_invalid_amount(self, goal_service, user_id, goal_create_data, mock_session):
        """Test goal creation with invalid target amount."""
        goal_create_data.target_amount = -1000  # Negative amount
        
        with pytest.raises(ServiceException) as exc_info:
            goal_service.create_goal(user_id, goal_create_data)
        
        assert "must be positive" in exc_info.value.message
    
    def test_create_goal_past_date(self, goal_service, user_id, goal_create_data, mock_session):
        """Test goal creation with past target date."""
        goal_create_data.target_date = datetime.now() - timedelta(days=1)  # Yesterday
        
        with pytest.raises(ServiceException) as exc_info:
            goal_service.create_goal(user_id, goal_create_data)
        
        assert "must be in the future" in exc_info.value.message
    
    def test_get_user_goals(self, goal_service, user_id, mock_session):
        """Test retrieving user goals."""
        mock_goals = [Mock(), Mock()]
        mock_session.exec.return_value.all.return_value = mock_goals
        
        result = goal_service.get_user_goals(user_id)
        
        assert result == mock_goals
        # Verify that the query filtered by user_id and active status
        mock_session.exec.assert_called_once()
    
    def test_update_goal_success(self, goal_service, user_id, mock_session):
        """Test successful goal update."""
        goal_id = uuid4()
        
        # Mock existing goal
        existing_goal = Mock()
        existing_goal.user_id = user_id
        
        with patch.object(goal_service, 'get_by_id', return_value=existing_goal):
            with patch.object(goal_service, 'update', return_value=existing_goal) as mock_update:
                from app.model.user import UserInvestmentGoalUpdate
                update_data = UserInvestmentGoalUpdate(target_amount=1200000)
                
                result = goal_service.update_goal(goal_id, user_id, update_data)
                
                mock_update.assert_called_once()
                assert result == existing_goal
    
    def test_update_goal_wrong_user(self, goal_service, user_id, mock_session):
        """Test goal update by wrong user."""
        goal_id = uuid4()
        other_user_id = uuid4()
        
        # Mock existing goal owned by different user
        existing_goal = Mock()
        existing_goal.user_id = other_user_id
        
        with patch.object(goal_service, 'get_by_id', return_value=existing_goal):
            from app.model.user import UserInvestmentGoalUpdate
            update_data = UserInvestmentGoalUpdate(target_amount=1200000)
            
            with pytest.raises(ServiceException) as exc_info:
                goal_service.update_goal(goal_id, user_id, update_data)
            
            assert exc_info.value.status_code == 404
            assert "not found" in exc_info.value.message


class TestUserAccountService:
    """Test cases for UserAccountService."""
    
    @pytest.fixture
    def mock_session(self):
        """Create a mock database session."""
        return Mock()
    
    @pytest.fixture
    def account_service(self, mock_session):
        """Create User Account service with mock session."""
        return UserAccountService(mock_session)
    
    @pytest.fixture
    def user_id(self):
        """Create a test user ID."""
        return uuid4()
    
    @pytest.fixture
    def account_create_data(self):
        """Create valid account creation data."""
        return UserAccountCreate(
            account_type=AccountType.INDIVIDUAL,
            account_name="My Investment Account",
            account_number="12345678"
        )
    
    def test_create_account_success(self, account_service, user_id, account_create_data, mock_session):
        """Test successful account creation."""
        expected_account = UserAccount(
            id=uuid4(),
            user_id=user_id,
            **account_create_data.dict()
        )
        
        with patch.object(account_service, 'create', return_value=expected_account) as mock_create:
            result = account_service.create_account(user_id, account_create_data)
            
            mock_create.assert_called_once()
            assert result == expected_account
    
    def test_create_joint_account_no_holder_name(self, account_service, user_id, account_create_data, mock_session):
        """Test joint account creation without joint holder name."""
        account_create_data.account_type = AccountType.JOINT
        account_create_data.joint_holder_name = None
        
        with pytest.raises(ServiceException) as exc_info:
            account_service.create_account(user_id, account_create_data)
        
        assert "Joint holder name is required" in exc_info.value.message
    
    def test_create_retirement_account_invalid_limit(self, account_service, user_id, account_create_data, mock_session):
        """Test retirement account creation with invalid contribution limit."""
        account_create_data.account_type = AccountType.RETIREMENT_401K
        account_create_data.contribution_limit = -1000  # Negative limit
        
        with pytest.raises(ServiceException) as exc_info:
            account_service.create_account(user_id, account_create_data)
        
        assert "must be positive" in exc_info.value.message
    
    def test_get_user_accounts(self, account_service, user_id, mock_session):
        """Test retrieving user accounts."""
        mock_accounts = [Mock(), Mock()]
        mock_session.exec.return_value.all.return_value = mock_accounts
        
        result = account_service.get_user_accounts(user_id)
        
        assert result == mock_accounts
        # Verify that the query filtered by user_id and active status
        mock_session.exec.assert_called_once()
    
    def test_deactivate_account_success(self, account_service, user_id, mock_session):
        """Test successful account deactivation."""
        account_id = uuid4()
        
        # Mock existing account
        existing_account = Mock()
        existing_account.user_id = user_id
        
        with patch.object(account_service, 'get_by_id', return_value=existing_account):
            with patch.object(account_service, 'update') as mock_update:
                result = account_service.deactivate_account(account_id, user_id)
                
                assert result is True
                mock_update.assert_called_once()
                # Verify that is_active was set to False
                call_kwargs = mock_update.call_args[1]
                assert call_kwargs['is_active'] is False
    
    def test_deactivate_account_wrong_user(self, account_service, user_id, mock_session):
        """Test account deactivation by wrong user."""
        account_id = uuid4()
        other_user_id = uuid4()
        
        # Mock existing account owned by different user
        existing_account = Mock()
        existing_account.user_id = other_user_id
        
        with patch.object(account_service, 'get_by_id', return_value=existing_account):
            with pytest.raises(ServiceException) as exc_info:
                account_service.deactivate_account(account_id, user_id)
            
            assert exc_info.value.status_code == 404
            assert "not found" in exc_info.value.message


# Integration test example
class TestKYCServiceIntegration:
    """Integration tests for KYC service (would use test database)."""
    
    @pytest.mark.integration
    def test_full_kyc_workflow(self):
        """Test complete KYC workflow from creation to verification."""
        # This would be an integration test using a test database
        # and real service instances
        pass