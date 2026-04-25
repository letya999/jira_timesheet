import asyncio
import secrets
import string
import sys
import os

# Add parent directory to sys.path to allow imports from core, models, etc.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import async_session
from core.security import get_password_hash
from models.user import User, JiraUser
from sqlalchemy import select

EMAILS = [
    "a.letyushev@twinby.com",
    "a.kovalev@twinby.com",
    "s.nersesyan@twinby.com",
    "k.lysenko@twinby.com",
    "cto@twinby.com",
]

async def promote():
    async with async_session() as db:
        for email in EMAILS:
            # 1. Check if user exists
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            # 2. Check for jira_user to link
            result = await db.execute(select(JiraUser).where(JiraUser.email == email))
            jira_user = result.scalar_one_or_none()
            jira_user_id = jira_user.id if jira_user else None
            full_name = jira_user.display_name if jira_user else email

            if user:
                print(f"Updating user: {email}")
                user.role = "Admin"
                user.is_active = True
                if jira_user_id:
                    user.jira_user_id = jira_user_id
            else:
                print(f"Creating user: {email}")
                random_password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
                user = User(
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash(random_password),
                    role="Admin",
                    is_active=True,
                    jira_user_id=jira_user_id
                )
                db.add(user)
        
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(promote())
