from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload, joinedload
from api import deps
from schemas.user import UserResponse
from schemas.pagination import PaginatedResponse
from core.database import get_db
from models.user import User, JiraUser
from services.jira import sync_jira_users_to_db
import math

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin", "PM", "CEO"])),
    page: int = 1,
    size: int = 50
):
    """Fetch all system users with pagination."""
    query = select(User).options(joinedload(User.jira_user))
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Fetch items
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    users = result.scalars().all()
    
    pages = math.ceil(total / size) if size > 0 else 1
    
    # Map to response with jira data
    resp_items = []
    for u in users:
        resp_items.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "jira_user_id": u.jira_user_id,
            "team_id": u.jira_user.team_id if u.jira_user else None,
            "display_name": u.jira_user.display_name if u.jira_user else u.full_name
        })
    
    return {
        "items": resp_items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(deps.get_current_user), db: AsyncSession = Depends(get_db)):
    """Fetch current logged in user profile with jira info."""
    # Ensure jira_user is loaded
    result = await db.execute(
        select(User).where(User.id == current_user.id).options(joinedload(User.jira_user))
    )
    u = result.scalar_one()
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_active": u.is_active,
        "jira_user_id": u.jira_user_id,
        "team_id": u.jira_user.team_id if u.jira_user else None,
        "display_name": u.jira_user.display_name if u.jira_user else u.full_name
    }

@router.post("/sync")
async def sync_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin"]))
):
    """Sync users from Jira."""
    count = await sync_jira_users_to_db(db)
    return {"status": "success", "synced": count, "message": f"Successfully synced {count} users from Jira"}
