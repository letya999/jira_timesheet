from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class RoleBase(BaseModel):
    name: str
    is_system: bool = False

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None

class RoleResponse(RoleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class OrgUnitBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    reporting_period: str = "weekly"

class OrgUnitCreate(OrgUnitBase):
    pass

class OrgUnitUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    reporting_period: Optional[str] = None

class OrgUnitResponse(OrgUnitBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OrgUnitTree(OrgUnitResponse):
    children: List['OrgUnitTree'] = []
    model_config = ConfigDict(from_attributes=True)

class UserOrgRoleBase(BaseModel):
    user_id: int
    org_unit_id: int
    role_id: int

class UserOrgRoleCreate(UserOrgRoleBase):
    pass

class UserOrgRoleResponse(UserOrgRoleBase):
    id: int
    role: RoleResponse
    model_config = ConfigDict(from_attributes=True)

class ApprovalRouteBase(BaseModel):
    org_unit_id: int
    target_type: str
    step_order: int
    role_id: int

class ApprovalRouteCreate(ApprovalRouteBase):
    pass

class ApprovalRouteUpdate(BaseModel):
    target_type: Optional[str] = None
    step_order: Optional[int] = None
    role_id: Optional[int] = None

class ApprovalRouteResponse(ApprovalRouteBase):
    id: int
    role: RoleResponse
    model_config = ConfigDict(from_attributes=True)
