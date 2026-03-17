import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import JiraUser, User
from models.project import Project
from services.jira import sync_jira_users_to_db, sync_jira_projects_to_db
from core.security import get_password_hash

@pytest.mark.asyncio
async def test_sync_jira_users_creates_new_jira_users(db: AsyncSession):
    mock_users = [
        {
            "accountId": "acc_1",
            "displayName": "User One",
            "emailAddress": "user1@example.com",
            "accountType": "atlassian",
            "active": True,
            "avatarUrls": {"48x48": "http://avatar1"}
        },
        {
            "accountId": "acc_2",
            "displayName": "User Two",
            "emailAddress": "user2@example.com",
            "accountType": "atlassian",
            "active": True,
            "avatarUrls": {"48x48": "http://avatar2"}
        }
    ]
    
    with patch("services.jira.fetch_jira_users", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_users
        
        count = await sync_jira_users_to_db(db)
        assert count == 2
        
        result = await db.execute(select(JiraUser))
        users = result.scalars().all()
        assert len(users) == 2
        assert {u.jira_account_id for u in users} == {"acc_1", "acc_2"}

@pytest.mark.asyncio
async def test_sync_jira_users_updates_existing(db: AsyncSession):
    # Pre-create a user
    existing_user = JiraUser(
        jira_account_id="acc_1",
        display_name="Old Name",
        email="user1@example.com",
        is_active=True
    )
    db.add(existing_user)
    await db.commit()
    
    mock_users = [
        {
            "accountId": "acc_1",
            "displayName": "New Name",
            "emailAddress": "user1@example.com",
            "accountType": "atlassian",
            "active": True,
            "avatarUrls": {"48x48": "http://avatar1"}
        }
    ]
    
    with patch("services.jira.fetch_jira_users", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_users
        
        count = await sync_jira_users_to_db(db)
        assert count == 1
        
        await db.refresh(existing_user)
        assert existing_user.display_name == "New Name"

@pytest.mark.asyncio
async def test_sync_jira_users_links_system_user(db: AsyncSession):
    # Pre-create system user without jira link
    sys_user = User(
        email="user1@example.com",
        hashed_password=get_password_hash("pass"),
        full_name="System User",
        role="Employee",
        is_active=True
    )
    db.add(sys_user)
    await db.commit()
    
    mock_users = [
        {
            "accountId": "acc_1",
            "displayName": "Jira User One",
            "emailAddress": "user1@example.com",
            "accountType": "atlassian",
            "active": True
        }
    ]
    
    with patch("services.jira.fetch_jira_users", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_users
        
        await sync_jira_users_to_db(db)
        
        await db.refresh(sys_user)
        assert sys_user.jira_user_id is not None
        
        result = await db.execute(select(JiraUser).where(JiraUser.id == sys_user.jira_user_id))
        ju = result.scalar_one()
        assert ju.jira_account_id == "acc_1"

@pytest.mark.asyncio
async def test_sync_jira_users_handles_empty_response(db: AsyncSession):
    with patch("services.jira.fetch_jira_users", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = []
        
        count = await sync_jira_users_to_db(db)
        assert count == 0

@pytest.mark.asyncio
async def test_sync_jira_projects_creates_projects(db: AsyncSession):
    mock_projects = [
        {"id": "10001", "key": "PROJ1", "name": "Project One"},
        {"id": "10002", "key": "PROJ2", "name": "Project Two"}
    ]
    
    with patch("services.jira.fetch_jira_projects", new_callable=AsyncMock) as mock_fetch_proj, \
         patch("services.jira.fetch_jira_project_versions", new_callable=AsyncMock) as mock_fetch_vers, \
         patch("services.jira.fetch_jira_project_sprints", new_callable=AsyncMock) as mock_fetch_sprints:
        
        mock_fetch_proj.return_value = mock_projects
        mock_fetch_vers.return_value = []
        mock_fetch_sprints.return_value = []
        
        count = await sync_jira_projects_to_db(db)
        assert count == 2
        
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        assert len(projects) == 2
        assert {p.key for p in projects} == {"PROJ1", "PROJ2"}

@pytest.mark.asyncio
async def test_sync_jira_projects_skips_existing(db: AsyncSession):
    # Pre-create
    existing_p = Project(jira_id="10001", key="PROJ1", name="Old Name", is_active=False)
    db.add(existing_p)
    await db.commit()
    
    mock_projects = [{"id": "10001", "key": "PROJ1", "name": "New Name"}]
    
    with patch("services.jira.fetch_jira_projects", new_callable=AsyncMock) as mock_fetch_proj, \
         patch("services.jira.fetch_jira_project_versions", new_callable=AsyncMock) as mock_fetch_vers, \
         patch("services.jira.fetch_jira_project_sprints", new_callable=AsyncMock) as mock_fetch_sprints:
        
        mock_fetch_proj.return_value = mock_projects
        mock_fetch_vers.return_value = []
        mock_fetch_sprints.return_value = []
        
        count = await sync_jira_projects_to_db(db)
        assert count == 1
        
        await db.refresh(existing_p)
        assert existing_p.name == "New Name"
        
        result = await db.execute(select(Project))
        assert len(result.scalars().all()) == 1
