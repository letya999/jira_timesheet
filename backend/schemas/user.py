from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Jira User"
    jira_account_id: Optional[str] = None # Input only
    role: str = "Employee"
    weekly_quota: int = 40
    team_id: Optional[int] = None
    jira_user_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    weekly_quota: Optional[int] = None
    team_id: Optional[int] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class JiraUserResponse(BaseModel):
    id: int
    jira_account_id: str
    display_name: str
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    is_active: bool
    team_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class JiraUserUpdate(BaseModel):
    team_id: Optional[int] = None
    is_active: Optional[bool] = None
