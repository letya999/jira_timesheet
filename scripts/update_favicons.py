import os
import re

views_dir = r"c:\Users\User\a_projects\jira_timesheet\frontend\views"
logo_name = "logo.png"

for filename in os.listdir(views_dir):
    if filename.endswith(".py"):
        filepath = os.path.join(views_dir, filename)
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        # Pattern to find st.set_page_config
        # We want to add page_icon="logo.png" if it's not there
        if "st.set_page_config" in content:
            if 'page_icon="' not in content and "page_icon='" not in content:
                # Add page_icon before layout or at the end
                new_content = re.sub(
                    r"(st\.set_page_config\([^)]*)(\))",
                    r'\1, page_icon="' + logo_name + r'"\2',
                    content
                )
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filename}")
            else:
                # Already has page_icon, replace it with logo.png if it's an emoji or something else?
                # The user asked to use the NEW logo.
                new_content = re.sub(
                     r"page_icon\s*=\s*['\"][^'\"]*['\"]",
                     f'page_icon="{logo_name}"',
                     content
                )
                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filename} (replaced icon)")
