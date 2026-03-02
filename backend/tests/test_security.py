import time
from unittest.mock import patch

import pytest
from core.middleware import AdvancedMiddleware
from core.security import create_access_token, get_password_hash, verify_password
from fastapi import FastAPI


def test_password_hashing():
    pw = "secret"
    h = get_password_hash(pw)
    assert verify_password(pw, h) is True
    assert verify_password("wrong", h) is False

def test_create_access_token():
    data = {"sub": "test@ex.com"}
    token = create_access_token(data)
    assert token is not None

@pytest.mark.asyncio
async def test_rate_limit_middleware():
    app = FastAPI()
    app.add_middleware(AdvancedMiddleware)

    @app.get("/")
    async def root():
        return {"ok": True}

    from collections import defaultdict

    from httpx import ASGITransport, AsyncClient
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch("core.middleware.RATE_LIMIT_MAX_REQUESTS", 2), \
             patch("core.middleware.request_counts", defaultdict(lambda: {"count": 0, "reset_time": time.time() + 60})):

            resp = await ac.get("/")
            assert resp.status_code == 200

            resp = await ac.get("/")
            assert resp.status_code == 200

            # 3rd request should fail
            resp = await ac.get("/")
            assert resp.status_code == 429
