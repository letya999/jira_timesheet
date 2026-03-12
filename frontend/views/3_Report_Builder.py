from datetime import datetime, timedelta

import pandas as pd
import plotly.express as px
import streamlit as st
from api_client import (
    fetch_custom_report,
    fetch_db_projects,
    fetch_org_units,
    fetch_project_versions,
    fetch_report_categories,
    fetch_report_sprints,
    get_all_employees,
    get_headers,
    get_me,
)
from auth_utils import ensure_session
from i18n import t
from state_manager import state

st.set_page_config(page_title=t("reports.report_builder_pro"), page_icon="logo.png", layout="wide")

token, _ = ensure_session()
if not token:
    st.warning(t("auth.please_login"))
    st.stop()

st.title(t("reports.title"))
st.markdown(t("reports.subtitle"))

user_info = get_me()
user_role = user_info.get("role") if user_info else "Employee"

# --- 1. Data Source Filters (API level) ---
with st.expander(f"🌐 {t('reports.data_source_filters')}", expanded=True):
    f_col1, f_col2, f_col3, f_col4 = st.columns(4)
    headers = get_headers()

    with f_col1:
        start_date = st.date_input(
            t("journal.start_date"), datetime.now().date() - timedelta(days=30), key="api_start_date"
        )
        end_date = st.date_input(t("journal.end_date"), datetime.now().date(), key="api_end_date")

        # New Category Filter
        cats = fetch_report_categories(_headers=headers)
        cat_options = {c["id"]: c["name"] for c in cats}
        sel_cat_ids = st.multiselect(
            t("reports.categories"),
            options=list(cat_options.keys()),
            format_func=lambda x: cat_options[x],
            placeholder=t("common.choose_options"),
            key="api_cats",
        )

    with f_col2:
        projects_data = fetch_db_projects(size=100, _headers=headers)
        project_list = projects_data.get("items", [])
        project_options = {p["id"]: f"{p['key']} - {p['name']}" for p in project_list}
        selected_project_id = st.selectbox(
            t("common.project"),
            options=[None] + list(project_options.keys()),
            format_func=lambda x: project_options[x] if x else t("journal.all_projects"),
            key="api_project",
        )

        selected_release_id = None
        if selected_project_id:
            versions = fetch_project_versions(selected_project_id, _headers=headers)
            if versions:
                ver_map = {v["id"]: v["name"] for v in versions}
                selected_release_id = st.selectbox(
                    t("reports.release"),
                    options=[None] + list(ver_map.keys()),
                    format_func=lambda x: ver_map[x] if x else t("reports.all_releases"),
                    key="api_release",
                )
        else:
            # Optionally show a generic release filter or keep hidden
            st.info(t("reports.select_project_hint"))

        # New Sprint Multi-filter
        sprints = fetch_report_sprints(_headers=headers)
        sprint_options = {s["id"]: s["name"] for s in sprints}
        sel_sprint_ids = st.multiselect(
            t("common.sprint"),
            options=list(sprint_options.keys()),
            format_func=lambda x: sprint_options[x],
            placeholder=t("common.choose_options"),
            key="api_sprints",
        )

    with f_col3:
        if user_role in ["Admin", "CEO", "PM"]:
            units = fetch_org_units(_headers=headers)
            unit_options = {u["id"]: u["name"] for u in units}
            selected_org_unit_id = st.selectbox(
                t("common.team"),
                options=[None] + list(unit_options.keys()),
                format_func=lambda x: unit_options[x] if x else t("common.all"),
                key="api_unit",
            )
        else:
            selected_org_unit_id = None
            st.info(t("reports.employee_restricted_info"))

        # New Worklog Type Filter
        sel_types = st.multiselect(t("reports.worklog_types"), options=["JIRA", "MANUAL"], placeholder=t("common.choose_options"), key="api_types")

    with f_col4:
        if user_role in ["Admin", "CEO", "PM"]:
            # New People (User) Filter
            all_emps = get_all_employees(_headers=headers)
            emp_options = {e["id"]: e["display_name"] for e in all_emps}
            sel_user_ids = st.multiselect(
                t("common.employees"),
                options=list(emp_options.keys()),
                format_func=lambda x: emp_options[x],
                placeholder=t("common.choose_options"),
                key="api_users",
            )
        else:
            sel_user_ids = None
            st.write(f"**{t('common.employee')}:** {user_info.get('full_name')}")

