import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
from api_client import (
    fetch_custom_report, 
    fetch_db_projects, 
    fetch_project_versions, 
    fetch_departments,
    get_headers
)
from auth_utils import ensure_session

st.set_page_config(page_title="Report Builder Pro", layout="wide")

token = ensure_session()
if not token:
    st.warning("Please login from the main page.")
    st.stop()

st.title("📊 Report Builder Pro")
st.markdown("Build professional pivot reports with nesting, filtering, and advanced visualizations.")

# --- 1. Data Source Filters (API level) ---
with st.expander("🌐 Data Source & Global Filters", expanded=True):
    f_col1, f_col2, f_col3 = st.columns(3)
    with f_col1:
        start_date = st.date_input("Start Date", datetime.now().date() - timedelta(days=30), key="api_start_date")
        end_date = st.date_input("End Date", datetime.now().date(), key="api_end_date")
        
    with f_col2:
        headers = get_headers()
        projects_data = fetch_db_projects(size=100, _headers=headers)
        project_list = projects_data.get("items", [])
        project_options = {p["id"]: f"{p['key']} - {p['name']}" for p in project_list}
        selected_project_id = st.selectbox("Project", options=[None] + list(project_options.keys()), format_func=lambda x: project_options[x] if x else "All Projects", key="api_project")
        
        selected_release_id = None
        if selected_project_id:
            proj_key = [p["key"] for p in project_list if p["id"] == selected_project_id][0]
            versions = fetch_project_versions(proj_key, _headers=headers)
            if versions:
                ver_map = {v["id"]: v["name"] for v in versions}
                selected_release_id = st.selectbox("Release", options=[None] + list(ver_map.keys()), format_func=lambda x: ver_map[x] if x else "All Releases", key="api_release")

    with f_col3:
        departments = fetch_departments(_headers=headers)
        dept_options = {d["id"]: d["name"] for d in departments}
        selected_dept_id = st.selectbox("Department", options=[None] + list(dept_options.keys()), format_func=lambda x: dept_options[x] if x else "All", key="api_dept")
        
        selected_div_id = None
        selected_team_id = None
        if selected_dept_id:
            divisions = next(d["divisions"] for d in departments if d["id"] == selected_dept_id)
            div_options = {div["id"]: div["name"] for div in divisions}
            selected_div_id = st.selectbox("Division", options=[None] + list(div_options.keys()), format_func=lambda x: div_options[x] if x else "All", key="api_div")
            if selected_div_id:
                teams = next(div["teams"] for div in divisions if div["id"] == selected_div_id)
                team_options = {t["id"]: t["name"] for t in teams}
                selected_team_id = st.selectbox("Team", options=[None] + list(team_options.keys()), format_func=lambda x: team_options[x] if x else "All", key="api_team")

# --- 2. Pivot Configuration ---
st.subheader("⚙️ Pivot Configuration")
c1, c2, c3 = st.columns(3)

with c1:
    group_rows = st.multiselect(
        "Rows (Vertical)", 
        options=["user", "project", "task", "release", "sprint", "team", "division", "department", "date"],
        default=["user", "project"],
        key="pivot_rows"
    )
    
    group_cols = st.multiselect(
        "Columns (Horizontal)",
        options=["date", "sprint", "release", "team", "user"],
        default=["date"],
        key="pivot_cols"
    )

with c2:
    val_format = st.radio("Value Unit", options=["hours", "days"], horizontal=True, key="pivot_unit")
    h_per_day = st.number_input("Hours per day", min_value=1.0, max_value=24.0, value=8.0, key="pivot_hpd")
    
    granularity = "day"
    if "date" in group_rows or "date" in group_cols:
        granularity = st.select_slider(
            "Date Granularity", 
            options=["day", "week", "2weeks", "month", "quarter"],
            value="week",
            key="pivot_granularity"
        )

