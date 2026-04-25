import asyncio
import httpx
from core.config import settings

async def test_jira():
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    endpoints = [
        "/rest/api/3/users/search",
        "/rest/api/3/user/search?query=a",  # Alternative search
        "/rest/api/3/project",            # Basic check
        "/rest/api/3/myself"              # Verify identity
    ]
    
    async with httpx.AsyncClient(auth=auth) as client:
        for ep in endpoints:
            url = f"{settings.JIRA_URL}{ep}"
            print(f"Testing {url}...")
            try:
                resp = await client.get(url)
                print(f"  Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"  Response: {resp.text}")
                else:
                    data = resp.json()
                    if isinstance(data, list):
                        print(f"  Success! Found {len(data)} items.")
                    else:
                        print(f"  Success! Keys: {list(data.keys())}")
            except Exception as e:
                print(f"  Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_jira())
