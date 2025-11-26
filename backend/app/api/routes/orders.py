from app.api.deps import CurrentUser, SessionDep
from app.model.order import (
    OrderCreate, OrderUpdate, OrderPublic,
    OrderExecutionPublic, OrderWithDetails,
    OrderSummary, OrderStatus
)
from app.repositories.order_repository import OrderRepository
from app.services.order_service import OrderService
from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/orders", tags=["orders"])

# Initialize service
order_service = OrderService()
order_repo = OrderRepository()


@router.post("/", response_model=OrderPublic)
def create_order(
        order: OrderCreate,
        current_user: CurrentUser,
        session: SessionDep
):
    """Create a new order"""
    return order_service.create_order_with_validation(session, current_user, order)


@router.get("/", response_model=List[OrderPublic])
def get_user_orders(
        current_user: CurrentUser,
        session: SessionDep,
        portfolio_id: Optional[UUID] = None,
        status: Optional[OrderStatus] = None
):
    """Get all orders for the current user"""
    return order_repo.get_orders(session, current_user.id, portfolio_id, status)


@router.get("/with-details", response_model=List[OrderWithDetails])
def get_user_orders_with_details(
        current_user: CurrentUser,
        session: SessionDep,
        portfolio_id: Optional[UUID] = None,
        status: Optional[OrderStatus] = None,
):
    """Get all orders for the current user including stock symbol and company name"""
    rows = order_repo.get_orders_with_details(session, current_user.id, portfolio_id, status)

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
    order = order_repo.get_order_by_id(session, order_id, current_user.id)

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
    return order_service.update_order_with_validation(
        session, order_id, current_user.id, order_update
    )


@router.delete("/{order_id}")
def cancel_order(
        order_id: UUID,
        current_user: CurrentUser,
        session: SessionDep
):
    """Cancel an order"""
    return order_service.cancel_order_with_validation(
        session, order_id, current_user.id
    )


@router.get("/{order_id}/executions", response_model=List[OrderExecutionPublic])
def get_order_executions(
        order_id: UUID,
        current_user: CurrentUser,
        session: SessionDep
):
    """Get executions for a specific order"""
    order = order_repo.get_order_by_id(session, order_id, current_user.id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order_repo.get_order_executions(session, order_id)


@router.get("/summary", response_model=OrderSummary)
def get_order_summary(
        current_user: CurrentUser,
        session: SessionDep,
        portfolio_id: Optional[UUID] = None
):
    """Get order summary for the user"""
    return order_service.get_order_summary(session, current_user.id, portfolio_id)
