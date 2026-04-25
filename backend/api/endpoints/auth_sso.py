import secrets
import string
from datetime import timedelta
from urllib.parse import urlencode

from core.config import settings
from core.database import get_db
from core.security import get_password_hash
from crud.user import user as crud_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi_sso.sso.generic import create_provider
from fastapi_sso.sso.google import GoogleSSO
from models.user import User
from schemas.user import UserCreate
from services.auth import auth_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# Initialize Generic OIDC Provider if configured
sso_provider = None
if settings.AUTHENTIK_OIDC_URL and settings.AUTHENTIK_CLIENT_ID:
    AuthentikSSO = create_provider(
        name="authentik",
        discovery_url=settings.AUTHENTIK_OIDC_URL,
    )
    sso_provider = AuthentikSSO(
        client_id=settings.AUTHENTIK_CLIENT_ID,
        client_secret=settings.AUTHENTIK_CLIENT_SECRET,
        redirect_uri=settings.AUTHENTIK_REDIRECT_URI,
        allow_insecure_http=True,  # Set to False in production
    )

# Initialize Google OAuth provider if configured (independent from Authentik)
google_sso_provider = None
if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.GOOGLE_REDIRECT_URI:
    google_sso_provider = GoogleSSO(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        allow_insecure_http=True,  # Set to False in production
    )


async def _get_or_create_local_user(db: AsyncSession, email: str, display_name: str | None) -> User:
    user = await crud_user.get_by_email(db, email=email)
    if user:
        return user

    random_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    user_in = UserCreate(
        email=email,
        full_name=display_name or email,
        password=random_password,
        role="Employee",
    )
    user_data = user_in.model_dump()
    password = user_data.pop("password")
    user_data["hashed_password"] = get_password_hash(password)

    db_obj = User(**user_data)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def _get_existing_local_user(db: AsyncSession, email: str) -> User | None:
    return await crud_user.get_by_email(db, email=email)


def _build_access_token(user: User) -> str:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return auth_service.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )


@router.get("/login")
async def sso_login():
    """Redirect to Authentik OIDC login page."""
    if not sso_provider:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="SSO is not configured on this server.",
        )
    async with sso_provider:
        return await sso_provider.get_login_redirect()


@router.get("/callback")
async def sso_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle OIDC callback and authenticate/register user."""
    if not sso_provider:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="SSO is not configured on this server.",
        )

    async with sso_provider:
        try:
            user_info = await sso_provider.verify_and_process(request)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"SSO authentication failed: {str(e)}",
            ) from e

    if not user_info or not user_info.email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to retrieve user email from SSO provider.",
        )

    user = await _get_or_create_local_user(db, user_info.email, user_info.display_name)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = _build_access_token(user)

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/google/login")
async def google_sso_login(next: str | None = None):
    """Redirect to Google OAuth login page."""
    if not google_sso_provider:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server.",
        )
    async with google_sso_provider:
        state = next if next and next.startswith("/") else None
        return await google_sso_provider.get_login_redirect(params={"prompt": "select_account"}, state=state)


@router.get("/google/callback")
async def google_sso_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback and authenticate/register user."""
    if not google_sso_provider:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server.",
        )

    async with google_sso_provider:
        try:
            user_info = await google_sso_provider.verify_and_process(request)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google OAuth authentication failed: {str(e)}",
            ) from e

    if not user_info or not user_info.email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to retrieve user email from Google OAuth provider.",
        )

    user = await _get_existing_local_user(db, user_info.email)
    if not user:
        if settings.GOOGLE_AUTO_PROVISION_USERS:
            user = await _get_or_create_local_user(db, user_info.email, user_info.display_name)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not provisioned. Contact administrator.",
            )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = _build_access_token(user)

    # Optional browser redirect flow for web login screens.
    if settings.GOOGLE_LOGIN_SUCCESS_REDIRECT:
        callback_state = request.query_params.get("state")
        next_path = callback_state if callback_state and callback_state.startswith("/") else "/app/dashboard"
        qs = urlencode({"token": access_token, "next": next_path})
        return RedirectResponse(url=f"{settings.GOOGLE_LOGIN_SUCCESS_REDIRECT}?{qs}", status_code=303)

    return {"access_token": access_token, "token_type": "bearer"}
