import pytest
from core.security import get_password_hash
from httpx import AsyncClient
from models import User
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_scenario_03_vacation_season(client: AsyncClient, db: AsyncSession):
    """Сценарий 3: Сезон отпусков (наложение исключено)"""
    emp = User(email="emp_vac@ex.com", full_name="Emp Vac", hashed_password=get_password_hash("pass"))
    db.add(emp)
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_vac@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Подача нескольких отпусков в разные даты (чтобы избежать 400 Overlap)
    dates = [
        ("2026-08-01", "2026-08-05"),
        ("2026-08-10", "2026-08-15"),
        ("2026-08-20", "2026-08-25"),
    ]
    for start, end in dates:
        payload = {"type": "VACATION", "start_date": start, "end_date": end, "reason": "Summer"}
        resp = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
        assert resp.status_code == 200

    resp = await client.get("/api/v1/leaves/my", headers=emp_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3
