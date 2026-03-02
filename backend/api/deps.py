import jwt
from core.config import settings
from core.context import user_id_ctx
from core.database import get_db
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from models import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except InvalidTokenError as err:
        raise credentials_exception from err

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    user_id_ctx.set(user.id)
    return user


def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted")
        return current_user

    return role_checker
