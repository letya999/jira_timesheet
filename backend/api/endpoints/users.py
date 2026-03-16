import math
import secrets
import string
from typing import Any

from core.database import get_db
from core.security import get_password_hash
from fastapi import APIRouter, Depends, HTTPException
from models.org import OrgUnit
from models.user import JiraUser, User
from schemas.pagination import PaginatedResponse
from schemas.user import (
    BulkUpdatePayload,
    JiraUserResponse,
    PasswordChangeRequest,
    PromoteBulkPayload,
    UserPromoteResponse,
    UserResponse,
    UserType,
    UserUpdate,
)
from services.jira import sync_jira_users_to_db
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from api import deps

router = APIRouter()


def _serialize_user(user: User | JiraUser, **extra: Any) -> dict:
    """Helper to serialize User or JiraUser to a dict consistently."""
    if isinstance(user, User):
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "needs_password_change": user.needs_password_change,
            "timezone": user.timezone,
            "jira_user_id": user.jira_user_id,
            "org_unit_id": user.jira_user.org_unit_id if user.jira_user else None,
            "org_unit_ids": [o.id for o in user.org_units] if hasattr(user, "org_units") and user.org_units else [],
            "display_name": user.jira_user.display_name if user.jira_user else user.full_name,
            "type": UserType.SYSTEM,
            **extra,
        }
    else:
        return {
            "id": user.id,
            "jira_account_id": user.jira_account_id,
            "display_name": user.display_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "weekly_quota": user.weekly_quota,
            "org_unit_id": user.org_unit_id,
            "user_id": None,
            "type": UserType.IMPORT,
            **extra,
        }


