from datetime import datetime, timedelta

import jwt
from core.config import settings
from core.security import verify_password
from crud.user import user as crud_user
from models.user import User
from sqlalchemy.ext.asyncio import AsyncSession


class AuthService:
    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> User | None:
        user = await crud_user.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

auth_service = AuthService()
