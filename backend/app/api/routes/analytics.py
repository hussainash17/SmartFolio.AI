from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
from uuid import UUID

import math
from fastapi import APIRouter, HTTPException, status, Query
from fastapi import Body
from sqlmodel import select, or_

from app.api.deps import CurrentUser, SessionDep
from app.model.alert import News
from app.model.company import Company
from app.model.portfolio import AllocationTarget, AllocationTargetPublic
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.stock import StockData
from app.model.trade import Trade
from app.model.technical_indicators import DonchianChannelCache
from app.model.stock import DailyOHLC
from sqlalchemy import desc, and_
from datetime import date as dt_date

router = APIRouter(prefix="/analytics", tags=["analytics"])


# Portfolio Performance Analytics
@router.get("/portfolio/{portfolio_id}/performance")
def get_portfolio_performance(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        period: str = Query("1Y", description="Time period: 1D, 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y, ALL")
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
        annualized_return = ((current_value / total_investment) ** (
                    365 / days_in_period) - 1) * 100 if total_investment > 0 else 0
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
            prev_value = float(trades[i - 1].total_amount)
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
        current_user: CurrentUser,
        session: SessionDep
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

    # Get latest stock prices for all positions
    from app.model.stock import StockData
    from sqlalchemy import desc

    # Collect company IDs
    company_ids = [stock.id for _, stock in positions_query]
    
    # Fetch latest stock data for these companies
    latest_prices = {}
    if company_ids:
        # This is a bit inefficient (N+1), but for a portfolio with < 50 stocks it's fine
        # A better approach would be a subquery or window function
        for company_id in company_ids:
            stock_data = session.exec(
                select(StockData)
                .where(StockData.company_id == company_id)
                .order_by(desc(StockData.timestamp))
                .limit(1)
            ).first()
            
            if stock_data and stock_data.last_trade_price:
                latest_prices[company_id] = float(stock_data.last_trade_price)

    # Calculate total value dynamically
    total_value = 0
    stock_allocations = []
    
    for position, stock in positions_query:
        # Use latest price if available, otherwise fallback to position's average price (or 0)
        current_price = latest_prices.get(stock.id, float(position.average_price))
        
        # Calculate values
        quantity = position.quantity
        current_pos_value = quantity * current_price
        total_investment = float(position.total_investment)
        
        unrealized_pnl = current_pos_value - total_investment
        unrealized_pnl_percent = (unrealized_pnl / total_investment * 100) if total_investment > 0 else 0
        
        total_value += current_pos_value
        
        stock_allocations.append({
            "stock_id": str(stock.id),
            "symbol": stock.trading_code,
            "name": stock.company_name,
            "sector": stock.sector,
            "current_value": current_pos_value,
            "allocation_percent": 0, # Will calculate after total_value is known
            "quantity": quantity,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": round(unrealized_pnl_percent, 2)
        })

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

    # Update allocation percentages
    for alloc in stock_allocations:
        alloc["allocation_percent"] = round(alloc["current_value"] / total_value * 100, 2)

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
        current_user: CurrentUser,
        session: SessionDep,
        benchmark: str = Query("SPY", description="Benchmark symbol (e.g., SPY, QQQ, IWM)"),
        period: str = Query("1Y", description="Time period: 1M, 3M, 6M, 1Y, 2Y, 5Y")
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
    beta = portfolio_perf["volatility"] / 15.0 if portfolio_perf[
                                                      "volatility"] > 0 else 1.0  # Simplified beta calculation

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
        current_user: CurrentUser,
        session: SessionDep
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

    portfolio_dividend_yield = (
                total_annual_dividends / total_portfolio_value * 100) if total_portfolio_value > 0 else 0

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
        current_user: CurrentUser,
        session: SessionDep
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
        session: SessionDep,
        days: int = Query(7, ge=1, le=30)
) -> Dict[str, Any]:
    """Compute basic market sentiment from recent news sentiments."""
    since = datetime.utcnow() - timedelta(days=days)
    news_items = session.exec(
        select(News).where(News.published_at >= since, News.is_active == True)).all()  # noqa: E712
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
        current_user: CurrentUser,
        session: SessionDep
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
        session: SessionDep
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
        session: SessionDep,
        sector: str = Query(..., description="Sector name"),
        limit: int = Query(3, ge=1, le=10, description="Number of stocks to return")
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
        current_user: CurrentUser,
        session: SessionDep,
        targets: Dict[str, Any] = Body(...),
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


