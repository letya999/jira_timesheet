from datetime import date

import pytest
from core.security import get_password_hash
from models import (
    AuditLog,
    Issue,
    JiraUser,
    OrgUnit,
    Project,
    Release,
    Sprint,
    SystemSettings,
    TimesheetPeriod,
    User,
    Worklog,
    WorklogCategory,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


@pytest.mark.asyncio
async def test_create_user(db: AsyncSession):
    user = User(
        email="test@example.com", hashed_password=get_password_hash("password"), full_name="Test User", role="Employee"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    assert user.id is not None
    assert user.email == "test@example.com"


@pytest.mark.asyncio
async def test_create_jira_user(db: AsyncSession):
    jira_user = JiraUser(jira_account_id="jira-123", display_name="Jira Name", email="jira@example.com")
    db.add(jira_user)
    await db.commit()
    await db.refresh(jira_user)
    assert jira_user.id is not None
    assert jira_user.jira_account_id == "jira-123"


@pytest.mark.asyncio
async def test_org_hierarchy(db: AsyncSession):
    dept = OrgUnit(name="IT")
    db.add(dept)
    await db.flush()

    div = OrgUnit(name="Software", parent_id=dept.id)
    db.add(div)
    await db.flush()

    team = OrgUnit(name="Backend", parent_id=div.id)
    db.add(team)
    await db.commit()

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(OrgUnit).where(OrgUnit.id == team.id).options(selectinload(OrgUnit.parent).selectinload(OrgUnit.parent))
    )
    team = result.scalar_one()

    assert team.id is not None
    assert team.parent.name == "Software"
    assert team.parent.parent.name == "IT"


@pytest.mark.asyncio
async def test_project_models(db: AsyncSession):
    project = Project(jira_id="proj-1", key="PROJ", name="Project 1")
    db.add(project)
    await db.flush()

    issue = Issue(jira_id="iss-1", key="PROJ-1", summary="Issue 1", project_id=project.id)
    db.add(issue)

    sprint = Sprint(jira_id="spr-1", name="Sprint 1")
    db.add(sprint)

    release = Release(jira_id="rel-1", name="Release 1", project_id=project.id)
    db.add(release)
    await db.commit()

    # Re-fetch issue with loaded relationships
    result = await db.execute(
        select(Issue).where(Issue.id == issue.id).options(selectinload(Issue.sprints), selectinload(Issue.releases))
    )
    issue = result.scalar_one()

    issue.sprints.append(sprint)
    issue.releases.append(release)
    await db.commit()

    assert issue.id is not None
    assert len(issue.sprints) == 1
    assert len(issue.releases) == 1


@pytest.mark.asyncio
async def test_timesheet_models(db: AsyncSession):
    jira_user = JiraUser(jira_account_id="j-1", display_name="J User")
    db.add(jira_user)
    await db.flush()

    cat = WorklogCategory(name="Development")
    db.add(cat)
    await db.flush()

    worklog = Worklog(date=date.today(), hours=8.0, jira_user_id=jira_user.id, category_id=cat.id)
    db.add(worklog)

    user = User(email="u1@ex.com", hashed_password="pw", full_name="U1")
    db.add(user)
    await db.flush()

    period = TimesheetPeriod(user_id=user.id, start_date=date(2024, 1, 1), end_date=date(2024, 1, 7))
    db.add(period)
    await db.commit()

    assert worklog.id is not None
    assert period.id is not None


@pytest.mark.asyncio
async def test_system_settings(db: AsyncSession):
    setting = SystemSettings(key="test_key", value={"enabled": True})
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    assert setting.key == "test_key"
    assert setting.value["enabled"] is True


@pytest.mark.asyncio
async def test_audit_log(db: AsyncSession):
    log = AuditLog(action="TEST_ACTION", target_type="Test", payload={"data": "test"})
    db.add(log)
    await db.commit()
    await db.refresh(log)
    assert log.id is not None
    assert log.action == "TEST_ACTION"
