from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session

from app.api.deps import get_current_user, get_session_dep
from app.model.funds import AccountTransaction, TransactionType
from app.model.order import Order, OrderStatus
from app.model.portfolio import (
    Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioPublic,
    PortfolioPosition, PortfolioPositionPublic,
    PortfolioSummary
)
from app.model.company import Company
from app.model.trade import Trade, TradeCreate, TradeUpdate, TradePublic, TradeWithDetails
from app.model.user import User

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# Portfolio Management APIs
@router.post("/", response_model=PortfolioPublic)
def create_portfolio(
        portfolio: PortfolioCreate,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Create a new portfolio for the current user"""
    # Check if this is the first portfolio (make it default)
    existing_portfolios = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all()

    if not existing_portfolios:
        portfolio.is_default = True

    # If this portfolio is set as default, unset others
    if portfolio.is_default:
        for existing in existing_portfolios:
            existing.is_default = False
            session.add(existing)

    db_portfolio = Portfolio(
        user_id=current_user.id,
        **portfolio.dict()
    )
    session.add(db_portfolio)
    session.commit()
    session.refresh(db_portfolio)
    return db_portfolio


@router.get("/", response_model=List[PortfolioPublic])
def get_user_portfolios(
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get all portfolios for the current user"""
    portfolios = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all()
    return portfolios


@router.get("/{portfolio_id}", response_model=PortfolioPublic)
def get_portfolio(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get a specific portfolio by ID"""
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    return portfolio


@router.put("/{portfolio_id}", response_model=PortfolioPublic)
def update_portfolio(
        portfolio_id: UUID,
        portfolio_update: PortfolioUpdate,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Update a portfolio"""
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # If setting as default, unset other portfolios
    if portfolio_update.is_default:
        other_portfolios = session.exec(
            select(Portfolio).where(
                Portfolio.user_id == current_user.id,
                Portfolio.id != portfolio_id
            )
        ).all()
        for other in other_portfolios:
            other.is_default = False
            session.add(other)

    update_data = portfolio_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(portfolio, field, value)

    # Touch updated_at
    from datetime import datetime as _dt
    portfolio.updated_at = _dt.utcnow()

    session.add(portfolio)
    session.commit()
    session.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}")
def delete_portfolio(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Delete a portfolio"""
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Don't allow deletion of default portfolio if it's the only one
    if portfolio.is_default:
        other_portfolios = session.exec(
            select(Portfolio).where(
                Portfolio.user_id == current_user.id,
                Portfolio.id != portfolio_id
            )
        ).all()
        if not other_portfolios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only portfolio"
            )

    session.delete(portfolio)
    session.commit()
    return {"message": "Portfolio deleted successfully"}


# Portfolio Position Management APIs
@router.post("/{portfolio_id}/positions", response_model=PortfolioPositionPublic)
def add_position(
        portfolio_id: UUID,
        stock_symbol: str,
        quantity: int,
        average_price: float,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Add a new position to a portfolio"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Verify stock exists by symbol
    stock = session.exec(
        select(Company).where(Company.trading_code == stock_symbol.upper())
    ).first()

    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with symbol '{stock_symbol}' not found"
        )

    # Check if position already exists
    existing_position = session.exec(
        select(PortfolioPosition).where(
            PortfolioPosition.portfolio_id == portfolio_id,
            PortfolioPosition.stock_id == stock.id
        )
    ).first()

    if existing_position:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Position already exists for this stock"
        )

    total_investment = quantity * average_price
    total_cost = Decimal(str(total_investment))

    # Check if portfolio has sufficient cash balance
    current_cash = portfolio.cash_balance or Decimal(0)
    if current_cash < total_cost:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient cash balance. Available: {float(current_cash)}, Required: {float(total_cost)}"
        )

    # Deduct cash from portfolio
    portfolio.cash_balance = current_cash - total_cost

    position = PortfolioPosition(
        portfolio_id=portfolio_id,
        stock_id=stock.id,
        quantity=quantity,
        average_price=average_price,
        total_investment=total_investment,  # Initially same as investment
        current_value=total_investment,  # Initially same as investment
        unrealized_pnl=0,
        unrealized_pnl_percent=0
    )

    # Create transaction record for audit trail
    transaction = AccountTransaction(
        user_id=current_user.id,
        portfolio_id=portfolio.id,
        type=TransactionType.BUY,
        amount=total_cost,
        description=f"Added position: {stock.trading_code} - {quantity} shares @ {average_price}"
    )

    session.add(position)
    session.add(portfolio)
    session.add(transaction)
    session.commit()
    session.refresh(position)
    return position


@router.get("/{portfolio_id}/positions", response_model=List[PortfolioPositionPublic])
def get_portfolio_positions(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get all positions in a portfolio"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    positions = session.exec(
        select(PortfolioPosition).where(
            PortfolioPosition.portfolio_id == portfolio_id
        )
    ).all()

    return positions


@router.get("/{portfolio_id}/positions/with-details")
def get_portfolio_positions_with_details(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get all positions in a portfolio with stock details"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    rows = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()

    result = []
    for position, stock in rows:
        current_price = None
        if position.quantity and position.quantity > 0 and position.current_value is not None:
            try:
                current_price = float(position.current_value) / float(position.quantity)
            except Exception:
                current_price = None
        result.append({
            "id": position.id,
            "portfolio_id": position.portfolio_id,
            "stock_id": position.stock_id,
            "quantity": position.quantity,
            "average_price": float(position.average_price),
            "total_investment": float(position.total_investment),
            "current_value": float(position.current_value) if position.current_value is not None else None,
            "unrealized_pnl": float(position.unrealized_pnl) if position.unrealized_pnl is not None else None,
            "unrealized_pnl_percent": float(
                position.unrealized_pnl_percent) if position.unrealized_pnl_percent is not None else None,
            "last_updated": position.last_updated,
            "current_price": current_price,
            "stock": {
                "id": stock.id,
                "symbol": stock.trading_code,
                "company_name": stock.company_name,
                "sector": stock.sector,
                "industry": stock.industry,
            }
        })
    return result


@router.put("/{portfolio_id}/positions/{position_id}")
def update_position(
        portfolio_id: UUID,
        position_id: UUID,
        quantity: Optional[int] = None,
        average_price: Optional[float] = None,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Update a portfolio position"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    position = session.exec(
        select(PortfolioPosition).where(
            PortfolioPosition.id == position_id,
            PortfolioPosition.portfolio_id == portfolio_id
        )
    ).first()

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found"
        )

    # Get stock details for transaction description
    stock = session.exec(
        select(Company).where(Company.id == position.stock_id)
    ).first()

    # Calculate old total investment
    old_total_investment = Decimal(str(position.total_investment))

    # Update position fields
    if quantity is not None:
        position.quantity = quantity
    if average_price is not None:
        position.average_price = average_price

    # Recalculate total investment
    position.total_investment = position.quantity * position.average_price
    new_total_investment = Decimal(str(position.total_investment))

    # Calculate cash adjustment needed
    cash_difference = new_total_investment - old_total_investment
    current_cash = portfolio.cash_balance or Decimal(0)

    # If position value increased, check if there's enough cash
    if cash_difference > 0:
        if current_cash < cash_difference:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient cash balance. Available: {float(current_cash)}, Required: {float(cash_difference)}"
            )
        portfolio.cash_balance = current_cash - cash_difference
        transaction_type = TransactionType.BUY
        description = f"Position increase: {stock.trading_code if stock else 'Unknown'} - {position.quantity} shares @ {position.average_price}"
    elif cash_difference < 0:
        # Position value decreased, return cash
        portfolio.cash_balance = current_cash + abs(cash_difference)
        transaction_type = TransactionType.SELL
        description = f"Position decrease: {stock.trading_code if stock else 'Unknown'} - {position.quantity} shares @ {position.average_price}"
    else:
        # No cash adjustment needed
        transaction_type = None
        description = None

    # Create transaction record if there was a cash adjustment
    if transaction_type and cash_difference != 0:
        transaction = AccountTransaction(
            user_id=current_user.id,
            portfolio_id=portfolio.id,
            type=transaction_type,
            amount=abs(cash_difference),
            description=description
        )
        session.add(transaction)

    session.add(position)
    session.add(portfolio)
    session.commit()
    session.refresh(position)
    return position


@router.delete("/{portfolio_id}/positions/{position_id}")
def remove_position(
        portfolio_id: UUID,
        position_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Remove a position from portfolio and return cash"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    position = session.exec(
        select(PortfolioPosition).where(
            PortfolioPosition.id == position_id,
            PortfolioPosition.portfolio_id == portfolio_id
        )
    ).first()

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found"
        )

    # Get stock details for transaction description
    stock = session.exec(
        select(Company).where(Company.id == position.stock_id)
    ).first()

    # Return cash to portfolio based on total investment
    cash_to_return = Decimal(str(position.total_investment))
    current_cash = portfolio.cash_balance or Decimal(0)
    portfolio.cash_balance = current_cash + cash_to_return

    # Create transaction record for the position removal
    transaction = AccountTransaction(
        user_id=current_user.id,
        portfolio_id=portfolio.id,
        type=TransactionType.SELL,
        amount=cash_to_return,
        description=f"Position removed: {stock.trading_code if stock else 'Unknown'} - {position.quantity} shares @ {position.average_price}"
    )

    session.add(portfolio)
    session.add(transaction)
    session.delete(position)
    session.commit()
    return {"message": "Position removed successfully", "cash_returned": float(cash_to_return)}


# Trade Management APIs
@router.post("/{portfolio_id}/trades", response_model=TradePublic)
def add_trade(
        portfolio_id: UUID,
        trade: TradeCreate,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Add a new trade to a portfolio and update cash/ledger"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Verify stock exists
    stock = session.exec(
        select(Company).where(Company.id == trade.stock_id)
    ).first()

    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )

    # Create trade
    db_trade = Trade(
        portfolio_id=portfolio_id,
        **trade.dict()
    )

    # Adjust cash and ledger
    amount = Decimal(str(trade.net_amount)) if trade.net_amount is not None else Decimal(str(trade.total_amount))
    amount = amount or Decimal(0)
    if str(trade.trade_type).upper() == "BUY":
        portfolio.cash_balance = (portfolio.cash_balance or 0) - amount
        tx_type = TransactionType.BUY
    elif str(trade.trade_type).upper() == "SELL":
        portfolio.cash_balance = (portfolio.cash_balance or 0) + amount
        tx_type = TransactionType.SELL
    else:
        # Unknown trade type; proceed without cash impact
        tx_type = TransactionType.ADJUSTMENT

    tx = AccountTransaction(
        user_id=current_user.id,
        portfolio_id=portfolio.id,
        trade_id=db_trade.id,
        type=tx_type,
        amount=amount.copy_abs(),
        description=f"{trade.trade_type.title()} {stock.trading_code}"
    )

    session.add(db_trade)
    session.add(portfolio)
    session.add(tx)
    session.commit()
    session.refresh(db_trade)
    return db_trade


@router.get("/{portfolio_id}/trades", response_model=List[TradePublic])
def get_portfolio_trades(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get all trades in a portfolio"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    trades = session.exec(
        select(Trade).where(Trade.portfolio_id == portfolio_id)
    ).all()

    return trades


@router.put("/{portfolio_id}/trades/{trade_id}", response_model=TradePublic)
def update_trade(
        portfolio_id: UUID,
        trade_id: UUID,
        trade_update: TradeUpdate,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Update a trade"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    trade = session.exec(
        select(Trade).where(
            Trade.id == trade_id,
            Trade.portfolio_id == portfolio_id
        )
    ).first()

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )

    update_data = trade_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trade, field, value)

    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade


@router.delete("/{portfolio_id}/trades/{trade_id}")
def delete_trade(
        portfolio_id: UUID,
        trade_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Delete a trade"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    trade = session.exec(
        select(Trade).where(
            Trade.id == trade_id,
            Trade.portfolio_id == portfolio_id
        )
    ).first()

    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )

    session.delete(trade)
    session.commit()
    return {"message": "Trade deleted successfully"}


# Portfolio Summary API
@router.get("/{portfolio_id}/summary", response_model=PortfolioSummary)
def get_portfolio_summary(
        portfolio_id: UUID,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep)
):
    """Get portfolio summary with positions and performance metrics"""
    # Verify portfolio belongs to user
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    positions = session.exec(
        select(PortfolioPosition).where(
            PortfolioPosition.portfolio_id == portfolio_id
        )
    ).all()

    total_investment = sum(pos.total_investment for pos in positions)
    current_value = sum(pos.current_value for pos in positions)
    unrealized_pnl = sum(pos.unrealized_pnl for pos in positions)

    # Calculate overall PnL percentage
    unrealized_pnl_percent = (
        (unrealized_pnl / total_investment * 100) if total_investment > 0 else 0
    )

    return PortfolioSummary(
        portfolio_id=portfolio.id,
        portfolio_name=portfolio.name,
        total_investment=total_investment,
        current_value=current_value,
        unrealized_pnl=unrealized_pnl,
        unrealized_pnl_percent=unrealized_pnl_percent,
        total_positions=len(positions),
        positions=positions
    )


@router.get("/trades/recent", response_model=List[TradeWithDetails])
def get_recent_trades(
        limit: int = 20,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep),
):
    """Get recent executed trades across all portfolios for current user"""
    # Find user's portfolios
    portfolio_ids = [p.id for p in
                     session.exec(select(Portfolio).where(Portfolio.user_id == current_user.id)).all() or []]
    if not portfolio_ids:
        return []
    rows = session.exec(
        select(Trade, Company)
        .join(Company, Trade.stock_id == Company.id)
        .where(Trade.portfolio_id.in_(portfolio_ids))
        .order_by(Trade.trade_date.desc())
        .limit(limit)
    ).all() or []
    result: List[TradeWithDetails] = []
    for trade, stock in rows:
        result.append(
            TradeWithDetails(
                **trade.dict(),
                symbol=stock.trading_code,
                company_name=stock.company_name,
            )
        )
    return result


@router.get("/orders-trades/summary")
def get_orders_trades_summary(
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session_dep),
):
    """Summary for Orders & Trades dashboard boxes."""
    # Pending orders
    pending = session.exec(
        select(Order).where(
            Order.user_id == current_user.id,
            Order.status == OrderStatus.PENDING,
        )
    ).all() or []
    # Filled today
    from datetime import datetime as _dt
    start = _dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    filled_today = session.exec(
        select(Order).where(
            Order.user_id == current_user.id,
            Order.status == OrderStatus.FILLED,
            Order.filled_at >= start,
        )
    ).all() or []
    # Total order value all-time
    all_orders = session.exec(select(Order).where(Order.user_id == current_user.id)).all() or []
    from decimal import Decimal as _D
    pending_total_value = sum(_D(o.total_amount or 0) for o in pending)
    all_time_total_value = sum(_D(o.total_amount or 0) for o in all_orders)
    # Recent trades count
    portfolio_ids = [p.id for p in
                     session.exec(select(Portfolio).where(Portfolio.user_id == current_user.id)).all() or []]
    recent_trades_count = 0
    if portfolio_ids:
        recent_trades_count = len(
            session.exec(
                select(Trade).where(Trade.portfolio_id.in_(portfolio_ids)).order_by(Trade.trade_date.desc()).limit(50)
            ).all() or []
        )
    return {
        "pending_orders_count": len(pending),
        "pending_orders_total_value": float(pending_total_value),
        "filled_today_count": len(filled_today),
        "total_order_value_all_time": float(all_time_total_value),
        "recent_trades_count": int(recent_trades_count),
    }
