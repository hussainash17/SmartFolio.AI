from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, SQLModel
from uuid import UUID

from app.api.deps import get_current_user, get_session_dep
from app.model.user import User
from app.model.portfolio import Portfolio
from app.model.funds import AccountTransaction, TransactionType, AccountTransactionPublic
from app.model.order import Order, OrderStatus, OrderSide
from app.model.stock import StockData

router = APIRouter(prefix="/funds", tags=["funds"])


def _safe_decimal(value) -> Decimal:
	try:
		return Decimal(str(value or 0))
	except Exception:
		return Decimal(0)


def _get_default_portfolio(session: Session, user_id: UUID) -> Portfolio:
	portfolio = session.exec(
		select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.is_default == True)
	).first()
	if not portfolio:
		# fallback to any portfolio
		portfolio = session.exec(select(Portfolio).where(Portfolio.user_id == user_id)).first()
	if not portfolio:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No portfolio found for user")
	return portfolio


@router.get("/summary")
def get_funds_summary(current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
	portfolios: List[Portfolio] = session.exec(select(Portfolio).where(Portfolio.user_id == current_user.id)).all() or []
	cash_balance = sum(_safe_decimal(p.cash_balance) for p in portfolios)
	# Compute reserved funds for open BUY orders
	open_buy_orders: List[Order] = session.exec(
		select(Order).where(
			Order.user_id == current_user.id,
			Order.side == OrderSide.BUY,
			Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
		)
	).all() or []
	# Fetch latest prices for referenced stocks
	from collections import defaultdict
	latest_price: dict[UUID, Decimal] = {}
	if open_buy_orders:
		company_ids = list({o.stock_id for o in open_buy_orders})
		rows: List[StockData] = session.exec(
			select(StockData).where(StockData.company_id.in_(company_ids)).order_by(StockData.company_id, StockData.timestamp.desc())
		).all() or []
		seen = set()
		for r in rows:
			if r.company_id not in seen:
				latest_price[r.company_id] = _safe_decimal(r.last_trade_price)
				seen.add(r.company_id)

	reserved = Decimal(0)
	for o in open_buy_orders:
		remaining = _safe_decimal(o.quantity) - _safe_decimal(o.filled_quantity or 0)
		if remaining <= 0:
			continue
		reference_price = _safe_decimal(o.price) if o.price is not None else latest_price.get(o.stock_id, Decimal(0))
		reserved += reference_price * remaining

	credit_limit = _safe_decimal(getattr(current_user, "credit_limit", 0))
	buying_power = cash_balance + credit_limit - reserved
	if buying_power < 0:
		buying_power = Decimal(0)

	return {
		"cash_balance": float(cash_balance),
		"credit_limit": float(credit_limit),
		"reserved_funds": float(reserved),
		"buying_power": float(buying_power),
	}


@router.get("/transactions", response_model=List[AccountTransactionPublic])
def list_transactions(limit: int = 50, offset: int = 0, current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
	rows = session.exec(
		select(AccountTransaction)
		.where(AccountTransaction.user_id == current_user.id)
		.order_by(AccountTransaction.created_at.desc())
		.offset(offset)
		.limit(limit)
	).all() or []
	return rows


class FundsChangeRequest(SQLModel):
	amount: float
	portfolio_id: Optional[UUID] = None
	description: Optional[str] = None


@router.post("/deposit")
def deposit_funds(req: FundsChangeRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
	amount = _safe_decimal(req.amount)
	if amount <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")
	portfolio = _get_default_portfolio(session, current_user.id) if not req.portfolio_id else session.get(Portfolio, req.portfolio_id)
	if not portfolio or portfolio.user_id != current_user.id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
	portfolio.cash_balance = _safe_decimal(portfolio.cash_balance) + amount
	tx = AccountTransaction(
		user_id=current_user.id,
		portfolio_id=portfolio.id,
		type=TransactionType.DEPOSIT,
		amount=amount,
		description=req.description or "User deposit",
	)
	session.add(portfolio)
	session.add(tx)
	session.commit()
	session.refresh(portfolio)
	return {"message": "Deposit successful", "cash_balance": float(portfolio.cash_balance)}


@router.post("/withdraw")
def withdraw_funds(req: FundsChangeRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
	amount = _safe_decimal(req.amount)
	if amount <= 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Amount must be positive")
	portfolio = _get_default_portfolio(session, current_user.id) if not req.portfolio_id else session.get(Portfolio, req.portfolio_id)
	if not portfolio or portfolio.user_id != current_user.id:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")
	# Compute reserved funds to ensure sufficient available cash
	open_buy_orders: List[Order] = session.exec(
		select(Order).where(
			Order.user_id == current_user.id,
			Order.side == OrderSide.BUY,
			Order.status.in_([OrderStatus.PENDING, OrderStatus.PARTIAL])
		)
	).all() or []
	reserved = Decimal(0)
	if open_buy_orders:
		company_ids = list({o.stock_id for o in open_buy_orders})
		rows: List[StockData] = session.exec(
			select(StockData).where(StockData.company_id.in_(company_ids)).order_by(StockData.company_id, StockData.timestamp.desc())
		).all() or []
		seen = set()
		latest = {}
		for r in rows:
			if r.company_id not in seen:
				latest[r.company_id] = _safe_decimal(r.last_trade_price)
				seen.add(r.company_id)
		for o in open_buy_orders:
			remaining = _safe_decimal(o.quantity) - _safe_decimal(o.filled_quantity or 0)
			if remaining <= 0:
				continue
			reference_price = _safe_decimal(o.price) if o.price is not None else latest.get(o.stock_id, Decimal(0))
			reserved += reference_price * remaining
	available = _safe_decimal(portfolio.cash_balance) - reserved
	if amount > available:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient available cash after reservations")
	portfolio.cash_balance = _safe_decimal(portfolio.cash_balance) - amount
	tx = AccountTransaction(
		user_id=current_user.id,
		portfolio_id=portfolio.id,
		type=TransactionType.WITHDRAWAL,
		amount=amount,
		description=req.description or "User withdrawal",
	)
	session.add(portfolio)
	session.add(tx)
	session.commit()
	session.refresh(portfolio)
	return {"message": "Withdrawal successful", "cash_balance": float(portfolio.cash_balance)}


class FundsSettingsRequest(SQLModel):
	credit_limit: float


@router.patch("/settings")
def update_funds_settings(req: FundsSettingsRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_session_dep)):
	if req.credit_limit is None or float(req.credit_limit) < 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="credit_limit must be non-negative")
	current_user.credit_limit = float(req.credit_limit)
	session.add(current_user)
	session.commit()
	return {"message": "Settings updated", "credit_limit": current_user.credit_limit}