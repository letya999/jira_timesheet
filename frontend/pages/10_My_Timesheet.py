import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, date
from api_client import (
    fetch_timesheet, get_my_period, submit_timesheet, 
    get_me, get_headers, add_manual_log, search_issues,
    get_employees
)
from auth_utils import ensure_session
from ui_components import safe_api_call, error_state

st.set_page_config(page_title="My Timesheet", layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title("My Timesheet")
    st.warning("Please login from the main page.")
    st.stop()

user_info = get_me()
if not user_info:
    st.error("Failed to fetch user info")
    st.stop()

# --- State Management for Dates ---
if "ts_target_date" not in st.session_state:
    st.session_state.ts_target_date = date.today()

def move_period(delta_days):
    st.session_state.ts_target_date += timedelta(days=delta_days)

# --- Fetch Period Info ---
period_info = get_my_period(st.session_state.ts_target_date)

if not period_info:
    st.error("Could not determine reporting period.")
    st.stop()

start_date = date.fromisoformat(period_info["start_date"])
end_date = date.fromisoformat(period_info["end_date"])
status = period_info["status"]

# --- UI Header ---
col_prev, col_dates, col_next, col_status, col_submit = st.columns([0.05, 0.45, 0.05, 0.2, 0.25])

with col_prev:
    if st.button("⬅️", width="stretch"):
        # Move back by the size of the period
        st.session_state.ts_target_date = start_date - timedelta(days=1)
        st.rerun()

with col_dates:
    st.subheader(f"{start_date.strftime('%d %b')} - {end_date.strftime('%d %b, %Y')}")

with col_next:
    if st.button("➡️", width="stretch"):
        st.session_state.ts_target_date = end_date + timedelta(days=1)
        st.rerun()

with col_status:
    color_map = {
        "OPEN": "blue",
        "SUBMITTED": "orange",
        "APPROVED": "green",
        "REJECTED": "red"
    }
    st.markdown(f"Status: **:{color_map.get(status, 'grey')}[{status}]**")

with col_submit:
    if status in ["OPEN", "REJECTED"]:
        if st.button("🚀 Submit Period", type="primary", width="stretch"):
            if submit_timesheet(start_date, end_date):
                st.success("Timesheet submitted!")
                st.rerun()
            else:
                st.error("Failed to submit")
    else:
        st.button("🚀 Submit Period", disabled=True, width="stretch")

# --- Fetch Data for the Grid ---
data = fetch_timesheet(
    start_date=start_date,
    end_date=end_date,
    team_id=None, # Explicitly none for "My Timesheet"
    size=1000 # Fetch all for this period
)
worklogs = data.get("items", [])

# Filter out worklogs logged after submission if submitted
if status in ["SUBMITTED", "APPROVED"]:
    submitted_at_str = period_info.get("submitted_at")
    if submitted_at_str:
        try:
            submitted_at = datetime.fromisoformat(submitted_at_str.replace("Z", "+00:00")).replace(tzinfo=None)
            filtered_worklogs = []
            for wl in worklogs:
                wl_created_at = datetime.fromisoformat(wl["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                if wl_created_at <= submitted_at:
                    filtered_worklogs.append(wl)
            worklogs = filtered_worklogs
        except Exception:
            pass

# --- Transform Data for Grid ---
# We want rows to be tasks and columns to be days
days_in_period = []
curr = start_date
while curr <= end_date:
    days_in_period.append(curr)
    curr += timedelta(days=1)

# Grouping
grid_data = {} # Key: (Category, Name), Value: {date: hours}

for wl in worklogs:
    cat = wl.get("category") or "Jira Task"
    
    if wl.get("type") == "JIRA":
        name = f"{wl.get('issue_key')} {wl.get('issue_summary')}".strip()
    else:
        name = wl.get("description") or "No description"
        
    key = (cat, name)
    
    if key not in grid_data:
        grid_data[key] = {d: 0.0 for d in days_in_period}
    
    wl_date = date.fromisoformat(wl["date"]) if isinstance(wl["date"], str) else wl["date"]
    if wl_date in grid_data[key]:
        grid_data[key][wl_date] += wl["hours"]

# --- Build DataFrame ---
rows = []
for (cat, name), day_values in grid_data.items():
    row = {
        "Category": cat,
        "Name": name
    }
    for d in days_in_period:
        row[d.strftime("%a %d")] = day_values[d]
    row["Total"] = sum(day_values.values())
    rows.append(row)

if rows:
    df = pd.DataFrame(rows)
    
    # Styling
    def highlight_positive(v):
        if isinstance(v, (int, float)) and v > 0:
            return 'background-color: #e6f3ff'
        return ''

    # Calculate daily totals
    daily_totals = {d.strftime("%a %d"): 0.0 for d in days_in_period}
    for row in rows:
        for d in days_in_period:
            daily_totals[d.strftime("%a %d")] += row[d.strftime("%a %d")]

    # Daily Totals Bar
    st.markdown("#### Daily Totals")
    total_cols = st.columns(len(days_in_period))
    for i, d in enumerate(days_in_period):
        val = daily_totals[d.strftime("%a %d")]
        total_cols[i].metric(d.strftime("%a %d"), f"{val}h", delta=None)

    st.markdown("### Worklogs")
    
    # Add totals row to dataframe for display or show it separately
    # Let's show the dataframe
    day_cols = [d.strftime("%a %d") for d in days_in_period]
    st.dataframe(
        df,
        width="stretch",
        hide_index=True,
        column_config={
            "Category": st.column_config.TextColumn(width="small"),
            "Name": st.column_config.TextColumn(width="large"),
            "Total": st.column_config.NumberColumn(format="%.1f", width="small"),
            **{d: st.column_config.NumberColumn(format="%.1f", width="small") for d in day_cols}
        }
    )
        
else:
    st.info("No worklogs found for this period.")

st.divider()
st.info("To add or edit worklogs, please use the **Journal** page.")
