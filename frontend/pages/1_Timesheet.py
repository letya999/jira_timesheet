import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_timesheet, add_manual_log, fetch_db_projects, fetch_project_sprints, fetch_project_versions

st.set_page_config(page_title="Timesheet", layout="wide")
st.title("Timesheet")

if "token" not in st.session_state or not st.session_state["token"]:
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

    # 3. Date range selection
    start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=7))
    end_date = st.date_input("End Date", datetime.now().date())

st.write(f"### Timesheet Matrix View ({start_date} to {end_date})")

# --- Fetch data ---
proj_param = selected_project_id if selected_project_id != 0 else None
sprint_param = selected_sprint_id if selected_sprint_id != 0 else None
release_param = selected_release_id if selected_release_id != 0 else None

data = fetch_timesheet(
    start_date=start_date, 
    end_date=end_date, 
    project_id=proj_param,
    sprint_id=sprint_param,
    release_id=release_param
)

worklogs = data.get("worklogs", [])

all_logs = []
for log in worklogs:
    all_logs.append({
        "Date": log["date"],
        "Hours": log["hours"],
        "Employee": log.get("user_name", "Unknown"),
        "Task": log.get("issue_key") or log.get("category", "N/A"),
        "Type": log["type"],
        "Summary": log.get("issue_summary") or log.get("description", ""),
    })

if all_logs:
    df = pd.DataFrame(all_logs)
    # Ensure Date is string or formatted
    df["Date"] = pd.to_datetime(df["Date"]).dt.date
    
    # Aggregated matrix view
    # Index depends on whether we view a specific project or just personal
    index_cols = ["Employee", "Type", "Task", "Summary"] if selected_project_id != 0 else ["Type", "Task", "Summary"]
    
    matrix = df.pivot_table(
        index=index_cols, 
        columns="Date", 
        values="Hours", 
        aggfunc="sum", 
        fill_value=0
    )
    
    # Sort columns by date
    matrix = matrix.reindex(sorted(matrix.columns), axis=1)
    
    # Add Total column
    matrix["Total"] = matrix.sum(axis=1)
    
    st.dataframe(matrix, use_container_width=True)
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
