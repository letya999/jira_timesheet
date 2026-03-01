import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import (
    fetch_timesheet, add_manual_log, fetch_db_projects, 
    fetch_project_sprints, fetch_project_versions, get_headers,
    fetch_org_units, get_employees, search_issues
)
from auth_utils import ensure_session
from i18n import t
from state_manager import state

from ui_components import loading_skeleton, error_state, safe_api_call, worklog_card, pagination_ui

st.set_page_config(page_title=t("journal.title", page_icon="logo.png"), layout="wide")

# Check for session/cookies
token, _ = ensure_session()

if not token:
    st.title(t("journal.title"))
    st.warning(t("auth.please_login"))
    st.stop()

from api_client import get_me
user_info = get_me()
user_role = user_info.get("role") if user_info else "Employee"

# --- Dialog for Adding Worklog ---
@st.dialog(t("journal.add_worklog"))
def add_worklog_dialog():
    # 1. User Selection
    if user_role in ["Admin", "CEO", "PM"]:
        emp_data, err = safe_api_call(get_employees, size=1000, _headers=get_headers())
        if err:
            error_state(f"{t('common.error')}: {err}")
            return
            
        employees = emp_data.get("items", [])
        emp_options = {e["id"]: e["display_name"] for e in employees}
        selected_user_id = st.selectbox(t("common.employee"), options=list(emp_options.keys()), format_func=lambda x: emp_options[x])
    else:
        # Regular user can only log for themselves
        selected_user_id = user_info.get("jira_user_id")
        st.write(t("journal.logging_for", name=user_info.get('full_name')))
        if not selected_user_id:
            st.error(t("auth.no_jira_linked"))
            return

    # 2. Type Selection
    log_type = st.radio(t("common.type"), [t("journal.type_jira"), t("journal.type_manual")], horizontal=True)
    
    # 3. Category Selection
    if log_type == t("journal.type_jira"):
        category = "Development"
    else:
        categories_map = {
            "Development": t("common.category_dev"),
            "Meeting": t("common.category_meet"),
            "Left": t("common.category_leave"),
            "Documentation": t("common.category_doc"),
            "Design": t("common.category_design"),
            "Other": t("common.category_other")
        }
        category_key = st.selectbox(t("common.category"), options=list(categories_map.keys()), format_func=lambda x: categories_map[x], index=list(categories_map.keys()).index("Other"))
        category = category_key

    # 4. Task Selection (only for JIRA)
    issue_id = None
    
    if log_type == t("journal.type_jira"):
        st.info(t("journal.task_search_hint"))
        issue_search = st.text_input(t("journal.task_search"))
        if len(issue_search) >= 2:
            found_issues, i_err = safe_api_call(search_issues, issue_search)
            if i_err:
                st.error(t("common.error"))
            elif found_issues:
                issue_options = {i["id"]: f"{i['key']} - {i['summary']}" for i in found_issues}
                issue_id = st.selectbox(t("journal.select_task"), options=list(issue_options.keys()), format_func=lambda x: issue_options[x])
            else:
                st.warning(t("journal.no_tasks"))
    
    log_date = st.date_input(t("common.date"), value=datetime.now().date())
    hours = st.number_input(t("common.hours"), min_value=0.5, max_value=24.0, step=0.5, value=8.0)
    description = st.text_area(t("common.description"))
    
    if st.button(t("journal.submit_worklog"), type="primary", width="stretch"):
        if log_type == t("journal.type_jira") and not issue_id:
            st.error(t("journal.select_task_error"))
        else:
            with st.spinner(t("journal.submitting")):
                success = add_manual_log(log_date, hours, category, description, user_id=selected_user_id, issue_id=issue_id)
                if success:
                    st.success(t("journal.added_success", hours=hours, category=category))
                    st.session_state.last_journal_filter_hash = "" # Force refresh
                    st.rerun()
                else:
                    st.error(t("journal.failed_to_add"))

# --- Layout ---
col_title, col_refresh, col_btn = st.columns([0.6, 0.15, 0.25])
with col_title:
    st.title(t("journal.title"))
with col_refresh:
    if st.button(f"🔄 {t('common.refresh')}", width="stretch"):
        st.cache_data.clear()
        st.rerun()