@router.get("/", response_model=PaginatedResponse[UserResponse | JiraUserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin", "PM", "CEO"])),
    page: int = 1,
    size: int = 50,
    search: str | None = None,
    type: UserType | None = None,
    org_unit_id: int | None = None,
):
    """Fetch all users (system and import) with advanced filtering and SQL pagination."""

    # Base queries
    system_query = select(User).options(selectinload(User.jira_user), selectinload(User.org_units))

    linked_jira_ids = select(User.jira_user_id).where(User.jira_user_id.is_not(None)).scalar_subquery()
    import_query = select(JiraUser).where(JiraUser.id.not_in(linked_jira_ids))

    # Apply filters
    if search:
        system_query = system_query.where(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
        import_query = import_query.where(
            (JiraUser.display_name.ilike(f"%{search}%")) | (JiraUser.email.ilike(f"%{search}%"))
        )

    if org_unit_id:
        system_query = system_query.join(User.jira_user).where(JiraUser.org_unit_id == org_unit_id)
        import_query = import_query.where(JiraUser.org_unit_id == org_unit_id)

    items = []
    total = 0
    offset = (page - 1) * size

    if type == UserType.SYSTEM:
        count_q = select(func.count()).select_from(system_query.subquery())
        total = (await db.execute(count_q)).scalar() or 0
        res = await db.execute(system_query.offset(offset).limit(size))
        items = res.scalars().all()
    elif type == UserType.IMPORT:
        count_q = select(func.count()).select_from(import_query.subquery())
        total = (await db.execute(count_q)).scalar() or 0
        res = await db.execute(import_query.offset(offset).limit(size))
        items = res.scalars().all()
    else:
        # All types case with SQL-level pagination
        sys_count_q = select(func.count()).select_from(system_query.subquery())
        sys_count = (await db.execute(sys_count_q)).scalar() or 0

        imp_count_q = select(func.count()).select_from(import_query.subquery())
        imp_count = (await db.execute(imp_count_q)).scalar() or 0

        total = sys_count + imp_count

        if offset < sys_count:
            # Fetch from system first
            res_sys = await db.execute(system_query.offset(offset).limit(size))
            items = list(res_sys.scalars().all())

            # If we need more items from imports
            if len(items) < size and imp_count > 0:
                remaining = size - len(items)
                res_imp = await db.execute(import_query.offset(0).limit(remaining))
                items.extend(res_imp.scalars().all())
        else:
            # Fetch only from imports
            imp_offset = offset - sys_count
            res_imp = await db.execute(import_query.offset(imp_offset).limit(size))
            items = res_imp.scalars().all()

    resp_items = [_serialize_user(item) for item in items]
    pages = math.ceil(total / size) if size > 0 else 1
    return {"items": resp_items, "total": total, "page": page, "size": size, "pages": pages}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(deps.get_current_user), db: AsyncSession = Depends(get_db)):
    """Fetch current logged in user profile with jira info."""
    result = await db.execute(
        select(User).where(User.id == current_user.id).options(selectinload(User.org_units), joinedload(User.jira_user))
    )
    u = result.scalar_one()
    return _serialize_user(u)


@router.get("/{user_id}", response_model=UserResponse | JiraUserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin", "PM", "CEO"])),
):
    """Fetch a single user by ID (either system or import)."""
    # Try system user first
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.org_units), joinedload(User.jira_user))
    )
    user = result.scalar_one_or_none()
    if user:
        return _serialize_user(user)

    # Try Jira user
    result = await db.execute(select(JiraUser).where(JiraUser.id == user_id))
    jira_user = result.scalar_one_or_none()
    if jira_user:
        return _serialize_user(jira_user)

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/bulk-update")
async def bulk_update_users(
    payload: BulkUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    """Bulk update users with restricted fields and proper error handling."""
    try:
        update_data = payload.data.model_dump(exclude_unset=True)
        for uid in payload.user_ids:
            res = await db.execute(
                select(User).where(User.id == uid).options(selectinload(User.org_units))
            )
            user = res.scalar_one_or_none()
            if user:
                if "org_unit_ids" in update_data:
                    unit_ids = update_data["org_unit_ids"]
                    units = await db.execute(select(OrgUnit).where(OrgUnit.id.in_(unit_ids)))
                    user.org_units = list(units.scalars().all())

                # Update other fields (role, is_active)
                for field in ["role", "is_active"]:
                    if field in update_data:
                        setattr(user, field, update_data[field])
                db.add(user)

        await db.commit()
        return {"status": "success", "updated_count": len(payload.user_ids)}
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Bulk update failed, changes rolled back")


@router.post("/reset-password/{user_id}", response_model=UserPromoteResponse)
async def reset_user_password(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    res = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.org_units), selectinload(User.jira_user))
    )
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for i in range(10))
    user.hashed_password = get_password_hash(temp_password)
    user.needs_password_change = True

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _serialize_user(user, temporary_password=temp_password)


