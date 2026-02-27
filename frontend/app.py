import streamlit as st
from auth_utils import ensure_session, get_cookie_manager, delete_token
from api_client import get_me

st.set_page_config(page_title="Jira Timesheet System", layout="wide")

# 1. Initialize authentication and get cookie manager
token, cookie_manager = ensure_session(allow_wait=True)

# 2. Define pages for navigation
# Using st.Page allows us to control the sidebar labels and icons
home_page = st.Page("pages/0_Home.py", title="Home", icon="🏠", default=True)
journal_page = st.Page("pages/1_Journal.py", title="Journal", icon="📝")
dashboard_page = st.Page("pages/2_Dashboard.py", title="Dashboard", icon="📊")
reports_page = st.Page("pages/3_Report_Builder.py", title="Report Builder", icon="📈")
org_page = st.Page("pages/4_Org_Structure.py", title="Org Structure", icon="🌳")
employees_page = st.Page("pages/5_Employees.py", title="Employees", icon="👥")
projects_page = st.Page("pages/6_Projects.py", title="Projects", icon="🏗️")
settings_page = st.Page("pages/7_Settings.py", title="Settings", icon="⚙️")

# 3. Create the navigation menu
if not token:
    # If not logged in, only show the Home (Login) page
    pg = st.navigation([home_page], position="hidden")
else:
    # If logged in, show all pages grouped in sections
    # Note: We can hide 'Home' from the list if desired by not including it or putting it in a hidden section
    pg = st.navigation({
        "Main": [home_page, journal_page, dashboard_page],
        "Analytics": [reports_page],
        "Administration": [org_page, employees_page, projects_page, settings_page]
    })

# 4. Sidebar Profile & Logout (at the bottom)
if token:
    with st.sidebar:
        st.markdown("---")
        # Try to get user profile for the sidebar
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
