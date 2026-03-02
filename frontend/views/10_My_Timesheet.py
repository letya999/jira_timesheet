from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st
from api_client import (
    add_manual_log,
    fetch_holidays,
    fetch_timesheet,
    get_employees,
    get_headers,
    get_me,
    get_my_period,
    search_issues,
    submit_timesheet,
)
from auth_utils import ensure_session
from i18n import t
from ui_components import error_state, safe_api_call

st.set_page_config(page_title=t("timesheet.title", page_icon="logo.png"), layout="wide")

# Check for session
token, _ = ensure_session()

if not token:
    st.title(t("timesheet.title"))
    st.warning(t("auth.please_login"))
    st.stop()

user_info = get_me()
if not user_info:
    st.error(t("auth.failed_user_info"))
    st.stop()

user_role = user_info.get("role") if user_info else "Employee"


def _select_user(user_role, user_info):
    if user_role in ["Admin", "CEO", "PM"]:
        emp_data, err = safe_api_call(get_employees, size=1000, _headers=get_headers())
        if err:
            error_state(f"{t('common.error')}: {err}")
            return None

        employees = emp_data.get("items", [])
        emp_options = {e["id"]: e["display_name"] for e in employees}
        return st.selectbox(
            t("common.employee"), options=list(emp_options.keys()), format_func=lambda x: emp_options[x]
        )
    else:
        # Regular user can only log for themselves
        selected_user_id = user_info.get("jira_user_id")
        st.write(t("journal.logging_for", name=user_info.get("full_name")))
        if not selected_user_id:
            st.error(t("auth.no_jira_linked"))
        return selected_user_id


def _select_category(log_type):
    if log_type == t("journal.type_jira"):
        return "Development"

    categories_map = {
        "Development": t("common.category_dev"),
        "Meeting": t("common.category_meet"),
        "Left": t("common.category_leave"),
        "Documentation": t("common.category_doc"),
        "Design": t("common.category_design"),
        "Other": t("common.category_other"),
    }
    return st.selectbox(
        t("common.category"),
        options=list(categories_map.keys()),
        format_func=lambda x: categories_map[x],
        index=list(categories_map.keys()).index("Other"),
    )


def _select_task():
    st.info(t("journal.task_search_hint"))
    issue_search = st.text_input(t("journal.task_search"))
    if len(issue_search) >= 2:
        found_issues, i_err = safe_api_call(search_issues, issue_search)
        if i_err:
            st.error(t("common.error"))
        elif found_issues:
            issue_options = {i["id"]: f"{i['key']} - {i['summary']}" for i in found_issues}
            return st.selectbox(
                t("journal.select_task"), options=list(issue_options.keys()), format_func=lambda x: issue_options[x]
            )
        else:
            st.warning(t("journal.no_tasks"))
    return None


# --- Dialog for Adding Worklog ---
@st.dialog(t("journal.add_worklog"))
def add_worklog_dialog():
    # 1. User Selection
    selected_user_id = _select_user(user_role, user_info)
    if not selected_user_id:
        return

    # 2. Type Selection
    log_type = st.radio(t("common.type"), [t("journal.type_jira"), t("journal.type_manual")], horizontal=True)

    # 3. Category Selection
    category = _select_category(log_type)

    # 4. Task Selection (only for JIRA)
    issue_id = None
    if log_type == t("journal.type_jira"):
        issue_id = _select_task()

    log_date = st.date_input(t("common.date"), value=st.session_state.ts_target_date)
    hours = st.number_input(t("common.hours"), min_value=0.5, max_value=24.0, step=0.5, value=8.0)
    description = st.text_area(t("common.description"))

    if st.button(t("journal.submit_worklog"), type="primary", width="stretch"):
        if log_type == t("journal.type_jira") and not issue_id:
            st.error(t("journal.select_task_error"))
        else:
            with st.spinner(t("journal.submitting")):
                success = add_manual_log(
                    log_date, hours, category, description, user_id=selected_user_id, issue_id=issue_id
                )
                if success:
                    st.success(t("journal.added_success", hours=hours, category=category))
                    if "last_journal_filter_hash" in st.session_state:
                        st.session_state.last_journal_filter_hash = ""  # Force refresh
                    st.rerun()
                else:
                    st.error(t("journal.failed_to_add"))


# --- State Management for Dates ---
if "ts_target_date" not in st.session_state:
    st.session_state.ts_target_date = date.today()


def move_period(delta_days):
    st.session_state.ts_target_date += timedelta(days=delta_days)


# --- Fetch Period Info ---
period_info = get_my_period(st.session_state.ts_target_date)

if not period_info:
    st.error(t("timesheet.period_error"))
    st.stop()

