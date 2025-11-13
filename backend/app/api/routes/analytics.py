from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, Session, func, and_, or_
import math

from app.api.deps import get_current_user, get_session_dep
from app.model.user import User
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.trade import Trade
from app.model.stock import StockData
from app.model.company import Company
from app.model.order import Order
from app.model.alert import News
from app.model.portfolio import AllocationTarget, AllocationTargetPublic, AllocationTargetCreate
from fastapi import Body

router = APIRouter(prefix="/analytics", tags=["analytics"])


# Portfolio Performance Analytics
@router.get("/portfolio/{portfolio_id}/performance")
def get_portfolio_performance(
    portfolio_id: UUID,
    period: str = Query("1Y", description="Time period: 1D, 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get comprehensive portfolio performance metrics"""
    
    # Verify portfolio ownership
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
    
    # Calculate date range
    end_date = datetime.utcnow()
    period_map = {
        "1D": timedelta(days=1),
        "1W": timedelta(weeks=1),
        "1M": timedelta(days=30),
        "3M": timedelta(days=90),
        "6M": timedelta(days=180),
        "1Y": timedelta(days=365),
        "2Y": timedelta(days=730),
        "5Y": timedelta(days=1825),
        "ALL": timedelta(days=3650)  # 10 years max
    }
    
    start_date = end_date - period_map.get(period, timedelta(days=365))
    
    # Get portfolio positions
    positions = session.exec(
        select(PortfolioPosition).where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()
    
    # Get trades in the period
    trades = session.exec(
        select(Trade).where(
            Trade.portfolio_id == portfolio_id,
            Trade.trade_date >= start_date,
            Trade.trade_date <= end_date
        ).order_by(Trade.trade_date)
    ).all()
    
    # Calculate metrics
    current_value = sum(float(pos.current_value) for pos in positions)
    total_investment = sum(float(pos.total_investment) for pos in positions)
    total_unrealized_pnl = sum(float(pos.unrealized_pnl) for pos in positions)
    
    # Calculate returns
    absolute_return = total_unrealized_pnl
    absolute_return_percent = (absolute_return / total_investment * 100) if total_investment > 0 else 0
    
    # Calculate time-weighted return (simplified)
    days_in_period = (end_date - start_date).days
    if days_in_period > 0:
        annualized_return = ((current_value / total_investment) ** (365 / days_in_period) - 1) * 100 if total_investment > 0 else 0
    else:
        annualized_return = 0
    
    # Calculate CAGR (Compound Annual Growth Rate)
    years = days_in_period / 365.25
    if years > 0 and total_investment > 0:
        cagr = ((current_value / total_investment) ** (1 / years) - 1) * 100
    else:
        cagr = 0
    
    # Calculate volatility (simplified using daily returns)
    daily_returns = []
    if len(trades) > 1:
        for i in range(1, len(trades)):
            prev_value = float(trades[i-1].total_amount)
            curr_value = float(trades[i].total_amount)
            if prev_value > 0:
                daily_return = (curr_value - prev_value) / prev_value
                daily_returns.append(daily_return)
    
    volatility = 0
    if len(daily_returns) > 1:
        mean_return = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_return) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        volatility = math.sqrt(variance) * math.sqrt(252) * 100  # Annualized volatility
    
    # Calculate Sharpe ratio (assuming 2% risk-free rate)
    risk_free_rate = 2.0
    sharpe_ratio = (annualized_return - risk_free_rate) / volatility if volatility > 0 else 0
    
    # Calculate maximum drawdown
    max_drawdown = 0
    peak_value = 0
    for trade in trades:
        trade_value = float(trade.total_amount)
        if trade_value > peak_value:
            peak_value = trade_value
        else:
            drawdown = (peak_value - trade_value) / peak_value * 100 if peak_value > 0 else 0
            max_drawdown = max(max_drawdown, drawdown)
    
    return {
        "portfolio_id": portfolio_id,
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "current_value": current_value,
        "total_investment": total_investment,
        "absolute_return": absolute_return,
        "absolute_return_percent": round(absolute_return_percent, 2),
        "annualized_return": round(annualized_return, 2),
        "cagr": round(cagr, 2),
        "volatility": round(volatility, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "max_drawdown": round(max_drawdown, 2),
        "total_trades": len(trades)
    }


@router.get("/portfolio/{portfolio_id}/allocation")
def get_portfolio_allocation(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get portfolio asset allocation breakdown"""
    
    # Verify portfolio ownership
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
    
    # Get positions with stock information
    positions_query = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()
    
    total_value = sum(float(pos.current_value) for pos, _ in positions_query)
    
    if total_value == 0:
        return {
            "portfolio_id": portfolio_id,
            "total_value": 0,
            "stock_wise_allocation": [],
            "sector_wise_allocation": [],
            "concentration_risk": {
                "top_5_holdings": 0,
                "top_10_holdings": 0,
                "largest_holding": 0
            }
        }
    
    # Stock-wise allocation
    stock_allocations = []
    for position, stock in positions_query:
        allocation_percent = float(position.current_value) / total_value * 100
        stock_allocations.append({
            "stock_id": str(stock.id),
            "symbol": stock.trading_code,
            "name": stock.company_name,
            "sector": stock.sector,
            "current_value": float(position.current_value),
            "allocation_percent": round(allocation_percent, 2),
            "quantity": position.quantity,
            "unrealized_pnl": float(position.unrealized_pnl),
            "unrealized_pnl_percent": float(position.unrealized_pnl_percent)
        })
    
    # Sort by allocation percentage
    stock_allocations.sort(key=lambda x: x["allocation_percent"], reverse=True)
    
    # Sector-wise allocation
    sector_map = {}
    for allocation in stock_allocations:
        sector = allocation["sector"] or "Unknown"
        if sector not in sector_map:
            sector_map[sector] = {"value": 0, "stocks": []}
        sector_map[sector]["value"] += allocation["current_value"]
        sector_map[sector]["stocks"].append(allocation["symbol"])
    
    sector_allocations = []
    for sector, data in sector_map.items():
        sector_allocations.append({
            "sector": sector,
            "value": data["value"],
            "allocation_percent": round(data["value"] / total_value * 100, 2),
            "stock_count": len(data["stocks"]),
            "stocks": data["stocks"]
        })
    
    sector_allocations.sort(key=lambda x: x["allocation_percent"], reverse=True)
    
    # Concentration risk analysis
    top_5_percent = sum(stock["allocation_percent"] for stock in stock_allocations[:5])
    top_10_percent = sum(stock["allocation_percent"] for stock in stock_allocations[:10])
    largest_holding = stock_allocations[0]["allocation_percent"] if stock_allocations else 0
    
    return {
        "portfolio_id": portfolio_id,
        "total_value": total_value,
        "stock_wise_allocation": stock_allocations,
        "sector_wise_allocation": sector_allocations,
        "concentration_risk": {
            "top_5_holdings": round(top_5_percent, 2),
            "top_10_holdings": round(top_10_percent, 2),
            "largest_holding": round(largest_holding, 2)
        }
    }


@router.get("/portfolio/{portfolio_id}/benchmark-comparison")
def get_benchmark_comparison(
    portfolio_id: UUID,
    benchmark: str = Query("SPY", description="Benchmark symbol (e.g., SPY, QQQ, IWM)"),
    period: str = Query("1Y", description="Time period: 1M, 3M, 6M, 1Y, 2Y, 5Y"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Compare portfolio performance against a benchmark"""
    
    # Verify portfolio ownership
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
    
    # Get portfolio performance
    portfolio_perf = get_portfolio_performance(portfolio_id, period, current_user, session)
    
    # Get benchmark data (simplified - in real implementation, fetch from market data API)
    benchmark_data = {
        "SPY": {"1M": 2.1, "3M": 5.8, "6M": 12.3, "1Y": 15.7, "2Y": 8.9, "5Y": 11.2},
        "QQQ": {"1M": 3.2, "3M": 8.1, "6M": 18.9, "1Y": 22.4, "2Y": 12.8, "5Y": 16.8},
        "IWM": {"1M": 1.8, "3M": 4.2, "6M": 9.7, "1Y": 12.3, "2Y": 6.8, "5Y": 8.9}
    }
    
    benchmark_return = benchmark_data.get(benchmark, {}).get(period, 10.0)
    
    # Calculate alpha and beta (simplified)
    portfolio_return = portfolio_perf["annualized_return"]
    alpha = portfolio_return - benchmark_return
    beta = portfolio_perf["volatility"] / 15.0 if portfolio_perf["volatility"] > 0 else 1.0  # Simplified beta calculation
    
    # Information ratio
    tracking_error = abs(portfolio_return - benchmark_return)
    information_ratio = alpha / tracking_error if tracking_error > 0 else 0
    
    return {
        "portfolio_id": portfolio_id,
        "benchmark_symbol": benchmark,
        "period": period,
        "portfolio_return": round(portfolio_return, 2),
        "benchmark_return": round(benchmark_return, 2),
        "alpha": round(alpha, 2),
        "beta": round(beta, 2),
        "information_ratio": round(information_ratio, 2),
        "tracking_error": round(tracking_error, 2),
        "outperformance": portfolio_return > benchmark_return
    }


@router.get("/portfolio/{portfolio_id}/dividend-analysis")
def get_dividend_analysis(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get dividend analysis for the portfolio"""
    
    # Verify portfolio ownership
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
    
    # Get dividend-paying positions
    positions_query = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()
    
    total_portfolio_value = sum(float(pos.current_value) for pos, _ in positions_query)
    
    # Mock dividend data (in real implementation, fetch from financial data API)
    dividend_stocks = []
    total_annual_dividends = 0
    
    for position, stock in positions_query:
        # Mock dividend yield (in real implementation, get from financial API)
        mock_dividend_yield = 2.5 if stock.sector in ["Utilities", "REIT", "Consumer Staples"] else 1.2
        annual_dividend = float(position.current_value) * (mock_dividend_yield / 100)
        total_annual_dividends += annual_dividend
        
        if mock_dividend_yield > 0:
            dividend_stocks.append({
                "stock_id": str(stock.id),
                "symbol": stock.trading_code,
                "name": stock.company_name,
                "sector": stock.sector,
                "position_value": float(position.current_value),
                "dividend_yield": mock_dividend_yield,
                "annual_dividend": round(annual_dividend, 2),
                "quarterly_dividend": round(annual_dividend / 4, 2),
                "quantity": position.quantity
            })
    
    portfolio_dividend_yield = (total_annual_dividends / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
    
    return {
        "portfolio_id": portfolio_id,
        "total_portfolio_value": total_portfolio_value,
        "total_annual_dividends": round(total_annual_dividends, 2),
        "portfolio_dividend_yield": round(portfolio_dividend_yield, 2),
        "quarterly_income": round(total_annual_dividends / 4, 2),
        "monthly_income": round(total_annual_dividends / 12, 2),
        "dividend_stocks": dividend_stocks,
        "dividend_growth_estimate": 3.5  # Mock 3.5% annual dividend growth
    }


@router.get("/portfolio/{portfolio_id}/cost-basis")
def get_cost_basis_analysis(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get detailed cost basis and tax implications analysis"""
    
    # Verify portfolio ownership
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
    
    # Get all trades for cost basis calculation
    trades = session.exec(
        select(Trade, Company)
        .join(Company, Trade.stock_id == Company.id)
        .where(Trade.portfolio_id == portfolio_id)
        .order_by(Trade.trade_date)
    ).all()
    
    # Get current positions
    positions = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()
    
    # Calculate cost basis for each stock
    stock_analysis = {}
    total_realized_gains = 0
    total_unrealized_gains = 0
    
    for position, stock in positions:
        stock_id = str(stock.id)
        if stock_id not in stock_analysis:
            stock_analysis[stock_id] = {
                "symbol": stock.trading_code,
                "name": stock.company_name,
                "current_quantity": position.quantity,
                "average_cost": float(position.average_price),
                "total_cost": float(position.total_investment),
                "current_value": float(position.current_value),
                "unrealized_pnl": float(position.unrealized_pnl),
                "unrealized_pnl_percent": float(position.unrealized_pnl_percent),
                "lots": [],
                "short_term_gains": 0,
                "long_term_gains": 0
            }
        
        total_unrealized_gains += float(position.unrealized_pnl)
    
    # Analyze individual lots for tax purposes
    for trade, stock in trades:
        stock_id = str(stock.id)
        if stock_id in stock_analysis:
            days_held = (datetime.utcnow() - trade.trade_date).days
            is_long_term = days_held > 365
            
            lot_info = {
                "trade_id": str(trade.id),
                "date": trade.trade_date,
                "quantity": trade.quantity,
                "price": float(trade.price),
                "total_cost": float(trade.total_amount),
                "days_held": days_held,
                "is_long_term": is_long_term,
                "trade_type": trade.trade_type
            }
            
            stock_analysis[stock_id]["lots"].append(lot_info)
    
    # Tax loss harvesting opportunities
    tax_loss_opportunities = []
    for stock_id, analysis in stock_analysis.items():
        if analysis["unrealized_pnl"] < -1000:  # Loss > $1000
            tax_loss_opportunities.append({
                "symbol": analysis["symbol"],
                "unrealized_loss": analysis["unrealized_pnl"],
                "current_value": analysis["current_value"],
                "tax_savings_estimate": abs(analysis["unrealized_pnl"]) * 0.25  # Assuming 25% tax rate
            })
    
    return {
        "portfolio_id": portfolio_id,
        "total_cost_basis": sum(analysis["total_cost"] for analysis in stock_analysis.values()),
        "total_current_value": sum(analysis["current_value"] for analysis in stock_analysis.values()),
        "total_unrealized_gains": round(total_unrealized_gains, 2),
        "total_realized_gains": round(total_realized_gains, 2),
        "stock_analysis": stock_analysis,
        "tax_loss_opportunities": tax_loss_opportunities,
        "estimated_tax_liability": round(max(0, total_unrealized_gains) * 0.20, 2)  # Assuming 20% capital gains tax
    }


@router.get("/sentiment/market")
def get_market_sentiment(
    days: int = Query(7, ge=1, le=30),
    session: Session = Depends(get_session_dep)
) -> Dict[str, Any]:
    """Compute basic market sentiment from recent news sentiments."""
    since = datetime.utcnow() - timedelta(days=days)
    news_items = session.exec(select(News).where(News.published_at >= since, News.is_active == True)).all()  # noqa: E712
    total = len(news_items) if news_items else 0
    pos = sum(1 for n in news_items if (n.sentiment or '').lower() == 'positive')
    neg = sum(1 for n in news_items if (n.sentiment or '').lower() == 'negative')
    neu = total - pos - neg
    score = 0.0
    if total > 0:
        score = (pos - neg) / total  # -1 to +1
    gauge = int(round((score + 1) / 2 * 100))  # 0-100
    return {
        "score": round(score, 3),
        "gauge": gauge,
        "counts": {"positive": pos, "negative": neg, "neutral": neu, "total": total},
    }


@router.get("/portfolio/{portfolio_id}/allocation/targets", response_model=List[AllocationTargetPublic])
def get_allocation_targets(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get saved target allocation for a portfolio"""
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

    targets = session.exec(
        select(AllocationTarget).where(
            AllocationTarget.portfolio_id == portfolio_id,
            AllocationTarget.user_id == current_user.id
        )
    ).all()
    return targets


@router.get("/sectors")
def get_sectors_list(
    session: Session = Depends(get_session_dep)
):
    """Get list of all available sectors"""
    # Get distinct sectors from Company table
    sectors = session.exec(
        select(Company.sector).where(
            Company.sector.isnot(None),
            Company.sector != "",
            Company.is_active == True
        )
    ).all()
    
    # Deduplicate manually since SQLModel doesn't support .distinct() on single column
    sectors = list(set(sectors))
    
    # Normalize and deduplicate
    sector_set = set()
    for sector in sectors:
        if sector:
            # Normalize numeric sectors to names
            if sector.isdigit():
                sector_map = {
                    '1': 'Banking',
                    '2': 'NBFI',
                    '3': 'Fuel & Power',
                    '4': 'Cement',
                    '5': 'Ceramics',
                    '6': 'Engineering',
                    '7': 'Food & Allied',
                    '8': 'IT',
                    '9': 'Jute',
                    '10': 'Miscellaneous',
                    '11': 'Paper & Printing',
                    '12': 'Pharmaceuticals & Chemicals',
                    '13': 'Services & Real Estate',
                    '14': 'Tannery',
                    '15': 'Telecommunication',
                    '16': 'Travel & Leisure',
                    '17': 'Textiles',
                    '18': 'Mutual Funds',
                    '19': 'Insurance',
                }
                sector = sector_map.get(sector, sector)
            sector_set.add(sector)
    
    return sorted(list(sector_set))


@router.get("/stocks/by-sector")
def get_top_liquid_stocks_by_sector(
    sector: str = Query(..., description="Sector name"),
    limit: int = Query(3, ge=1, le=10, description="Number of stocks to return"),
    session: Session = Depends(get_session_dep)
):
    """Get top liquid stocks in a sector, sorted by volume/turnover"""
    # Normalize sector input (handle numeric codes)
    sector_filter = sector
    if sector.isdigit():
        sector_map = {
            '1': 'Banking',
            '2': 'NBFI',
            '3': 'Fuel & Power',
            '4': 'Cement',
            '5': 'Ceramics',
            '6': 'Engineering',
            '7': 'Food & Allied',
            '8': 'IT',
            '9': 'Jute',
            '10': 'Miscellaneous',
            '11': 'Paper & Printing',
            '12': 'Pharmaceuticals & Chemicals',
            '13': 'Services & Real Estate',
            '14': 'Tannery',
            '15': 'Telecommunication',
            '16': 'Travel & Leisure',
            '17': 'Textiles',
            '18': 'Mutual Funds',
            '19': 'Insurance',
        }
        sector_filter = sector_map.get(sector, sector)
    
    # Get companies in this sector
    companies = session.exec(
        select(Company).where(
            or_(
                Company.sector == sector_filter,
                Company.sector == sector  # Also check numeric code
            ),
            Company.is_active == True
        )
    ).all()
    
    if not companies:
        return []
    
    company_ids = [c.id for c in companies]
    
    # Get latest StockData for each company, ordered by liquidity (volume * price or turnover)
    # We'll use a subquery to get the latest StockData per company
    from sqlalchemy import desc
    
    latest_stock_data = []
    for company_id in company_ids:
        latest = session.exec(
            select(StockData)
            .where(StockData.company_id == company_id)
            .order_by(desc(StockData.timestamp))
            .limit(1)
        ).first()
        if latest:
            latest_stock_data.append((company_id, latest))
    
    # Sort by liquidity (turnover preferred, fallback to volume * price)
    def liquidity_score(data_tuple):
        _, stock_data = data_tuple
        if stock_data.turnover and stock_data.turnover > 0:
            return float(stock_data.turnover)
        elif stock_data.volume and stock_data.last_trade_price:
            return float(stock_data.volume) * float(stock_data.last_trade_price)
        return 0.0
    
    latest_stock_data.sort(key=liquidity_score, reverse=True)
    
    # Get top N companies with their stock data
    result = []
    for company_id, stock_data in latest_stock_data[:limit]:
        company = next((c for c in companies if c.id == company_id), None)
        if company:
            result.append({
                "id": str(company.id),
                "symbol": company.trading_code,
                "company_name": company.company_name or company.name,
                "sector": company.sector,
                "current_price": float(stock_data.last_trade_price) if stock_data.last_trade_price else 0.0,
                "volume": int(stock_data.volume) if stock_data.volume else 0,
                "turnover": float(stock_data.turnover) if stock_data.turnover else 0.0,
            })
    
    return result


@router.put("/portfolio/{portfolio_id}/allocation/targets", response_model=List[AllocationTargetPublic])
def upsert_allocation_targets(
    portfolio_id: UUID,
    targets: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Replace target allocation entries for a portfolio"""
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

    # Extract targets list from request body
    targets_list = targets.get("targets", [])
    if not isinstance(targets_list, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="targets must be a list"
        )

    # Validate: sum of target_percent must equal 100%
    total_percent = sum(float(t.get("target_percent", 0)) for t in targets_list)
    if abs(total_percent - 100.0) > 0.01:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total target allocation must equal 100%. Current total: {total_percent:.2f}%"
        )

    # Validate: no duplicate (category, category_type) pairs
    seen_pairs = set()
    for t in targets_list:
        category = t.get("category", "")
        category_type = t.get("category_type", "SECTOR")
        pair = (category, category_type)
        if pair in seen_pairs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate target found for category '{category}' with type '{category_type}'"
            )
        seen_pairs.add(pair)

    # Delete existing targets for this user/portfolio
    existing = session.exec(
        select(AllocationTarget).where(
            AllocationTarget.portfolio_id == portfolio_id,
            AllocationTarget.user_id == current_user.id
        )
    ).all()
    for row in existing:
        session.delete(row)
    session.commit()

    # Insert new targets
    saved: List[AllocationTarget] = []
    from datetime import datetime as _dt
    now = _dt.utcnow()
    for t in targets_list:
        row = AllocationTarget(
            user_id=current_user.id,
            portfolio_id=portfolio_id,
            category=t.get("category", ""),
            category_type=t.get("category_type", "SECTOR"),
            target_percent=Decimal(str(t.get("target_percent", 0))),
            min_percent=Decimal(str(t.get("min_percent", 0))) if t.get("min_percent") is not None else None,
            max_percent=Decimal(str(t.get("max_percent", 100))) if t.get("max_percent") is not None else None,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        saved.append(row)
    session.commit()
    for row in saved:
        session.refresh(row)

    return saved