with c3:
    st.write("")
    st.write("")
    if st.button("🚀 Run Pivot Report", use_container_width=True, type="primary", key="run_btn"):
        if not group_rows:
            st.error("Select at least one Row dimension")
        else:
            with st.spinner("Fetching data..."):
                payload = {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "project_id": selected_project_id,
                    "release_id": selected_release_id,
                    "department_id": selected_dept_id,
                    "division_id": selected_div_id,
                    "team_id": selected_team_id,
                    "group_by_rows": group_rows,
                    "group_by_cols": group_cols,
                    "date_granularity": granularity,
                    "format": val_format,
                    "hours_per_day": h_per_day
                }
                data = fetch_custom_report(payload)
                if data:
                    st.session_state.raw_data = pd.DataFrame(data)
                    st.session_state.config = payload
                    st.success(f"Loaded {len(data)} records")
                else:
                    st.warning("No data found")
                    st.session_state.raw_data = None

# --- 3. Report Display ---
if "raw_data" in st.session_state and st.session_state.raw_data is not None:
    df = st.session_state.raw_data.copy()
    cfg = st.session_state.config
    
    # Pre-processing: map 'date' to granularity
    final_rows = [cfg["date_granularity"] if r == "date" else r for r in cfg["group_by_rows"]]
    final_cols = [cfg["date_granularity"] if c == "date" else c for c in cfg["group_by_cols"]]
    
    # Filter out empty dimensions or overlaps
    overlap = set(final_rows).intersection(set(final_cols))
    if overlap:
        st.error(f"Dimension overlap: {overlap}")
        st.stop()
    
    # 3.1 Local Filters (Data level)
    with st.expander("🧪 Advanced Local Filters"):
        l_col1, l_col2 = st.columns(2)
        with l_col1:
            all_users = sorted(df["user"].unique().tolist())
            sel_users = st.multiselect("Filter Employees", all_users, default=all_users, key="loc_users")
        with l_col2:
            all_projs = sorted(df["project"].unique().tolist())
            sel_projs = st.multiselect("Filter Projects", all_projs, default=all_projs, key="loc_projs")
            
        df = df[df["user"].isin(sel_users) & df["project"].isin(sel_projs)]

    if df.empty:
        st.info("Filters resulting in empty dataset")
    else:
        # Fill NA for used dimensions
        df[final_rows + final_cols] = df[final_rows + final_cols].fillna("N/A")
        
        # Aggregation
        if final_cols:
            pivot_df = df.pivot_table(
                index=final_rows,
                columns=final_cols,
                values="value",
                aggfunc="sum",
                fill_value=0
            )
        else:
            pivot_df = df.groupby(final_rows)["value"].sum().to_frame()
            pivot_df.columns = [f"Total ({val_format})"]

        # --- Dashboard Metrics ---
        st.divider()
        total_val = df["value"].sum()
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Grand Total", f"{total_val:,.1f} {val_format}")
        m2.metric("Total Hours", f"{df['hours'].sum():,.1f} h")
        m3.metric("Employees", df["user"].nunique())
        m4.metric("Tasks", df["task"].nunique())

        st.subheader("📋 Data Table")
        st.dataframe(pivot_df, use_container_width=True)

        # --- 4. Visuals ---
        st.divider()
        st.subheader("📈 Analytics View")
        v_col1, v_col2 = st.columns([1, 3])
        
        with v_col1:
            viz_type = st.radio("Chart Type", ["Bar", "Line", "Pie"], key="viz_choice")
            color_by = st.selectbox("Color By", options=final_rows + (final_cols if final_cols else []), key="viz_color")
            
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
                    st.info("Add 'date' to pivot to enable Line charts")
            elif viz_type == "Pie":
                fig = px.pie(df, names=final_rows[0], values="value")
                st.plotly_chart(fig, use_container_width=True)

        # Export
        csv = pivot_df.to_csv().encode('utf-8-sig')
        st.download_button("📥 Download Pivot CSV", csv, "pivot_report.csv", "text/csv", key="dl_btn")
