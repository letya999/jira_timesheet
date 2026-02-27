from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func

from core.database import get_db
from models import User
from schemas.user import UserCreate, UserUpdate, UserResponse
from schemas.pagination import PaginatedResponse
from core.security import get_password_hash
from api.deps import require_role, get_current_user

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_my_user(current_user: Annotated[User, Depends(get_current_user)]):
    """Get currently logged in user."""
    return current_user

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
        
    # user_in.jira_account_id might be provided as account_id string, 
    # we need to find the local JiraUser.id
    jira_user_id = None
    if getattr(user_in, "jira_account_id", None):
        from models import JiraUser
        res = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == user_in.jira_account_id))
        jira_user = res.scalar_one_or_none()
        if jira_user:
            jira_user_id = jira_user.id

    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        jira_user_id=jira_user_id,
        role=user_in.role,
        weekly_quota=user_in.weekly_quota,
        team_id=user_in.team_id
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role(["Admin"]))])
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    db_user = await db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
        
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_role(["Admin"]))])
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    db_user = await db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(db_user)
    await db.commit()
    return None
