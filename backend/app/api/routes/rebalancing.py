from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Query
from sqlmodel import select, Session

from app.api.deps import CurrentUser, SessionDep
from app.model.company import Company
from app.model.order import Order, OrderStatus, OrderType, OrderSide, OrderValidity
from app.model.portfolio import Portfolio, PortfolioPosition, AllocationTarget
from app.model.rebalancing import (
    RebalancingSettings,
    RebalancingSettingsUpdate,
    RebalancingSettingsPublic,
    RebalancingSuggestion,
    RebalancingSuggestionsResponse,
    RebalancingExecuteRequest,
    RebalancingExecuteResponse,
    RebalancingRun,
    RebalancingTrade,
    RebalancingRunPublic,
    RebalancingHistoryResponse,
    RebalancingTradePublic,
)
from app.model.trade import Trade

router = APIRouter(prefix="/rebalancing", tags=["rebalancing"])


def verify_portfolio_ownership(
        portfolio_id: UUID,
        user_id: UUID,
        session: Session
) -> Portfolio:
    """Verify portfolio belongs to user and return it"""
    portfolio = session.exec(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == user_id
        )
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    return portfolio


@router.get("/portfolio/{portfolio_id}/suggestions")
def get_rebalancing_suggestions(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        threshold_pct: float = Query(5.0, ge=0.1, le=50.0, description="Drift threshold percentage"),
        min_trade_value: float = Query(100.0, ge=0, description="Minimum trade value"),
        strategy: str = Query("strategic", description="Rebalancing strategy"),
) -> RebalancingSuggestionsResponse:
    """
    Calculate rebalancing suggestions for a portfolio.
    
    Compares current allocation against target allocation and suggests
    trades to bring the portfolio back within the target ranges.
    """
    # Verify ownership
    portfolio = verify_portfolio_ownership(portfolio_id, current_user.id, session)

    # Get current allocation
    positions_query = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()

    total_value = sum(float(pos.current_value) for pos, _ in positions_query)

    if total_value <= 0:
        return RebalancingSuggestionsResponse(
            portfolio_id=portfolio_id,
            threshold_pct=Decimal(str(threshold_pct)),
            min_trade_value=Decimal(str(min_trade_value)),
            suggestions=[],
            totals={"buyValue": 0, "sellValue": 0, "estimatedCost": 0}
        )

    # Get allocation targets
    targets = session.exec(
        select(AllocationTarget).where(
            AllocationTarget.portfolio_id == portfolio_id,
            AllocationTarget.user_id == current_user.id
        )
    ).all()

    if not targets:
        return RebalancingSuggestionsResponse(
            portfolio_id=portfolio_id,
            threshold_pct=Decimal(str(threshold_pct)),
            min_trade_value=Decimal(str(min_trade_value)),
            suggestions=[],
            totals={"buyValue": 0, "sellValue": 0, "estimatedCost": 0}
        )

    # Build target map by sector
    target_map = {t.category: float(t.target_percent) for t in targets}

    # Calculate current sector allocations
    sector_allocations = {}
    stocks_by_sector = {}

    for position, stock in positions_query:
        sector = stock.sector or "Unknown"
        current_value = float(position.current_value)

        if sector not in sector_allocations:
            sector_allocations[sector] = 0
            stocks_by_sector[sector] = []

        sector_allocations[sector] += current_value
        stocks_by_sector[sector].append({
            "position": position,
            "stock": stock,
            "current_value": current_value
        })

    # Calculate sector percentages and deviations
    sector_deviations = {}
    for sector, sector_value in sector_allocations.items():
        current_pct = (sector_value / total_value) * 100
        target_pct = target_map.get(sector, current_pct)
        deviation = current_pct - target_pct
        sector_deviations[sector] = {
            "current_pct": current_pct,
            "target_pct": target_pct,
            "deviation": deviation,
            "current_value": sector_value,
            "target_value": (target_pct / 100) * total_value
        }

    # Generate suggestions
    suggestions = []

    for sector, dev_info in sector_deviations.items():
        if abs(dev_info["deviation"]) > threshold_pct:
            sector_stocks = stocks_by_sector.get(sector, [])
            if not sector_stocks:
                continue

            difference = dev_info["target_value"] - dev_info["current_value"]

            # Distribute difference across stocks proportionally
            for stock_info in sector_stocks:
                position = stock_info["position"]
                stock = stock_info["stock"]
                stock_value = stock_info["current_value"]

                # Calculate proportion of this stock in sector
                sector_total = sum(s["current_value"] for s in sector_stocks)
                stock_proportion = stock_value / sector_total if sector_total > 0 else 0

                suggested_value_change = difference * stock_proportion

                # Calculate shares based on current price
                current_price = float(position.current_value) / position.quantity if position.quantity > 0 else 0

                if current_price > 0:
                    suggested_shares = abs(int(round(suggested_value_change / current_price)))

                    if suggested_shares > 0 and abs(suggested_value_change) >= min_trade_value:
                        # Determine priority based on deviation magnitude
                        if abs(dev_info["deviation"]) > 10:
                            priority = "high"
                        elif abs(dev_info["deviation"]) > 5:
                            priority = "medium"
                        else:
                            priority = "low"

                        suggestion = RebalancingSuggestion(
                            symbol=stock.trading_code,
                            company_name=stock.company_name,
                            sector=sector,
                            action="BUY" if suggested_value_change > 0 else "SELL",
                            current_allocation=Decimal(str(round((stock_value / total_value) * 100, 2))),
                            target_allocation=Decimal(str(round(dev_info["target_pct"], 2))),
                            deviation=Decimal(str(round(dev_info["deviation"], 2))),
                            suggested_shares=suggested_shares,
                            suggested_value=Decimal(str(round(abs(suggested_value_change), 2))),
                            current_value=Decimal(str(round(stock_value, 2))),
                            priority=priority
                        )
                        suggestions.append(suggestion)

    # Sort by priority
    priority_order = {"high": 3, "medium": 2, "low": 1}
    suggestions.sort(key=lambda s: priority_order.get(s.priority, 0), reverse=True)

    # Calculate totals
    buy_value = sum(float(s.suggested_value) for s in suggestions if s.action == "BUY")
    sell_value = sum(float(s.suggested_value) for s in suggestions if s.action == "SELL")
    estimated_cost = (buy_value + sell_value) * 0.001  # 0.1% transaction cost

    return RebalancingSuggestionsResponse(
        portfolio_id=portfolio_id,
        threshold_pct=Decimal(str(threshold_pct)),
        min_trade_value=Decimal(str(min_trade_value)),
        suggestions=suggestions,
        totals={
            "buyValue": round(buy_value, 2),
            "sellValue": round(sell_value, 2),
            "estimatedCost": round(estimated_cost, 2)
        }
    )


