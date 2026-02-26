"""
Main entry point for the Jira Timesheet API.
Handles application factory, middleware configuration, and router registration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.middleware import global_exception_handler
from api.endpoints import auth, org, timesheet, users, reports, sync

app = FastAPI(
    title="Jira Timesheet API",
    description="Backend API for Resource & Time Management Service with Jira Integration.",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register global error handler
app.add_exception_handler(Exception, global_exception_handler)

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["User Management"])
app.include_router(org.router, prefix="/org", tags=["Organization Structure"])
app.include_router(timesheet.router, prefix="/timesheet", tags=["Timesheet Operations"])
app.include_router(reports.router, prefix="/reports", tags=["Analytics & Reports"])
app.include_router(sync.router, prefix="/jira", tags=["Jira Synchronization"])

@app.get("/health", tags=["System"])
async def health_check():
    """Returns the health status of the API."""
    return {"status": "ok"}