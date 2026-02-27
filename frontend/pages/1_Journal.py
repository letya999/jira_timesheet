import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import (
    fetch_timesheet, add_manual_log, fetch_db_projects, 
    fetch_project_sprints, fetch_project_versions, get_headers,
    fetch_departments
)
from auth_utils import ensure_session

st.set_page_config(page_title="Journal", layout="wide")

# Check for session/cookies
token = ensure_session()

if not token:
    st.title("Journal")
    st.warning("Please login from the main page.")
    st.stop()

# --- Dialog for Adding Worklog ---
@st.dialog("Add Worklog")
def add_worklog_dialog():
    with st.form("manual_log_form_dialog", clear_on_submit=True):
        category = st.selectbox("Category", ["Vacation", "Sick Leave", "Bench", "Admin", "Training"])
        log_date = st.date_input("Date", value=datetime.now().date())
        hours = st.number_input("Hours", min_value=0.5, max_value=24.0, step=0.5, value=8.0)
        description = st.text_area("Description (Optional)")
        
        submitted = st.form_submit_button("Submit")
        if submitted:
            success = add_manual_log(log_date, hours, category, description)
            if success:
                st.success(f"Added {hours}h for {category} on {log_date}")
                st.session_state.last_journal_filter_hash = "" # Force refresh
                st.rerun()
            else:
                st.error("Failed to add log")

# --- Layout ---
col_title, col_btn = st.columns([0.8, 0.2])
with col_title:
    st.title("Journal")
with col_btn:
    if st.button("➕ Add Worklog", type="primary", use_container_width=True):
        add_worklog_dialog()

# --- Filters on Page (Expander) ---
with st.expander("🔍 Filters & Search", expanded=False):
    f_col1, f_col2, f_col3 = st.columns(3)
    
    with f_col1:
        start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=90)) # default to 90 days to see "everything"
        end_date = st.date_input("End Date", datetime.now().date())
        
        headers = get_headers()
        projects_data = fetch_db_projects(size=100, _headers=headers)
        project_list = projects_data.get("items", [])
        project_options = {0: {"name": "All Projects", "key": "All"}}
        for p in project_list: project_options[p["id"]] = {"name": p["name"], "key": p["key"]}
        
        selected_project_id = st.selectbox(
            "Project", 
            options=list(project_options.keys()), 
            index=0,
            format_func=lambda x: f"{project_options[x]['key']} - {project_options[x]['name']}" if x != 0 else project_options[x]["name"]
        )

    with f_col2:
        depts = fetch_departments(_headers=headers)
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
        categories = ["All", "Vacation", "Sick Leave", "Bench", "Admin", "Training", "Jira Task"]
        selected_category = st.selectbox("Category", options=categories)
        sort_order = st.radio("Sort by Date", options=["asc", "desc"], index=1, horizontal=True) # Default to DESC
        page_size = st.select_slider("Logs per page", options=[25, 50, 100, 500], value=100)

# --- Fetch data ---
proj_param = selected_project_id if selected_project_id != 0 else None
cat_param = selected_category if selected_category != "All" else None
dept_param = selected_dept if selected_dept != 0 else None
div_param = selected_div if selected_div != 0 else None
team_param = selected_team if selected_team != 0 else None

# Handle page in session state
if "journal_page" not in st.session_state:
    st.session_state.journal_page = 1

# Reset page if filters change
filter_hash = f"{proj_param}-{cat_param}-{start_date}-{end_date}-{page_size}-{dept_param}-{div_param}-{team_param}-{sort_order}"
if st.session_state.get("last_journal_filter_hash") != filter_hash:
    st.session_state.journal_page = 1
    st.session_state.last_journal_filter_hash = filter_hash

data = fetch_timesheet(
    start_date=start_date, 
    end_date=end_date, 
    project_id=proj_param,
    category=cat_param,
    dept_id=dept_param,
    div_id=div_param,
    team_id=team_param,
    sort_order=sort_order,
    page=st.session_state.journal_page,
    size=page_size
)

worklogs = data.get("items", [])
total_logs = data.get("total", 0)
total_pages = data.get("pages", 1)

st.write(f"Showing **{len(worklogs)}** of **{total_logs}** logs")

if worklogs:
    jira_base_url = "https://neuralab.atlassian.net"
    
    formatted_logs = []
    for log in worklogs:
        employee_name = log.get("user_name", "Unknown")
        issue_key = log.get("issue_key") or ""
        issue_summary = log.get("issue_summary") or log.get("description") or "No description"
        task_url = f"{jira_base_url}/browse/{issue_key}" if issue_key else None
        
        formatted_logs.append({
            "Date": log["date"],
            "Employee": employee_name,
            "Project": log.get("project_name", "N/A"),
            "Task": issue_summary,
            "Hours": log["hours"],
            "Category": log.get("category") or ("Jira Task" if issue_key else "Manual"),
            "Key": task_url
        })
    
    df = pd.DataFrame(formatted_logs)
    
    st.dataframe(
        df,
        column_config={
            "Key": st.column_config.LinkColumn(
                "Jira", 
                help="Click to view Jira issue", 
                display_text=r"browse/([^/]+)$"
            ),
            "Date": st.column_config.DateColumn("Date", format="YYYY-MM-DD"),
            "Hours": st.column_config.NumberColumn("Hours", format="%.2f h"),
            "Task": st.column_config.TextColumn("Task", width="large"),
        },
        use_container_width=True,
        hide_index=True
    )
    
    # Simple pagination UI
    if total_pages > 1:
        st.markdown("---")
        cols = st.columns([1, 1, 3, 1, 1])
        with cols[1]:
            if st.button("Previous", disabled=st.session_state.journal_page <= 1):
                st.session_state.journal_page -= 1
                st.rerun()
        with cols[2]:
            st.write(f"Page {st.session_state.journal_page} of {total_pages}")
        with cols[3]:
            if st.button("Next", disabled=st.session_state.journal_page >= total_pages):
                st.session_state.journal_page += 1
                st.rerun()
else:
    st.info("No logs found for the selected filters.")
