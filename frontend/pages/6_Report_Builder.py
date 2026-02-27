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

st.set_page_config(page_title="Report Builder", layout="wide")

token = ensure_session()
if not token:
    st.warning("Please login from the main page.")
    st.stop()

st.title("🚀 Professional Report Builder")

# --- Sidebar Filters ---
with st.sidebar:
    st.header("🔍 Filters")
    
    # Date Range
    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input("From", datetime.now().date() - timedelta(days=30))
    with col2:
        end_date = st.date_input("To", datetime.now().date())
        
    # Project Filter
    headers = get_headers()
    projects_data = fetch_db_projects(size=100, _headers=headers)
    project_list = projects_data.get("items", [])
    project_options = {p["id"]: f"{p['key']} - {p['name']}" for p in project_list}
    selected_project_id = st.selectbox("Project", options=[None] + list(project_options.keys()), format_func=lambda x: project_options[x] if x else "All Projects")
    
    # Release Filter (dependent on project)
    selected_release_id = None
    if selected_project_id:
        proj_key = [p["key"] for p in project_list if p["id"] == selected_project_id][0]
        versions = fetch_project_versions(proj_key, _headers=headers)
        if versions:
            ver_map = {v["id"]: v["name"] for v in versions}
            selected_release_id = st.selectbox("Release", options=[None] + list(ver_map.keys()), format_func=lambda x: ver_map[x] if x else "All Releases")

    # Hierarchy Filter
    departments = fetch_departments(_headers=headers)
    dept_options = {d["id"]: d["name"] for d in departments}
    selected_dept_id = st.selectbox("Department", options=[None] + list(dept_options.keys()), format_func=lambda x: dept_options[x] if x else "All")
    
    selected_div_id = None
    if selected_dept_id:
        divisions = next(d["divisions"] for d in departments if d["id"] == selected_dept_id)
        div_options = {div["id"]: div["name"] for div in divisions}
        selected_div_id = st.selectbox("Division", options=[None] + list(div_options.keys()), format_func=lambda x: div_options[x] if x else "All")
        
        selected_team_id = None
        if selected_div_id:
            teams = next(div["teams"] for div in divisions if div["id"] == selected_div_id)
            team_options = {t["id"]: t["name"] for t in teams}
            selected_team_id = st.selectbox("Team", options=[None] + list(team_options.keys()), format_func=lambda x: team_options[x] if x else "All")
    else:
        selected_team_id = None

st.markdown("### 🛠 Configuration")

c1, c2, c3 = st.columns(3)

with c1:
    st.subheader("Structure")
    group_rows = st.multiselect(
        "Rows (Vertical)", 
        options=["user", "project", "task", "release", "sprint", "team", "division", "department", "date"],
        default=["user", "project"]
    )
    
    group_cols = st.selectbox(
        "Columns (Horizontal)",
        options=["None", "date", "sprint", "release", "team", "user"],
        index=1
    )

with c2:
    st.subheader("Data & Format")
    val_format = st.radio("Display Format", options=["hours", "days"], horizontal=True)
    h_per_day = st.number_input("Hours per day", min_value=1.0, max_value=24.0, value=8.0)
    
    granularity = "day"
    # Determine actual column dimension to use
    actual_col_dim = group_cols
    if group_cols == "date":
        granularity = st.select_slider(
            "Time Granularity", 
            options=["day", "week", "2weeks", "month", "quarter"],
            value="week"
        )
        actual_col_dim = granularity

    # Safety check: if column is in rows, it will cause issues in pivot_table
    if actual_col_dim in group_rows:
        st.error(f"⚠️ Cannot use the same field '{actual_col_dim}' for both rows and columns. Please change your selection.")
        st.stop()

with c3:
    st.subheader("Actions")
    st.write("")
    st.write("")
    run_report = st.button("🚀 Generate Report", use_container_width=True, type="primary")

