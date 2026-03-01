import streamlit as st
import pandas as pd
from datetime import datetime, timedelta, date
from api_client import (
    fetch_my_teams, fetch_team_periods, approve_timesheet, 
    get_me, fetch_timesheet, get_employees
)
from auth_utils import ensure_session
from i18n import t

st.set_page_config(page_title=t("approvals.title"), layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title(t("approvals.title"))
    st.warning(t("auth.please_login"))
    st.stop()

user_info = get_me()
if not user_info or user_info.get("role") not in ["Admin", "PM", "CEO"]:
    st.error(t("auth.no_permission"))
    st.stop()

st.title(t("approvals.title"))

# --- Filters ---
col1, col2 = st.columns(2)

with col1:
    my_teams = fetch_my_teams()
    if not my_teams and user_info.get("role") != "Admin":
        st.warning(t("approvals.not_pm_warning"))
        st.stop()
    
    # Admins see all teams from fetch_my_teams(), PMs only theirs.
    team_options = {t_item["id"]: t_item["name"] for t_item in my_teams}
    selected_org_unit_id = st.selectbox(t("common.team"), options=list(team_options.keys()), format_func=lambda x: team_options[x])

with col2:
    # Determine period based on team setting
    selected_team = next((t_item for t_item in my_teams if t_item["id"] == selected_org_unit_id), None)
    if not selected_team and user_info.get("role") == "Admin":
        # Fallback for admin
        selected_team = {"reporting_period": "weekly"}
    
    period_type = selected_team.get("reporting_period", "weekly")
    
    # Date selection to find the period
    ref_date = st.date_input(t("approvals.ref_date"), date.today())
    
    # Calculate period dates (same logic as backend for consistency)
    if period_type == "weekly":
        start_date = ref_date - timedelta(days=ref_date.weekday())
        end_date = start_date + timedelta(days=6)
    elif period_type == "monthly":
        start_date = ref_date.replace(day=1)
        import calendar
        _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
        end_date = ref_date.replace(day=last_day)
    else: # bi-weekly
        if ref_date.day <= 15:
            start_date = ref_date.replace(day=1)
            end_date = ref_date.replace(day=15)
        else:
            start_date = ref_date.replace(day=16)
            import calendar
            _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
            end_date = ref_date.replace(day=last_day)

st.info(t("approvals.reviewing_period", start=start_date, end=end_date, type=t(f"org.{period_type.replace('-', '')}")))

# --- Fetch Data ---
# 1. Periods statuses
team_periods = fetch_team_periods(start_date, end_date, org_unit_id=selected_org_unit_id)
period_map = {p["user_id"]: p for p in team_periods}

# 2. OrgUnit members
# This is a bit tricky, we need users in this team. 
# For now, let's fetch all users and filter. 
# Ideally we have a /org/teams/{id}/members endpoint.
from api_client import get_all_users
users_data = get_all_users(size=1000)
team_members = [u for u in users_data.get("items", []) if u.get("team_id") == selected_org_unit_id]

if not team_members:
    st.warning(t("approvals.no_members"))
    st.stop()

# 3. Fetch all worklogs for the team to show hours
# We use the existing fetch_timesheet with team_id filter
worklogs_data = fetch_timesheet(start_date=start_date, end_date=end_date, org_unit_id=selected_org_unit_id, size=5000)
worklogs = worklogs_data.get("items", [])

# Calculate hours per user
user_hours = {}
for wl in worklogs:
    uid = wl.get("user_id") # Note: this is jira_user_id in worklog but we need User.id
    # Wait, the worklog has user_id which is jira_user_id. 
    # The TimesheetPeriod is linked to User.id.
    # We need to map JiraUser to User.
    pass

# Refined grouping: use display_name for now or map correctly
user_totals = {}
for wl in worklogs:
    name = wl.get("user_name")
    user_totals[name] = user_totals.get(name, 0.0) + wl.get("hours", 0.0)

# --- Display List ---
st.subheader(t("approvals.member_status"))

for member in team_members:
    m_id = member["id"]
    m_name = member["full_name"]
    m_period = period_map.get(m_id)
    m_status = m_period["status"] if m_period else "OPEN"
    m_hours = user_totals.get(member.get("full_name"), 0.0) # This matching is loose but okay for MVP
    
    with st.container(border=True):
        c1, c2, c3, c4 = st.columns([0.3, 0.2, 0.2, 0.3])
        c1.markdown(f"**{m_name}**")
        c2.metric(t("common.hours"), f"{m_hours}h")
        
        status_colors = {"OPEN": "blue", "SUBMITTED": "orange", "APPROVED": "green", "REJECTED": "red"}
        status_label = t(f"common.status_{m_status.lower()}")
        c3.markdown(f"{t('common.status')}: **:{status_colors.get(m_status, 'grey')}[{status_label}]**")
        
        if m_status == "SUBMITTED":
            with c4:
                btn_col1, btn_col2 = st.columns(2)
                if btn_col1.button(f"✅ {t('common.approve')}", key=f"app_{m_id}"):
                    if approve_timesheet(m_period["id"], "APPROVED"):
                        st.success(f"{t('common.approve')} {m_name}")
                        st.rerun()
                if btn_col2.button(f"❌ {t('common.reject')}", key=f"rej_{m_id}"):
                    # Open a small popover or dialog for comment? 
                    # For MVP just reject
                    if approve_timesheet(m_period["id"], "REJECTED", comment=t("approvals.rejected_by_pm")):
                        st.warning(f"{t('common.reject')} {m_name}")
                        st.rerun()
        elif m_status == "APPROVED":
            if c4.button(f"⏪ {t('approvals.revoke_approval')}", key=f"rev_{m_id}"):
                if approve_timesheet(m_period["id"], "REJECTED", comment=t("approvals.revoked_msg")):
                    st.rerun()
        else:
            c4.write(t("approvals.waiting_submission"))
            
    # Optional: Detailed view
    with st.expander(t("common.details") + f" {m_name}"):
        member_logs = [wl for wl in worklogs if wl.get("user_name") == m_name]
        if member_logs:
            m_df = pd.DataFrame(member_logs)[["date", "hours", "project_name", "issue_key", "description"]]
            m_df.columns = [t("common.date"), t("common.hours"), t("common.project"), t("journal.task_search"), t("common.description")]
            st.dataframe(m_df, width="stretch", hide_index=True)
        else:
            st.write(t("journal.no_logs_found"))
