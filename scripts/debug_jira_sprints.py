import asyncio
import httpx
import sys
import os

# Adjust path to import from core.config
sys.path.append(os.getcwd()) # In container, we are in /app/backend

from core.config import settings

async def debug_issue():
    auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
    # Search for any issue with worklogs
    url = f"{settings.JIRA_URL}/rest/api/3/search/jql"
    payload = {
        "jql": "worklogDate is not empty",
        "maxResults": 3,
        "fields": ["*all"]
    }
    
    async with httpx.AsyncClient(auth=auth) as client:
        print(f"Connecting to {settings.JIRA_URL}...")
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            print(f"Error: {resp.status_code}")
            print(resp.text)
            return
        
        data = resp.json()
        issues = data.get("issues", [])
        if not issues:
            print("No issues found with worklogs. Trying any issue...")
            payload["jql"] = ""
            resp = await client.post(url, json=payload)
            data = resp.json()
            issues = data.get("issues", [])
        
        if not issues:
            print("No issues found at all.")
            return
            
        for issue in issues:
            fields = issue.get("fields", {})
            print(f"\nChecking Issue: {issue['key']}")
            print("-" * 40)
            
            # Look for sprint in field names or values
            found_sprint_fields = []
            for key, value in fields.items():
                if value and isinstance(value, list) and any(isinstance(v, (str, dict)) and ("Sprint" in str(v) or "sprint" in str(v)) for v in value):
                    found_sprint_fields.append((key, value))
            
            if found_sprint_fields:
                print("FOUND SPRINT FIELDS:")
                for key, val in found_sprint_fields:
                    print(f"Field: {key}")
                    print(f"Value sample: {str(val)[:200]}...")
            else:
                print("No obvious sprint fields found in *all* fields for this issue.")
                print("\nAvailable custom fields with list values (potential candidates):")
                for key, value in fields.items():
                    if key.startswith("customfield_") and isinstance(value, list) and value:
                         print(f"{key}: {str(value)[:100]}...")

if __name__ == "__main__":
    asyncio.run(debug_issue())
