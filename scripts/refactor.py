import os
import re
from pathlib import Path


def process_file(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return

    original_content = content

    # Replace team_id with org_unit_id
    content = content.replace("team_id=", "org_unit_id=")
    content = content.replace("team_id:", "org_unit_id:")
    content = content.replace(".team_id", ".org_unit_id")
    content = content.replace("team_id =", "org_unit_id =")

    # Change Team to OrgUnit for specific cases
    content = re.sub(r'\bTeam\b', 'OrgUnit', content)
    content = re.sub(r'\bTeamCreate\b', 'OrgUnitCreate', content)
    content = re.sub(r'\bTeamUpdate\b', 'OrgUnitUpdate', content)
    content = re.sub(r'\bTeamResponse\b', 'OrgUnitResponse', content)

    # Change JiraUser.team to JiraUser.org_unit
    content = content.replace("JiraUser.team", "JiraUser.org_unit")
    content = content.replace("jira_user.team", "jira_user.org_unit")

    # Adjust imports from models.org
    content = re.sub(r'from models\.org import.*', 'from models.org import OrgUnit, Role, UserOrgRole, ApprovalRoute', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    dirs_to_process = ['backend/api', 'backend/crud', 'backend/services', 'backend/schemas', 'backend/tests', 'frontend/pages', 'frontend/ui_components.py', 'frontend/app.py', 'tests']

    for d in dirs_to_process:
        path = Path(d)
        if path.is_file():
            process_file(path)
        elif path.is_dir():
            for root, _, files in os.walk(path):
                for file in files:
                    if file.endswith('.py'):
                        process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