# --- Report Execution ---
if run_report or "report_df" in st.session_state:
    if run_report:
        payload = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "project_id": selected_project_id,
            "release_id": selected_release_id,
            "department_id": selected_dept_id,
            "division_id": selected_div_id,
            "team_id": selected_team_id,
            "group_by_rows": group_rows,
            "group_by_cols": group_cols if group_cols != "None" else None,
            "date_granularity": granularity,
            "format": val_format,
            "hours_per_day": h_per_day
        }
        
        data = fetch_custom_report(payload)
        if data:
            st.session_state.report_df = pd.DataFrame(data)
            st.session_state.report_config = payload
        else:
            st.error("No data found for the selected criteria.")
            st.stop()

    df = st.session_state.report_df.copy()
    config = st.session_state.report_config
    
    if not df.empty:
        pivot_val = "value"
        
        # Determine the column dimension
        col_dim = config["group_by_cols"]
        if col_dim == "date":
            col_dim = config["date_granularity"]
            if col_dim not in df.columns: col_dim = "date"
            
        row_dims = config["group_by_rows"]
        
        # Fill missing values
        df[row_dims] = df[row_dims].fillna("N/A")
        
        if col_dim and col_dim != "None":
            df[col_dim] = df[col_dim].fillna("N/A")
            
            # Pivot table
            pivot_df = df.pivot_table(
                index=row_dims,
                columns=col_dim,
                values=pivot_val,
                aggfunc='sum',
                fill_value=0
            )
            
            # Add Totals
            pivot_df['Total'] = pivot_df.sum(axis=1)
            
            # Add a bottom summary row
            summary_row = pivot_df.sum().to_frame().T
            if isinstance(pivot_df.index, pd.MultiIndex):
                # For MultiIndex, we need a tuple for the index
                summary_index = ['Total'] + [''] * (len(row_dims) - 1)
                summary_row.index = pd.MultiIndex.from_tuples([tuple(summary_index)], names=row_dims)
            else:
                summary_row.index = ['Total']
                summary_row.index.name = row_dims[0]
            
            pivot_df = pd.concat([pivot_df, summary_row])
        else:
            # Simple aggregation if no columns selected
            pivot_df = df.groupby(row_dims)[pivot_val].sum().to_frame()
            pivot_df.columns = [f"Total ({val_format})"]
            
            # Add bottom summary
            total_sum = pivot_df.sum().values[0]
            summary_row = pd.DataFrame({pivot_df.columns[0]: [total_sum]})
            if isinstance(pivot_df.index, pd.MultiIndex):
                summary_index = ['Total'] + [''] * (len(row_dims) - 1)
                summary_row.index = pd.MultiIndex.from_tuples([tuple(summary_index)], names=row_dims)
            else:
                summary_row.index = ['Total']
                summary_row.index.name = row_dims[0]
            
            pivot_df = pd.concat([pivot_df, summary_row])

        st.divider()
        st.subheader("📊 Report Result")
        
        # Display Pivot
        st.dataframe(
            pivot_df, 
            use_container_width=True,
            column_config={
                "Total": st.column_config.NumberColumn(format="%.1f"),
            }
        )
        
        # --- Visualization ---
        st.divider()
        st.subheader("📈 Visualization")
        
        viz_type = st.selectbox("Chart Type", ["Bar Chart (by Row Groups)", "Line Chart (Time Series)", "Pie Chart (Distribution)"])
        
        if viz_type == "Bar Chart (by Row Groups)":
            # Aggregate by first row group
            main_group = row_dims[0]
            chart_data = df.groupby(main_group)[pivot_val].sum().reset_index()
            fig = px.bar(chart_data, x=main_group, y=pivot_val, color=main_group, title=f"Total {val_format} by {main_group}")
            st.plotly_chart(fig, use_container_width=True)
            
        elif viz_type == "Line Chart (Time Series)":
            # Group by date dimension
            date_col = config["date_granularity"] if config["group_by_cols"] == "date" else "date"
            if date_col not in df.columns: date_col = "date"
            
            # Ensure date column is datetime for proper sorting
            df_chart = df.copy()
            df_chart[date_col] = pd.to_datetime(df_chart[date_col])
            chart_data = df_chart.groupby(date_col)[pivot_val].sum().reset_index()
            fig = px.line(chart_data, x=date_col, y=pivot_val, title=f"Trend of {val_format} over time")
            st.plotly_chart(fig, use_container_width=True)
            
        elif viz_type == "Pie Chart (Distribution)":
            main_group = row_dims[0]
            chart_data = df.groupby(main_group)[pivot_val].sum().reset_index()
            fig = px.pie(chart_data, names=main_group, values=pivot_val, title=f"Distribution by {main_group}")
            st.plotly_chart(fig, use_container_width=True)

        # Download button
        csv = pivot_df.to_csv().encode('utf-8-sig')
        st.download_button(
            label="📥 Download as CSV",
            data=csv,
            file_name=f"custom_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            mime='text/csv',
        )
