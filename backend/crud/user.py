from typing import Optional, List, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from crud.base import CRUDBase
from models.user import User, JiraUser
from schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

user = CRUDUser(User)

class CRUDJiraUser(CRUDBase[JiraUser, Any, Any]): # We can use schemas if they fit
    async def get_by_jira_id(self, db: AsyncSession, *, jira_id: str) -> Optional[JiraUser]:
        result = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == jira_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[JiraUser]:
        result = await db.execute(select(JiraUser).where(JiraUser.email == email))
        return result.scalar_one_or_none()

jira_user = CRUDJiraUser(JiraUser)
