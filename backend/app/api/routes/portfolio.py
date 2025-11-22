from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, UploadFile, File
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.model.company import Company
from app.model.funds import AccountTransaction, TransactionType
from app.model.order import Order, OrderStatus
from app.model.portfolio import (
    Portfolio, PortfolioCreate, PortfolioUpdate, PortfolioPublic,
    PortfolioPosition, PortfolioPositionPublic,
    PortfolioSummary
)
from app.model.portfolio_statement import (
    PortfolioStatementResponse,
    BulkHoldingsSaveRequest,
    BulkHoldingsSaveResponse,
)
from app.model.stock import StockData
from app.model.trade import Trade, TradeCreate, TradeUpdate, TradePublic, TradeWithDetails
from app.services.holdings_service import HoldingsService

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# Portfolio Aggregates across all user portfolios
@router.get("/aggregates")
def get_portfolios_aggregate(
        current_user: CurrentUser,
        session: SessionDep,
):
    """
    Aggregate totals for all portfolios of the current user.
    
    Returns:
        {
          "total_portfolio_value": float,   # stocks + cash
          "total_invested_amount": float,   # sum of positions total_investment
          "total_available_cash": float,    # sum of portfolios cash_balance
          "total_gain_loss": float,         # stock_value - total_invested_amount
          "total_day_change": float         # today's change across all stocks
        }
    """
    # Fetch user portfolios
    portfolios: List[Portfolio] = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all() or []

    if not portfolios:
        return {
            "total_portfolio_value": 0.0,
            "total_invested_amount": 0.0,
            "total_available_cash": 0.0,
            "total_gain_loss": 0.0,
            "total_day_change": 0.0,
        }

    # Gather all positions across portfolios
    portfolio_ids = [p.id for p in portfolios]
    positions: List[PortfolioPosition] = session.exec(
        select(PortfolioPosition).where(PortfolioPosition.portfolio_id.in_(portfolio_ids))
    ).all() or []

    def _d(value) -> Decimal:
        try:
            return Decimal(str(value or 0))
        except Exception:
            return Decimal(0)

    # Sum invested and cash
    total_invested_amount = sum(_d(pos.total_investment) for pos in positions)
    total_available_cash = sum(_d(p.cash_balance) for p in portfolios)

    # Map stock -> total qty
    from collections import defaultdict
    stock_qty = defaultdict(lambda: Decimal(0))
    for pos in positions:
        stock_qty[pos.stock_id] += _d(pos.quantity)

    # Latest prices per stock
    latest_prices: Dict[UUID, StockData] = {}
    company_ids = list(stock_qty.keys())
    if company_ids:
        rows: List[StockData] = session.exec(
            select(StockData)
            .where(StockData.company_id.in_(company_ids))
            .order_by(StockData.company_id, StockData.timestamp.desc())
        ).all() or []
        seen = set()
        for row in rows:
            if row.company_id not in seen:
                latest_prices[row.company_id] = row
                seen.add(row.company_id)

    # Compute stock value with latest prices; fallback to stored current_value
    stock_value = Decimal(0)
    for pos in positions:
        data = latest_prices.get(pos.stock_id)
        if data:
            stock_value += _d(data.last_trade_price) * _d(pos.quantity)
        else:
            stock_value += _d(pos.current_value)

    total_portfolio_value = stock_value + total_available_cash

    # Day change = sum((last - prev_close) * qty)
    day_change_value = Decimal(0)
    for cid, qty in stock_qty.items():
        data = latest_prices.get(cid)
        if data and _d(data.previous_close) > 0:
            delta = _d(data.last_trade_price) - _d(data.previous_close)
            day_change_value += delta * qty

    total_gain_loss = stock_value - total_invested_amount

    return {
        "total_portfolio_value": float(total_portfolio_value),
        "total_invested_amount": float(total_invested_amount),
        "total_available_cash": float(total_available_cash),
        "total_gain_loss": float(total_gain_loss),
        "total_day_change": float(day_change_value),
    }

# Portfolio Management APIs
@router.post("/", response_model=PortfolioPublic)
def create_portfolio(
        portfolio: PortfolioCreate,
        session: SessionDep,
        current_user: CurrentUser
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
        current_user: CurrentUser,
        session: SessionDep
):
    """Get all portfolios for the current user"""
    portfolios = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all()
    return portfolios


