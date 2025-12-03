"""
Portfolio service module.

This module provides portfolio management functionality including
portfolio creation, position tracking, trade execution, and performance calculations.
"""

from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select, func, and_, or_
import logging
from dataclasses import dataclass

from app.services.base import BaseService, ServiceException
from app.model.portfolio import (
    Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioPublic,
    PortfolioPosition, PortfolioPositionPublic, PortfolioSummary,
    Watchlist, WatchlistCreate, WatchlistUpdate, WatchlistPublic,
    WatchlistItem, WatchlistItemCreate, WatchlistItemPublic
)
from app.model.trade import Trade, TradeCreate, TradeUpdate, TradePublic
from app.model.order import Order, OrderCreate, OrderUpdate, OrderPublic, OrderStatus, OrderSide
from app.model.stock import StockCompany, StockData
from app.model.user import User

logger = logging.getLogger(__name__)


@dataclass
class PositionSummary:
    """Data class for position summary information."""
    total_positions: int
    total_investment: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_percent: Decimal
    top_gainers: List[Dict[str, Any]]
    top_losers: List[Dict[str, Any]]


class PortfolioService(BaseService[Portfolio, PortfolioCreate, PortfolioUpdate]):
    """Service for portfolio management operations."""
    
    def __init__(self, session: Optional[Session] = None):
        super().__init__(Portfolio, session)
    
    def verify_portfolio_ownership(self, portfolio_id: UUID, user_id: UUID) -> Portfolio:
        """
        Verify that a portfolio belongs to a user.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID
            
        Returns:
            Portfolio if found and owned by user
            
        Raises:
            ServiceException: If portfolio not found or not owned by user
        """
        portfolio = self.session.exec(
            select(Portfolio).where(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id
            )
        ).first()
        
        if not portfolio:
            raise ServiceException("Portfolio not found or access denied", status_code=404)
        
        return portfolio
    
    def create_portfolio(self, portfolio_data: PortfolioCreate, user_id: UUID) -> Portfolio:
        """
        Create a new portfolio for a user.
        
        Args:
            portfolio_data: Portfolio creation data
            user_id: User UUID
            
        Returns:
            Created portfolio
        """
        try:
            # Check if this is the first portfolio (make it default)
            existing_portfolios = self.session.exec(
                select(Portfolio).where(Portfolio.user_id == user_id)
            ).all()
            
            if not existing_portfolios:
                portfolio_data.is_default = True
            
            # If this portfolio is set as default, unset others
            if portfolio_data.is_default:
                for existing in existing_portfolios:
                    existing.is_default = False
                    self.session.add(existing)
            
            portfolio = Portfolio(
                user_id=user_id,
                **portfolio_data.dict()
            )
            
            self.session.add(portfolio)
            self.session.commit()
            self.session.refresh(portfolio)
            
            logger.info(f"Created portfolio {portfolio.id} for user {user_id}")
            return portfolio
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error creating portfolio for user {user_id}: {e}")
            raise ServiceException(f"Failed to create portfolio: {str(e)}")
    
    def get_user_portfolios(self, user_id: UUID) -> List[Portfolio]:
        """Get all portfolios for a user."""
        try:
            portfolios = self.session.exec(
                select(Portfolio).where(Portfolio.user_id == user_id)
            ).all()
            return portfolios
        except Exception as e:
            logger.error(f"Error getting portfolios for user {user_id}: {e}")
            raise ServiceException(f"Failed to get portfolios: {str(e)}")
    
    def get_portfolio_with_positions(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        """
        Get portfolio with all positions and calculated metrics.
        
        Args:
            portfolio_id: Portfolio UUID
            user_id: User UUID
            
        Returns:
            Portfolio with positions and metrics
        """
        portfolio = self.verify_portfolio_ownership(portfolio_id, user_id)
        
        # Get positions with stock information
        positions = self.session.exec(
            select(PortfolioPosition, StockCompany)
            .join(StockCompany, PortfolioPosition.stock_id == StockCompany.id)
            .where(PortfolioPosition.portfolio_id == portfolio_id)
        ).all()
        
        position_data = []
        total_investment = Decimal('0')
        current_value = Decimal('0')
        
        for position, stock in positions:
            # Update current value with latest stock price
            if stock.current_price:
                position.current_value = Decimal(str(stock.current_price)) * position.quantity
                position.unrealized_pnl = position.current_value - position.total_investment
                if position.total_investment > 0:
                    position.unrealized_pnl_percent = (position.unrealized_pnl / position.total_investment) * 100
            
            total_investment += position.total_investment
            current_value += position.current_value
            
            position_data.append({
                "position": position,
                "stock": stock,
                "unrealized_pnl": float(position.unrealized_pnl),
                "unrealized_pnl_percent": float(position.unrealized_pnl_percent)
            })
        
        # Calculate portfolio metrics
        total_pnl = current_value - total_investment
        total_pnl_percent = (total_pnl / total_investment * 100) if total_investment > 0 else Decimal('0')
        
        return {
            "portfolio": portfolio,
            "positions": position_data,
            "summary": {
                "total_positions": len(position_data),
                "total_investment": float(total_investment),
                "current_value": float(current_value),
                "unrealized_pnl": float(total_pnl),
                "unrealized_pnl_percent": float(total_pnl_percent)
            }
        }
    
    def _calculate_commission(self, portfolio: Portfolio, total_amount: Decimal) -> Decimal:
        """
        Calculate commission based on portfolio's broker commission rate.
        
        Args:
            portfolio: Portfolio with broker_commission field
            total_amount: Total trade amount (quantity × price)
            
        Returns:
            Commission amount
        """
        commission_rate = portfolio.broker_commission / Decimal('100')
        return total_amount * commission_rate
    
    def execute_trade(self, trade_data: TradeCreate, user_id: UUID) -> Trade:
        """
        Execute a trade and update portfolio positions.
        
        Args:
            trade_data: Trade execution data
            user_id: User UUID
            
        Returns:
            Executed trade
        """
        try:
            portfolio = None
            # Verify portfolio ownership if specified
            if trade_data.portfolio_id:
                portfolio = self.verify_portfolio_ownership(trade_data.portfolio_id, user_id)
            
            # Calculate commission for BUY/SELL trades only
            commission = Decimal('0')
            if portfolio and trade_data.trade_type.upper() in ('BUY', 'SELL'):
                commission = self._calculate_commission(portfolio, trade_data.total_amount)
            
            # Update trade commission and net_amount
            trade_dict = trade_data.dict()
            trade_dict['commission'] = commission
            
            # Calculate net_amount: for both BUY and SELL, subtract commission
            # BUY: net_amount = investment amount (excluding commission)
            # SELL: net_amount = proceeds after commission
            if trade_data.trade_type.upper() == 'BUY':
                trade_dict['net_amount'] = trade_data.total_amount - commission
            elif trade_data.trade_type.upper() == 'SELL':
                trade_dict['net_amount'] = trade_data.total_amount - commission  # Commission reduces proceeds
            else:
                trade_dict['net_amount'] = trade_data.total_amount
            
            # Create trade record
            trade = Trade(**trade_dict)
            self.session.add(trade)
            
            # Update portfolio positions and cash balance if portfolio is specified
            if portfolio:
                self._update_portfolio_position(trade, portfolio)
            
            self.session.commit()
            self.session.refresh(trade)
            
            logger.info(f"Executed trade {trade.id} for user {user_id} with commission {commission}")
            return trade
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error executing trade for user {user_id}: {e}")
            raise ServiceException(f"Failed to execute trade: {str(e)}")
    
    def _update_portfolio_position(self, trade: Trade, portfolio: Portfolio):
        """Update portfolio position and cash balance based on trade."""
        # Get existing position
        position = self.session.exec(
            select(PortfolioPosition).where(
                and_(
                    PortfolioPosition.portfolio_id == trade.portfolio_id,
                    PortfolioPosition.stock_id == trade.stock_id
                )
            )
        ).first()
        
        current_cash = portfolio.cash_balance or Decimal('0')
        
        if trade.trade_type.upper() == "BUY":
            # For BUY: subtract total_amount (includes commission) from cash
            total_cost = trade.total_amount  # total_amount already includes commission
            if current_cash < total_cost:
                raise ServiceException(f"Insufficient cash balance. Available: {current_cash}, Required: {total_cost}")
            
            portfolio.cash_balance = current_cash - total_cost
            
            if position:
                # Update existing position
                total_cost_position = position.total_investment + trade.net_amount
                total_quantity = position.quantity + trade.quantity
                position.average_price = total_cost_position / total_quantity if total_quantity > 0 else Decimal('0')
                position.quantity = total_quantity
                position.total_investment = total_cost_position
            else:
                # Create new position
                position = PortfolioPosition(
                    portfolio_id=trade.portfolio_id,
                    stock_id=trade.stock_id,
                    quantity=trade.quantity,
                    average_price=trade.price,
                    total_investment=trade.net_amount,
                    current_value=trade.net_amount
                )
                self.session.add(position)
        
        elif trade.trade_type.upper() == "SELL":
            if position and position.quantity >= trade.quantity:
                # For SELL: add net_amount (after commission) to cash
                portfolio.cash_balance = current_cash + trade.net_amount
                
                # Reduce position
                position.quantity -= trade.quantity
                # Proportionally reduce total investment
                if position.quantity > 0:
                    position.total_investment = position.average_price * position.quantity
                else:
                    # Position fully closed
                    position.total_investment = Decimal('0')
                    position.current_value = Decimal('0')
                    position.unrealized_pnl = Decimal('0')
                    position.unrealized_pnl_percent = Decimal('0')
            else:
                raise ServiceException("Insufficient quantity to sell")
        
        self.session.add(portfolio)
    
    def get_portfolio_trades(self, portfolio_id: UUID, user_id: UUID) -> List[Trade]:
        """Get all trades for a portfolio."""
        self.verify_portfolio_ownership(portfolio_id, user_id)
        
        trades = self.session.exec(
            select(Trade).where(Trade.portfolio_id == portfolio_id)
            .order_by(Trade.trade_date.desc())
        ).all()
        
        return trades
    
    def get_position_summary(self, portfolio_id: UUID, user_id: UUID) -> PositionSummary:
        """Get position summary with top gainers and losers."""
        portfolio_data = self.get_portfolio_with_positions(portfolio_id, user_id)
        positions = portfolio_data["positions"]
        
        # Sort positions by PnL percentage
        sorted_positions = sorted(positions, key=lambda x: x["unrealized_pnl_percent"], reverse=True)
        
        top_gainers = sorted_positions[:5]  # Top 5 gainers
        top_losers = sorted_positions[-5:]  # Top 5 losers
        
        return PositionSummary(
            total_positions=portfolio_data["summary"]["total_positions"],
            total_investment=Decimal(str(portfolio_data["summary"]["total_investment"])),
            current_value=Decimal(str(portfolio_data["summary"]["current_value"])),
            unrealized_pnl=Decimal(str(portfolio_data["summary"]["unrealized_pnl"])),
            unrealized_pnl_percent=Decimal(str(portfolio_data["summary"]["unrealized_pnl_percent"])),
            top_gainers=top_gainers,
            top_losers=top_losers
        )
    
    # Watchlist Management
    def create_watchlist(self, watchlist_data: WatchlistCreate, user_id: UUID) -> Watchlist:
        """Create a new watchlist for a user."""
        try:
            # Check if this is the first watchlist (make it default)
            existing_watchlists = self.session.exec(
                select(Watchlist).where(Watchlist.user_id == user_id)
            ).all()
            
            if not existing_watchlists:
                watchlist_data.is_default = True
            
            # If this watchlist is set as default, unset others
            if watchlist_data.is_default:
                for existing in existing_watchlists:
                    existing.is_default = False
                    self.session.add(existing)
            
            watchlist = Watchlist(
                user_id=user_id,
                **watchlist_data.dict()
            )
            
            self.session.add(watchlist)
            self.session.commit()
            self.session.refresh(watchlist)
            
            logger.info(f"Created watchlist {watchlist.id} for user {user_id}")
            return watchlist
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error creating watchlist for user {user_id}: {e}")
            raise ServiceException(f"Failed to create watchlist: {str(e)}")
    
    def add_to_watchlist(self, watchlist_id: UUID, item_data: WatchlistItemCreate, user_id: UUID) -> WatchlistItem:
        """Add a stock to a watchlist."""
        try:
            # Verify watchlist ownership
            watchlist = self.session.exec(
                select(Watchlist).where(
                    and_(
                        Watchlist.id == watchlist_id,
                        Watchlist.user_id == user_id
                    )
                )
            ).first()
            
            if not watchlist:
                raise ServiceException("Watchlist not found or access denied", status_code=404)
            
            # Check if stock already in watchlist
            existing = self.session.exec(
                select(WatchlistItem).where(
                    and_(
                        WatchlistItem.watchlist_id == watchlist_id,
                        WatchlistItem.stock_id == item_data.stock_id
                    )
                )
            ).first()
            
            if existing:
                raise ServiceException("Stock already in watchlist", status_code=400)
            
            item = WatchlistItem(
                watchlist_id=watchlist_id,
                **item_data.dict()
            )
            
            self.session.add(item)
            self.session.commit()
            self.session.refresh(item)
            
            return item
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error adding to watchlist {watchlist_id}: {e}")
            raise ServiceException(f"Failed to add to watchlist: {str(e)}")
    
    def get_user_watchlists(self, user_id: UUID) -> List[Watchlist]:
        """Get all watchlists for a user."""
        try:
            watchlists = self.session.exec(
                select(Watchlist).where(Watchlist.user_id == user_id)
            ).all()
            return watchlists
        except Exception as e:
            logger.error(f"Error getting watchlists for user {user_id}: {e}")
            raise ServiceException(f"Failed to get watchlists: {str(e)}")

