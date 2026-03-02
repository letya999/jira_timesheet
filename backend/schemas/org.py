from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    name: str
    is_system: bool = False


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: str | None = None


class RoleResponse(RoleBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class OrgUnitBase(BaseModel):
    name: str
    parent_id: int | None = None
    reporting_period: str = "weekly"


class OrgUnitCreate(OrgUnitBase):
    pass


class OrgUnitUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    reporting_period: str | None = None


class OrgUnitResponse(OrgUnitBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class OrgUnitTree(OrgUnitResponse):
    children: list["OrgUnitTree"] = []
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
    target_type: str | None = None
    step_order: int | None = None
    role_id: int | None = None


class ApprovalRouteResponse(ApprovalRouteBase):
    id: int
    role: RoleResponse
    model_config = ConfigDict(from_attributes=True)
