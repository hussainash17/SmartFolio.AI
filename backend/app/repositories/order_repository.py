"""Order repository for database operations"""
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select
from app.model.order import Order, OrderStatus, OrderSide, OrderExecution
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.stock import StockData
from app.model.company import Company
from app.model.funds import AccountTransaction
from app.model.trade import Trade


class OrderRepository:
    """Repository for Order-related database operations"""
    
    @staticmethod
    def get_order_by_id(session: Session, order_id: UUID, user_id: UUID) -> Optional[Order]:
        """Get an order by ID and user ID"""
        return session.exec(
            select(Order).where(
                Order.id == order_id,
                Order.user_id == user_id
            )
        ).first()
    
    @staticmethod
    def get_orders(
        session: Session,
        user_id: UUID,
        portfolio_id: Optional[UUID] = None,
        status: Optional[OrderStatus] = None
    ) -> List[Order]:
        """Get orders for a user with optional filters"""
        query = select(Order).where(Order.user_id == user_id)
        
        if portfolio_id:
            query = query.where(Order.portfolio_id == portfolio_id)
        
        if status:
            query = query.where(Order.status == status)
        
        return session.exec(query.order_by(Order.placed_at.desc())).all()
    
    @staticmethod
    def get_orders_with_details(
        session: Session,
        user_id: UUID,
        portfolio_id: Optional[UUID] = None,
        status: Optional[OrderStatus] = None
    ) -> List[tuple]:
        """Get orders with stock details"""
        query = select(Order, Company).join(
            Company, Order.stock_id == Company.id
        ).where(Order.user_id == user_id)
        
        if portfolio_id:
            query = query.where(Order.portfolio_id == portfolio_id)
        
        if status:
            query = query.where(Order.status == status)
        
        return session.exec(query.order_by(Order.placed_at.desc())).all() or []
    
    @staticmethod
    def create_order(session: Session, order: Order) -> Order:
        """Create a new order"""
        session.add(order)
        return order
    
    @staticmethod
    def update_order(session: Session, order: Order) -> Order:
        """Update an existing order"""
        session.add(order)
        return order
    
    @staticmethod
    def get_order_executions(session: Session, order_id: UUID) -> List[OrderExecution]:
        """Get executions for an order"""
        return session.exec(
            select(OrderExecution).where(OrderExecution.order_id == order_id)
            .order_by(OrderExecution.executed_at.desc())
        ).all()
    
    @staticmethod
    def get_stock_by_id(session: Session, stock_id: UUID) -> Optional[Company]:
        """Get a stock/company by ID"""
        return session.exec(
            select(Company).where(Company.id == stock_id)
        ).first()
    
    @staticmethod
    def get_portfolio_by_id(session: Session, portfolio_id: UUID, user_id: UUID) -> Optional[Portfolio]:
        """Get a portfolio by ID and user ID"""
        return session.exec(
            select(Portfolio).where(
                Portfolio.id == portfolio_id,
                Portfolio.user_id == user_id
            )
        ).first()
    
    @staticmethod
    def get_user_portfolios(session: Session, user_id: UUID) -> List[Portfolio]:
        """Get all portfolios for a user"""
        return session.exec(
            select(Portfolio).where(Portfolio.user_id == user_id)
        ).all() or []
    
    @staticmethod
    def get_latest_stock_data(session: Session, company_id: UUID) -> Optional[StockData]:
        """Get the latest stock data for a company"""
        return session.exec(
            select(StockData)
            .where(StockData.company_id == company_id)
            .order_by(StockData.timestamp.desc())
        ).first()
    
    @staticmethod
    def get_open_buy_orders(session: Session, user_id: UUID) -> List[Order]:
        """Get all open buy orders for a user"""
        return session.exec(
            select(Order).where(
                Order.user_id == user_id,
                Order.side == OrderSide.BUY,
                Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
            )
        ).all() or []
    
    @staticmethod
    def get_latest_stock_data_batch(session: Session, company_ids: List[UUID]) -> List[StockData]:
        """Get latest stock data for multiple companies"""
        return session.exec(
            select(StockData).where(
                StockData.company_id.in_(company_ids)
            ).order_by(StockData.company_id, StockData.timestamp.desc())
        ).all() or []
    
    @staticmethod
    def get_portfolio_position(
        session: Session,
        portfolio_id: UUID,
        stock_id: UUID
    ) -> Optional[PortfolioPosition]:
        """Get a portfolio position"""
        return session.exec(
            select(PortfolioPosition).where(
                PortfolioPosition.portfolio_id == portfolio_id,
                PortfolioPosition.stock_id == stock_id
            )
        ).first()
    
    @staticmethod
    def create_portfolio_position(session: Session, position: PortfolioPosition) -> PortfolioPosition:
        """Create a new portfolio position"""
        session.add(position)
        return position
    
    @staticmethod
    def update_portfolio_position(session: Session, position: PortfolioPosition) -> PortfolioPosition:
        """Update a portfolio position"""
        session.add(position)
        return position
    
    @staticmethod
    def delete_portfolio_position(session: Session, position: PortfolioPosition) -> None:
        """Delete a portfolio position"""
        session.delete(position)
    
    @staticmethod
    def create_trade(session: Session, trade: Trade) -> Trade:
        """Create a new trade record"""
        session.add(trade)
        return trade
    
    @staticmethod
    def create_account_transaction(session: Session, transaction: AccountTransaction) -> AccountTransaction:
        """Create a new account transaction"""
        session.add(transaction)
        return transaction
    
    @staticmethod
    def update_portfolio(session: Session, portfolio: Portfolio) -> Portfolio:
        """Update a portfolio"""
        session.add(portfolio)
        return portfolio
