import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from api_client import fetch_dashboard, get_export_url, get_headers
import requests
from auth_utils import ensure_session

# Check for session/cookies
token, _ = ensure_session()

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
    # Ensure Date is datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    view_type = st.selectbox("Select View", [
        "Executive View (Capex/Opex)", 
        "Team Utilization (Hours by Team)", 
        "Financial Pivot (By Dept/Division)",
        "Raw Data"
    ])
    
    if view_type == "Executive View (Capex/Opex)":
        st.subheader("Executive Capex/Opex Report")
        
        display_mode = st.radio("Display Mode", ["List View (Image 1)", "Release Comparison (Image 2)"], horizontal=True)
        granularity = st.radio("Time Granularity", ["Month", "Releases"], horizontal=True)
        col_to_use = "Month" if granularity == "Month" else "Releases"
        
        # Calculate Capex and Opex
        df['Capex'] = df.apply(lambda x: x['Hours'] if x['Category'] == 'Capex' else 0, axis=1)
        df['Opex'] = df.apply(lambda x: x['Hours'] if x['Category'] == 'Opex' else 0, axis=1)
        
        if display_mode == "List View (Image 1)":
            # Group by Team, User, and the selected granularity
            # Calculate Min/Max dates for "Activity Dates"
            user_dates = df.groupby("User")["Date"].agg(['min', 'max']).reset_index()
            user_dates['Dates'] = user_dates.apply(lambda x: f"{x['min'].strftime('%d.%m')} - {x['max'].strftime('%d.%m')}", axis=1)
            
            group_cols = ["Team", "User", "Department", col_to_use]
            agg_df = df.groupby(group_cols).agg({
                'Hours': 'sum',
                'Capex': 'sum',
                'Opex': 'sum'
            }).reset_index()
            
            agg_df = agg_df.merge(user_dates[['User', 'Dates']], on='User', how='left')
            
            display_df = agg_df.copy().rename(columns={
                "User": "Сотрудник",
                "Department": "Подразделение",
                "Dates": "Даты",
                col_to_use: "Период",
                "Hours": "Часы"
            })
            
            rows = []
            for team, team_data in display_df.groupby("Team"):
                rows.append({
                    "Сотрудник": f"**{team}**", "Даты": "", "Подразделение": "", "Период": "",
                    "Часы": team_data["Часы"].sum(), "Capex": team_data["Capex"].sum(), "Opex": team_data["Opex"].sum(),
                    "is_header": True
                })
                for _, row in team_data.sort_values("Сотрудник").iterrows():
                    rows.append({
                        "Сотрудник": row["Сотрудник"], "Даты": row["Даты"], "Подразделение": row["Подразделение"], 
                        "Период": row["Период"], "Часы": row["Часы"], "Capex": row["Capex"], "Opex": row["Opex"],
                        "is_header": False
                    })
            
            final_df = pd.DataFrame(rows)
            
            # Apply styling
            def apply_color(styler):
                # Color headers: if 'is_header' is True, make row bold and grey
                styler.apply(lambda x: ['background-color: #f0f2f6; font-weight: bold' if x['is_header'] else '' for _ in x], axis=1)
                # Color Capex (Green) and Opex (Red)
                styler.set_properties(subset=['Capex'], **{'background-color': '#c6efce', 'color': '#006100'})
                styler.set_properties(subset=['Opex'], **{'background-color': '#ffc7ce', 'color': '#9c0006'})
                return styler

            st.dataframe(
                final_df.style.pipe(apply_color),
                width="stretch",
                column_config={
                    "is_header": None, # Hides the column from the user
                    "Capex": st.column_config.NumberColumn(format="%.1f"),
                    "Opex": st.column_config.NumberColumn(format="%.1f"),
                    "Часы": st.column_config.NumberColumn(format="%.1f", help="Total Hours"),
                }
            )
            
        else: # Release Comparison (Image 2)
            # Pivot table where Columns are Releases/Months
            pivot = df.pivot_table(
                index=["Department", "Team", "User"],
                columns=col_to_use,
                values="Hours",
                aggfunc="sum",
                fill_value=0
            ).reset_index()
            
            # Format to include Team Headers
            rows = []
            for team, team_data in pivot.groupby("Team"):
                # Header row
                header = {"User": f"**{team}**", "Department": "", "Team": team}
                for col in pivot.columns:
                    if col not in ["Department", "Team", "User"]:
                        header[col] = team_data[col].sum()
                rows.append(header)
                
                # Data rows
                for _, row in team_data.iterrows():
                    rows.append(row.to_dict())
            
            final_pivot = pd.DataFrame(rows).drop(columns=["Team"])
            final_pivot = final_pivot.rename(columns={"User": "Сотрудник", "Department": "Подразделение"})
            
            st.dataframe(final_pivot, width="stretch")

    elif view_type == "Team Utilization (Hours by Team)":
        pivot = df.pivot_table(index="Team", columns="Type", values="Hours", aggfunc="sum", fill_value=0)
        st.dataframe(pivot)
        
    elif view_type == "Financial Pivot (By Dept/Division)":
        pivot = df.pivot_table(index=["Department", "Team", "User"], columns="Category", values="Hours", aggfunc="sum", fill_value=0)
        st.dataframe(pivot)

    elif view_type == "Raw Data":
        st.dataframe(df)

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