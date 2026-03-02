from models.org import ApprovalRoute, OrgUnit, Role, UserOrgRole
from schemas.org import (
    ApprovalRouteCreate,
    ApprovalRouteUpdate,
    OrgUnitCreate,
    OrgUnitUpdate,
    RoleCreate,
    RoleUpdate,
    UserOrgRoleCreate,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from crud.base import CRUDBase


class CRUDOrgUnit(CRUDBase[OrgUnit, OrgUnitCreate, OrgUnitUpdate]):
    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> list[OrgUnit]:
        result = await db.execute(select(OrgUnit).offset(skip).limit(limit))
        return result.scalars().all()

    async def get_tree(self, db: AsyncSession) -> list[OrgUnit]:
        result = await db.execute(select(OrgUnit))
        # Tree building is usually done in memory after fetching all,
        # since recursive CTEs or eager loads can be tricky for arbitrary n-level.
        return result.scalars().all()

    async def get_by_name(self, db: AsyncSession, *, name: str) -> OrgUnit | None:
        result = await db.execute(select(OrgUnit).where(OrgUnit.name == name))
        return result.scalar_one_or_none()


org_unit = CRUDOrgUnit(OrgUnit)


class CRUDRole(CRUDBase[Role, RoleCreate, RoleUpdate]):
    async def get_by_name(self, db: AsyncSession, *, name: str) -> Role | None:
        result = await db.execute(select(Role).where(Role.name == name))
        return result.scalar_one_or_none()


role = CRUDRole(Role)


class CRUDUserOrgRole(CRUDBase[UserOrgRole, UserOrgRoleCreate, UserOrgRoleCreate]):
    async def get_by_user_and_unit(self, db: AsyncSession, *, user_id: int, org_unit_id: int) -> list[UserOrgRole]:
        stmt = (
            select(UserOrgRole)
            .where(UserOrgRole.user_id == user_id, UserOrgRole.org_unit_id == org_unit_id)
            .options(selectinload(UserOrgRole.role))
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_by_unit(self, db: AsyncSession, *, org_unit_id: int) -> list[UserOrgRole]:
        stmt = select(UserOrgRole).where(UserOrgRole.org_unit_id == org_unit_id).options(selectinload(UserOrgRole.role))
        result = await db.execute(stmt)
        return result.scalars().all()


user_org_role = CRUDUserOrgRole(UserOrgRole)


class CRUDApprovalRoute(CRUDBase[ApprovalRoute, ApprovalRouteCreate, ApprovalRouteUpdate]):
    async def get_by_unit_and_target(
        self, db: AsyncSession, *, org_unit_id: int, target_type: str
    ) -> list[ApprovalRoute]:
        result = await db.execute(
            select(ApprovalRoute)
            .where(ApprovalRoute.org_unit_id == org_unit_id, ApprovalRoute.target_type == target_type)
            .order_by(ApprovalRoute.step_order)
            .options(selectinload(ApprovalRoute.role))
        )
        return result.scalars().all()


approval_route = CRUDApprovalRoute(ApprovalRoute)