start_date = date.fromisoformat(period_info["start_date"])
end_date = date.fromisoformat(period_info["end_date"])
status = period_info["status"]

# --- Fetch Holidays ---
holidays_list = fetch_holidays(start_date, end_date)
holiday_dates = {date.fromisoformat(h["date"]): h["name"] for h in holidays_list if h["is_holiday"]}

# --- UI Header ---
col_prev, col_dates, col_next, col_status, col_submit, col_add = st.columns([0.05, 0.35, 0.05, 0.15, 0.2, 0.2])

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
    color_map = {"OPEN": "blue", "SUBMITTED": "orange", "APPROVED": "green", "REJECTED": "red"}
    status_label = t(f"common.status_{status.lower()}")
    st.markdown(f"{t('common.status')}: **:{color_map.get(status, 'grey')}[{status_label}]**")

with col_submit:
    if status in ["OPEN", "REJECTED"]:
        if st.button(f"🚀 {t('timesheet.submit_button')}", type="primary", width="stretch"):
            if submit_timesheet(start_date, end_date):
                st.success(t("timesheet.submitted"))
                st.rerun()
            else:
                st.error(t("timesheet.submit_failed"))
    else:
        st.button(f"🚀 {t('timesheet.submit_button')}", disabled=True, width="stretch")

with col_add:
    if st.button(f"➕ {t('journal.add_worklog')}", type="primary", width="stretch"):
        add_worklog_dialog()

# --- Fetch Data for the Grid ---
user_jira_id = user_info.get("jira_user_id")
if user_jira_id is None:
    # If user has no jira account linked, they should see 0 logs, not all logs
    user_jira_id = -1

data = fetch_timesheet(
    start_date=start_date,
    end_date=end_date,
    user_id=user_jira_id,
    org_unit_id=None,  # Explicitly none for "My Timesheet"
    size=1000,  # Fetch all for this period
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
grid_data = {}  # Key: (Category, Name), Value: {date: hours}

for wl in worklogs:
    cat = wl.get("category") or t("ui.jira_task")

    if wl.get("type") == "JIRA":
        name = f"{wl.get('issue_key')} {wl.get('issue_summary')}".strip()
    else:
        name = wl.get("description") or t("common.description")

    key = (cat, name)

    if key not in grid_data:
        grid_data[key] = {d: 0.0 for d in days_in_period}

    wl_date = date.fromisoformat(wl["date"]) if isinstance(wl["date"], str) else wl["date"]
    if wl_date in grid_data[key]:
        grid_data[key][wl_date] += wl["hours"]

# --- Build DataFrame ---
rows = []
for (cat, name), day_values in grid_data.items():
    row = {"Category": cat, "Name": name}
    for d in days_in_period:
        row[d.strftime("%a %d")] = day_values[d]
    row["Total"] = sum(day_values.values())
    rows.append(row)

if rows:
    df = pd.DataFrame(rows)

    # Styling
    def highlight_positive(v):
        if isinstance(v, (int, float)) and v > 0:
            return "background-color: #e6f3ff"
        return ""

    # Calculate daily totals
    daily_totals = {d.strftime("%a %d"): 0.0 for d in days_in_period}
    for row in rows:
        for d in days_in_period:
            daily_totals[d.strftime("%a %d")] += row[d.strftime("%a %d")]

    # Daily Totals Bar
    st.markdown(f"#### {t('timesheet.daily_totals')}")
    total_cols = st.columns(len(days_in_period))
    for i, d in enumerate(days_in_period):
        val = daily_totals[d.strftime("%a %d")]

        # Holiday indicator
        h_name = holiday_dates.get(d)
        is_weekend = d.weekday() >= 5

        label = d.strftime("%a %d")
        if h_name:
            label = f"🎁 {label}"
            tooltip = f"Holiday: {h_name}"
        elif is_weekend:
            label = f"🏖️ {label}"
            tooltip = "Weekend"
        else:
            tooltip = None

        total_cols[i].metric(label, f"{val}h", delta=None, help=tooltip)

    st.markdown(f"### {t('timesheet.worklogs')}")

    # Add totals row to dataframe for display or show it separately
    # Let's show the dataframe
    day_cols = [d.strftime("%a %d") for d in days_in_period]
    st.dataframe(
        df,
        width="stretch",
        hide_index=True,
        column_config={
            "Category": st.column_config.TextColumn(label=t("common.category"), width="small"),
            "Name": st.column_config.TextColumn(label=t("common.name"), width="large"),
            "Total": st.column_config.NumberColumn(label=t("common.total"), format="%.1f", width="small"),
            **{d: st.column_config.NumberColumn(format="%.1f", width="small") for d in day_cols},
        },
    )

else:
    st.info(t("timesheet.no_worklogs"))
