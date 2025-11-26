from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List
from uuid import UUID

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.model.order import Order, OrderStatus, OrderSide
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.stock import StockData, DailyOHLC
from app.model.user import UserInvestmentGoal
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _safe_decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal(0)


def _compute_risk_score(annualized_return: float, volatility: float, sharpe_ratio: float, max_drawdown: float) -> float:
    """Compute a simple 0-100 risk score from performance metrics.
    Higher volatility and drawdown increase risk; higher Sharpe lowers risk.
    """
    # Normalize components into 0-100 bands
    vol_component = min(100.0, max(0.0, (volatility / 50.0) * 60.0))  # up to 60 pts
    dd_component = min(100.0, max(0.0, (max_drawdown / 50.0) * 40.0))  # up to 40 pts
    sharpe_reducer = min(30.0, max(0.0, sharpe_ratio * 10.0))  # reduce up to 30 pts
    base_score = vol_component + dd_component - sharpe_reducer
    return float(max(0.0, min(100.0, base_score)))


def _risk_level(score: float) -> str:
    if score < 30:
        return "LOW"
    if score < 60:
        return "MODERATE"
    return "HIGH"


@router.get("/summary")
def get_dashboard_summary(
        current_user: CurrentUser,
        session: SessionDep,
):
    """Aggregate key dashboard metrics for the authenticated user.
    Returns portfolio totals, YTD return %, risk score, active goals, and daily change.
    """
    # Fetch user portfolios
    portfolios: List[Portfolio] = session.exec(
        select(Portfolio).where(Portfolio.user_id == current_user.id)
    ).all()

    if portfolios is None:
        portfolios = []

    # Early return when no portfolios exist
    if len(portfolios) == 0:
        active_goals = session.exec(
            select(UserInvestmentGoal).where(
                UserInvestmentGoal.user_id == current_user.id,
                UserInvestmentGoal.is_active == True,
            )
        ).all() or []
        return {
            "portfolio_count": 0,
            "total_portfolio_value": 0.0,
            "total_investment": 0.0,
            "cash_balance": 0.0,
            "stock_value": 0.0,
            "day_change": 0.0,
            "day_change_percent": 0.0,
            "ytd_return_percent": 0.0,
            "risk_score": 0.0,
            "risk_level": "LOW",
            "active_goals": len(active_goals),
            "buying_power": 0.0,
        }

    # Gather all positions across portfolios
    portfolio_ids = [p.id for p in portfolios]
    positions: List[PortfolioPosition] = session.exec(
        select(PortfolioPosition).where(PortfolioPosition.portfolio_id.in_(portfolio_ids))
    ).all() or []

    # Sum values
    total_investment = sum(_safe_decimal(pos.total_investment) for pos in positions)
    cash_balance = sum(_safe_decimal(p.cash_balance) for p in portfolios)
    total_realized_gains = sum(_safe_decimal(p.realized_pnl) for p in portfolios)

    # Build map of stock_id -> total quantity and current value for weighting
    from collections import defaultdict
    stock_quantity: Dict[UUID, Decimal] = defaultdict(lambda: Decimal(0))
    for pos in positions:
        stock_quantity[pos.stock_id] += _safe_decimal(pos.quantity)

    # Fetch latest StockData for each stock for day change and current price
    company_ids = list(stock_quantity.keys())
    latest_prices: Dict[UUID, StockData] = {}
    if company_ids:
        # Get latest per company by picking the max timestamp rows
        rows: List[StockData] = session.exec(
            select(StockData)
            .where(StockData.company_id.in_(company_ids))
            .order_by(StockData.company_id, StockData.timestamp.desc())
        ).all() or []
        # Keep first seen per company (sorted by timestamp desc per company)
        seen = set()
        for row in rows:
            if row.company_id not in seen:
                latest_prices[row.company_id] = row
                seen.add(row.company_id)

    # Compute stock value using latest prices where available; fallback to stored current_value
    stock_value_calc = Decimal(0)
    for pos in positions:
        data = latest_prices.get(pos.stock_id)
        if data:
            stock_value_calc += _safe_decimal(data.last_trade_price) * _safe_decimal(pos.quantity)
        else:
            stock_value_calc += _safe_decimal(pos.current_value)
    stock_value = stock_value_calc
    total_portfolio_value = stock_value + cash_balance

    # Compute day change using StockData (last - previous_close) * quantity
    day_change_value = Decimal(0)
    for cid, qty in stock_quantity.items():
        data = latest_prices.get(cid)
        if data and _safe_decimal(data.previous_close) > 0:
            delta = _safe_decimal(data.last_trade_price) - _safe_decimal(data.previous_close)
            day_change_value += delta * qty

    day_change = float(day_change_value)
    day_change_percent = float((day_change_value / stock_value * 100) if stock_value > 0 else Decimal(0))

    # Compute YTD return using DailyOHLC close on first trading day of year as baseline
    start_of_year = datetime(datetime.utcnow().year, 1, 1)
    ytd_numerator = Decimal(0)
    ytd_denominator = Decimal(0)
    if company_ids:
        for cid in company_ids:
            # Baseline price: first close on/after Jan 1
            baseline_row = session.exec(
                select(DailyOHLC)
                .where(DailyOHLC.company_id == cid, DailyOHLC.date >= start_of_year)
                .order_by(DailyOHLC.date.asc())
            ).first()
            baseline_price = _safe_decimal(baseline_row.close_price) if baseline_row else Decimal(0)
            # Current price from StockData if available, else implied from position current_value
            current_data = latest_prices.get(cid)
            if current_data:
                current_price = _safe_decimal(current_data.last_trade_price)
            else:
                # Fallback: derive from positions' stored current_value
                qty = stock_quantity.get(cid, Decimal(0))
                # Approximate current value by distributing total stock_value proportionally is complex; skip when unknown
                current_price = Decimal(0) if qty <= 0 else Decimal(0)
            # Weight by current position value
            position_value = (_safe_decimal(current_data.last_trade_price) * qty) if current_data else Decimal(0)
            if baseline_price > 0 and position_value > 0 and current_price > 0:
                ret = (current_price / baseline_price) - Decimal(1)
                ytd_numerator += position_value * ret
                ytd_denominator += position_value
        ytd_return_percent = float((ytd_numerator / ytd_denominator * 100) if ytd_denominator > 0 else Decimal(0))
    else:
        ytd_return_percent = 0.0

    # Compute risk score by aggregating portfolio metrics from analytics service (weighted by portfolio value)
    analytics = AnalyticsService(session)
    weighted_risk_score = 0.0
    weight_sum = 0.0
    for p in portfolios:
        # Weight by this portfolio's value
        p_positions = [pos for pos in positions if pos.portfolio_id == p.id]
        p_value = float(sum((_safe_decimal(latest_prices.get(pos.stock_id).last_trade_price) * _safe_decimal(
            pos.quantity)) if latest_prices.get(pos.stock_id) else _safe_decimal(pos.current_value) for pos in
                            p_positions))
        if p_value <= 0:
            continue
        try:
            metrics = analytics.get_portfolio_performance(p.id, current_user.id, period="1Y")
            score = _compute_risk_score(
                annualized_return=metrics.annualized_return,
                volatility=metrics.volatility,
                sharpe_ratio=metrics.sharpe_ratio,
                max_drawdown=metrics.max_drawdown,
            )
            weighted_risk_score += score * p_value
            weight_sum += p_value
        except Exception:
            # If analytics fails, skip this portfolio
            pass

    risk_score = (weighted_risk_score / weight_sum) if weight_sum > 0 else 0.0
    risk_level = _risk_level(risk_score)

    # Compute reserved funds for pending/partial BUY orders and derive buying power
    reserved_funds = Decimal(0)
    open_buy_orders: List[Order] = session.exec(
        select(Order).where(
            Order.user_id == current_user.id,
            Order.side == OrderSide.BUY,
            Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
        )
    ).all() or []
    for o in open_buy_orders:
        remaining_qty = _safe_decimal(o.quantity) - _safe_decimal(o.filled_quantity or 0)
        if remaining_qty <= 0:
            continue
        lp = latest_prices.get(o.stock_id)
        ref_price = _safe_decimal(o.price) if o.price is not None else (
            _safe_decimal(lp.last_trade_price) if lp else Decimal(0))
        reserved_funds += (ref_price * remaining_qty)

    # Include user credit limit (leverage) in buying power
    credit_limit = _safe_decimal(getattr(current_user, "credit_limit", 0))
    buying_power_value = cash_balance + credit_limit - reserved_funds
    if buying_power_value < 0:
        buying_power_value = Decimal(0)

    # Active goals count
    active_goals = session.exec(
        select(UserInvestmentGoal).where(
            UserInvestmentGoal.user_id == current_user.id,
            UserInvestmentGoal.is_active == True,
        )
    ).all() or []

    return {
        "portfolio_count": len(portfolios),
        "total_portfolio_value": float(total_portfolio_value),
        "total_investment": float(total_investment),
        "cash_balance": float(cash_balance),
        "stock_value": float(stock_value),
        "day_change": float(day_change),
        "day_change_percent": float(day_change_percent),
        "ytd_return_percent": float(ytd_return_percent),
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "active_goals": len(active_goals),
        "buying_power": float(buying_power_value),
        "total_realized_gains": float(total_realized_gains),
    }
