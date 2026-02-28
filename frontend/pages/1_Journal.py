import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import (
    fetch_timesheet, add_manual_log, fetch_db_projects, 
    fetch_project_sprints, fetch_project_versions, get_headers,
    fetch_departments, get_employees, search_issues
)
from auth_utils import ensure_session
from state_manager import state

from ui_components import loading_skeleton, error_state, safe_api_call, worklog_card, pagination_ui

st.set_page_config(page_title="Journal", layout="wide")

# Check for session/cookies
token, _ = ensure_session()

if not token:
    st.title("Journal")
    st.warning("Please login from the main page.")
    st.stop()

from api_client import get_me
user_info = get_me()
user_role = user_info.get("role") if user_info else "Employee"

# --- Dialog for Adding Worklog ---
@st.dialog("Add Worklog")
def add_worklog_dialog():
    # 1. User Selection
    if user_role in ["Admin", "CEO", "PM"]:
        emp_data, err = safe_api_call(get_employees, size=1000, _headers=get_headers())
        if err:
            error_state(f"Failed to load employees: {err}")
            return
            
        employees = emp_data.get("items", [])
        emp_options = {e["id"]: e["display_name"] for e in employees}
        selected_user_id = st.selectbox("Employee", options=list(emp_options.keys()), format_func=lambda x: emp_options[x])
    else:
        # Regular user can only log for themselves
        selected_user_id = user_info.get("jira_user_id")
        st.write(f"Logging for: **{user_info.get('full_name')}**")
        if not selected_user_id:
            st.error("Your account is not linked to a Jira user.")
            return

    # 2. Type Selection
    log_type = st.radio("Type", ["JIRA", "MANUAL"], horizontal=True)
    
    # 3. Category Selection
    if log_type == "JIRA":
        category = "Development"
    else:
        categories = ["Development", "Meeting", "Left", "Documentation", "Design", "Other"]
        default_cat = "Other"
        category = st.selectbox("Category", categories, index=categories.index(default_cat))

    # 4. Task Selection (only for JIRA)
    issue_id = None
    
    if log_type == "JIRA":
        st.info("Search for a task by key or name (min 2 chars)")
        issue_search = st.text_input("Task Search")
        if len(issue_search) >= 2:
            found_issues, i_err = safe_api_call(search_issues, issue_search)
            if i_err:
                st.error("Error searching tasks")
            elif found_issues:
                issue_options = {i["id"]: f"{i['key']} - {i['summary']}" for i in found_issues}
                issue_id = st.selectbox("Select Task", options=list(issue_options.keys()), format_func=lambda x: issue_options[x])
            else:
                st.warning("No tasks found")
    
    log_date = st.date_input("Date", value=datetime.now().date())
    hours = st.number_input("Hours", min_value=0.5, max_value=24.0, step=0.5, value=8.0)
    description = st.text_area("Description / Comment")
    
    if st.button("Submit Worklog", type="primary", width="stretch"):
        if log_type == "JIRA" and not issue_id:
            st.error("Please select a task for Jira Task")
        else:
            with st.spinner("Submitting..."):
                success = add_manual_log(log_date, hours, category, description, user_id=selected_user_id, issue_id=issue_id)
                if success:
                    st.success(f"Added {hours}h for {category}")
                    st.session_state.last_journal_filter_hash = "" # Force refresh
                    st.rerun()
                else:
                    st.error("Failed to add log")

# --- Layout ---
col_title, col_refresh, col_btn = st.columns([0.7, 0.15, 0.15])
with col_title:
    st.title("Journal")
with col_refresh:
    if st.button("🔄 Refresh", width="stretch"):
        st.cache_data.clear()
        st.rerun()
with col_btn:
    if st.button("➕ Add Worklog", type="primary", width="stretch"):
        add_worklog_dialog()

