from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select
from app.api.deps import CurrentUser, SessionDep
from datetime import datetime
from decimal import Decimal
from app.model.order import (
    Order, OrderCreate, OrderUpdate, OrderPublic,
    OrderExecution, OrderExecutionPublic,
    OrderSummary, OrderType, OrderSide, OrderStatus, OrderValidity,
    OrderWithDetails)
from app.model.portfolio import Portfolio, PortfolioPosition
from app.model.stock import StockData
from app.model.company import Company
from app.model.funds import AccountTransaction, TransactionType
from app.model.trade import Trade

router = APIRouter(prefix="/orders", tags=["orders"])


def _safe_decimal(value) -> Decimal:
	try:
		return Decimal(str(value or 0))
	except Exception:
		return Decimal(0)


@router.post("/", response_model=OrderPublic)
def create_order(
	order: OrderCreate,
	current_user: CurrentUser,
	session: SessionDep
):
	"""Create a new order"""
	# Validate stock exists
	stock = session.exec(
		select(Company).where(Company.id == order.stock_id)
	).first()
	
	if not stock:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Stock not found"
		)
	
	# Validate portfolio if specified
	portfolio = None
	if order.portfolio_id:
		portfolio = session.exec(
			select(Portfolio).where(
				Portfolio.id == order.portfolio_id,
				Portfolio.user_id == current_user.id
			)
		).first()
		
		if not portfolio:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Portfolio not found"
			)
	
	# Affordability check for BUY orders against buying power (cash + credit - reserved)
	if order.side == OrderSide.BUY:
		# compute reference price
		ref_price = _safe_decimal(order.price)
		if ref_price <= 0:
			latest = session.exec(
				select(StockData)
				.where(StockData.company_id == order.stock_id)
				.order_by(StockData.timestamp.desc())
			).first()
			ref_price = _safe_decimal(latest.last_trade_price) if latest else Decimal(0)
			total_needed = ref_price * _safe_decimal(order.quantity)
		else:
			total_needed = ref_price * _safe_decimal(order.quantity)
		# fetch cash across portfolios and reserved
		portfolios = session.exec(select(Portfolio).where(Portfolio.user_id == current_user.id)).all() or []
		cash = sum(_safe_decimal(p.cash_balance) for p in portfolios)
		credit = _safe_decimal(getattr(current_user, "credit_limit", 0))
		open_buys = session.exec(
			select(Order).where(
				Order.user_id == current_user.id,
				Order.side == OrderSide.BUY,
				Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
			)
		).all() or []
		reserved = Decimal(0)
		if open_buys:
			company_ids = list({o.stock_id for o in open_buys})
			rows = session.exec(
				select(StockData).where(StockData.company_id.in_(company_ids)).order_by(StockData.company_id, StockData.timestamp.desc())
			).all() or []
			seen = set()
			latest_map = {}
			for r in rows:
				if r.company_id not in seen:
					latest_map[r.company_id] = _safe_decimal(r.last_trade_price)
					seen.add(r.company_id)
			for o in open_buys:
				remaining = _safe_decimal(o.quantity) - _safe_decimal(o.filled_quantity or 0)
				if remaining <= 0:
					continue
				p = _safe_decimal(o.price) if o.price is not None else latest_map.get(o.stock_id, Decimal(0))
				reserved += p * remaining
		buying_power = cash + credit - reserved
		if total_needed > buying_power:
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient buying power")
	
	# Create order
	db_order = Order(
		user_id=current_user.id,
		**order.dict()
	)
	session.add(db_order)
	
	# Auto-fill simulated orders immediately
	if order.is_simulated and order.portfolio_id:
		# Get current market price
		latest_data = session.exec(
			select(StockData)
			.where(StockData.company_id == order.stock_id)
			.order_by(StockData.timestamp.desc())
		).first()
		
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
		
		# Execute trade - add to portfolio
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
		session.add(db_trade)
		
		# Create account transaction
		tx = AccountTransaction(
			user_id=current_user.id,
			portfolio_id=portfolio.id,
			trade_id=db_trade.id,
			type=tx_type,
			amount=net_amount.copy_abs(),
			description=f"{order.side.value} {stock.trading_code}"
		)
		session.add(tx)
		
		# Update or create portfolio position
		position = session.exec(
			select(PortfolioPosition).where(
				PortfolioPosition.portfolio_id == order.portfolio_id,
				PortfolioPosition.stock_id == order.stock_id
			)
		).first()
		
		if order.side == OrderSide.BUY:
			if position:
				# Update existing position
				total_cost = position.total_investment + net_amount
				total_quantity = position.quantity + order.quantity
				position.average_price = total_cost / total_quantity if total_quantity > 0 else Decimal('0')
				position.quantity = total_quantity
				position.total_investment = total_cost
				position.current_value = total_quantity * execution_price
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
				session.add(position)
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
			position.quantity = position.quantity - order.quantity
			if position.quantity == 0:
				# Remove position if fully sold
				session.delete(position)
			else:
				# Recalculate average price (FIFO or keep current average)
				position.current_value = position.quantity * execution_price
		
		session.add(portfolio)
	
	session.commit()
	session.refresh(db_order)
	return db_order


