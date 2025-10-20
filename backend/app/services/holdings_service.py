"""Service for managing portfolio holdings"""
from decimal import Decimal
from typing import List, Tuple
from uuid import UUID

from sqlmodel import Session, select

from app.model.company import Company
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.funds import AccountTransaction, TransactionType
from app.model.portfolio_statement import (
    BulkHoldingsSaveRequest,
    BulkHoldingsSaveResponse,
    HoldingItem,
)


class HoldingsService:
    """Service for portfolio holdings operations"""

    def __init__(self, session: Session):
        self.session = session

    def save_bulk_holdings(
        self,
        portfolio_id: UUID,
        user_id: UUID,
        request: BulkHoldingsSaveRequest,
    ) -> BulkHoldingsSaveResponse:
        """
        Save bulk holdings to a portfolio
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID (for ownership validation)
            request: Bulk holdings save request
            
        Returns:
            BulkHoldingsSaveResponse with operation results
        """
        warnings = []
        added_count = 0
        updated_count = 0
        
        # Validate portfolio ownership
        portfolio = self._validate_portfolio_ownership(portfolio_id, user_id)
        
        # Process each holding
        for holding in request.holdings:
            try:
                # Find or verify stock exists
                stock = self._find_or_warn_stock(holding, warnings)
                if not stock:
                    continue
                
                # Check if position already exists
                existing_position = self.session.exec(
                    select(PortfolioPosition).where(
                        PortfolioPosition.portfolio_id == portfolio_id,
                        PortfolioPosition.stock_id == stock.id,
                    )
                ).first()
                
                if existing_position:
                    # Update existing position
                    self._update_position(
                        existing_position, holding, portfolio, user_id
                    )
                    updated_count += 1
                else:
                    # Create new position
                    self._create_position(
                        portfolio_id, stock.id, holding, portfolio, user_id
                    )
                    added_count += 1
                    
            except Exception as e:
                warnings.append(
                    f"Error processing {holding.symbol}: {str(e)}"
                )
                continue
        
        # Commit all changes
        try:
            self.session.commit()
        except Exception as e:
            self.session.rollback()
            raise Exception(f"Failed to save holdings: {str(e)}")
        
        return BulkHoldingsSaveResponse(
            success=True,
            message=f"Successfully processed {added_count + updated_count} holdings",
            added_count=added_count,
            updated_count=updated_count,
            portfolio_id=portfolio_id,
            warnings=warnings,
        )

    def _validate_portfolio_ownership(
        self, portfolio_id: UUID, user_id: UUID
    ) -> Portfolio:
        """Validate that user owns the portfolio"""
        portfolio = self.session.exec(
            select(Portfolio).where(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id,
            )
        ).first()
        
        if not portfolio:
            raise Exception("Portfolio not found or access denied")
        
        if not portfolio.is_active:
            raise Exception("Portfolio is not active")
        
        return portfolio

    def _find_or_warn_stock(
        self, holding: HoldingItem, warnings: List[str]
    ) -> Company | None:
        """Find stock by trading code (symbol should already be a trading_code from parser)"""
        # Try by trading_code (exact match) - this should work now since parser maps it
        stock = self.session.exec(
            select(Company).where(
                Company.trading_code == holding.symbol.upper()
            )
        ).first()
        
        if not stock:
            # Not found - add warning
            warnings.append(
                f"Stock with trading code '{holding.symbol}' not found in database. "
                f"Please ensure the stock is added to the company table first."
            )
            return None
        
        return stock

    def _create_position(
        self,
        portfolio_id: UUID,
        stock_id: UUID,
        holding: HoldingItem,
        portfolio: Portfolio,
        user_id: UUID,
    ) -> None:
        """Create a new portfolio position"""
        total_investment = Decimal(str(holding.quantity)) * holding.cost_price
        
        # Create position
        position = PortfolioPosition(
            portfolio_id=portfolio_id,
            stock_id=stock_id,
            quantity=holding.quantity,
            average_price=holding.cost_price,
            total_investment=total_investment,
            current_value=holding.market_value,
            unrealized_pnl=holding.unrealized_gain_loss,
            unrealized_pnl_percent=holding.unrealized_gain_loss_percent,
        )
        
        # Create transaction record for audit
        transaction = AccountTransaction(
            user_id=user_id,
            portfolio_id=portfolio_id,
            type=TransactionType.BUY,
            amount=total_investment,
            description=f"Imported position from statement: {holding.symbol} - {holding.quantity} shares @ {holding.cost_price}",
        )
        
        self.session.add(position)
        self.session.add(transaction)

    def _update_position(
        self,
        position: PortfolioPosition,
        holding: HoldingItem,
        portfolio: Portfolio,
        user_id: UUID,
    ) -> None:
        """Update an existing portfolio position"""
        old_total_investment = position.total_investment
        
        # Update position values
        position.quantity = holding.quantity
        position.average_price = holding.cost_price
        position.total_investment = Decimal(str(holding.quantity)) * holding.cost_price
        position.current_value = holding.market_value
        position.unrealized_pnl = holding.unrealized_gain_loss
        position.unrealized_pnl_percent = holding.unrealized_gain_loss_percent
        
        # Calculate cash adjustment
        new_total_investment = position.total_investment
        cash_difference = new_total_investment - old_total_investment
        
        # Create transaction for the adjustment
        if cash_difference != 0:
            transaction = AccountTransaction(
                user_id=user_id,
                portfolio_id=portfolio.id,
                type=TransactionType.BUY if cash_difference > 0 else TransactionType.SELL,
                amount=abs(cash_difference),
                description=f"Position updated from statement: {holding.symbol} - {holding.quantity} shares @ {holding.cost_price}",
            )
            self.session.add(transaction)
        
        self.session.add(position)

    def reconcile_portfolio_cash(
        self,
        portfolio: Portfolio,
        total_investment: Decimal,
        user_id: UUID,
    ) -> None:
        """
        Reconcile portfolio cash balance after bulk import
        (Optional - you may want to implement this based on business logic)
        """
        # This could be used to adjust cash balance after importing positions
        # For now, we'll leave it as a placeholder
        pass

