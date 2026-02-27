import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, date
from api_client import (
    fetch_timesheet, get_my_period, submit_timesheet, 
    get_me, get_headers
)
from auth_utils import ensure_session

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
col_prev, col_dates, col_next, col_status, col_submit = st.columns([0.1, 0.4, 0.1, 0.2, 0.2])

with col_prev:
    if st.button("⬅️", use_container_width=True):
        # Move back by the size of the period
        days = (end_date - start_date).days + 1
        st.session_state.ts_target_date = start_date - timedelta(days=1)
        st.rerun()

with col_dates:
    st.subheader(f"{start_date.strftime('%d %b')} - {end_date.strftime('%d %b, %Y')}")

with col_next:
    if st.button("➡️", use_container_width=True):
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
        if st.button("🚀 Submit Period", type="primary", use_container_width=True):
            if submit_timesheet(start_date, end_date):
                st.success("Timesheet submitted!")
                st.rerun()
            else:
                st.error("Failed to submit")
    else:
        st.button("🚀 Submit Period", disabled=True, use_container_width=True)

# --- Fetch Data for the Grid ---
data = fetch_timesheet(
    start_date=start_date,
    end_date=end_date,
    size=1000 # Fetch all for this period
)
worklogs = data.get("items", [])

# --- Transform Data for Grid ---
# We want rows to be tasks and columns to be days
days_in_period = []
curr = start_date
while curr <= end_date:
    days_in_period.append(curr)
    curr += timedelta(days=1)

# Grouping
grid_data = {} # Key: (Project, IssueKey, IssueSummary), Value: {date: hours}

for wl in worklogs:
    proj = wl.get("project_name") or "Manual"
    issue_key = wl.get("issue_key") or ""
    issue_sum = wl.get("issue_summary") or wl.get("category") or "No description"
    key = (proj, issue_key, issue_sum)
    
    if key not in grid_data:
        grid_data[key] = {d: 0.0 for d in days_in_period}
    
    wl_date = date.fromisoformat(wl["date"]) if isinstance(wl["date"], str) else wl["date"]
    if wl_date in grid_data[key]:
        grid_data[key][wl_date] += wl["hours"]

# --- Build DataFrame ---
rows = []
for (proj, issue_key, issue_sum), day_values in grid_data.items():
    row = {
        "Project": proj,
        "Task": f"{issue_key} {issue_sum}".strip()
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

    st.markdown("### Worklogs")
    
    # Calculate daily totals
    daily_totals = {d.strftime("%a %d"): 0.0 for d in days_in_period}
    for row in rows:
        for d in days_in_period:
            daily_totals[d.strftime("%a %d")] += row[d.strftime("%a %d")]
    
    # Add totals row to dataframe for display or show it separately
    # Let's show the dataframe
    day_cols = [d.strftime("%a %d") for d in days_in_period]
    st.dataframe(
        df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Project": st.column_config.TextColumn(width="small"),
            "Task": st.column_config.TextColumn(width="large"),
            "Total": st.column_config.NumberColumn(format="%.1f", width="small"),
            **{d: st.column_config.NumberColumn(format="%.1f", width="small") for d in day_cols}
        }
    )
    
    # Daily Totals Bar
    st.markdown("#### Daily Totals")
    total_cols = st.columns(len(days_in_period))
    for i, d in enumerate(days_in_period):
        val = daily_totals[d.strftime("%a %d")]
        color = "green" if val >= 8 else ("orange" if val > 0 else "red")
        total_cols[i].metric(d.strftime("%a %d"), f"{val}h", delta=None)
        
else:
    st.info("No worklogs found for this period. Use the 'Journal' page to add logs or sync from Jira.")

# --- Quick Add Shortcut ---
st.divider()
st.subheader("Quick Add Manual Log")
with st.form("quick_add"):
    c1, c2, c3 = st.columns([0.2, 0.2, 0.6])
    q_date = c1.date_input("Date", value=st.session_state.ts_target_date)
    q_hours = c2.number_input("Hours", min_value=0.0, step=0.5, value=8.0)
    q_cat = c3.selectbox("Category", ["Admin", "Meeting", "Vacation", "Sick Leave", "Bench", "Training"])
    q_desc = st.text_input("Description")
    
    if st.form_submit_button("Add Log", use_container_width=True):
        from api_client import add_manual_log
        if add_manual_log(q_date, q_hours, q_cat, q_desc):
            st.success("Log added")
            st.rerun()
        else:
            st.error("Failed to add log")
