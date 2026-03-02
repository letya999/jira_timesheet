import math

from core.database import get_db
from crud.org import approval_route as crud_ar
from crud.org import org_unit as crud_org
from crud.org import role as crud_role
from crud.org import user_org_role as crud_uor
from fastapi import APIRouter, Depends, HTTPException, status
from models.org import ApprovalRoute, OrgUnit, UserOrgRole
from models.user import JiraUser, User
from schemas.org import (
    ApprovalRouteCreate,
    ApprovalRouteResponse,
    OrgUnitCreate,
    OrgUnitResponse,
    OrgUnitUpdate,
    RoleCreate,
    RoleResponse,
    UserOrgRoleCreate,
    UserOrgRoleResponse,
)
from schemas.pagination import PaginatedResponse
from schemas.user import JiraUserResponse, JiraUserUpdate
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api import deps

router = APIRouter()


# --- Employees (Jira Users) ---
@router.get("/employees", response_model=PaginatedResponse[JiraUserResponse])
async def get_employees(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.get_current_user),
    page: int = 1,
    size: int = 50,
    search: str | None = None,
    org_unit_id: int | None = None,
):
    query = select(JiraUser).options(selectinload(JiraUser.user))
    if search:
        query = query.where(JiraUser.display_name.ilike(f"%{search}%"))
    if org_unit_id:
        query = query.where(JiraUser.org_unit_id == org_unit_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    pages = math.ceil(total / size) if size > 0 else 1

    return {"items": items, "total": total, "page": page, "size": size, "pages": pages}


@router.patch("/employees/{employee_id}", response_model=JiraUserResponse)
async def update_employee(
    employee_id: int,
    obj_in: JiraUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin", "CEO", "PM"])),
):
    result = await db.execute(select(JiraUser).where(JiraUser.id == employee_id).options(selectinload(JiraUser.user)))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = obj_in.model_dump(exclude_unset=True)

    # Handle org_unit_id specifically if it comes instead of team_id
    if "team_id" in update_data:
        employee.org_unit_id = update_data.pop("team_id")

    for field, value in update_data.items():
        if hasattr(employee, field):
            setattr(employee, field, value)

    await db.commit()
    await db.refresh(employee)

    result = await db.execute(select(JiraUser).where(JiraUser.id == employee.id).options(selectinload(JiraUser.user)))
    return result.scalar_one()


# --- Org Units ---
@router.get("/units", response_model=list[OrgUnitResponse])
async def get_org_units(db: AsyncSession = Depends(get_db)):
    return await crud_org.get_multi(db, limit=1000)


@router.get("/my-teams", response_model=list[OrgUnitResponse])
async def get_my_teams(db: AsyncSession = Depends(get_db), current_user: User = Depends(deps.get_current_user)):
    """Return units where user has a role assigned."""
    if current_user.role in ["Admin", "CEO"]:
        return await crud_org.get_multi(db, limit=1000)

    result = await db.execute(select(OrgUnit).join(UserOrgRole).where(UserOrgRole.user_id == current_user.id))
    return result.scalars().all()


@router.post("/units", response_model=OrgUnitResponse)
async def create_org_unit(
    obj_in: OrgUnitCreate, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    return await crud_org.create(db, obj_in=obj_in)


@router.patch("/units/{unit_id}", response_model=OrgUnitResponse)
async def update_org_unit(
    unit_id: int,
    obj_in: OrgUnitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    unit = await crud_org.get(db, id=unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return await crud_org.update(db, db_obj=unit, obj_in=obj_in)


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org_unit(
    unit_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    unit = await crud_org.get(db, id=unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    await crud_org.remove(db, id=unit_id)
    return None


# --- Roles ---
@router.get("/roles", response_model=list[RoleResponse])
async def get_roles(db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))):
    return await crud_role.get_multi(db, limit=100)


@router.post("/roles", response_model=RoleResponse)
async def create_role(
    obj_in: RoleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    return await crud_role.create(db, obj_in=obj_in)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    role = await crud_role.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    await crud_role.remove(db, id=role_id)
    return None


# --- User Org Roles (Assignments) ---
@router.get("/units/{unit_id}/roles", response_model=list[UserOrgRoleResponse])
async def get_unit_roles(
    unit_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    return await crud_uor.get_by_unit(db, org_unit_id=unit_id)


@router.post("/units/roles", response_model=UserOrgRoleResponse)
async def assign_user_role(
    obj_in: UserOrgRoleCreate, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    assignment = await crud_uor.create(db, obj_in=obj_in)
    # Refetch to load relationships
    result = await db.execute(
        select(UserOrgRole)
        .where(UserOrgRole.id == assignment.id)
        .options(selectinload(UserOrgRole.role), selectinload(UserOrgRole.user), selectinload(UserOrgRole.org_unit))
    )
    return result.scalar_one()


@router.delete("/units/roles/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_role(
    assignment_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    assignment = await crud_uor.get(db, id=assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await crud_uor.remove(db, id=assignment_id)
    return None


# --- Approval Routes ---
@router.get("/units/{unit_id}/approval-routes", response_model=list[ApprovalRouteResponse])
async def get_unit_approval_routes(
    unit_id: int,
    target_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    if target_type:
        return await crud_ar.get_by_unit_and_target(db, org_unit_id=unit_id, target_type=target_type)

    # Alternatively get all
    result = await db.execute(
        select(ApprovalRoute).where(ApprovalRoute.org_unit_id == unit_id).options(selectinload(ApprovalRoute.role))
    )
    return result.scalars().all()


@router.post("/units/approval-routes", response_model=ApprovalRouteResponse)
async def create_approval_route(
    obj_in: ApprovalRouteCreate, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    route = await crud_ar.create(db, obj_in=obj_in)
    # Refetch to load role
    result = await db.execute(
        select(ApprovalRoute).where(ApprovalRoute.id == route.id).options(selectinload(ApprovalRoute.role))
    )
    return result.scalar_one()


@router.delete("/units/approval-routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval_route(
    route_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    route = await crud_ar.get(db, id=route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    await crud_ar.remove(db, id=route_id)
    return None
