from typing import Any

from models.user import JiraUser, User
from schemas.user import UserCreate, UserUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

user = CRUDUser(User)

class CRUDJiraUser(CRUDBase[JiraUser, Any, Any]): # We can use schemas if they fit
    async def get_by_jira_id(self, db: AsyncSession, *, jira_id: str) -> JiraUser | None:
        result = await db.execute(select(JiraUser).where(JiraUser.jira_account_id == jira_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, *, email: str) -> JiraUser | None:
        result = await db.execute(select(JiraUser).where(JiraUser.email == email))
        return result.scalar_one_or_none()

jira_user = CRUDJiraUser(JiraUser)
