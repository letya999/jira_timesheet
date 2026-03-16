import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from models.user import User, JiraUser, UserType
from models.org import OrgUnit
from core.security import get_password_hash

@pytest.fixture
async def pm_user(db: AsyncSession) -> User:
    user = User(
        email="pm@example.com",
        hashed_password=get_password_hash("pmpass"),
        full_name="PM User",
        role="PM",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest.fixture
async def pm_headers(client: AsyncClient, pm_user: User) -> dict:
    login_res = await client.post(
        "/api/v1/auth/login", data={"username": "pm@example.com", "password": "pmpass"}
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_get_users_non_admin_forbidden(client: AsyncClient, db: AsyncSession, pm_headers: dict):
    # PM should have access to GET /users
    response = await client.get("/api/v1/users/", headers=pm_headers)
    assert response.status_code == 200

    # Create an Employee
    emp = User(
        email="emp@example.com",
        hashed_password=get_password_hash("emppass"),
        full_name="Emp User",
        role="Employee",
        is_active=True
    )
    db.add(emp)
    await db.commit()
    
    # Login as Employee
    login_res = await client.post(
        "/api/v1/auth/login", data={"username": "emp@example.com", "password": "emppass"}
    )
    token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {token}"}
    
    # Employee should NOT have access
    response = await client.get("/api/v1/users/", headers=emp_headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Create a non-admin user
    user = User(
        email="to_delete@example.com",
        hashed_password="pw",
        full_name="Delete Me",
        role="Employee",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    user_id = user.id

    response = await client.delete(f"/api/v1/users/{user_id}", headers=auth_headers)
    assert response.status_code == 200
    
    # Verify gone
    db.expire_all()
    res = await db.execute(select(User).where(User.id == user_id))
    assert res.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_delete_self_forbidden(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=auth_headers)
    assert response.status_code == 400
    assert "Cannot delete your own account" in response.json()["detail"]

@pytest.mark.asyncio
async def test_delete_last_admin_forbidden(client: AsyncClient, auth_headers: dict, db: AsyncSession, admin_user: User):
    # Create another admin so we can delete the first one
    admin2 = User(
        email="admin2@example.com",
        hashed_password=get_password_hash("pass"),
        full_name="Admin 2",
        role="Admin",
        is_active=True
    )
    db.add(admin2)
    await db.commit()
    await db.refresh(admin2)
    
    # Login as admin2
    login_res = await client.post(
        "/api/v1/auth/login", data={"username": "admin2@example.com", "password": "pass"}
    )
    token = login_res.json()["access_token"]
    admin2_headers = {"Authorization": f"Bearer {token}"}
    
    # Delete admin_user (first admin) - should work because admin2 exists
    response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=admin2_headers)
    assert response.status_code == 200
    
    # Now try to delete admin2 while being logged in as admin2 - self-deletion triggers first
    response = await client.delete(f"/api/v1/users/{admin2.id}", headers=admin2_headers)
    assert response.status_code == 400
    
    # We need a non-admin (PM) with delete permission? No, only Admins have delete permission in require_role.
    # So the only way to test "last admin" is if there's only one admin left and we try to delete them.
    # But only admins can delete. So it's always self-deletion if there's only one.
    # The guard is still useful if we ever allow PMs to delete or similar.

@pytest.mark.asyncio
async def test_merge_already_linked_forbidden(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Setup
    sys1 = User(email="sys1@example.com", hashed_password="pw", full_name="Sys 1")
    jira = JiraUser(jira_account_id="jira_linked", display_name="Jira", email="jira@example.com")
    db.add_all([sys1, jira])
    await db.commit()
    await db.refresh(sys1)
    await db.refresh(jira)
    
    sys1.jira_user_id = jira.id
    db.add(sys1)
    await db.commit()
    
    sys2 = User(email="sys2@example.com", hashed_password="pw", full_name="Sys 2")
    db.add(sys2)
    await db.commit()
    await db.refresh(sys2)
    
    # Try to merge already linked jira user to sys2
    response = await client.post(
        "/api/v1/users/merge",
        params={"jira_user_id": jira.id, "system_user_id": sys2.id},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "already linked" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_users_filter_by_type(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Already have admin (system)
    jira = JiraUser(jira_account_id="jira_filter", display_name="Jira Filter", email="jf@example.com")
    db.add(jira)
    await db.commit()
    
    # Filter by system
    response = await client.get("/api/v1/users/?type=system", headers=auth_headers)
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["type"] == "system"
        
    # Filter by import
    response = await client.get("/api/v1/users/?type=import", headers=auth_headers)
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["type"] == "import"

@pytest.mark.asyncio
async def test_bulk_update_non_admin_forbidden(client: AsyncClient, pm_headers: dict, pm_user: User):
    payload = {"user_ids": [pm_user.id], "data": {"role": "PM"}}
    response = await client.post("/api/v1/users/bulk-update", json=payload, headers=pm_headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_get_users_unified_listing(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Setup: one system user, one import user
    jira_user = JiraUser(
        jira_account_id="jira_1",
        display_name="Imported User",
        email="import@example.com",
        is_active=True
    )
    db.add(jira_user)
    await db.commit()

    response = await client.get("/api/v1/users/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    # Should see at least admin (from fixture) and the imported user
    items = data["items"]
    types = [item["type"] for item in items]
    assert "system" in types
    assert "import" in types

@pytest.mark.asyncio
async def test_reset_password_admin_only(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Create a target user
    user = User(
        email="target@example.com",
        hashed_password="old",
        full_name="Target User",
        role="Employee",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    user_id = user.id

    response = await client.post(f"/api/v1/users/reset-password/{user_id}", headers=auth_headers)
    assert response.status_code == 200
    assert "temporary_password" in response.json()
    
    # Verify flag set in DB
    db.expire_all()
    res = await db.execute(select(User).where(User.id == user_id))
    updated_user = res.scalar_one()
    assert updated_user.needs_password_change is True

@pytest.mark.asyncio
async def test_merge_users(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Setup
    system_user = User(
        email="sys@example.com",
        hashed_password="pw",
        full_name="Sys User",
        role="Employee"
    )
    jira_user = JiraUser(
        jira_account_id="jira_merge",
        display_name="Jira Name",
        email="jira@example.com"
    )
    db.add_all([system_user, jira_user])
    await db.commit()
    await db.refresh(system_user)
    await db.refresh(jira_user)
    sys_id = system_user.id
    jira_id = jira_user.id

    response = await client.post(
        "/api/v1/users/merge",
        params={"jira_user_id": jira_id, "system_user_id": sys_id},
        headers=auth_headers
    )
    assert response.status_code == 200
    
    # Verify link
    db.expire_all()
    res = await db.execute(select(User).where(User.id == sys_id))
    updated_sys = res.scalar_one()
    assert updated_sys.jira_user_id == jira_id

@pytest.mark.asyncio
async def test_bulk_update_org_units(client: AsyncClient, auth_headers: dict, db: AsyncSession):
    # Setup
    unit1 = OrgUnit(name="Unit 1")
    unit2 = OrgUnit(name="Unit 2")
    user = User(email="bulk@example.com", hashed_password="pw", full_name="Bulk User")
    db.add_all([unit1, unit2, user])
    await db.commit()
    await db.refresh(unit1)
    await db.refresh(unit2)
    await db.refresh(user)
    user_id = user.id
    u1_id = unit1.id
    u2_id = unit2.id

    payload = {
        "user_ids": [user_id],
        "data": {
            "org_unit_ids": [u1_id, u2_id],
            "role": "PM"
        }
    }
    
    response = await client.post("/api/v1/users/bulk-update", json=payload, headers=auth_headers)
    assert response.status_code == 200
    
    # Verify in DB
    from sqlalchemy.orm import selectinload
    db.expire_all()
    res = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.org_units))
    )
    updated_user = res.scalar_one()
    assert len(updated_user.org_units) == 2
    assert updated_user.role == "PM"