@router.post("/portfolio/{portfolio_id}/execute")
def execute_rebalancing(
        portfolio_id: UUID,
        request: RebalancingExecuteRequest,
        current_user: CurrentUser,
        session: SessionDep
) -> RebalancingExecuteResponse:
    """
    Execute rebalancing trades for a portfolio.
    
    Creates orders and simulated trades to rebalance the portfolio
    according to the provided suggestions.
    """
    # Verify ownership
    portfolio = verify_portfolio_ownership(portfolio_id, current_user.id, session)

    if not request.suggestions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No suggestions provided"
        )

    # Calculate drift before rebalancing
    positions_query = session.exec(
        select(PortfolioPosition, Company)
        .join(Company, PortfolioPosition.stock_id == Company.id)
        .where(PortfolioPosition.portfolio_id == portfolio_id)
    ).all()

    total_value = sum(float(pos.current_value) for pos, _ in positions_query)

    targets = session.exec(
        select(AllocationTarget).where(
            AllocationTarget.portfolio_id == portfolio_id,
            AllocationTarget.user_id == current_user.id
        )
    ).all()

    target_map = {t.category: float(t.target_percent) for t in targets}

    # Calculate current drift
    sector_allocations = {}
    for position, stock in positions_query:
        sector = stock.sector or "Unknown"
        if sector not in sector_allocations:
            sector_allocations[sector] = 0
        sector_allocations[sector] += float(position.current_value)

    drift_before = 0
    if total_value > 0:
        deviations = []
        for sector, value in sector_allocations.items():
            current_pct = (value / total_value) * 100
            target_pct = target_map.get(sector, current_pct)
            deviations.append(abs(current_pct - target_pct))
        drift_before = sum(deviations) / len(deviations) if deviations else 0

    # Create rebalancing run
    rebalancing_run = RebalancingRun(
        user_id=current_user.id,
        portfolio_id=portfolio_id,
        type="manual",
        drift_before=Decimal(str(round(drift_before, 2))),
        drift_after=Decimal("0"),  # Will update after execution
        trades_count=len(request.suggestions),
        buy_value=Decimal("0"),
        sell_value=Decimal("0"),
        transaction_cost=Decimal("0"),
        executed_at=datetime.utcnow()
    )
    session.add(rebalancing_run)
    session.flush()  # Get the ID

    # Execute trades
    executed_trades = []
    total_buy = Decimal("0")
    total_sell = Decimal("0")

    for sug in request.suggestions:
        symbol = sug.get("symbol")
        action = sug.get("action", "BUY").upper()
        quantity = sug.get("quantity", 0)
        limit_price = sug.get("limit_price")

        if not symbol or quantity <= 0:
            continue

        # Lookup stock
        stock = session.exec(
            select(Company).where(Company.trading_code == symbol)
        ).first()

        if not stock:
            continue

        # Get current price (use limit_price or current market price)
        if limit_price:
            price = Decimal(str(limit_price))
        else:
            # Get latest stock data price
            from app.model.stock import StockData
            latest_data = session.exec(
                select(StockData)
                .where(StockData.stock_id == stock.id)
                .order_by(StockData.timestamp.desc())
                .limit(1)
            ).first()
            price = Decimal(str(latest_data.last)) if latest_data and latest_data.last else Decimal("0")

        if price <= 0:
            continue

        value = price * quantity

        # Create order (simulated, immediately filled)
        order = Order(
            user_id=current_user.id,
            portfolio_id=portfolio_id,
            stock_id=stock.id,
            order_type=OrderType.MARKET if not limit_price else OrderType.LIMIT,
            side=OrderSide.BUY if action == "BUY" else OrderSide.SELL,
            quantity=quantity,
            price=price if limit_price else None,
            validity=OrderValidity.DAY,
            status=OrderStatus.FILLED if request.simulate else OrderStatus.PENDING,
            filled_quantity=quantity if request.simulate else 0,
            average_price=price if request.simulate else None,
            total_amount=value,
            commission=value * Decimal("0.001"),  # 0.1% commission
            is_simulated=request.simulate,
            placed_at=datetime.utcnow(),
            filled_at=datetime.utcnow() if request.simulate else None
        )
        session.add(order)

        # Create trade (simulated execution)
        if request.simulate:
            trade = Trade(
                portfolio_id=portfolio_id,
                stock_id=stock.id,
                trade_type="BUY" if action == "BUY" else "SELL",
                quantity=quantity,
                price=price,
                total_amount=value,
                commission=value * Decimal("0.001"),
                net_amount=value - (value * Decimal("0.001")),
                trade_date=datetime.utcnow(),
                notes=f"Rebalancing trade - {action} {symbol}",
                is_simulated=True
            )
            session.add(trade)

        # Record rebalancing trade
        rebal_trade = RebalancingTrade(
            run_id=rebalancing_run.id,
            stock_id=stock.id,
            symbol=symbol,
            action=action,
            quantity=quantity,
            price=price,
            value=value
        )
        session.add(rebal_trade)

        executed_trades.append(RebalancingTradePublic(
            symbol=symbol,
            action=action,
            quantity=quantity,
            price=price,
            value=value
        ))

        if action == "BUY":
            total_buy += value
        else:
            total_sell += value

    # Update rebalancing run totals
    transaction_cost = (total_buy + total_sell) * Decimal("0.001")
    rebalancing_run.buy_value = total_buy
    rebalancing_run.sell_value = total_sell
    rebalancing_run.transaction_cost = transaction_cost

    # Estimate drift after (simplified - assume perfect execution)
    drift_after = Decimal(str(round(drift_before * 0.2, 2)))  # Assume 80% improvement
    rebalancing_run.drift_after = drift_after

    session.commit()
    session.refresh(rebalancing_run)

    # Update settings last_rebalance_at
    settings = session.exec(
        select(RebalancingSettings).where(
            RebalancingSettings.portfolio_id == portfolio_id,
            RebalancingSettings.user_id == current_user.id
        )
    ).first()

    if settings:
        settings.last_rebalance_at = datetime.utcnow()
        settings.updated_at = datetime.utcnow()
        session.add(settings)
        session.commit()

    return RebalancingExecuteResponse(
        run_id=rebalancing_run.id,
        executed_at=rebalancing_run.executed_at,
        trades=executed_trades,
        buy_value=total_buy,
        sell_value=total_sell,
        transaction_cost=transaction_cost,
        drift_before=rebalancing_run.drift_before,
        drift_after=drift_after
    )


