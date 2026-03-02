from api.router import api_router
from core.config import settings
from core.logging_config import setup_logging
from core.middleware import setup_exception_handlers, setup_middlewares
from core.worker import queue
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from saq.web.starlette import saq_web

app = FastAPI(
    title="Jira Timesheet API",
    description="Enterprise Backend API for Resource & Time Management Service with Jira Integration.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
)

# Setup Structured Logging
setup_logging()

# Apply middlewares and exception handlers
setup_middlewares(app)
setup_exception_handlers(app)

# Include API routers with /api/v1 prefix
app.include_router(api_router, prefix="/api/v1")

# Mount SAQ Web UI
app.mount("/saq", saq_web("/saq", [queue]))


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Jira Timesheet Enterprise API",
        version="1.0.0",
        description="Premium API for Jira Resource Management",
        routes=app.routes,
    )
    # Add custom extension or logo if needed
    openapi_schema["info"]["x-logo"] = {"url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"}
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.on_event("startup")
async def startup():
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")


@app.get("/health", tags=["System"])
async def health_check():
    """Returns the health status of the API."""
    return {"status": "ok"}