@router.get("/{portfolio_id}", response_model=PortfolioPublic)
def get_portfolio(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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


@router.get("/positions/by-symbol/{symbol}")
def get_positions_by_symbol(
        symbol: str,
        current_user: CurrentUser,
        session: SessionDep
):
    """Get all positions for a specific symbol across all user portfolios"""
    # Find the stock by symbol
    stock = session.exec(
        select(Company).where(Company.trading_code == symbol.upper())
    ).first()

    if not stock:
        return []

    # Get all portfolios for the user
    portfolios = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all()

    portfolio_ids = [p.id for p in portfolios]

    # Get positions for this stock across all user portfolios
    positions = session.exec(
        select(PortfolioPosition, Portfolio, Company)
        .join(Portfolio, PortfolioPosition.portfolio_id == Portfolio.id)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(
            PortfolioPosition.stock_id == stock.id,
            PortfolioPosition.portfolio_id.in_(portfolio_ids)
        )
    ).all()

    result = []
    for position, portfolio, company in positions:
        result.append({
            "id": position.id,
            "portfolio_id": portfolio.id,
            "portfolio_name": portfolio.name,
            "stock_id": company.id,
            "symbol": company.trading_code,
            "company_name": company.company_name,
            "quantity": position.quantity,
            "average_price": float(position.average_price),
            "total_investment": float(position.total_investment),
            "current_value": float(position.current_value) if position.current_value else None,
            "unrealized_pnl": float(position.unrealized_pnl) if position.unrealized_pnl else None,
            "last_updated": position.last_updated,
        })

    return result


@router.get("/{portfolio_id}/positions/with-details")
def get_portfolio_positions_with_details(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep
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

    stock_ids = [position.stock_id for position, _ in rows]
    latest_prices: Dict[UUID, StockData] = {}
    if stock_ids:
        stock_data_rows = session.exec(
            select(StockData)
            .where(StockData.company_id.in_(stock_ids))
            .order_by(StockData.company_id, StockData.timestamp.desc())
        ).all() or []
        seen = set()
        for data in stock_data_rows:
            if data.company_id not in seen:
                latest_prices[data.company_id] = data
                seen.add(data.company_id)

    result = []
    for position, stock in rows:
        latest_data = latest_prices.get(position.stock_id)
        current_price_decimal = None
        if latest_data:
            current_price_decimal = latest_data.last_trade_price
        elif position.quantity and position.quantity > 0 and position.current_value is not None:
            try:
                current_price_decimal = Decimal(position.current_value) / Decimal(position.quantity)
            except Exception:
                current_price_decimal = None

        quantity_decimal = Decimal(position.quantity or 0)
        total_investment_decimal = Decimal(position.total_investment or 0)
        if current_price_decimal is not None:
            current_value_decimal = current_price_decimal * quantity_decimal
        else:
            current_value_decimal = Decimal(position.current_value or 0)

        unrealized_pnl_decimal = current_value_decimal - total_investment_decimal
        unrealized_pct_decimal = (
            (unrealized_pnl_decimal / total_investment_decimal * Decimal(100))
            if total_investment_decimal > 0 else Decimal(0)
        )

        result.append({
            "id": position.id,
            "portfolio_id": position.portfolio_id,
            "stock_id": position.stock_id,
            "quantity": position.quantity,
            "average_price": float(position.average_price),
            "total_investment": float(total_investment_decimal),
            "current_value": float(current_value_decimal),
            "unrealized_pnl": float(unrealized_pnl_decimal),
            "unrealized_pnl_percent": float(unrealized_pct_decimal),
            "last_updated": position.last_updated,
            "current_price": float(current_price_decimal) if current_price_decimal is not None else None,
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
        current_user: CurrentUser,
        session: SessionDep,
        quantity: Optional[int] = None,
        average_price: Optional[float] = None,
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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
        current_user: CurrentUser,
        session: SessionDep
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

    stock_ids = [pos.stock_id for pos in positions]
    latest_prices: Dict[UUID, StockData] = {}
    if stock_ids:
        price_rows = session.exec(
            select(StockData)
            .where(StockData.company_id.in_(stock_ids))
            .order_by(StockData.company_id, StockData.timestamp.desc())
        ).all() or []
        seen: set[UUID] = set()
        for row in price_rows:
            if row.company_id not in seen:
                latest_prices[row.company_id] = row
                seen.add(row.company_id)

    total_investment_positions = sum(Decimal(pos.total_investment or 0) for pos in positions)
    current_value_positions = Decimal(0)
    for pos in positions:
        price_row = latest_prices.get(pos.stock_id)
        if price_row:
            current_price = Decimal(price_row.last_trade_price or 0)
            current_value_positions += current_price * Decimal(pos.quantity or 0)
        else:
            current_value_positions += Decimal(pos.current_value or 0)

    cash_balance = Decimal(portfolio.cash_balance or 0)

    total_investment = total_investment_positions + cash_balance
    current_value = current_value_positions + cash_balance
    unrealized_pnl = current_value - total_investment

    # Calculate overall PnL percentage
    unrealized_pnl_percent = (
        (unrealized_pnl / total_investment * 100) if total_investment > 0 else Decimal(0)
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
        current_user: CurrentUser,
        session: SessionDep,
        limit: int = 20
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
        current_user: CurrentUser,
        session: SessionDep,
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


# Portfolio Statement PDF Upload & Parsing APIs
@router.post("/{portfolio_id}/upload-statement", response_model=PortfolioStatementResponse)
async def upload_portfolio_statement(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        file: UploadFile = File(...),
        broker_house: Optional[str] = None,
):
    """
    Upload and parse a portfolio statement PDF file.
    
    Extracts holdings data from the PDF and returns structured information
    for review before saving to the database.
    
    Args:
        portfolio_id: UUID of the portfolio to associate holdings with
        file: PDF file of the portfolio statement
        broker_house: (Optional) Broker house name to use specific parser.
                     Supported values: 'lankabangla', 'doha', 'generic'
                     If not provided, will attempt to auto-detect from PDF content.
        current_user: Current authenticated user
        session: Database session
        
    Returns:
        PortfolioStatementResponse with parsed client info and holdings
        
    Raises:
        400: Invalid file format, corrupted PDF, or unsupported broker
        404: Portfolio not found
        413: File size exceeds limit
        422: PDF parsing failed
    
    Example:
        POST /api/v1/portfolio/{portfolio_id}/upload-statement?broker_house=lankabangla
    """
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

    # Validate broker_house parameter if provided
    if broker_house:
        broker_house = broker_house.lower().strip()
        supported_brokers = ['lankabangla', 'doha', 'generic']
        if broker_house not in supported_brokers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported broker house: '{broker_house}'. Supported values: {', '.join(supported_brokers)}"
            )

    # Parse the PDF with specified broker and database session for stock matching
    try:
        # Initialize parser with database session for stock lookup
        from app.services.pdf_parser import PortfolioStatementParser
        parser = PortfolioStatementParser(session=session)
        statement = await parser.parse_pdf_statement(file, broker_house=broker_house)
        return statement
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error while processing PDF: {str(e)}"
        )


@router.post("/{portfolio_id}/holdings/bulk", response_model=BulkHoldingsSaveResponse)
def save_bulk_holdings(
        portfolio_id: UUID,
        request: BulkHoldingsSaveRequest,
        current_user: CurrentUser,
        session: SessionDep,
):
    """
    Save parsed holdings from portfolio statement to the database.
    
    This endpoint should be called after reviewing the parsed data from
    the upload-statement endpoint. It will create or update portfolio
    positions based on the provided holdings.
    
    Args:
        portfolio_id: UUID of the portfolio
        request: Bulk holdings save request with client info and holdings
        current_user: Current authenticated user
        session: Database session
        
    Returns:
        BulkHoldingsSaveResponse with operation results
        
    Raises:
        400: Invalid data format
        404: Portfolio not found
        409: Conflict with existing data (if configured)
        500: Internal server error
    """
    try:
        holdings_service = HoldingsService(session)
        result = holdings_service.save_bulk_holdings(
            portfolio_id=portfolio_id,
            user_id=current_user.id,
            request=request,
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save holdings: {str(e)}"
        )