@router.post("/merge")
async def merge_users(
    jira_user_id: int,
    system_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    """Link JiraUser to system User and clean up."""
    # Fetch both
    res_jira = await db.execute(
        select(JiraUser).where(JiraUser.id == jira_user_id).options(selectinload(JiraUser.user))
    )
    jira_user = res_jira.scalar_one_or_none()

    res_system = await db.execute(
        select(User).where(User.id == system_user_id).options(selectinload(User.org_units))
    )
    system_user = res_system.scalar_one_or_none()

    if not jira_user or not system_user:
        raise HTTPException(status_code=404, detail="One or both users not found")

    if jira_user.user_id:
        raise HTTPException(status_code=400, detail="Jira user already linked to a system user")

    # Merge
    system_user.jira_user_id = jira_user.id

    # Transfer org_unit_id to org_units if not already present
    if jira_user.org_unit_id:
        res_unit = await db.execute(select(OrgUnit).where(OrgUnit.id == jira_user.org_unit_id))
        unit = res_unit.scalar_one_or_none()
        if unit and unit not in system_user.org_units:
            system_user.org_units.append(unit)

    db.add(system_user)

    # Check for worklogs before deleting JiraUser
    from models.timesheet import Worklog
    worklog_count_res = await db.execute(select(func.count(Worklog.id)).where(Worklog.jira_user_id == jira_user.id))
    worklog_count = worklog_count_res.scalar() or 0

    if worklog_count == 0:
        await db.delete(jira_user)

    await db.commit()
    return {"status": "success"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    """Delete user with self-deletion and last-admin protection."""
    # Check if system user
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()

    if user:
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")

        admin_count_result = await db.execute(
            select(func.count()).select_from(User).where(
                User.role == "Admin",
                User.id != user_id
            )
        )
        if (admin_count_result.scalar() or 0) == 0:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin user")

        await db.delete(user)
        await db.commit()
        return {"status": "success"}

    # Try Jira user
    res_jira = await db.execute(select(JiraUser).where(JiraUser.id == user_id))
    jira_user = res_jira.scalar_one_or_none()
    if jira_user:
        await db.delete(jira_user)
        await db.commit()
        return {"status": "success"}

    raise HTTPException(status_code=404, detail="User not found")


@router.post("/promote-bulk")
async def promote_bulk_users(
    payload: PromoteBulkPayload,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    """Bulk promote Jira users to system users."""
    promoted_count = 0
    for jid in payload.user_ids:
        try:
            # Check if JiraUser exists
            result = await db.execute(select(JiraUser).where(JiraUser.id == jid))
            jira_user = result.scalar_one_or_none()
            if not jira_user:
                continue

            # Check if already has system user
            result = await db.execute(select(User).where(User.jira_user_id == jid))
            if result.scalar_one_or_none():
                continue

            # Generate random password
            alphabet = string.ascii_letters + string.digits
            temp_password = "".join(secrets.choice(alphabet) for i in range(10))

            new_user = User(
                email=jira_user.email if jira_user.email else f"user_{jid}@local.internal",
                hashed_password=get_password_hash(temp_password),
                full_name=jira_user.display_name,
                role="Employee",
                is_active=True,
                needs_password_change=True,
                jira_user_id=jid,
                timezone="UTC",
            )
            db.add(new_user)
            promoted_count += 1
        except Exception:
            continue

    await db.commit()
    return {"status": "success", "promoted_count": promoted_count}


@router.post("/promote/{jira_user_id}", response_model=UserPromoteResponse)
async def promote_to_system_user(
    jira_user_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))
):
    """Convert a Jira employee into a system user with a random password."""
    # Check if JiraUser exists
    result = await db.execute(select(JiraUser).where(JiraUser.id == jira_user_id))
    jira_user = result.scalar_one_or_none()
    if not jira_user:
        raise HTTPException(status_code=404, detail="Jira user not found")

    # Check if already has system user
    result = await db.execute(select(User).where(User.jira_user_id == jira_user_id))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already has system access")

    # Generate random password
    alphabet = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for i in range(10))

    new_user = User(
        email=jira_user.email if jira_user.email else f"user_{jira_user_id}@local.internal",
        hashed_password=get_password_hash(temp_password),
        full_name=jira_user.display_name,
        role="Employee",
        is_active=True,
        needs_password_change=True,
        jira_user_id=jira_user_id,
        timezone="UTC",
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return _serialize_user(new_user, temporary_password=temp_password)


@router.post("/change-password")
async def change_password(
    payload: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Change current user password and clear needs_password_change flag."""
    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.needs_password_change = False

    db.add(current_user)
    await db.commit()

    return {"status": "success", "message": "Password changed successfully"}


@router.post("/sync")
async def sync_users(db: AsyncSession = Depends(get_db), current_user=Depends(deps.require_role(["Admin"]))):
    """Sync users from Jira."""
    count = await sync_jira_users_to_db(db)
    return {"status": "success", "synced": count, "message": f"Successfully synced {count} users from Jira"}


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(deps.require_role(["Admin"])),
):
    """Update system user details with proper M2M handling."""
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.org_units), joinedload(User.jira_user))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "org_unit_ids" in update_data:
        unit_ids = update_data.pop("org_unit_ids")
        units_result = await db.execute(select(OrgUnit).where(OrgUnit.id.in_(unit_ids)))
        user.org_units = list(units_result.scalars().all())

    for field, value in update_data.items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _serialize_user(user)