@router.get("/donchian-channel/{symbol}")
def get_donchian_channel(
        symbol: str,
        session: SessionDep,
        periods: str = Query("5,10,20", description="Comma-separated list of periods (e.g., '5,10,20')")
):
    """
    Get Donchian Channel support and resistance levels for a stock symbol.
    
    Uses daily caching to improve performance. Calculations for periods 5, 10, and 20
    are cached per symbol per day and reused for subsequent requests.
    
    Donchian Channels show the highest high and lowest low over a specified period.
    - Resistance (Upper Channel) = Highest high over N periods
    - Support (Lower Channel) = Lowest low over N periods
    - Middle Channel = (Upper Channel + Lower Channel) / 2
    
    Args:
        symbol: Stock trading code/symbol
        periods: Comma-separated periods (default: 5,10,20)
        
    Returns:
        Support and resistance levels for each period
    """
    
    # Find company by trading code
    company = session.exec(
        select(Company).where(
            Company.trading_code == symbol.upper(),
            Company.is_active == True
        )
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with symbol '{symbol}' not found"
        )
    
    # Parse periods
    try:
        period_list = [int(p.strip()) for p in periods.split(',')]
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid periods format. Use comma-separated integers (e.g., '5,10,20')"
        )
    
    # Get today's date
    today = dt_date.today()
    
    # Check if we have cached data for today
    cached_data = session.exec(
        select(DonchianChannelCache).where(
            and_(
                DonchianChannelCache.company_id == company.id,
                DonchianChannelCache.calculation_date == today
            )
        )
    ).first()
    
    # If cached data exists, use it
    if cached_data:
        # Build response from cached data
        channels = []
        
        # Always include standard periods from cache
        if 5 in period_list or not period_list:
            channels.append({
                "period": 5,
                "resistance": float(cached_data.period_5_resistance),
                "support": float(cached_data.period_5_support),
                "middle": float(cached_data.period_5_middle),
                "range": float(cached_data.period_5_range)
            })
        
        if 10 in period_list or not period_list:
            channels.append({
                "period": 10,
                "resistance": float(cached_data.period_10_resistance),
                "support": float(cached_data.period_10_support),
                "middle": float(cached_data.period_10_middle),
                "range": float(cached_data.period_10_range)
            })
        
        if 20 in period_list or not period_list:
            channels.append({
                "period": 20,
                "resistance": float(cached_data.period_20_resistance),
                "support": float(cached_data.period_20_support),
                "middle": float(cached_data.period_20_middle),
                "range": float(cached_data.period_20_range)
            })
        
        # For any non-standard periods, we need to calculate on-the-fly
        non_standard_periods = [p for p in period_list if p not in [5, 10, 20]]
        
        if non_standard_periods:
            # Fetch data and calculate for non-standard periods
            max_period = max(non_standard_periods)
            ohlc_data = _fetch_ohlc_data(session, company.id, max_period)
            
            for period in non_standard_periods:
                period_data = ohlc_data[-period:]
                highest_high = max(d['high'] for d in period_data)
                lowest_low = min(d['low'] for d in period_data)
                middle_channel = (highest_high + lowest_low) / 2
                
                channels.append({
                    "period": period,
                    "resistance": round(highest_high, 2),
                    "support": round(lowest_low, 2),
                    "middle": round(middle_channel, 2),
                    "range": round(highest_high - lowest_low, 2)
                })
        
        return {
            "symbol": symbol,
            "company_name": company.company_name or company.name,
            "current_price": float(cached_data.current_price),
            "data_points": cached_data.data_points,
            "latest_date": cached_data.calculation_date,
            "includes_current_day": cached_data.includes_current_day,
            "cached": True,
            "channels": sorted(channels, key=lambda x: x['period'])
        }
    
    # No cache found, calculate fresh values
    # Always calculate for standard periods 5, 10, 20 for caching
    standard_periods = [5, 10, 20]
    all_periods_to_calculate = list(set(standard_periods + period_list))
    max_period = max(all_periods_to_calculate)
    
    # Fetch OHLC data
    ohlc_data = _fetch_ohlc_data(session, company.id, max_period)
    
    # Calculate channels for all periods
    results = {}
    for period in all_periods_to_calculate:
        period_data = ohlc_data[-period:]
        highest_high = max(d['high'] for d in period_data)
        lowest_low = min(d['low'] for d in period_data)
        middle_channel = (highest_high + lowest_low) / 2
        
        results[period] = {
            "period": period,
            "resistance": round(highest_high, 2),
            "support": round(lowest_low, 2),
            "middle": round(middle_channel, 2),
            "range": round(highest_high - lowest_low, 2)
        }
    
    # Get metadata
    latest_close = ohlc_data[-1]['close']
    latest_date = ohlc_data[-1]['date']
    includes_current_day = ohlc_data[-1]['source'] == 'current'
    
    # Store in cache (only standard periods)
    cache_entry = DonchianChannelCache(
        company_id=company.id,
        calculation_date=today,
        current_price=Decimal(str(latest_close)),
        data_points=len(ohlc_data),
        includes_current_day=includes_current_day,
        period_5_resistance=Decimal(str(results[5]["resistance"])),
        period_5_support=Decimal(str(results[5]["support"])),
        period_5_middle=Decimal(str(results[5]["middle"])),
        period_5_range=Decimal(str(results[5]["range"])),
        period_10_resistance=Decimal(str(results[10]["resistance"])),
        period_10_support=Decimal(str(results[10]["support"])),
        period_10_middle=Decimal(str(results[10]["middle"])),
        period_10_range=Decimal(str(results[10]["range"])),
        period_20_resistance=Decimal(str(results[20]["resistance"])),
        period_20_support=Decimal(str(results[20]["support"])),
        period_20_middle=Decimal(str(results[20]["middle"])),
        period_20_range=Decimal(str(results[20]["range"])),
    )
    
    session.add(cache_entry)
    session.commit()
    
    # Return only requested periods
    channels = [results[p] for p in period_list]
    
    return {
        "symbol": symbol,
        "company_name": company.company_name or company.name,
        "current_price": round(latest_close, 2),
        "data_points": len(ohlc_data),
        "latest_date": latest_date,
        "includes_current_day": includes_current_day,
        "cached": False,
        "channels": sorted(channels, key=lambda x: x['period'])
    }


