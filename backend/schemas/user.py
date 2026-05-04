from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserType(str, Enum):
    SYSTEM = "system"
    IMPORT = "import"


class BulkUpdateData(BaseModel):
    role: str | None = None
    org_unit_ids: list[int] | None = None
    is_active: bool | None = None


class BulkUpdatePayload(BaseModel):
    user_ids: list[int] = Field(..., min_length=1)
    data: BulkUpdateData


class PromoteBulkPayload(BaseModel):
    user_ids: list[int] = Field(..., min_length=1)


class PromoteUserPayload(BaseModel):
    email_override: EmailStr | None = None
    full_name_override: str | None = None


class SystemUserCreatePayload(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "Employee"
    timezone: str = "UTC"
    password: str | None = None
    jira_user_id: int | None = None
    org_unit_ids: list[int] | None = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = "Jira User"
    role: str = "Employee"
    jira_user_id: int | None = None
    timezone: str = "UTC"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    timezone: str | None = None
    org_unit_ids: list[int] | None = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    needs_password_change: bool = False
    org_unit_id: int | None = None
    org_unit_ids: list[int] = []
    display_name: str | None = None
    timezone: str
    type: UserType = UserType.SYSTEM

    model_config = ConfigDict(from_attributes=True)


class UserPromoteResponse(UserResponse):
    temporary_password: str


class PasswordChangeRequest(BaseModel):
    new_password: str


class JiraUserResponse(BaseModel):
    id: int
    jira_account_id: str
    display_name: str
    email: EmailStr | None = None
    avatar_url: str | None = None
    is_active: bool
    weekly_quota: int
    org_unit_id: int | None = None
    user_id: int | None = None
    type: UserType = UserType.IMPORT

    model_config = ConfigDict(from_attributes=True)


class JiraUserUpdate(BaseModel):
    org_unit_id: int | None = None
    is_active: bool | None = None
    weekly_quota: int | None = None
