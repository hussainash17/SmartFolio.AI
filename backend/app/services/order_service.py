"""Order service for business logic"""
from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import HTTPException, status
from sqlmodel import Session
from datetime import datetime
from decimal import Decimal

from app.model.order import (
    Order, OrderCreate, OrderUpdate,
    OrderSummary, OrderType, OrderSide, OrderStatus
)
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.company import Company
from app.model.funds import AccountTransaction, TransactionType
from app.model.trade import Trade
from app.model.user import User
from app.repositories.order_repository import OrderRepository


def _safe_decimal(value) -> Decimal:
    """Convert value to Decimal safely"""
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal(0)


class OrderService:
    """Service for order business logic"""
    
    def __init__(self):
        self.repo = OrderRepository()
    
    def validate_stock_exists(self, session: Session, stock_id: UUID) -> Company:
        """Validate that a stock exists"""
        stock = self.repo.get_stock_by_id(session, stock_id)
        if not stock:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Stock not found"
            )
        return stock
    
    def validate_portfolio_ownership(
        self,
        session: Session,
        portfolio_id: UUID,
        user_id: UUID
    ) -> Portfolio:
        """Validate that a portfolio exists and belongs to user"""
        portfolio = self.repo.get_portfolio_by_id(session, portfolio_id, user_id)
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio not found"
            )
        return portfolio
    
    def calculate_buying_power(self, session: Session, user: User) -> Decimal:
        """Calculate user's buying power (cash + credit - reserved)"""
        # Fetch cash across portfolios
        portfolios = self.repo.get_user_portfolios(session, user.id)
        cash = sum(_safe_decimal(p.cash_balance) for p in portfolios)
        
        # Get credit limit
        credit = _safe_decimal(getattr(user, "credit_limit", 0))
        
        # Calculate reserved amount from open buy orders
        open_buys = self.repo.get_open_buy_orders(session, user.id)
        reserved = Decimal(0)
        
        if open_buys:
            # Get latest prices for stocks
            company_ids = list({o.stock_id for o in open_buys})
            rows = self.repo.get_latest_stock_data_batch(session, company_ids)
            
            # Build latest price map
            seen = set()
            latest_map = {}
            for r in rows:
                if r.company_id not in seen:
                    latest_map[r.company_id] = _safe_decimal(r.last_trade_price)
                    seen.add(r.company_id)
            
            # Calculate reserved amount
            for o in open_buys:
                remaining = _safe_decimal(o.quantity) - _safe_decimal(o.filled_quantity or 0)
                if remaining <= 0:
                    continue
                p = _safe_decimal(o.price) if o.price is not None else latest_map.get(o.stock_id, Decimal(0))
                reserved += p * remaining
        
        return cash + credit - reserved
    
    def check_affordability(
        self,
        session: Session,
        user: User,
        order: OrderCreate
    ) -> None:
        """Check if user can afford the buy order"""
        if order.side != OrderSide.BUY:
            return
        
        # Compute reference price
        ref_price = _safe_decimal(order.price)
        if ref_price <= 0:
            latest = self.repo.get_latest_stock_data(session, order.stock_id)
            ref_price = _safe_decimal(latest.last_trade_price) if latest else Decimal(0)
        
        total_needed = ref_price * _safe_decimal(order.quantity)
        buying_power = self.calculate_buying_power(session, user)
        
        if total_needed > buying_power:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient buying power"
            )
    
    def execute_simulated_order(
        self,
        session: Session,
        db_order: Order,
        order: OrderCreate,
        portfolio: Portfolio,
        stock: Company
    ) -> None:
        """Auto-fill simulated orders immediately"""
        # Get current market price
        latest_data = self.repo.get_latest_stock_data(session, order.stock_id)
        
        if not latest_data or not latest_data.last_trade_price:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to get current market price for stock"
            )
        
        # Determine execution price
        execution_price = _safe_decimal(order.price)
        if execution_price <= 0 or order.order_type == OrderType.MARKET:
            execution_price = _safe_decimal(latest_data.last_trade_price)
        
        # Calculate execution details
        commission = Decimal("0")  # No commission for simulated trading
        total_amount = execution_price * _safe_decimal(order.quantity)
        net_amount = total_amount + commission
        
        # Update order with filled status
        db_order.status = OrderStatus.FILLED
        db_order.filled_quantity = order.quantity
        db_order.average_price = execution_price
        db_order.total_amount = total_amount
        db_order.commission = commission
        db_order.net_amount = net_amount
        db_order.filled_at = datetime.utcnow()
        
        # Adjust portfolio cash balance
        if order.side == OrderSide.BUY:
            if portfolio.cash_balance is None:
                portfolio.cash_balance = Decimal(0)
            portfolio.cash_balance = portfolio.cash_balance - net_amount
            tx_type = TransactionType.BUY
        else:  # SELL
            if portfolio.cash_balance is None:
                portfolio.cash_balance = Decimal(0)
            portfolio.cash_balance = portfolio.cash_balance + net_amount
            tx_type = TransactionType.SELL
        
        # Create trade record
        db_trade = Trade(
            portfolio_id=order.portfolio_id,
            stock_id=order.stock_id,
            trade_type=order.side.value,
            quantity=order.quantity,
            price=execution_price,
            total_amount=total_amount,
            commission=commission,
            net_amount=net_amount,
            trade_date=datetime.utcnow(),
            notes=f"Auto-filled {order.order_type.value} order",
            is_simulated=True
        )
        self.repo.create_trade(session, db_trade)
        
        # Create account transaction
        tx = AccountTransaction(
            user_id=portfolio.user_id,
            portfolio_id=portfolio.id,
            trade_id=db_trade.id,
            type=tx_type,
            amount=net_amount.copy_abs(),
            description=f"{order.side.value} {stock.trading_code}"
        )
        self.repo.create_account_transaction(session, tx)
        
        # Update or create portfolio position
        position = self.repo.get_portfolio_position(
            session, order.portfolio_id, order.stock_id
        )
        
        if order.side == OrderSide.BUY:
            if position:
                # Update existing position
                total_cost = position.total_investment + net_amount
                total_quantity = position.quantity + order.quantity
                position.average_price = total_cost / total_quantity if total_quantity > 0 else Decimal('0')
                position.quantity = total_quantity
                position.total_investment = total_cost
                position.current_value = total_quantity * execution_price
                self.repo.update_portfolio_position(session, position)
            else:
                # Create new position
                position = PortfolioPosition(
                    portfolio_id=order.portfolio_id,
                    stock_id=order.stock_id,
                    quantity=order.quantity,
                    average_price=execution_price,
                    total_investment=net_amount,
                    current_value=order.quantity * execution_price
                )
                self.repo.create_portfolio_position(session, position)
        else:  # SELL
            if not position:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No position found to sell"
                )
            # Update position for sell
            if position.quantity < order.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient shares to sell"
                )
            
            # Calculate realized P/L: (sell_price - avg_cost) * quantity_sold
            realized_gain = (execution_price - position.average_price) * _safe_decimal(order.quantity)
            
            # Update portfolio's cumulative realized P/L
            if portfolio.realized_pnl is None:
                portfolio.realized_pnl = Decimal(0)
            portfolio.realized_pnl = portfolio.realized_pnl + realized_gain
            
            # Update position quantity
            position.quantity = position.quantity - order.quantity
            if position.quantity == 0:
                # Remove position if fully sold
                self.repo.delete_portfolio_position(session, position)
            else:
                # Recalculate current value
                position.current_value = position.quantity * execution_price
                self.repo.update_portfolio_position(session, position)
        
        self.repo.update_portfolio(session, portfolio)
    
    def create_order_with_validation(
        self,
        session: Session,
        user: User,
        order: OrderCreate
    ) -> Order:
        """Create a new order with validation"""
        # Validate stock exists
        stock = self.validate_stock_exists(session, order.stock_id)
        
        # Validate portfolio if specified
        portfolio = None
        if order.portfolio_id:
            portfolio = self.validate_portfolio_ownership(
                session, order.portfolio_id, user.id
            )
        
        # Affordability check for BUY orders
        self.check_affordability(session, user, order)
        
        # Create order
        db_order = Order(
            user_id=user.id,
            **order.dict()
        )
        self.repo.create_order(session, db_order)
        
        # Auto-fill simulated orders immediately
        if order.is_simulated and order.portfolio_id:
            self.execute_simulated_order(session, db_order, order, portfolio, stock)
        
        session.commit()
        session.refresh(db_order)
        return db_order
    
    def update_order_with_validation(
        self,
        session: Session,
        order_id: UUID,
        user_id: UUID,
        order_update: OrderUpdate
    ) -> Order:
        """Update an order with validation"""
        order = self.repo.get_order_by_id(session, order_id, user_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Only allow updates for pending orders
        if order.status != OrderStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update pending orders"
            )
        
        # Update order
        for field, value in order_update.dict(exclude_unset=True).items():
            setattr(order, field, value)
        
        self.repo.update_order(session, order)
        session.commit()
        session.refresh(order)
        return order
    
    def cancel_order_with_validation(
        self,
        session: Session,
        order_id: UUID,
        user_id: UUID
    ) -> Dict[str, str]:
        """Cancel an order with validation"""
        order = self.repo.get_order_by_id(session, order_id, user_id)
        
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        # Only allow cancellation of pending or partial orders
        if order.status not in [OrderStatus.PENDING, OrderStatus.PARTIAL]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel pending or partial orders"
            )
        
        order.status = OrderStatus.CANCELLED
        order.cancelled_at = datetime.utcnow()
        
        self.repo.update_order(session, order)
        session.commit()
        
        return {"message": "Order cancelled successfully"}
    
    def get_order_summary(
        self,
        session: Session,
        user_id: UUID,
        portfolio_id: Optional[UUID] = None
    ) -> OrderSummary:
        """Get order summary for the user"""
        orders = self.repo.get_orders(session, user_id, portfolio_id)
        
        summary = OrderSummary(
            total_orders=len(orders),
            pending_orders=len([o for o in orders if o.status == OrderStatus.PENDING]),
            filled_orders=len([o for o in orders if o.status == OrderStatus.FILLED]),
            cancelled_orders=len([o for o in orders if o.status == OrderStatus.CANCELLED]),
            rejected_orders=len([o for o in orders if o.status == OrderStatus.REJECTED]),
            total_volume=sum(o.quantity for o in orders),
            total_amount=sum(o.total_amount or 0 for o in orders),
            orders=orders
        )
        
        return summary
