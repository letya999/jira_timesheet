from fastapi import APIRouter

from api.endpoints import (
    approvals,
    auth,
    calendar,
    leave,
    notifications,
    org,
    projects,
    reports,
    slack,
    sync,
    timesheet,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["User Management"])
api_router.include_router(org.router, prefix="/org", tags=["Organization Structure"])
api_router.include_router(timesheet.router, prefix="/timesheet", tags=["Timesheet Operations"])
api_router.include_router(reports.router, prefix="/reports", tags=["Analytics & Reports"])
api_router.include_router(sync.router, prefix="/sync", tags=["Jira Synchronization"])
api_router.include_router(projects.router, prefix="/projects", tags=["Project Management"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["Calendar & Holidays"])
api_router.include_router(leave.router, prefix="/leaves", tags=["Leave & Vacations"])
api_router.include_router(slack.router, prefix="/slack", tags=["Slack Integration"])
