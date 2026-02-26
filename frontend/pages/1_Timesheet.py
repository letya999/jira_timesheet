import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_timesheet, add_manual_log, fetch_db_projects, fetch_project_sprints, fetch_project_versions
from auth_utils import ensure_session

st.set_page_config(page_title="Timesheet", layout="wide")

# Check for session/cookies
token = ensure_session()

st.title("Timesheet")

if not token:
    st.warning("Please login from the main page.")
    st.stop()

# --- Filters ---
with st.sidebar:
    st.header("Filters")
    
    # 1. Project Selection
    projects_data = fetch_db_projects(size=100)
    project_list = projects_data.get("items", [])
    project_options = {p["id"]: {"name": p["name"], "key": p["key"]} for p in project_list}
    project_options[0] = {"name": "Select a Project...", "key": "None"}
    
    selected_project_id = st.selectbox(
        "Project", 
        options=list(project_options.keys()), 
        index=list(project_options.keys()).index(0),
        format_func=lambda x: f"{project_options[x]['key']} - {project_options[x]['name']}" if x != 0 else project_options[x]["name"]
    )
    
    selected_sprint_id = 0
    selected_release_id = 0
    
    if selected_project_id != 0:
        proj_key = project_options[selected_project_id]["key"]
        # 2. Sprint/Release selection
        sprints = fetch_project_sprints(proj_key)
        if sprints:
            sprint_map = {s["id"]: s["name"] for s in sprints}
            selected_sprint_id = st.selectbox("Sprint", options=[0] + list(sprint_map.keys()), format_func=lambda x: sprint_map[x] if x != 0 else "All")
        
        versions = fetch_project_versions(proj_key)
        if versions:
            ver_map = {v["id"]: v["name"] for v in versions}
            selected_release_id = st.selectbox("Release / Version", options=[0] + list(ver_map.keys()), format_func=lambda x: ver_map[x] if x != 0 else "All")

    # 4. Category filter
    categories = ["All", "Vacation", "Sick Leave", "Bench", "Admin", "Training"]
    selected_category = st.selectbox("Category", options=categories)

    # 5. Date range selection
    start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=7))
    end_date = st.date_input("End Date", datetime.now().date())

    # 6. Pagination settings
    page_size = st.sidebar.select_slider("Logs per page", options=[25, 50, 100], value=50)

# --- Fetch data ---
proj_param = selected_project_id if selected_project_id != 0 else None
sprint_param = selected_sprint_id if selected_sprint_id != 0 else None
release_param = selected_release_id if selected_release_id != 0 else None
cat_param = selected_category if selected_category != "All" else None

# Handle page in session state for better experience
if "timesheet_page" not in st.session_state:
    st.session_state.timesheet_page = 1

# Reset page if filters change (naive check)
filter_hash = f"{proj_param}-{sprint_param}-{release_param}-{cat_param}-{start_date}-{end_date}-{page_size}"
if st.session_state.get("last_filter_hash") != filter_hash:
    st.session_state.timesheet_page = 1
    st.session_state.last_filter_hash = filter_hash

data = fetch_timesheet(
    start_date=start_date, 
    end_date=end_date, 
    project_id=proj_param,
    sprint_id=sprint_param,
    release_id=release_param,
    category=cat_param,
    page=st.session_state.timesheet_page,
    size=page_size
)

worklogs = data.get("items", [])
total_logs = data.get("total", 0)
total_pages = data.get("pages", 1)

st.write(f"### Worklogs (Total: {total_logs})")

if worklogs:
    jira_base_url = "https://neuralab.atlassian.net"
    
    formatted_logs = []
    for log in worklogs:
        employee_name = log.get("user_name", "Unknown")
        jira_acc_id = log.get("jira_account_id")
        employee_link = f"{jira_base_url}/jira/people/{jira_acc_id}" if jira_acc_id else None
        
        issue_key = log.get("issue_key") or ""
        issue_summary = log.get("issue_summary") or log.get("description") or "No description"
        task_url = f"{jira_base_url}/browse/{issue_key}" if issue_key else None
        
        formatted_logs.append({
            "Date": log["date"],
            "Employee": employee_name,
            "Jira": employee_link,
            "Key": task_url,
            "Task": issue_summary,
            "Hours": log["hours"],
            "Category": log.get("category") or ("Jira Task" if issue_key else "Manual")
        })
    
    df = pd.DataFrame(formatted_logs)
    
    st.dataframe(
        df,
        column_config={
            "Jira": st.column_config.LinkColumn("Jira", help="Link to Jira profile", display_text="👤 View"),
            "Key": st.column_config.LinkColumn(
                "Key", 
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
        cols = st.columns([1, 1, 3, 1, 1])
        with cols[1]:
            if st.button("Previous", disabled=st.session_state.timesheet_page <= 1):
                st.session_state.timesheet_page -= 1
                st.rerun()
        with cols[2]:
            st.write(f"Page {st.session_state.timesheet_page} of {total_pages}")
        with cols[3]:
            if st.button("Next", disabled=st.session_state.timesheet_page >= total_pages):
                st.session_state.timesheet_page += 1
                st.rerun()
else:
    st.info("No logs found for the selected filters.")

# --- Manual Log Form ---
st.divider()
st.subheader("Add Manual Log")
with st.form("manual_log_form"):
    category = st.selectbox("Category", ["Vacation", "Sick Leave", "Bench", "Admin", "Training"])
    log_date = st.date_input("Date")
    hours = st.number_input("Hours", min_value=0.5, max_value=24.0, step=0.5)
    description = st.text_input("Description (Optional)")
    
    submitted = st.form_submit_button("Add Log")
    if submitted:
        success = add_manual_log(log_date, hours, category, description)
        if success:
            st.success(f"Added {hours}h for {category} on {log_date}")
            st.rerun()
        else:
            st.error("Failed to add log")
