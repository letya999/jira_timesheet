from datetime import date

import pytest
from core.security import get_password_hash
from crud.category import CategoryCreate
from crud.category import category as crud_category
from crud.org import org_unit as crud_org
from crud.project import project as crud_project
from crud.settings import system_settings as crud_settings
from crud.timesheet import timesheet_period as crud_period
from crud.timesheet import worklog as crud_worklog
from crud.user import user as crud_user
from models.project import Issue, Project
from models.user import JiraUser, User
from schemas.org import OrgUnitCreate
from schemas.project import ProjectCreate
from schemas.timesheet import TimesheetPeriodBase
from schemas.user import UserCreate
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_crud_user(db: AsyncSession):
    user_in = UserCreate(email="crud@example.com", password="testpassword", full_name="CRUD User")
    from models.user import User
    user = User(email=user_in.email, hashed_password=get_password_hash(user_in.password), full_name=user_in.full_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    db_user = await crud_user.get_by_email(db, email="crud@example.com")
    assert db_user is not None
    assert db_user.full_name == "CRUD User"

    # Update
    updated_user = await crud_user.update(db, db_obj=db_user, obj_in={"full_name": "Updated Name"})
    assert updated_user.full_name == "Updated Name"

@pytest.mark.asyncio
async def test_crud_org(db: AsyncSession):
    dept = await crud_org.create(db, obj_in=OrgUnitCreate(name="Engineering"))
    assert dept.name == "Engineering"

    div = await crud_org.create(db, obj_in=OrgUnitCreate(name="Cloud", parent_id=dept.id))
    assert div.name == "Cloud"

    team = await crud_org.create(db, obj_in=OrgUnitCreate(name="Platform", parent_id=div.id))
    assert team.name == "Platform"

    depts = await crud_org.get_multi(db)
    assert len(depts) >= 1

@pytest.mark.asyncio
async def test_crud_project(db: AsyncSession):
    project = await crud_project.create(db, obj_in=ProjectCreate(jira_id="J-1", key="KEY", name="Proj"))
    assert project.key == "KEY"

    db_project = await crud_project.get_by_key(db, key="KEY")
    assert db_project.id == project.id

    count = await crud_project.count(db)
    assert count >= 1

@pytest.mark.asyncio
async def test_crud_category(db: AsyncSession):
    cat = await crud_category.create(db, obj_in=CategoryCreate(name="Meetings"))
    assert cat.name == "Meetings"

    active_cats = await crud_category.get_active(db)
    assert len(active_cats) >= 1

@pytest.mark.asyncio
async def test_crud_settings(db: AsyncSession):
    await crud_settings.set(db, "key1", {"val": 1})
    setting = await crud_settings.get(db, "key1")
    assert setting.value["val"] == 1

    await crud_settings.set(db, "key1", {"val": 2})
    setting = await crud_settings.get(db, "key1")
    assert setting.value["val"] == 2

@pytest.mark.asyncio
async def test_crud_timesheet_advanced(db: AsyncSession):
    # Setup for filters
    project = Project(jira_id="P1", key="P1", name="Proj 1")
    db.add(project)
    await db.flush()

    issue = Issue(jira_id="I1", key="P1-1", summary="Sum", project_id=project.id)
    db.add(issue)
    await db.flush()

    jira_user = JiraUser(jira_account_id="j1", display_name="J1")
    db.add(jira_user)
    await db.flush()

    from models.timesheet import Worklog
    worklog = Worklog(date=date.today(), hours=1.0, jira_user_id=jira_user.id, issue_id=issue.id)
    db.add(worklog)
    await db.commit()

    # Test filters
    items, total = await crud_worklog.get_multi_with_filters(db, project_id=project.id)
    assert total == 1
    assert items[0].id == worklog.id

    items, total = await crud_worklog.get_multi_with_filters(db, start_date=date.today(), end_date=date.today())
    assert total == 1

    # Test period
    user = User(email="u@ex.com", hashed_password="p", full_name="U")
    db.add(user)
    await db.flush()
    period = await crud_period.create(db, obj_in=TimesheetPeriodBase(
        user_id=user.id,
        start_date=date(2024,1,1),
        end_date=date(2024,1,7)
    ))
    db_period = await crud_period.get_by_user_and_date(db, user_id=user.id, start_date=date(2024,1,1), end_date=date(2024,1,7))
    assert db_period.id == period.id
