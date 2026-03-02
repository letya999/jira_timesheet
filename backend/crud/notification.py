from models.notification import Notification
from schemas.notification import NotificationCreate, NotificationUpdate
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from crud.base import CRUDBase


class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    async def get_multi_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> list[Notification]:
        result = await db.execute(
            select(self.model)
            .where(self.model.user_id == user_id)
            .order_by(desc(self.model.created_at))
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_unread_count(self, db: AsyncSession, *, user_id: int) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(self.model)
            .where(self.model.user_id == user_id)
            .where(not self.model.is_read)
        )
        return result.scalar_one()

    async def mark_all_as_read(self, db: AsyncSession, *, user_id: int) -> int:
        from sqlalchemy import update

        result = await db.execute(
            update(self.model).where(self.model.user_id == user_id).where(not self.model.is_read).values(is_read=True)
        )
        # Assuming commit happens elsewhere or we commit here
        await db.commit()
        return result.rowcount


notification = CRUDNotification(Notification)
