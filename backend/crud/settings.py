from models.settings import SystemSettings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class CRUDSystemSettings:
    async def get(self, db: AsyncSession, key: str) -> SystemSettings | None:
        result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
        return result.scalar_one_or_none()

    async def set(self, db: AsyncSession, key: str, value: dict) -> SystemSettings:
        db_obj = await self.get(db, key)
        if db_obj:
            db_obj.value = value
        else:
            db_obj = SystemSettings(key=key, value=value)
            db.add(db_obj)
        await db.flush()
        return db_obj

system_settings = CRUDSystemSettings()