with col_btn:
    if st.button(f"➕ {t('journal.add_worklog')}", type="primary", width="stretch"):
        add_worklog_dialog()

# --- Filters on Page (Expander) ---
with st.expander(f"🔍 {t('journal.filters_search')}", expanded=False):
    f_col1, f_col2, f_col3 = st.columns(3)
    
    with f_col1:
        start_date = st.date_input(t("journal.start_date"), datetime.now().date() - timedelta(days=90)) # default to 90 days to see "everything"
        end_date = st.date_input(t("journal.end_date"), datetime.now().date())
        
        headers = get_headers()
        projects_data, p_err = safe_api_call(fetch_db_projects, size=100, _headers=headers)
        
        project_options = {0: {"name": t("journal.all_projects"), "key": "All"}}
        if not p_err:
            project_list = projects_data.get("items", [])
            for p in project_list: project_options[p["id"]] = {"name": p["name"], "key": p["key"]}
        
        selected_project_id = st.selectbox(
            t("common.project"), 
            options=list(project_options.keys()), 
            index=0,
            format_func=lambda x: f"{project_options[x]['key']} - {project_options[x]['name']}" if x != 0 else project_options[x]["name"]
        )

    with f_col2:
        units_res, u_err = safe_api_call(fetch_org_units, _headers=headers)
        units = units_res or []
        unit_options = {0: t("journal.all_teams")}
        for u in units: unit_options[u["id"]] = u["name"]
        selected_team = st.selectbox(t("common.team"), options=list(unit_options.keys()), format_func=lambda x: unit_options[x])

    with f_col3:
        categories_map = {
            "All": t("common.all"),
            "Development": t("common.category_dev"),
            "Meeting": t("common.category_meet"),
            "Left": t("common.category_leave"),
            "Documentation": t("common.category_doc"),
            "Design": t("common.category_design"),
            "Other": t("common.category_other")
        }
        selected_category = st.selectbox(t("common.category"), options=list(categories_map.keys()), format_func=lambda x: categories_map[x])
        sort_order = st.radio(t("journal.sort_order"), options=["asc", "desc"], index=1, horizontal=True) # Default to DESC
        page_size = st.select_slider(t("journal.logs_per_page"), options=[10, 25, 50, 100], value=25)

# --- Fetch data ---
proj_param = selected_project_id if selected_project_id != 0 else None
cat_param = selected_category if selected_category != "All" else None
team_param = selected_team if selected_team != 0 else None

# Reset page if filters change
filter_hash = f"{proj_param}-{cat_param}-{start_date}-{end_date}-{page_size}-{team_param}-{sort_order}"
if st.session_state.get("last_journal_filter_hash") != filter_hash:
    state.set_page("journal", 1)
    st.session_state.last_journal_filter_hash = filter_hash

# --- MAIN LISTING WITH SKELETON ---
with st.spinner(t("journal.loading_logs")):
    # Using a container to swap content
    main_content = st.empty()
    with main_content.container():
        loading_skeleton(height=120, count=3)
        
    data, t_err = safe_api_call(
        fetch_timesheet,
        start_date=start_date, 
        end_date=end_date, 
        project_id=proj_param,
        category=cat_param,
        org_unit_id=team_param,
        sort_order=sort_order,
        page=state.get_page("journal"),
        size=page_size
    )

if t_err:
    main_content.empty()
    error_state(f"{t('common.error')}: {t_err}")
    st.stop()

worklogs = data.get("items", [])
total_logs = data.get("total", 0)
total_pages = data.get("pages", 1)

# Clear skeleton and show data
main_content.empty()
with main_content.container():
    st.write(t("journal.showing_logs", count=len(worklogs), total=total_logs))

    if worklogs:
        jira_base_url = "https://neuralab.atlassian.net"
        for log in worklogs:
            worklog_card(log, jira_base_url=jira_base_url)
            st.write("") # Spacer

        # Standard Pagination UI
        pagination_ui(
            current_page=state.get_page("journal"),
            total_pages=total_pages,
            on_change=lambda p: state.set_page("journal", p)
        )
    else:
        st.info(t("journal.no_logs_found"))