# --- 2. Pivot Configuration ---
st.subheader(f"⚙️ {t('reports.pivot_config')}")
c1, c2, c3 = st.columns(3)

pivot_options = [
    "user",
    "project",
    "task",
    "release",
    "sprint",
    "team",
    "division",
    "department",
    "date",
    "category",
    "type",
]

with c1:
    group_rows = st.multiselect(
        t("reports.rows_vertical"),
        options=pivot_options,
        default=["user", "project"],
        format_func=lambda x: t(f"common.{x}") if x in pivot_options else x,
        placeholder=t("common.choose_options"),
        key="pivot_rows",
    )

    group_cols = st.multiselect(
        t("reports.cols_horizontal"),
        options=pivot_options,
        default=["date"],
        format_func=lambda x: t(f"common.{x}") if x in pivot_options else x,
        placeholder=t("common.choose_options"),
        key="pivot_cols",
    )

with c2:
    val_format = st.radio(t("reports.value_unit"), options=["hours", "days"], format_func=lambda x: t(f"common.{x}"), horizontal=True, key="pivot_unit")
    h_per_day = st.number_input(t("reports.hours_per_day"), min_value=1.0, max_value=24.0, value=8.0, key="pivot_hpd")

    granularity = "day"
    if "date" in group_rows or "date" in group_cols:
        granularity = st.select_slider(
            t("reports.date_granularity"),
            options=["day", "week", "2weeks", "month", "quarter"],
            value="week",
            format_func=lambda x: (
                t(f"dashboard.{x}") if x in ["month"] else t(f"org.period_{x.replace('2weeks', 'biweekly')}")
            ),
            key="pivot_granularity",
        )

with c3:
    st.write("")
    st.write("")
    if st.button(f"🚀 {t('reports.run_report')}", width="stretch", type="primary", key="run_btn"):
        if not group_rows:
            st.error(t("reports.row_dim_error"))
        else:
            with st.spinner(t("common.loading")):
                payload = {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "project_id": selected_project_id,
                    "release_id": selected_release_id,
                    "org_unit_id": selected_org_unit_id,
                    "user_ids": sel_user_ids if sel_user_ids else None,
                    "sprint_ids": sel_sprint_ids if sel_sprint_ids else None,
                    "worklog_types": sel_types if sel_types else None,
                    "category_ids": sel_cat_ids if sel_cat_ids else None,
                    "group_by_rows": group_rows,
                    "group_by_cols": group_cols,
                    "date_granularity": granularity,
                    "format": val_format,
                    "hours_per_day": h_per_day,
                }
                data = fetch_custom_report(payload)
                if data:
                    state.report_raw_data = pd.DataFrame(data)
                    st.session_state.config = payload
                    st.success(t("reports.loaded_count", count=len(data)))
                else:
                    st.warning(t("reports.no_data"))
                    state.report_raw_data = None


