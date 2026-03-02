import os
import sys
from collections.abc import AsyncGenerator

import pytest
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add backend to sys.path so we can import from it
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app
from models import User
from models.base import Base
from core.database import get_db
from core.security import get_password_hash

# Increase rate limit for tests
os.environ["RATE_LIMIT_MAX_REQUESTS"] = "10000"

# Use a file-based SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./test_e2e.db"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True, scope="function")
async def setup_cache():
    FastAPICache.init(InMemoryBackend(), prefix="test-cache")
    yield


@pytest.fixture(autouse=True, scope="function")
async def setup_db():
    """Ensure tables are created for every test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db(setup_db) -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function")
async def admin_user(db: AsyncSession) -> User:
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == "testadmin@example.com"))
    admin = result.scalar_one_or_none()
    if not admin:
        admin = User(
            email="testadmin@example.com",
            hashed_password=get_password_hash("testpass"),
            full_name="Test Admin",
            role="Admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
    return admin


@pytest.fixture(scope="function")
async def auth_headers(client: AsyncClient, admin_user: User) -> dict:
    login_res = await client.post(
        "/api/v1/auth/login", data={"username": "testadmin@example.com", "password": "testpass"}
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
