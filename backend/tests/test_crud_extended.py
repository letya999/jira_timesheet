import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from crud.timesheet import worklog as crud_worklog
from crud.org import org_unit as crud_org, role as crud_role
from models.timesheet import Worklog
from models.user import JiraUser
from models.org import OrgUnit, Role
from models.project import Project, Issue
from schemas.timesheet import ManualLogCreate

@pytest.mark.asyncio
async def test_crud_worklog_filters(db: AsyncSession):
    # Setup
    unit = OrgUnit(name="Filter Unit")
    db.add(unit)
    await db.flush()
    
    ju = JiraUser(jira_account_id="ju-filter", display_name="Filter", org_unit_id=unit.id)
    db.add(ju)
    await db.flush()
    
    p = Project(jira_id="P-F", key="F", name="Filter")
    db.add(p)
    await db.flush()
    
    iss = Issue(jira_id="I-F", key="F-1", summary="F", project_id=p.id)
    db.add(iss)
    await db.flush()
    
    w = Worklog(jira_user_id=ju.id, issue_id=iss.id, date=date(2026,1,1), hours=1.0, type="JIRA")
    db.add(w)
    await db.commit()
    
    # 1. Test project filter
    items, total = await crud_worklog.get_multi_with_filters(db, project_id=p.id)
    assert total >= 1
    
    # 2. Test org unit filter
    items, total = await crud_worklog.get_multi_with_filters(db, org_unit_id=unit.id)
    assert total >= 1
    
    # 3. Test date filter
    items, total = await crud_worklog.get_multi_with_filters(db, start_date=date(2026,1,1), end_date=date(2026,1,1))
    assert total >= 1

from schemas.org import RoleCreate

@pytest.mark.asyncio
async def test_crud_role_and_assignment(db: AsyncSession):
    role = await crud_role.create(db, obj_in=RoleCreate(name="New Role", is_system=False))
    assert role.name == "New Role"
    
    db_role = await crud_role.get_by_name(db, name="New Role")
    assert db_role.id == role.id
