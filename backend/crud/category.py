
from models.category import WorklogCategory
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase


class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None

class CRUDCategory(CRUDBase[WorklogCategory, CategoryCreate, CategoryUpdate]):
    async def get_active(self, db: AsyncSession) -> list[WorklogCategory]:
        result = await db.execute(select(WorklogCategory).where(WorklogCategory.is_active))
        return result.scalars().all()

category = CRUDCategory(WorklogCategory)
