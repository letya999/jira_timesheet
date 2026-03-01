import streamlit as st
import time
from auth_utils import ensure_session, get_cookie_manager, delete_token, check_access
from api_client import get_me, fetch_notification_stats, change_password
from i18n import t, language_selector
from ui_components import notification_sidebar_summary

st.set_page_config(page_title=t("common.system_title"), page_icon="logo.png", layout="wide")

# 1. Initialize authentication and get cookie manager
# ensure_session with allow_wait=True should handle the cookie load and rerun properly
token, cookie_manager = ensure_session(allow_wait=True)

# 2. Define all pages
home_page = st.Page("views/0_Home.py", title=t("common.home"), icon="🏠", default=True)
journal_page = st.Page("views/1_Journal.py", title=t("common.journal"), icon="📝")
dashboard_page = st.Page("views/2_Dashboard.py", title=t("common.dashboard"), icon="📊")
reports_builder_page = st.Page("views/3_Report_Builder.py", title=t("common.reports"), icon="📈")
timesheet_page = st.Page("views/10_My_Timesheet.py", title=t("common.my_timesheet"), icon="🗓️")
org_page = st.Page("views/4_Org_Structure.py", title=t("common.org_structure"), icon="🌳")
employees_page = st.Page("views/5_Employees.py", title=t("common.employees"), icon="👥")
projects_page = st.Page("views/6_Projects.py", title=t("common.projects"), icon="🏗️")
control_sheet_page = st.Page("views/8_Control_Sheet.py", title=t("common.control_sheet"), icon="📋")
approvals_page = st.Page("views/8_Approvals.py", title=t("approvals.title"), icon="✅")
settings_page = st.Page("views/7_Settings.py", title=t("common.settings"), icon="⚙️")
login_page = st.Page("views/9_Login.py", title=t("common.login"), icon="🔐", url_path="login")
notifications_page = st.Page("views/11_Notifications.py", title=t("common.notifications"), icon="🔔")
leaves_page = st.Page("views/12_Leave_Requests.py", title=t("leaves.title"), icon="📅")
hr_module_page = st.Page("views/13_HR_Module.py", title=t("leaves.hr_module"), icon="🏢")

# 3. Handle Navigation and Role-based Access (RBAC)
if not token:
    # If not logged in, force navigation to Login page.
    def auth_redirect():
        st.switch_page(login_page)
        
    redirect_page = st.Page(auth_redirect, title="Redirecting...", default=True)
    st.navigation([redirect_page, login_page], position="hidden").run()
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
            t("common.nav_main"): [home_page, journal_page, timesheet_page, leaves_page, dashboard_page, notifications_page],
            t("common.nav_analytics"): [reports_builder_page],
            t("common.nav_admin"): [org_page, employees_page, projects_page, approvals_page, control_sheet_page, hr_module_page, settings_page]
        }
    else:
        # Minimal menu for regular employees
        pages_to_show = {
            t("common.nav_workspace"): [home_page, journal_page, timesheet_page, leaves_page, notifications_page],
            t("common.nav_reporting"): [reports_builder_page]
        }
    
    # Check if password change is required
    user_info = get_me()
    if user_info and user_info.get("needs_password_change"):
        st.warning(t("employees.password_change_required"))
        st.info(t("employees.password_change_msg"))
        
        with st.form("change_password_form"):
            new_pwd = st.text_input(t("employees.new_password"), type="password")
            conf_pwd = st.text_input(t("employees.confirm_password"), type="password")
            
            if st.form_submit_button(t("employees.change_password_btn"), type="primary"):
                if new_pwd != conf_pwd:
                    st.error(t("employees.passwords_dont_match"))
                elif len(new_pwd) < 6:
                    st.error(t("employees.password_too_short"))
                else:
                    if change_password(new_pwd):
                        st.success(t("employees.password_changed_success"))
                        time.sleep(1)
                        st.rerun()
                    else:
                        st.error(t("common.error"))
        st.stop()

    # IMPORTANT: Initialize navigation. 
    # If the user was on a specific subpage, st.navigation will respect the URL.
    pg = st.navigation(pages_to_show)

    # 4. Sidebar Profile & Logout
    # We only show this block if pg.title is NOT "Login" (prevents sidebar on login page)
    # and if we are authenticated.
    if token and pg.title != t("common.login"):
        with st.sidebar:
            language_selector()
            st.markdown("---")
            user_info = get_me()
            if user_info:
                user_display = user_info.get("full_name") or user_info.get("email")
                user_role = user_info.get("role", "User")
                st.markdown(f"**👤 {user_display}**")
                st.caption(f"{t('common.role')}: {user_role}")
                
                # Show unread notifications summary
                stats = fetch_notification_stats()
                if stats and stats.get("unread_count", 0) > 0:
                    notification_sidebar_summary(stats["unread_count"])
            else:
                st.markdown(f"**👤 {t('sidebar.profile')}**")
                
            if st.button(f"🚪 {t('common.logout')}", width="stretch"):
                delete_token(cookie_manager)

    # 5. Run the selected page
    pg.run()
