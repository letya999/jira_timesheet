import asyncio

import httpx
from core.config import settings


async def debug_jira_projects():
    print(f"URL: {settings.JIRA_URL}")
    print(f"Email: {settings.JIRA_EMAIL}")
    print(f"Token present: {bool(settings.JIRA_API_TOKEN)}")

    url = f"{settings.JIRA_URL}/rest/api/3/project"
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)

    try:
        async with httpx.AsyncClient(auth=auth) as client:
            response = await client.get(url)
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Total projects received from Jira: {len(data)}")
                if data:
                    print(f"First 3 project keys: {[p.get('key') for p in data[:3]]}")
            else:
                print(f"Error Body: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(debug_jira_projects())
