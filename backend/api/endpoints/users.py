from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func

from core.database import get_db
from models import User
from schemas.user import UserCreate, UserResponse
from schemas.pagination import PaginatedResponse
from core.security import get_password_hash
from api.deps import require_role

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[UserResponse], dependencies=[Depends(require_role(["Admin", "CEO", "PM"]))])
async def get_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 50
):
    skip = (page - 1) * size
    
    # Get total count
    count_stmt = select(func.count()).select_from(User)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()
    
    # Get items
    stmt = select(User).offset(skip).limit(size)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    pages = (total + size - 1) // size
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.post("/sync", dependencies=[Depends(require_role(["Admin"]))])
async def sync_users(db: Annotated[AsyncSession, Depends(get_db)]):
    """Fetch users from Jira and sync with local DB."""
    from services.jira import sync_jira_users_to_db
    count = await sync_jira_users_to_db(db)
    return {"status": "success", "synced": count}

@router.post("/", response_model=UserResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_user(
    user_in: UserCreate, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        jira_account_id=user_in.jira_account_id,
        role=user_in.role,
        weekly_quota=user_in.weekly_quota,
        team_id=user_in.team_id
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
