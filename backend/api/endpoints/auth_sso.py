import secrets
import string
from datetime import timedelta

from core.config import settings
from core.database import get_db
from core.security import get_password_hash
from crud.user import user as crud_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi_sso.sso.generic import create_provider
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

    # Check if user exists in local database
    user = await crud_user.get_by_email(db, email=user_info.email)

    if not user:
        # Auto-registration: Create new user if they don't exist
        # Generate a random password since it's required by the model but won't be used for SSO
        random_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
        user_in = UserCreate(
            email=user_info.email,
            full_name=user_info.display_name or user_info.email,
            password=random_password,
            role="Employee",  # Default role
        )
        # We need to hash it manually because CRUD might expect it or we use a helper
        # Looking at schemas, UserCreate has password: str
        # Let's see how crud_user.create works (inherited from CRUDBase)
        user_data = user_in.model_dump()
        password = user_data.pop("password")
        user_data["hashed_password"] = get_password_hash(password)

        db_obj = User(**user_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        user = db_obj

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Generate JWT access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )

    # For development/simplicity, we return the token in JSON.
    # In a real enterprise app, you might want to redirect back to frontend with the token.
    return {"access_token": access_token, "token_type": "bearer"}
