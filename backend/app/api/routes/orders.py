from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, Session
from app.api.deps import get_current_user, get_session_dep
from datetime import datetime
from app.model.order import (
    Order, OrderCreate, OrderUpdate, OrderPublic,
    OrderExecution, OrderExecutionPublic,
    OrderSummary, OrderType, OrderSide, OrderStatus, OrderValidity
)
from app.model.portfolio import Portfolio
from app.model.stock import StockCompany
from app.model.user import User

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderPublic)
def create_order(
    order: OrderCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Create a new order"""
    # Validate stock exists
    stock = session.exec(
        select(StockCompany).where(StockCompany.id == order.stock_id)
    ).first()
    
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock not found"
        )
    
    # Validate portfolio if specified
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
    
    # Create order
    db_order = Order(
        user_id=current_user.id,
        **order.dict()
    )
    session.add(db_order)
    session.commit()
    session.refresh(db_order)
    return db_order


@router.get("/", response_model=List[OrderPublic])
def get_user_orders(
    portfolio_id: Optional[UUID] = None,
    status: Optional[OrderStatus] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
):
    """Get all orders for the current user"""
    query = select(Order).where(Order.user_id == current_user.id)
    
    if portfolio_id:
        query = query.where(Order.portfolio_id == portfolio_id)
    
    if status:
        query = query.where(Order.status == status)
    
    orders = session.exec(query.order_by(Order.placed_at.desc())).all()
    return orders


@router.get("/{order_id}", response_model=OrderPublic)
def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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
    portfolio_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session_dep)
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