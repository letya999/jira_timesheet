import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_password_hash
from models.user import User

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, admin_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent@example.com", "password": "testpass"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db: AsyncSession):
    inactive_user = User(
        email="inactive@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Inactive User",
        role="Employee",
        is_active=False,
    )
    db.add(inactive_user)
    await db.commit()
    
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "inactive@example.com", "password": "testpass"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testadmin@example.com"

@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, db: AsyncSession, admin_user: User, auth_headers: dict):
    response = await client.post(
        "/api/v1/users/change-password",
        json={"new_password": "newpassword123"},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Try login with new password
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "newpassword123"}
    )
    assert login_res.status_code == 200

@pytest.mark.asyncio
async def test_needs_password_change_flag(client: AsyncClient, db: AsyncSession):
    # Create user with needs_password_change=True
    user = User(
        email="needchange@example.com",
        hashed_password=get_password_hash("testpass"),
        full_name="Need Change",
        role="Employee",
        is_active=True,
        needs_password_change=True
    )
    db.add(user)
    await db.commit()
    
    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        data={"username": "needchange@example.com", "password": "testpass"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    
    # Get me and check flag
    me_res = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["needs_password_change"] is True

@pytest.mark.asyncio
async def test_token_structure(client: AsyncClient, admin_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@example.com", "password": "testpass"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # Basic JWT structure check (3 parts)
    assert len(data["access_token"].split(".")) == 3
