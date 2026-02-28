from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Jira User"
    role: str = "Employee"
    jira_user_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    team_id: Optional[int] = None
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JiraUserResponse(BaseModel):
    id: int
    jira_account_id: str
    display_name: str
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    is_active: bool
    weekly_quota: int
    team_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class JiraUserUpdate(BaseModel):
    team_id: Optional[int] = None
    is_active: Optional[bool] = None
    weekly_quota: Optional[int] = None
