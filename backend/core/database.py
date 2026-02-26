"""
Database configuration and session management using SQLAlchemy 2.0 Async.
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from core.config import settings

# Create async engine with URL from settings
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Reusable session factory
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    """
    Dependency for FastAPI endpoints to provide an async database session.
    Automatically closes the session after the request is finished.
    """
    async with async_session() as session:
        yield session