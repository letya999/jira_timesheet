import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_timesheet, add_manual_log

st.title("Timesheet")

if "token" not in st.session_state or not st.session_state["token"]:
    st.warning("Please login from the main page.")
    st.stop()

# Date range selection
col1, col2 = st.columns(2)
with col1:
    start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=7))
with col2:
    end_date = st.date_input("End Date", datetime.now().date())

st.write("### Your Timesheet Matrix View")

# Fetch data
data = fetch_timesheet(start_date, end_date)
jira_logs = data.get("jira_logs", [])
manual_logs = data.get("manual_logs", [])

all_logs = []
for log in jira_logs:
    all_logs.append({
        "Date": log["date"],
        "Hours": log["time_spent_hours"],
        "Task": log["issue_key"],
        "Type": "Jira"
    })
for log in manual_logs:
    all_logs.append({
        "Date": log["date"],
        "Hours": log["time_spent_hours"],
        "Task": log["category"],
        "Type": "Manual"
    })

if all_logs:
    df = pd.DataFrame(all_logs)
    # Basic matrix view: rows = Task, columns = Date
    matrix = df.pivot_table(index=["Type", "Task"], columns="Date", values="Hours", aggfunc="sum", fill_value=0)
    st.dataframe(matrix)
else:
    st.info("No logs found for the selected period.")

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