@router.get("/portfolio/{portfolio_id}/history")
def get_rebalancing_history(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep,
        limit: int = Query(20, ge=1, le=100),
        offset: int = Query(0, ge=0),
) -> RebalancingHistoryResponse:
    """
    Get rebalancing history for a portfolio.
    
    Returns paginated list of past rebalancing runs with details.
    """
    # Verify ownership
    portfolio = verify_portfolio_ownership(portfolio_id, current_user.id, session)

    # Get total count
    total_query = session.exec(
        select(RebalancingRun).where(
            RebalancingRun.portfolio_id == portfolio_id,
            RebalancingRun.user_id == current_user.id
        )
    )
    total_runs = len(list(total_query))

    # Get paginated runs
    runs = session.exec(
        select(RebalancingRun).where(
            RebalancingRun.portfolio_id == portfolio_id,
            RebalancingRun.user_id == current_user.id
        ).order_by(RebalancingRun.executed_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    # Fetch trades for each run
    runs_with_trades = []
    for run in runs:
        trades = session.exec(
            select(RebalancingTrade).where(RebalancingTrade.run_id == run.id)
        ).all()

        trade_publics = [
            RebalancingTradePublic(
                symbol=t.symbol,
                action=t.action,
                quantity=t.quantity,
                price=t.price,
                value=t.value
            )
            for t in trades
        ]

        runs_with_trades.append(RebalancingRunPublic(
            id=run.id,
            portfolio_id=run.portfolio_id,
            type=run.type,
            drift_before=run.drift_before,
            drift_after=run.drift_after,
            trades_count=run.trades_count,
            buy_value=run.buy_value,
            sell_value=run.sell_value,
            transaction_cost=run.transaction_cost,
            notes=run.notes,
            executed_at=run.executed_at,
            trades=trade_publics
        ))

    return RebalancingHistoryResponse(
        portfolio_id=portfolio_id,
        runs=runs_with_trades,
        total_runs=total_runs
    )


@router.get("/portfolio/{portfolio_id}/settings")
def get_rebalancing_settings(
        portfolio_id: UUID,
        current_user: CurrentUser,
        session: SessionDep
) -> RebalancingSettingsPublic:
    """Get rebalancing settings for a portfolio"""
    # Verify ownership
    portfolio = verify_portfolio_ownership(portfolio_id, current_user.id, session)

    settings = session.exec(
        select(RebalancingSettings).where(
            RebalancingSettings.portfolio_id == portfolio_id,
            RebalancingSettings.user_id == current_user.id
        )
    ).first()

    if not settings:
        # Create default settings
        settings = RebalancingSettings(
            user_id=current_user.id,
            portfolio_id=portfolio_id,
            enabled=False,
            threshold_pct=Decimal("5.0"),
            frequency="quarterly",
            min_trade_value=Decimal("100.0")
        )
        session.add(settings)
        session.commit()
        session.refresh(settings)

    return RebalancingSettingsPublic.from_orm(settings)


@router.put("/portfolio/{portfolio_id}/settings")
def update_rebalancing_settings(
        portfolio_id: UUID,
        updates: RebalancingSettingsUpdate,
        current_user: CurrentUser,
        session: SessionDep
) -> RebalancingSettingsPublic:
    """Update rebalancing settings for a portfolio"""
    # Verify ownership
    portfolio = verify_portfolio_ownership(portfolio_id, current_user.id, session)

    settings = session.exec(
        select(RebalancingSettings).where(
            RebalancingSettings.portfolio_id == portfolio_id,
            RebalancingSettings.user_id == current_user.id
        )
    ).first()

    if not settings:
        # Create new settings
        settings = RebalancingSettings(
            user_id=current_user.id,
            portfolio_id=portfolio_id,
            enabled=updates.enabled if updates.enabled is not None else False,
            threshold_pct=updates.threshold_pct if updates.threshold_pct is not None else Decimal("5.0"),
            frequency=updates.frequency if updates.frequency is not None else "quarterly",
            min_trade_value=updates.min_trade_value if updates.min_trade_value is not None else Decimal("100.0")
        )
        session.add(settings)
    else:
        # Update existing settings
        if updates.enabled is not None:
            settings.enabled = updates.enabled
        if updates.threshold_pct is not None:
            settings.threshold_pct = updates.threshold_pct
        if updates.frequency is not None:
            settings.frequency = updates.frequency
        if updates.min_trade_value is not None:
            settings.min_trade_value = updates.min_trade_value
        settings.updated_at = datetime.utcnow()
        session.add(settings)

    session.commit()
    session.refresh(settings)

    return RebalancingSettingsPublic.from_orm(settings)
