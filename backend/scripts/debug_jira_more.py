import asyncio
import httpx
from core.config import settings

async def debug_jira():
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    url = f"{settings.JIRA_URL}/rest/api/3/search"
    params = {
        "jql": "order by created DESC",
        "maxResults": 1,
        "fields": "key,project,summary"
    }
    
    async with httpx.AsyncClient(auth=auth) as client:
        print(f"URL: {url}")
        print(f"Auth Email: {settings.JIRA_EMAIL}")
        resp = await client.get(url, params=params)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Total issues found: {data.get('total')}")
            if data.get('issues'):
                issue = data['issues'][0]
                print(f"Sample issue: {issue['key']} in project {issue['fields']['project']['key']}")
        else:
            print(f"Body: {resp.text}")

        # Check projects again with more expansion
        resp_p = await client.get(f"{settings.JIRA_URL}/rest/api/3/project?expand=description")
        print(f"Projects Status: {resp_p.status_code}")
        print(f"Projects Body: {resp_p.text}")

if __name__ == "__main__":
    asyncio.run(debug_jira())
