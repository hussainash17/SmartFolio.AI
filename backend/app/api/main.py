from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils, portfolio, watchlist, orders, risk_management, kyc, analytics, research
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(portfolio.router)
api_router.include_router(watchlist.router)
api_router.include_router(orders.router)
api_router.include_router(risk_management.router)
api_router.include_router(kyc.router)
api_router.include_router(analytics.router)
api_router.include_router(research.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