@router.get("/profit-targets/{symbol}")
def get_profit_targets(
    symbol: str,
    current_user: CurrentUser,
    session: SessionDep,
    entry_price: float = Query(..., description="Entry price of the position"),
    current_price: float = Query(..., description="Current market price")
):
    """
    Calculate profit targets using multiple technical analysis methods.
    
    Requires authentication. Returns tiered exit strategy with:
    - Primary target based on technical resistance
    - Tiered targets (3 levels) with probability estimates
    - Alternative methods (risk_reward_2x, atr_3x, fibonacci_1.618)
    - Market context analysis
    """
    
    # Find company by trading code
    company = session.exec(
        select(Company).where(
            Company.trading_code == symbol.upper(),
            Company.is_active == True
        )
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock with symbol '{symbol}' not found"
        )
    
    # Fetch OHLC data for calculations (need at least 20 days for ATR)
    try:
        ohlc_data = _fetch_ohlc_data(session, company.id, 20)
    except HTTPException:
        # If not enough historical data, try with available data
        daily_data = session.exec(
            select(DailyOHLC)
            .where(DailyOHLC.company_id == company.id)
            .order_by(desc(DailyOHLC.date))
            .limit(20)
        ).all()
        
        current_stock_data = session.exec(
            select(StockData)
            .where(StockData.company_id == company.id)
            .order_by(desc(StockData.timestamp))
            .limit(1)
        ).first()
        
        ohlc_data = []
        if daily_data:
            for d in daily_data:
                ohlc_data.append({
                    'date': d.date,
                    'high': float(d.high),
                    'low': float(d.low),
                    'close': float(d.close_price),
                    'source': 'historical'
                })
        
        if current_stock_data:
            ohlc_data.append({
                'date': current_stock_data.timestamp,
                'high': float(current_stock_data.high),
                'low': float(current_stock_data.low),
                'close': float(current_stock_data.last_trade_price),
                'source': 'current'
            })
        
        if not ohlc_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Insufficient price data for {symbol}. Need at least some historical data."
            )
        
        ohlc_data = sorted(ohlc_data, key=lambda x: x['date'])
    
    # Calculate ATR (Average True Range) - 14 period
    atr = _calculate_atr(ohlc_data, period=14)
    
    # Calculate Donchian Channel resistance levels directly
    # Use the same logic as get_donchian_channel but inline
    try:
        # Calculate for periods 5, 10, 20
        period_5_data = ohlc_data[-5:]
        period_10_data = ohlc_data[-10:]
        period_20_data = ohlc_data[-20:]
        
        resistance_5 = max(d['high'] for d in period_5_data) if period_5_data else current_price
        resistance_10 = max(d['high'] for d in period_10_data) if period_10_data else current_price
        resistance_20 = max(d['high'] for d in period_20_data) if period_20_data else current_price
    except:
        # Fallback if calculation fails
        recent_highs = [d['high'] for d in ohlc_data[-20:]] if len(ohlc_data) >= 20 else [d['high'] for d in ohlc_data]
        resistance_20 = max(recent_highs) if recent_highs else current_price
        resistance_10 = max(recent_highs[-10:]) if len(recent_highs) >= 10 else resistance_20
        resistance_5 = max(recent_highs[-5:]) if len(recent_highs) >= 5 else resistance_20
    
    # Calculate price change from entry
    price_change = current_price - entry_price
    price_change_percent = (price_change / entry_price * 100) if entry_price > 0 else 0
    
    # Calculate volatility (standard deviation of returns)
    returns = []
    for i in range(1, len(ohlc_data)):
        prev_close = ohlc_data[i-1]['close']
        curr_close = ohlc_data[i]['close']
        if prev_close > 0:
            returns.append((curr_close - prev_close) / prev_close)
    
    volatility = 0
    if len(returns) > 1:
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / (len(returns) - 1)
        volatility = math.sqrt(variance) * 100  # Percentage volatility
    
    # Determine trend
    if len(ohlc_data) >= 20:
        recent_close = ohlc_data[-1]['close']
        older_close = ohlc_data[-20]['close']
        trend_change = ((recent_close - older_close) / older_close * 100) if older_close > 0 else 0
        
        if trend_change > 5:
            trend = "uptrend"
        elif trend_change < -5:
            trend = "downtrend"
        else:
            trend = "neutral"
    else:
        trend = "neutral"
    
    # Determine volatility level
    if volatility > 3:
        volatility_level = "high"
    elif volatility > 1.5:
        volatility_level = "medium"
    else:
        volatility_level = "low"
    
    # Get sector performance (simplified - in real implementation, compare with sector index)
    sector_performance = "neutral"  # Default
    
    # Calculate alternative profit targets
    
    # 1. Risk/Reward 2x: Entry + 2x ATR (assuming stop loss at entry - 1x ATR)
    risk_reward_2x_price = entry_price + (2 * atr)
    risk_reward_2x_gain = ((risk_reward_2x_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    
    # 2. ATR 3x: Entry + 3x ATR
    atr_3x_price = entry_price + (3 * atr)
    atr_3x_gain = ((atr_3x_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    
    # 3. Fibonacci 1.618 extension: Entry + (Entry - Support) * 1.618
    # Use recent low as support
    recent_low = min(d['low'] for d in ohlc_data[-20:])
    fib_range = entry_price - recent_low
    fibonacci_1618_price = entry_price + (fib_range * 1.618)
    fibonacci_1618_gain = ((fibonacci_1618_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    
    # Primary target: Use the most conservative resistance level that's above current price
    if resistance_5 > current_price:
        primary_price = resistance_5
        primary_rationale = f"Strong resistance at {resistance_5:.2f} tested multiple times in past 5 days"
    elif resistance_10 > current_price:
        primary_price = resistance_10
        primary_rationale = f"Key resistance level at {resistance_10:.2f} from 10-day high"
    elif resistance_20 > current_price:
        primary_price = resistance_20
        primary_rationale = f"Major resistance at {resistance_20:.2f} from 20-day high"
    else:
        # If no resistance above, use ATR-based target
        primary_price = current_price + (2.5 * atr)
        primary_rationale = f"ATR-based target at {primary_price:.2f} (2.5x ATR from current price)"
    
    primary_gain = ((primary_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    
    # Calculate confidence based on multiple factors
    confidence_factors = []
    
    # Factor 1: How close is resistance to current price (closer = higher confidence)
    if resistance_5 > current_price:
        resistance_distance = (resistance_5 - current_price) / current_price * 100
        if resistance_distance < 5:
            confidence_factors.append(0.9)
        elif resistance_distance < 10:
            confidence_factors.append(0.75)
        else:
            confidence_factors.append(0.6)
    
    # Factor 2: Trend alignment
    if trend == "uptrend" and current_price < primary_price:
        confidence_factors.append(0.85)
    elif trend == "neutral":
        confidence_factors.append(0.7)
    else:
        confidence_factors.append(0.55)
    
    # Factor 3: Volatility (moderate volatility is good for targets)
    if 1.5 <= volatility <= 3:
        confidence_factors.append(0.8)
    elif volatility < 1.5:
        confidence_factors.append(0.65)
    else:
        confidence_factors.append(0.6)
    
    primary_confidence = sum(confidence_factors) / len(confidence_factors) if confidence_factors else 0.7
    
    # Tiered targets (3 levels)
    tiered_targets = []
    
    # Tier 1: Conservative (closest resistance or 1.5x ATR)
    tier1_price = min(resistance_5, current_price + (1.5 * atr)) if resistance_5 > current_price else current_price + (1.5 * atr)
    tier1_gain = ((tier1_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    tier1_probability = 85 if tier1_price <= resistance_5 else 75
    
    tiered_targets.append({
        "level": 1,
        "price": round(tier1_price, 2),
        "percentage_gain": round(tier1_gain, 2),
        "suggested_action": "Take 33% profit",
        "probability": f"{tier1_probability}%"
    })
    
    # Tier 2: Moderate (10-day resistance or 2.5x ATR)
    tier2_price = min(resistance_10, current_price + (2.5 * atr)) if resistance_10 > current_price else current_price + (2.5 * atr)
    tier2_gain = ((tier2_price - entry_price) / entry_price * 100) if entry_price > 0 else 0
    tier2_probability = 65 if tier2_price <= resistance_10 else 55
    
    tiered_targets.append({
        "level": 2,
        "price": round(tier2_price, 2),
        "percentage_gain": round(tier2_gain, 2),
        "suggested_action": "Take 33% profit",
        "probability": f"{tier2_probability}%"
    })
    
    # Tier 3: Aggressive (primary target or 20-day resistance)
    tier3_price = primary_price
    tier3_gain = primary_gain
    tier3_probability = 45
    
    tiered_targets.append({
        "level": 3,
        "price": round(tier3_price, 2),
        "percentage_gain": round(tier3_gain, 2),
        "suggested_action": "Exit remaining position",
        "probability": f"{tier3_probability}%"
    })
    
    # Alternative methods
    alternative_methods = [
        {
            "method": "risk_reward_2x",
            "price": round(risk_reward_2x_price, 2),
            "percentage_gain": round(risk_reward_2x_gain, 2),
            "confidence": 0.85
        },
        {
            "method": "atr_3x",
            "price": round(atr_3x_price, 2),
            "percentage_gain": round(atr_3x_gain, 2),
            "confidence": 0.80
        },
        {
            "method": "fibonacci_1.618",
            "price": round(fibonacci_1618_price, 2),
            "percentage_gain": round(fibonacci_1618_gain, 2),
            "confidence": 0.75
        }
    ]
    
    # Sort alternative methods by confidence
    alternative_methods.sort(key=lambda x: x["confidence"], reverse=True)
    
    # Determine recommended strategy
    if volatility_level == "high":
        recommended_strategy = "scale_out"
    elif trend == "uptrend" and primary_confidence > 0.75:
        recommended_strategy = "hold_to_target"
    else:
        recommended_strategy = "scale_out"
    
    # Market context
    market_context = {
        "trend": trend,
        "volatility": volatility_level,
        "sector_performance": sector_performance,
        "recommended_strategy": recommended_strategy
    }
    
    now = datetime.utcnow()
    next_update = now + timedelta(hours=1)
    
    return {
        "primary": {
            "price": round(primary_price, 2),
            "percentage_gain": round(primary_gain, 2),
            "method": "technical_resistance",
            "confidence": round(primary_confidence, 2),
            "rationale": primary_rationale
        },
        "tiered_targets": tiered_targets,
        "alternative_methods": alternative_methods,
        "market_context": market_context,
        "calculated_at": now.isoformat(),
        "next_update": next_update.isoformat()
    }


def _calculate_atr(ohlc_data: list, period: int = 14) -> float:
    """
    Calculate Average True Range (ATR) from OHLC data.
    
    True Range = max of:
    - High - Low
    - abs(High - Previous Close)
    - abs(Low - Previous Close)
    
    ATR = Simple Moving Average of True Range over period
    """
    if len(ohlc_data) < period + 1:
        # Not enough data, use simple high-low range
        if ohlc_data:
            return (ohlc_data[-1]['high'] - ohlc_data[-1]['low']) / 2
        return 0.0
    
    true_ranges = []
    
    for i in range(1, len(ohlc_data)):
        high = ohlc_data[i]['high']
        low = ohlc_data[i]['low']
        prev_close = ohlc_data[i-1]['close']
        
        tr1 = high - low
        tr2 = abs(high - prev_close)
        tr3 = abs(low - prev_close)
        
        true_range = max(tr1, tr2, tr3)
        true_ranges.append(true_range)
    
    # Calculate ATR as SMA of True Range
    if len(true_ranges) >= period:
        recent_trs = true_ranges[-period:]
        atr = sum(recent_trs) / len(recent_trs)
    else:
        atr = sum(true_ranges) / len(true_ranges) if true_ranges else 0.0
    
    return atr


def _fetch_ohlc_data(session, company_id: UUID, max_period: int) -> list:
    """
    Helper function to fetch OHLC data combining historical and current day data.
    
    Args:
        session: Database session
        company_id: Company UUID
        max_period: Maximum number of periods needed
        
    Returns:
        List of OHLC data dictionaries sorted by date
    """
    
    # Fetch historical daily OHLC data
    daily_data = session.exec(
        select(DailyOHLC)
        .where(DailyOHLC.company_id == company_id)
        .order_by(desc(DailyOHLC.date))
        .limit(max_period)
    ).all()
    
    # Fetch current day's data from StockData
    current_stock_data = session.exec(
        select(StockData)
        .where(StockData.company_id == company_id)
        .order_by(desc(StockData.timestamp))
        .limit(1)
    ).first()
    
    # Create unified OHLC data list
    ohlc_data = []
    
    # Add historical data
    if daily_data:
        for d in daily_data:
            ohlc_data.append({
                'date': d.date,
                'high': float(d.high),
                'low': float(d.low),
                'close': float(d.close_price),
                'source': 'historical'
            })
    
    # Add current day's data if available
    if current_stock_data:
        ohlc_data.append({
            'date': current_stock_data.timestamp,
            'high': float(current_stock_data.high),
            'low': float(current_stock_data.low),
            'close': float(current_stock_data.last_trade_price),
            'source': 'current'
        })
    
    if not ohlc_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No price data found for company"
        )
    
    # Sort by date (oldest first)
    ohlc_data = sorted(ohlc_data, key=lambda x: x['date'])
    
    # Check if we have enough data
    if len(ohlc_data) < max_period:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient data. Need {max_period} periods, but only {len(ohlc_data)} available."
        )
    
    return ohlc_data


