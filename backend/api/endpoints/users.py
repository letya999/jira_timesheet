import math
import secrets
import string

from core.database import get_db
from core.security import get_password_hash
from fastapi import APIRouter, Depends, HTTPException
from models.user import JiraUser, User
from schemas.pagination import PaginatedResponse
from schemas.user import PasswordChangeRequest, UserPromoteResponse, UserResponse
from services.jira import sync_jira_users_to_db
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from api import deps

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
            "needs_password_change": u.needs_password_change,
            "jira_user_id": u.jira_user_id,
            "org_unit_id": u.jira_user.org_unit_id if u.jira_user else None,
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
        "needs_password_change": u.needs_password_change,
        "jira_user_id": u.jira_user_id,
        "org_unit_id": u.jira_user.org_unit_id if u.jira_user else None,
        "display_name": u.jira_user.display_name if u.jira_user else u.full_name
    }

@router.post("/promote/{jira_user_id}", response_model=UserPromoteResponse)
async def promote_to_system_user(
    jira_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin"]))
):
    """Convert a Jira employee into a system user with a random password."""
    # Check if JiraUser exists
    result = await db.execute(select(JiraUser).where(JiraUser.id == jira_user_id))
    jira_user = result.scalar_one_or_none()
    if not jira_user:
        raise HTTPException(status_code=404, detail="Jira user not found")

    # Check if already has system user
    result = await db.execute(select(User).where(User.jira_user_id == jira_user_id))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already has system access")

    # Generate random password
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for i in range(10))

    new_user = User(
        email=jira_user.email if jira_user.email else f"user_{jira_user_id}@local.internal",
        hashed_password=get_password_hash(temp_password),
        full_name=jira_user.display_name,
        role="Employee",
        is_active=True,
        needs_password_change=True,
        jira_user_id=jira_user_id
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "id": new_user.id,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "needs_password_change": new_user.needs_password_change,
        "jira_user_id": new_user.jira_user_id,
        "org_unit_id": jira_user.org_unit_id,
        "display_name": jira_user.display_name,
        "temporary_password": temp_password
    }

@router.post("/change-password")
async def change_password(
    payload: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Change current user password and clear needs_password_change flag."""
    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.needs_password_change = False

    db.add(current_user)
    await db.commit()

    return {"status": "success", "message": "Password changed successfully"}

@router.post("/sync")
async def sync_users(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.require_role(["Admin"]))
):
    """Sync users from Jira."""
    count = await sync_jira_users_to_db(db)
    return {"status": "success", "synced": count, "message": f"Successfully synced {count} users from Jira"}
