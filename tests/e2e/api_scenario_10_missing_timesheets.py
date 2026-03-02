from datetime import date, timedelta

import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_10_missing_timesheets(client: AsyncClient, db: AsyncSession):
    """Сценарий 10: Охота за прогульщиками"""
    admin = User(email="admin_sc10@ex.com", full_name="Admin", hashed_password=get_password_hash("pass"), role="Admin")
    db.add(admin)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "admin_sc10@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    start = date.today() - timedelta(days=7)
    end = start + timedelta(days=6)
    # team-periods возвращает периоды для сотрудников
    resp = await client.get(f"/api/v1/approvals/team-periods?start_date={start}&end_date={end}", headers=admin_headers)
    assert resp.status_code == 200