@router.get("/", response_model=List[OrderPublic])
def get_user_orders(
	current_user: CurrentUser,
	session: SessionDep,
	portfolio_id: Optional[UUID] = None,
	status: Optional[OrderStatus] = None
):
	"""Get all orders for the current user"""
	query = select(Order).where(Order.user_id == current_user.id)
	
	if portfolio_id:
		query = query.where(Order.portfolio_id == portfolio_id)
	
	if status:
		query = query.where(Order.status == status)
	
	orders = session.exec(query.order_by(Order.placed_at.desc())).all()
	return orders


@router.get("/with-details", response_model=List[OrderWithDetails])
def get_user_orders_with_details(
    current_user: CurrentUser,
    session: SessionDep,
    portfolio_id: Optional[UUID] = None,
    status: Optional[OrderStatus] = None,
):
    """Get all orders for the current user including stock symbol and company name"""
    query = select(Order, Company).join(Company, Order.stock_id == Company.id).where(Order.user_id == current_user.id)

    if portfolio_id:
        query = query.where(Order.portfolio_id == portfolio_id)

    if status:
        query = query.where(Order.status == status)

    rows = session.exec(query.order_by(Order.placed_at.desc())).all() or []

    results: List[OrderWithDetails] = []
    for order, stock in rows:
        results.append(
            OrderWithDetails(
                **order.dict(),
                symbol=stock.trading_code,
                company_name=stock.company_name,
            )
        )
    return results


@router.get("/{order_id}", response_model=OrderPublic)
def get_order(
	order_id: UUID,
	current_user: CurrentUser,
	session: SessionDep
):
	"""Get a specific order by ID"""
	order = session.exec(
		select(Order).where(
			Order.id == order_id,
			Order.user_id == current_user.id
		)
	).first()
	
	if not order:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Order not found"
		)
	
	return order


@router.put("/{order_id}", response_model=OrderPublic)
def update_order(
	order_id: UUID,
	order_update: OrderUpdate,
	current_user: CurrentUser,
	session: SessionDep
):
	"""Update an order"""
	order = session.exec(
		select(Order).where(
			Order.id == order_id,
			Order.user_id == current_user.id
		)
	).first()
	
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
	
	session.add(order)
	session.commit()
	session.refresh(order)
	return order


@router.delete("/{order_id}")
def cancel_order(
	order_id: UUID,
	current_user: CurrentUser,
	session: SessionDep
):
	"""Cancel an order"""
	order = session.exec(
		select(Order).where(
			Order.id == order_id,
			Order.user_id == current_user.id
		)
	).first()
	
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
	
	session.add(order)
	session.commit()
	
	return {"message": "Order cancelled successfully"}


@router.get("/{order_id}/executions", response_model=List[OrderExecutionPublic])
def get_order_executions(
	order_id: UUID,
	current_user: CurrentUser,
	session: SessionDep
):
	"""Get executions for a specific order"""
	order = session.exec(
		select(Order).where(
			Order.id == order_id,
			Order.user_id == current_user.id
		)
	).first()
	
	if not order:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Order not found"
		)
	
	executions = session.exec(
		select(OrderExecution).where(OrderExecution.order_id == order_id)
		.order_by(OrderExecution.executed_at.desc())
	).all()
	
	return executions


@router.get("/summary", response_model=OrderSummary)
def get_order_summary(
	current_user: CurrentUser,
	session: SessionDep,
	portfolio_id: Optional[UUID] = None
):
	"""Get order summary for the user"""
	query = select(Order).where(Order.user_id == current_user.id)
	
	if portfolio_id:
		query = query.where(Order.portfolio_id == portfolio_id)
	
	orders = session.exec(query).all()
	
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