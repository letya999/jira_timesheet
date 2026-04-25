from types import SimpleNamespace
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from api.endpoints import auth_sso
from core.config import settings
from core.security import get_password_hash
from fastapi.responses import RedirectResponse
from httpx import AsyncClient
from models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class DummyGoogleProvider:
    def __init__(self, user_info: SimpleNamespace | None = None):
        self.user_info = user_info or SimpleNamespace(email="google.user@example.com", display_name="Google User")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get_login_redirect(self, params=None, state=None):
        query = {}
        if params and params.get("prompt"):
            query["prompt"] = params["prompt"]
        if state:
            query["state"] = state
        suffix = f"?{urlencode(query)}" if query else ""
        return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth{suffix}", status_code=303)

    async def verify_and_process(self, request):
        return self.user_info


@pytest.mark.asyncio
async def test_google_sso_login_redirect_with_local_state(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(auth_sso, "google_sso_provider", DummyGoogleProvider())

    response = await client.get("/api/v1/auth/sso/google/login?next=/app/reports")
    assert response.status_code == 303

    location = response.headers["location"]
    parsed = urlparse(location)
    params = parse_qs(parsed.query)
    assert parsed.netloc == "accounts.google.com"
    assert params.get("prompt") == ["select_account"]
    assert params.get("state") == ["/app/reports"]


@pytest.mark.asyncio
async def test_google_sso_login_rejects_non_local_state(client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(auth_sso, "google_sso_provider", DummyGoogleProvider())

    response = await client.get("/api/v1/auth/sso/google/login?next=https://evil.example")
    assert response.status_code == 303

    location = response.headers["location"]
    params = parse_qs(urlparse(location).query)
    assert params.get("prompt") == ["select_account"]
    assert "state" not in params


@pytest.mark.asyncio
async def test_google_sso_callback_rejects_unknown_user_when_autoprovision_disabled(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    email = "new.google.user@example.com"
    monkeypatch.setattr(
        auth_sso,
        "google_sso_provider",
        DummyGoogleProvider(user_info=SimpleNamespace(email=email, display_name="New Google User")),
    )
    monkeypatch.setattr(settings, "GOOGLE_LOGIN_SUCCESS_REDIRECT", None)
    monkeypatch.setattr(settings, "GOOGLE_AUTO_PROVISION_USERS", False)

    response = await client.get("/api/v1/auth/sso/google/callback?code=dummy")
    assert response.status_code == 403
    assert response.json()["detail"] == "User is not provisioned. Contact administrator."

    created = await db.execute(select(User).where(User.email == email))
    assert created.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_google_sso_callback_existing_user_returns_token(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    email = "existing.google.user@example.com"
    existing = User(
        email=email,
        hashed_password=get_password_hash("unused"),
        full_name="Existing Google User",
        role="Employee",
        is_active=True,
    )
    db.add(existing)
    await db.commit()

    monkeypatch.setattr(
        auth_sso,
        "google_sso_provider",
        DummyGoogleProvider(user_info=SimpleNamespace(email=email, display_name="Existing Google User")),
    )
    monkeypatch.setattr(settings, "GOOGLE_LOGIN_SUCCESS_REDIRECT", None)
    monkeypatch.setattr(settings, "GOOGLE_AUTO_PROVISION_USERS", False)

    response = await client.get("/api/v1/auth/sso/google/callback?code=dummy")
    assert response.status_code == 200
    body = response.json()
    assert body.get("access_token")
    assert body.get("token_type") == "bearer"


@pytest.mark.asyncio
async def test_google_sso_callback_redirects_with_token_when_configured(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    email = "redirect.google.user@example.com"
    existing = User(
        email=email,
        hashed_password=get_password_hash("unused"),
        full_name="Redirect User",
        role="Employee",
        is_active=True,
    )
    db.add(existing)
    await db.commit()

    monkeypatch.setattr(settings, "GOOGLE_LOGIN_SUCCESS_REDIRECT", "http://localhost:8501/login")
    monkeypatch.setattr(settings, "GOOGLE_AUTO_PROVISION_USERS", False)
    monkeypatch.setattr(
        auth_sso,
        "google_sso_provider",
        DummyGoogleProvider(user_info=SimpleNamespace(email=email, display_name="Redirect User")),
    )

    response = await client.get("/api/v1/auth/sso/google/callback?code=dummy&state=/app/dashboard")
    assert response.status_code == 303

    location = response.headers["location"]
    parsed = urlparse(location)
    params = parse_qs(parsed.query)
    assert parsed.scheme == "http"
    assert parsed.netloc == "localhost:8501"
    assert parsed.path == "/login"
    assert params.get("next") == ["/app/dashboard"]
    assert params.get("token")


@pytest.mark.asyncio
async def test_google_sso_callback_inactive_user_forbidden(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    inactive_email = "inactive.google@example.com"
    inactive = User(
        email=inactive_email,
        hashed_password=get_password_hash("unused"),
        full_name="Inactive User",
        role="Employee",
        is_active=False,
    )
    db.add(inactive)
    await db.commit()

    monkeypatch.setattr(
        auth_sso,
        "google_sso_provider",
        DummyGoogleProvider(user_info=SimpleNamespace(email=inactive_email, display_name="Inactive User")),
    )
    monkeypatch.setattr(settings, "GOOGLE_LOGIN_SUCCESS_REDIRECT", None)

    response = await client.get("/api/v1/auth/sso/google/callback?code=dummy")
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"
