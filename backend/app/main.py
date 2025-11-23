from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from sqlalchemy.orm import configure_mappers
from starlette.middleware.cors import CORSMiddleware

import app.model as _models  # noqa: F401 - ensure all models are imported and mappers registered
# Import models to ensure they are initialized before any routers
from app.api.main import api_router
from app.core.config import settings

configure_mappers()


def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    # Application initialization can go here
    yield
    # Shutdown code can go here


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Set all CORS enabled origins
# In local environment, use regex pattern to allow any origin (localhost, IP addresses, etc.)
# This allows accessing frontend from different machines via IP while maintaining credentials
if settings.ENVIRONMENT == "local":
    # Allow any origin matching common local development patterns
    # This includes localhost, 127.0.0.1, and any IP address
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
elif settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)
