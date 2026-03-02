import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from models import User
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_scenario_13_employee_history(client: AsyncClient, db: AsyncSession):
    """Сценарий 13: Сотрудник видит историю отклонений отпуска"""
    emp = User(email="emp_sc13@ex.com", full_name="Emp 13", hashed_password=get_password_hash("pass"))
    admin = User(email="admin_sc13@ex.com", full_name="Admin 13", hashed_password=get_password_hash("pass"), role="Admin")
    db.add_all([emp, admin])
    await db.commit()

    login_res = await client.post("/api/v1/auth/login", data={"username": "emp_sc13@ex.com", "password": "pass"})
    emp_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    
    login_res_admin = await client.post("/api/v1/auth/login", data={"username": "admin_sc13@ex.com", "password": "pass"})
    admin_headers = {"Authorization": f"Bearer {login_res_admin.json()['access_token']}"}

    # Создаем отпуск
    payload = {"type": "VACATION", "start_date": "2026-10-01", "end_date": "2026-10-05", "reason": "Test"}
    resp = await client.post("/api/v1/leaves/", json=payload, headers=emp_headers)
    assert resp.status_code == 200
    leave_id = resp.json()["id"]

    # Отклоняем
    resp = await client.patch(f"/api/v1/leaves/{leave_id}", json={"status": "REJECTED", "comment": "Too busy"}, headers=admin_headers)
    assert resp.status_code == 200

    # Сотрудник читает
    resp = await client.get("/api/v1/leaves/my", headers=emp_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["status"] == "REJECTED"
    assert data[0]["comment"] == "Too busy"
