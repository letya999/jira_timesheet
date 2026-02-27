import streamlit as st
from auth_utils import ensure_session, get_cookie_manager, delete_token, check_access
from api_client import get_me

st.set_page_config(page_title="Jira Timesheet System", layout="wide")

# 1. Initialize authentication and get cookie manager
# ensure_session with allow_wait=True should handle the cookie load and rerun properly
token, cookie_manager = ensure_session(allow_wait=True)

# 2. Define all pages
home_page = st.Page("pages/0_Home.py", title="Home", icon="🏠", default=True)
journal_page = st.Page("pages/1_Journal.py", title="Journal", icon="📝")
dashboard_page = st.Page("pages/2_Dashboard.py", title="Dashboard", icon="📊")
reports_builder_page = st.Page("pages/3_Report_Builder.py", title="Report Builder", icon="📈")
org_page = st.Page("pages/4_Org_Structure.py", title="Org Structure", icon="🌳")
employees_page = st.Page("pages/5_Employees.py", title="Employees", icon="👥")
projects_page = st.Page("pages/6_Projects.py", title="Projects", icon="🏗️")
control_sheet_page = st.Page("pages/8_Control_Sheet.py", title="Лист контроля", icon="📋")
settings_page = st.Page("pages/7_Settings.py", title="Settings", icon="⚙️")
login_page = st.Page("pages/9_Login.py", title="Login", icon="🔐")

# 3. Handle Navigation and Role-based Access (RBAC)
if not token:
    # If not logged in, force navigation to Login page.
    # Note: st.navigation with position="hidden" hides the sidebar entirely.
    st.navigation([login_page], position="hidden").run()
    st.stop()
else:
    # Define page groups based on role
    is_privileged = check_access(allowed_roles=["Admin", "CEO", "PM"])
    
    # Check if we are on the login page via URL (e.g. after refresh if state was lost)
    # Streamlit doesn't give a direct way to see the "current page" BEFORE navigation, 
    # but the navigation run() handles it based on URL.

    if is_privileged:
        # Full menu for privileged users
        pages_to_show = {
            "Main": [home_page, journal_page, dashboard_page],
            "Analytics": [reports_builder_page],
            "Administration": [org_page, employees_page, projects_page, control_sheet_page, settings_page]
        }
    else:
        # Minimal menu for regular employees
        pages_to_show = {
            "User Workspace": [home_page, journal_page],
            "Reporting": [reports_builder_page]
        }
    
    # IMPORTANT: Initialize navigation. 
    # If the user was on a specific subpage, st.navigation will respect the URL.
    pg = st.navigation(pages_to_show)

    # 4. Sidebar Profile & Logout
    # We only show this block if pg.title is NOT "Login" (prevents sidebar on login page)
    # and if we are authenticated.
    if token and pg.title != "Login":
        with st.sidebar:
            st.markdown("---")
            user_info = get_me()
            if user_info:
                user_display = user_info.get("full_name") or user_info.get("email")
                user_role = user_info.get("role", "User")
                st.markdown(f"**👤 {user_display}**")
                st.caption(f"Role: {user_role}")
            else:
                st.markdown("**👤 User Profile**")
                
            if st.button("🚪 Logout", use_container_width=True):
                delete_token(cookie_manager)

    # 5. Run the selected page
    pg.run()
