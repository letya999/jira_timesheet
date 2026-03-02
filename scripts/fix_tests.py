import os
import re
from pathlib import Path


def process_test_file(filepath):
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        return

    original_content = content

    content = re.sub(r"Department\s*,\s*", "", content)
    content = re.sub(r"Division\s*,\s*", "", content)
    content = re.sub(r"Department", "OrgUnit", content)
    content = re.sub(r"Division", "OrgUnit", content)

    # Fix crud.org imports
    content = re.sub(r"from crud\.org import department.*", "from crud.org import org_unit as crud_org", content)

    if content != original_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed imports in {filepath}")


def main():
    test_dir = Path("backend/tests")
    for root, _, files in os.walk(test_dir):
        for file in files:
            if file.endswith(".py"):
                process_test_file(os.path.join(root, file))


if __name__ == "__main__":
    main()
