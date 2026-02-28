from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from crud.base import CRUDBase
from models.category import WorklogCategory
from pydantic import BaseModel

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class CRUDCategory(CRUDBase[WorklogCategory, CategoryCreate, CategoryUpdate]):
    async def get_active(self, db: AsyncSession) -> List[WorklogCategory]:
        result = await db.execute(select(WorklogCategory).where(WorklogCategory.is_active == True))
        return result.scalars().all()

category = CRUDCategory(WorklogCategory)
