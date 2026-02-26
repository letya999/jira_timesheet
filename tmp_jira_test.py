import httpx
import asyncio

JIRA_URL = "https://neuralab.atlassian.net"
JIRA_EMAIL = "a.letyushev@twinby.com"
JIRA_API_TOKEN = "ATATT3xFfGF0jX64-H-_sR1ssujkALIqa4ml08V_7BYu0AI4Eb144uRWOKw0kJf_IY55l93Y3hyMnRTfmkKbreKpwL199HYSv0ToExfC6VQU3f-0Ssn2xC83VyRsdBDQHr-426avFtvX2YeS-4EHi3FNqVHyhnx05QeqSey58CuC_tD7vL0dVnc=053FDAF7"

async def test_search():
    ids = "68561,31370,32706,71394,11120,11363,28642,28414,11328,11362,11358,71380,11330,71384,71381,11657,65546,71389,32688,10683,31000,31079,68017,71379,69602,71387,11119,71391,64529,71395,71386,32812,67779,71392,30992,31440,71383,10844,67206,71393,71385,68016,71388,11032,71396,71382,11025,68015,32766,10840,11360"
    jql = f"id in ({ids})"
    url = f"{JIRA_URL}/rest/api/3/search/jql"
    auth = (JIRA_EMAIL, JIRA_API_TOKEN)
    
    async with httpx.AsyncClient(auth=auth) as client:
        # Try GET first as in the original code
        print("Testing GET /search...")
        response = await client.get(url, params={"jql": jql, "fields": "key,project,fixVersions,status,issuetype,summary,parent"})
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")

        # Try POST as alternative
        print("\nTesting POST /search...")
        payload = {
            "jql": jql,
            "fields": ["key", "project", "fixVersions", "status", "issuetype", "summary", "parent"],
            "maxResults": 100
        }
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        response = await client.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_search())
