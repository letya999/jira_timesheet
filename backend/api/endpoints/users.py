from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from core.database import get_db
from models import User
from schemas.user import UserCreate, UserResponse
from core.security import get_password_hash
from api.deps import require_role

router = APIRouter()

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(require_role(["Admin", "CEO", "PM"]))])
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

@router.post("/", response_model=UserResponse, dependencies=[Depends(require_role(["Admin"]))])
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
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