# --- Filters on Page (Expander) ---
with st.expander("🔍 Filters & Search", expanded=False):
    f_col1, f_col2, f_col3 = st.columns(3)
    
    with f_col1:
        start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=90)) # default to 90 days to see "everything"
        end_date = st.date_input("End Date", datetime.now().date())
        
        headers = get_headers()
        projects_data, p_err = safe_api_call(fetch_db_projects, size=100, _headers=headers)
        
        project_options = {0: {"name": "All Projects", "key": "All"}}
        if not p_err:
            project_list = projects_data.get("items", [])
            for p in project_list: project_options[p["id"]] = {"name": p["name"], "key": p["key"]}
        
        selected_project_id = st.selectbox(
            "Project", 
            options=list(project_options.keys()), 
            index=0,
            format_func=lambda x: f"{project_options[x]['key']} - {project_options[x]['name']}" if x != 0 else project_options[x]["name"]
        )

    with f_col2:
        depts_res, d_err = safe_api_call(fetch_departments, _headers=headers)
        depts = depts_res or []
        dept_options = {0: "All Departments"}
        for d in depts: dept_options[d["id"]] = d["name"]
        selected_dept = st.selectbox("Department", options=list(dept_options.keys()), format_func=lambda x: dept_options[x])
        
        selected_div = 0
        selected_team = 0
        if selected_dept != 0:
            divisions = next((d["divisions"] for d in depts if d["id"] == selected_dept), [])
            div_options = {0: "All Divisions"}
            for dv in divisions: div_options[dv["id"]] = dv["name"]
            selected_div = st.selectbox("Division", options=list(div_options.keys()), format_func=lambda x: div_options[x])
            
            if selected_div != 0:
                teams = next((dv["teams"] for dv in divisions if dv["id"] == selected_div), [])
                team_options = {0: "All Teams"}
                for t in teams: team_options[t["id"]] = t["name"]
                selected_team = st.selectbox("Team", options=list(team_options.keys()), format_func=lambda x: team_options[x])
        else:
            st.selectbox("Division", options=[0], format_func=lambda x: "All Divisions", disabled=True)
            st.selectbox("Team", options=[0], format_func=lambda x: "All Teams", disabled=True)

    with f_col3:
        categories = ["All", "Development", "Meeting", "Left", "Documentation", "Design", "Other"]
        selected_category = st.selectbox("Category", options=categories)
        sort_order = st.radio("Sort by Created Date", options=["asc", "desc"], index=1, horizontal=True) # Default to DESC
        page_size = st.select_slider("Logs per page", options=[10, 25, 50, 100], value=25)

# --- Fetch data ---
proj_param = selected_project_id if selected_project_id != 0 else None
cat_param = selected_category if selected_category != "All" else None
dept_param = selected_dept if selected_dept != 0 else None
div_param = selected_div if selected_div != 0 else None
team_param = selected_team if selected_team != 0 else None

# Reset page if filters change
filter_hash = f"{proj_param}-{cat_param}-{start_date}-{end_date}-{page_size}-{dept_param}-{div_param}-{team_param}-{sort_order}"
if st.session_state.get("last_journal_filter_hash") != filter_hash:
    state.set_page("journal", 1)
    st.session_state.last_journal_filter_hash = filter_hash

# --- MAIN LISTING WITH SKELETON ---
with st.spinner("Loading logs..."):
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
        dept_id=dept_param,
        div_id=div_param,
        team_id=team_param,
        sort_order=sort_order,
        page=state.get_page("journal"),
        size=page_size
    )

if t_err:
    main_content.empty()
    error_state(f"Failed to fetch timesheet: {t_err}")
    st.stop()

worklogs = data.get("items", [])
total_logs = data.get("total", 0)
total_pages = data.get("pages", 1)

# Clear skeleton and show data
main_content.empty()
with main_content.container():
    st.write(f"Showing **{len(worklogs)}** of **{total_logs}** logs")

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
        st.info("No logs found for the selected filters.")
