from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils, portfolio, watchlist, orders, risk_management, kyc, analytics, research, market, alerts, news, subscription, dashboard
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
api_router.include_router(market.router)
api_router.include_router(alerts.router)
api_router.include_router(news.router)
api_router.include_router(subscription.router)
api_router.include_router(dashboard.router)


if settings.ENVIRONMENT == "local":
	api_router.include_router(private.router)
