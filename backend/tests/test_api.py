import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from models.base import Base
from core.database import get_db
from core.security import get_password_hash
from models import User, Department, Team

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test admin user
    async with TestingSessionLocal() as session:
        admin = User(
            email="testadmin@example.com",
            hashed_password=get_password_hash("testpass"),
            full_name="Test Admin",
            role="Admin"
        )
        session.add(admin)
        await session.commit()
        
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_login_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/auth/login", data={"username": "testadmin@example.com", "password": "testpass"})
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_login_failure():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/auth/login", data={"username": "wrong@example.com", "password": "pass"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_create_department_as_admin():
    # Login to get token
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/auth/login", data={"username": "testadmin@example.com", "password": "testpass"})
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create department
        response = await ac.post("/org/departments", json={"name": "Engineering"}, headers=headers)
    
    assert response.status_code == 200
    assert response.json()["name"] == "Engineering"

@pytest.mark.asyncio
async def test_get_departments():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/org/departments")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
