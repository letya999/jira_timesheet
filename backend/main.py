from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from core.middleware import setup_middlewares, setup_exception_handlers
from api.router import api_router

app = FastAPI(
    title="Jira Timesheet API",
    description="Enterprise Backend API for Resource & Time Management Service with Jira Integration.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json"
)

# Apply middlewares and exception handlers
setup_middlewares(app)
setup_exception_handlers(app)

# Include API routers with /api/v1 prefix
app.include_router(api_router, prefix="/api/v1")

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
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/health", tags=["System"])
async def health_check():
    """Returns the health status of the API."""
    return {"status": "ok"}