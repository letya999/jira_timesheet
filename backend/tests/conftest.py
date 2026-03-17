import os
import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import Request, Response
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from httpx import AsyncClient, ASGITransport
from redis import asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Patch RateLimiter.__call__ to skip limiting unless explicitly enabled
_original_limiter_call = RateLimiter.__call__

async def patched_limiter_call(self, request: Request, response: Response):
    if os.getenv("TEST_RATE_LIMITING"):
        return await _original_limiter_call(self, request, response)
    return

RateLimiter.__call__ = patched_limiter_call

from core.database import get_db
from core.security import get_password_hash
from main import app
from models import Base
from models.user import User

# Increase rate limit for tests
os.environ["RATE_LIMIT_MAX_REQUESTS"] = "10000"

@pytest.fixture(autouse=True, scope="function")
async def setup_limiter():
    redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    try:
        redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        await FastAPILimiter.init(redis)
        yield
        await FastAPILimiter.close()
    except Exception:
        yield


@pytest.fixture(autouse=True, scope="function")
async def setup_cache():
    FastAPICache.init(InMemoryBackend(), prefix="test-cache")
    yield


@pytest.fixture(scope="function")
async def test_engine():
    """Create a unique database for each test to ensure perfect isolation."""
    db_file = f"test_{uuid.uuid4().hex}.db"
    url = f"sqlite+aiosqlite:///./{db_file}"
    engine = create_async_engine(url, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass


@pytest.fixture(scope="function")
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest.fixture(autouse=True)
async def override_get_db_fixture(test_engine):
    session_factory = async_sessionmaker(autocommit=False, autoflush=False, bind=test_engine, expire_on_commit=False)
    
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session
            
    app.dependency_overrides[get_db] = _override_get_db
    yield
    del app.dependency_overrides[get_db]


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="function")
async def admin_user(db: AsyncSession) -> User:
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
    if login_res.status_code != 200:
        raise Exception(f"Login failed: {login_res.status_code} {login_res.text}")
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
async def pm_user(db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.email == "testpm@example.com"))
    pm = result.scalar_one_or_none()
    if not pm:
        pm = User(
            email="testpm@example.com",
            hashed_password=get_password_hash("testpass"),
            full_name="Test PM",
            role="PM",
            is_active=True,
        )
        db.add(pm)
        await db.commit()
        await db.refresh(pm)
    return pm


@pytest.fixture(scope="function")
async def pm_headers(client: AsyncClient, pm_user: User) -> dict:
    login_res = await client.post(
        "/api/v1/auth/login", data={"username": "testpm@example.com", "password": "testpass"}
    )
    if login_res.status_code != 200:
        raise Exception(f"Login failed: {login_res.status_code} {login_res.text}")
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