# --- 3. Report Display ---
if state.report_raw_data is not None:
    df = state.report_raw_data.copy()
    cfg = st.session_state.config

    # Pre-processing: map 'date' to granularity
    gran = cfg.get("date_granularity", "day")
    final_rows = [gran if r == "date" else r for r in cfg["group_by_rows"]]
    final_cols = [gran if c == "date" else c for c in cfg["group_by_cols"]]

    # Ensure all required dimensions exist in df
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
        if gran == "day":
            df["day"] = df["date"].dt.date
        elif gran == "week":
            df["week"] = df["date"].dt.to_period("W").apply(lambda r: r.start_time)
        elif gran == "2weeks":
            # Bucket to the Monday of the odd week (simple 14-day bucketing)
            df["2weeks"] = df["date"].apply(
                lambda d: d - timedelta(days=d.weekday() + (7 if (d.isocalendar()[1] % 2 == 0) else 0))
            )
            df["2weeks"] = pd.to_datetime(df["2weeks"]).dt.date
        elif gran == "month":
            df["month"] = df["date"].dt.to_period("M").apply(lambda r: r.start_time)
        elif gran == "quarter":
            df["quarter"] = df["date"].dt.to_period("Q").apply(lambda r: r.start_time)

    for col in final_rows + final_cols:
        if col not in df.columns:
            df[col] = t("common.na")

    # Filter out empty dimensions or overlaps
    overlap = set(final_rows).intersection(set(final_cols))
    if overlap:
        st.error(f"Dimension overlap: {overlap}")
        st.stop()

    # 3.1 Local Filters (Data level)
    with st.expander(f"🧪 {t('reports.advanced_filters')}"):
        l_col1, l_col2 = st.columns(2)
        with l_col1:
            all_users = sorted([str(u) for u in df["user"].unique() if u is not None])
            sel_users = st.multiselect(t("reports.filter_employees"), all_users, default=all_users, placeholder=t("common.choose_options"), key="loc_users")
        with l_col2:
            all_projs = sorted([str(p) for p in df["project"].unique() if p is not None])
            sel_projs = st.multiselect(t("reports.filter_projects"), all_projs, default=all_projs, placeholder=t("common.choose_options"), key="loc_projs")

        df = df[df["user"].isin(sel_users) & df["project"].isin(sel_projs)]

    if df.empty:
        st.info(t("reports.empty_dataset"))
    else:
        # Fill NA for used dimensions
        df[final_rows + final_cols] = df[final_rows + final_cols].fillna(t("common.na"))

        # Aggregation
        if final_cols:
            pivot_df = df.pivot_table(index=final_rows, columns=final_cols, values="value", aggfunc="sum", fill_value=0)
        else:
            pivot_df = df.groupby(final_rows)["value"].sum().to_frame()
            pivot_df.columns = [f"{t('common.total')} ({t(f'common.{val_format}')})"]

        # --- Dashboard Metrics ---
        st.divider()
        total_val = df["value"].sum()
        m1, m2, m3, m4 = st.columns(4)
        m1.metric(t("reports.grand_total"), f"{total_val:,.1f} {t(f'common.{val_format}')}")
        m2.metric(t("reports.total_hours"), f"{df['hours'].sum():,.1f} {t('common.hours_short')}")
        m3.metric(t("common.employees"), df["user"].nunique())
        m4.metric(t("common.task"), df["task"].nunique())

        st.subheader(f"📋 {t('reports.data_table')}")
        st.dataframe(pivot_df, width="stretch")

        # --- 4. Visuals ---
        st.divider()
        st.subheader(f"📈 {t('reports.analytics_view')}")
        v_col1, v_col2 = st.columns([1, 3])

        with v_col1:
            viz_type = st.radio(
                t("reports.chart_type"),
                ["Bar", "Line", "Pie"],
                format_func=lambda x: t(f"reports.chart_{x.lower()}"),
                key="viz_choice",
            )
            color_by = st.selectbox(
                t("reports.color_by"), options=final_rows + (final_cols if final_cols else []), key="viz_color"
            )

        with v_col2:
            if viz_type == "Bar":
                fig = px.bar(df, x=final_rows[0], y="value", color=color_by, barmode="group")
                st.plotly_chart(fig, use_container_width=True)
            elif viz_type == "Line":
                time_col = cfg["date_granularity"]
                if time_col in df.columns:
                    line_df = df.groupby([time_col, color_by])["value"].sum().reset_index()
                    line_df[time_col] = pd.to_datetime(line_df[time_col])
                    fig = px.line(line_df, x=time_col, y="value", color=color_by)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info(t("reports.line_chart_info"))
            elif viz_type == "Pie":
                fig = px.pie(df, names=final_rows[0], values="value")
                st.plotly_chart(fig, use_container_width=True)

        # Export
        csv = pivot_df.to_csv().encode("utf-8-sig")
        st.download_button(f"📥 {t('reports.download_csv')}", csv, "pivot_report.csv", "text/csv", key="dl_btn")
