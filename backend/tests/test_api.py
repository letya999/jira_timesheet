import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, admin_user):
    response = await client.post("/api/v1/auth/login", data={"username": "testadmin@example.com", "password": "testpass"})
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", data={"username": "wrong@example.com", "password": "pass"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_projects_auth(client: AsyncClient, auth_headers: dict):
    # Get projects
    response = await client.get("/api/v1/projects/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)
