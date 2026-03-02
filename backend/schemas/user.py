from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = "Jira User"
    role: str = "Employee"
    jira_user_id: int | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    needs_password_change: bool = False
    org_unit_id: int | None = None
    display_name: str | None = None

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

    model_config = ConfigDict(from_attributes=True)


class JiraUserUpdate(BaseModel):
    org_unit_id: int | None = None
    is_active: bool | None = None
    weekly_quota: int | None = None
