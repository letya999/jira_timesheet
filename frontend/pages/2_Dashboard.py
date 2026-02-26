import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_dashboard, get_export_url, get_headers
import requests
from auth_utils import ensure_session

# Check for session/cookies
token = ensure_session()

st.title("PM / CEO Dashboard")

if not token:
    st.warning("Please login from the main page.")
    st.stop()

col1, col2 = st.columns(2)
with col1:
    start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=30))
with col2:
    end_date = st.date_input("End Date", datetime.now().date())

st.write("Aggregated views and CapEx/OpEx reporting")

data = fetch_dashboard(start_date, end_date)
if data:
    df = pd.DataFrame(data)
    
    view_type = st.selectbox("Select View", ["Raw Data", "Team Utilization (Hours by Team)", "Financial Pivot (By Dept/Division)"])
    
    if view_type == "Raw Data":
        st.dataframe(df)
        
    elif view_type == "Team Utilization (Hours by Team)":
        pivot = df.pivot_table(index="Team", columns="Type", values="Hours", aggfunc="sum", fill_value=0)
        st.dataframe(pivot)
        
    elif view_type == "Financial Pivot (By Dept/Division)":
        pivot = df.pivot_table(index=["Department", "Team", "User"], columns="Category", values="Hours", aggfunc="sum", fill_value=0)
        st.dataframe(pivot)

else:
    st.info("No data available for the selected period. Ensure you have the required role (Admin/PM/CEO) to view this.")

st.divider()

if st.button("Prepare Export to Excel (.xlsx)"):
    # Since we can't easily download directly via button click due to Streamlit architecture, 
    # we make an API call to get bytes and use st.download_button
    export_url = get_export_url(start_date, end_date)
    headers = get_headers()
    response = requests.get(export_url, headers=headers)
    if response.status_code == 200:
        st.download_button(
            label="Download Excel",
            data=response.content,
            file_name=f"Timesheet_Report_{start_date}_to_{end_date}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    else:
        st.error("Failed to generate export.")