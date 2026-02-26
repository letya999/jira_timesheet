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

    model_config = ConfigDict(from_attributes=True)